import { SurveyRound, ISurveyRound } from "../models/SurveyRound";
import { MonthlySurveyAssignment } from "../models/MonthlySurveyAssignment";
import { SURVEY_VERSION } from "../config/surveyQuestions";
import { buildMonthlySurveyAssignments } from "../utils/monthly-survey-assignments";
import type { SurveyProjectRoster } from "../utils/monthly-survey-rosters";
import { monthlySurveyWindow, SurveySeason } from "../utils/survey-round-dates";
import { CustomValidationError, ResourceAccessError } from "../utils/errors";
import { DateTime } from "luxon";
import { SURVEY_TIMEZONE, surveyMonthAt } from "../utils/survey-round-dates";

export interface CreateSurveyRoundRequest extends SurveySeason { month: string; }
export interface SurveyRoundResult {
    roundId: string;
    status: ISurveyRound["status"];
    opensAt: Date;
    closesAt: Date;
    assignmentCount: number;
    insertedCount: number;
}
export interface SurveyRoundDependencies {
    loadRosters: (season: SurveySeason) => Promise<SurveyProjectRoster[]>;
    scheduleClose: (roundId: string, closesAt: Date) => Promise<void>;
    now?: () => Date;
}

export class SurveyRoundService {
    constructor(private readonly dependencies: SurveyRoundDependencies) {}
    private now(): Date { return this.dependencies.now?.() ?? new Date(); }

    public async createRound(request: CreateSurveyRoundRequest, scheduled = false): Promise<SurveyRoundResult> {
        const { seasonType, seasonYear, month } = request;
        if (!["FALL", "SPRING"].includes(seasonType) || !Number.isInteger(seasonYear) ||
            seasonYear < 2000 || seasonYear > 9999 || !month.startsWith(`${seasonYear}-`)) {
            throw new CustomValidationError(400, "A valid season and matching month/year are required");
        }
        const window = monthlySurveyWindow(month);
        const now = this.now();
        if (!scheduled && month !== surveyMonthAt(now)) {
            throw new CustomValidationError(400, "Manual rounds must use the current New York month");
        }
        // Manual creation opens now; scheduled creation keeps the calendar boundary.
        const opensAt = scheduled ? window.opensAt : now;
        const closesAt = scheduled ? window.closesAt :
            DateTime.fromJSDate(now, { zone: SURVEY_TIMEZONE }).plus({ days: 7 }).toJSDate();
        const scope = { seasonType, seasonYear, month };
        await SurveyRound.init();
        let round;
        try {
            round = await SurveyRound.findOneAndUpdate(scope, { $setOnInsert: {
                ...scope, roundId: `${seasonType.toLowerCase()}-${month}`,
                opensAt, closesAt, status: "scheduled", surveyVersion: SURVEY_VERSION,
            } }, { upsert: true, new: true, runValidators: true });
        } catch (error) {
            if ((error as { code?: number }).code !== 11000) throw error;
            round = await SurveyRound.findOne(scope);
        }
        if (!round) throw new Error("Survey round creation failed");
        if (round.status === "closed" || round.closesAt <= now) {
            return this.closeRound(round.roundId);
        }
        if (round.surveyVersion !== SURVEY_VERSION) {
            throw new ResourceAccessError(409, "This round uses a different survey version");
        }
        // Schedule first: a partial failure leaves a recoverable scheduled round.
        await this.dependencies.scheduleClose(round.roundId, round.closesAt);
        const insertedCount = await this.insertAssignments(round);
        await SurveyRound.updateOne({ roundId: round.roundId, status: "scheduled", opensAt: { $lte: now }, closesAt: { $gt: now } }, { $set: { status: "open" } });
        return this.result(round.roundId, insertedCount);
    }

    public async closeRound(roundId: string): Promise<SurveyRoundResult> {
        await this.requireRound(roundId);
        await SurveyRound.updateOne({ roundId }, { $set: { status: "closed" } });
        return this.result(roundId, 0);
    }

    public async regenerateAssignments(roundId: string): Promise<SurveyRoundResult> {
        const round = await this.requireRound(roundId);
        if (round.status === "closed" || round.closesAt <= this.now()) {
            throw new ResourceAccessError(409, "Closed or expired rounds cannot be regenerated");
        }
        if (round.surveyVersion !== SURVEY_VERSION) {
            throw new ResourceAccessError(409, "This round uses a different survey version");
        }
        return this.result(roundId, await this.insertAssignments(round));
    }

    private async insertAssignments(round: ISurveyRound): Promise<number> {
        const rosters = await this.dependencies.loadRosters(round);
        await MonthlySurveyAssignment.init();
        let inserted = 0;
        for (const project of rosters) {
            const assignments = buildMonthlySurveyAssignments({ roundId: round.roundId, ...project });
            for (const assignment of assignments) {
                const { roundId, projectPk, respondentPk, rateePk } = assignment;
                try {
                    const result = await MonthlySurveyAssignment.updateOne(
                        { roundId, projectPk, respondentPk, rateePk },
                        { $setOnInsert: { ...assignment, status: "pending", submittedAt: null,
                            createdAt: this.now(), updatedAt: this.now() } },
                        { upsert: true, runValidators: true, timestamps: false },
                    );
                    inserted += result.upsertedCount;
                } catch (error) {
                    if ((error as { code?: number }).code !== 11000) throw error;
                    // Another worker inserted the same unique pair. Never overwrite it.
                }
            }
        }
        return inserted;
    }

    private async requireRound(roundId: string) {
        const round = await SurveyRound.findOne({ roundId });
        if (!round) throw new ResourceAccessError(404, "Survey round not found");
        return round;
    }

    private async result(roundId: string, insertedCount: number): Promise<SurveyRoundResult> {
        const round = await this.requireRound(roundId);
        return { roundId, status: round.status, opensAt: round.opensAt, closesAt: round.closesAt,
            assignmentCount: await MonthlySurveyAssignment.countDocuments({ roundId }), insertedCount };
    }
}
