import * as express from "express";
import {
    Body,
    Controller,
    Get,
    Path,
    Post,
    Query,
    Request,
    Route,
    Security,
    SuccessResponse,
    Tags,
} from "tsoa";
import { SurveyAssignment } from "../models/SurveyAssignment";
import { SurveyAssignmentBatch } from "../models/SurveyAssignmentBatch";
import {
    buildSurveyPairings,
    SurveyPairing,
} from "../utils/survey-assignments";
import { CustomValidationError, ResourceAccessError } from "../utils/errors";
import { loadSurveySnapshot } from "../utils/survey-snapshot";

interface GenerateSurveyAssignmentsRequest {
    semester: string;
    snapshotRunId: string;
}

@Route("/api/surveys")
@Tags("Surveys")
export class SurveyController extends Controller {
    /** Generate from one explicitly selected, completed semester-end snapshot. */
    @Post("projects/{projectPk}/assignments")
    @Security("executive")
    @SuccessResponse("200", "Assignments generated")
    public async generateAssignments(
        @Request() req: express.Request,
        @Path() projectPk: string,
        @Body() body: GenerateSurveyAssignmentsRequest,
    ): Promise<{ assignments: SurveyPairing[] }> {
        const { semester, snapshotRunId } = body;
        if (!/^(FALL|SPRING)-\d{4}$/.test(semester)) {
            throw new CustomValidationError(
                400,
                "Use FALL-YYYY or SPRING-YYYY",
            );
        }
        const snapshot = await loadSurveySnapshot(
            snapshotRunId,
            projectPk,
            semester,
        );
        const pairings = buildSurveyPairings(
            semester,
            projectPk,
            snapshot.members,
        );
        const incompatible = await SurveyAssignment.exists({
            semester,
            projectPk,
            $or: [
                { snapshotRunId: { $ne: snapshot.runId } },
                { snapshotSha256: { $ne: snapshot.sha256 } },
            ],
        });
        if (incompatible)
            throw new ResourceAccessError(
                409,
                "Assignments already exist from live data or a different snapshot; review them before generating again",
            );
        // Establish the unique index before writes, including concurrent generation.
        await SurveyAssignment.init();
        await SurveyAssignmentBatch.init();
        const scope = { semester, projectPk };
        let batch;
        try {
            batch = await SurveyAssignmentBatch.findOneAndUpdate(
                scope,
                {
                    $setOnInsert: {
                        ...scope,
                        snapshotRunId: snapshot.runId,
                        snapshotSha256: snapshot.sha256,
                    },
                },
                { upsert: true, new: true },
            );
        } catch (error: any) {
            if (error?.code !== 11000) throw error;
            batch = await SurveyAssignmentBatch.findOne(scope);
        }
        if (
            !batch ||
            batch.snapshotRunId !== snapshot.runId ||
            batch.snapshotSha256 !== snapshot.sha256
        ) {
            throw new ResourceAccessError(
                409,
                "This project and semester are already pinned to another snapshot",
            );
        }
        const generatedAt = new Date();
        for (const pairing of pairings) {
            try {
                await SurveyAssignment.updateOne(
                    pairing,
                    {
                        $setOnInsert: {
                            ...pairing,
                            snapshotRunId: snapshot.runId,
                            snapshotSha256: snapshot.sha256,
                            snapshotRetrievedAt: new Date(snapshot.retrievedAt),
                            createdBy: req.session.authorizedUser!.pk,
                            createdAt: generatedAt,
                            updatedAt: generatedAt,
                        },
                    },
                    { upsert: true, timestamps: false },
                );
            } catch (error: any) {
                // Another request may have inserted the same unique pairing.
                if (error?.code !== 11000) throw error;
            }
        }
        return { assignments: pairings };
    }

    /** Respondents can see only their own assignments, including past semesters. */
    @Get("assignments/mine")
    @Security("oidc")
    @SuccessResponse("200", "Assignments retrieved")
    public async getMyAssignments(
        @Request() req: express.Request,
        @Query() semester: string,
    ): Promise<{ assignments: SurveyPairing[] }> {
        if (!/^(FALL|SPRING)-\d{4}$/.test(semester)) {
            throw new CustomValidationError(
                400,
                "Use FALL-YYYY or SPRING-YYYY",
            );
        }
        const assignments = await SurveyAssignment.find({
            semester,
            respondentPk: req.session.authorizedUser!.pk,
            snapshotRunId: { $exists: true },
            snapshotSha256: { $exists: true },
        })
            .select({
                _id: 0,
                semester: 1,
                projectPk: 1,
                respondentPk: 1,
                techLeadPk: 1,
            })
            .sort({ projectPk: 1, techLeadPk: 1 })
            .lean();
        return { assignments };
    }
}
