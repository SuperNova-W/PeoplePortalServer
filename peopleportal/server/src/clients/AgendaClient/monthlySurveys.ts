import type { Agenda } from "agenda";
import { SurveyRound } from "../../models/SurveyRound";
import { SurveyRoundService } from "../../services/SurveyRoundService";
import { monthlySurveyWindow, surveyMonthAt, surveySeasonAt, SURVEY_TIMEZONE } from "../../utils/survey-round-dates";

export const OPEN_SURVEY_JOB = "openMonthlySurveyRound";
export const CLOSE_SURVEY_JOB = "closeMonthlySurveyRound";
export const RECOVER_SURVEYS_JOB = "recoverMonthlySurveyRounds";
let service: SurveyRoundService | undefined;

export function getSurveyRoundService(): SurveyRoundService {
    if (!service) throw new Error("Survey scheduling is not initialized");
    return service;
}

/** Recovery also makes failed or missed openings retryable after process restarts. */
export async function recoverSurveyRounds(roundService: SurveyRoundService, now = new Date()): Promise<void> {
    await SurveyRound.updateMany({ status: { $ne: "closed" }, closesAt: { $lte: now } }, { $set: { status: "closed" } });
    const pending = await SurveyRound.find({ status: "scheduled", opensAt: { $lte: now }, closesAt: { $gt: now } });
    for (const round of pending) {
        await roundService.createRound({ seasonType: round.seasonType, seasonYear: round.seasonYear, month: round.month }, true);
    }
    const month = surveyMonthAt(now);
    const window = monthlySurveyWindow(month);
    if (window.opensAt <= now && now < window.closesAt) {
        const season = surveySeasonAt(now);
        const existing = await SurveyRound.findOne({ ...season, month });
        if (!existing) await roundService.createRound({ ...season, month }, true);
    }
}

export async function registerMonthlySurveyJobs(agenda: Agenda): Promise<void> {
    service = new SurveyRoundService({
        loadRosters: async season => (await import("../../utils/monthly-survey-rosters")).loadMonthlySurveyRosters(season),
        scheduleClose: async (roundId, closesAt) => {
            await agenda.create(CLOSE_SURVEY_JOB, { roundId })
                .unique({ name: CLOSE_SURVEY_JOB, "data.roundId": roundId }, { insertOnly: true })
                .schedule(closesAt).save();
        },
    });
    const roundService = service;
    agenda.define(OPEN_SURVEY_JOB, async () => {
        const now = new Date();
        await roundService.createRound({ ...surveySeasonAt(now), month: surveyMonthAt(now) }, true);
    });
    agenda.define(CLOSE_SURVEY_JOB, async job => {
        const roundId = (job.attrs.data as { roundId: string }).roundId;
        await roundService.closeRound(roundId);
    });
    agenda.define(RECOVER_SURVEYS_JOB, async () => recoverSurveyRounds(roundService));
    await agenda.every("0 0 24 * *", OPEN_SURVEY_JOB, {}, { timezone: SURVEY_TIMEZONE, skipImmediate: true });
    await agenda.every("10 minutes", RECOVER_SURVEYS_JOB, {}, { skipImmediate: false });
}
