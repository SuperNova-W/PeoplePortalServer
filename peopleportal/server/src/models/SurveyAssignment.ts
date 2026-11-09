import { Schema, model } from "mongoose";
import { SurveyPairing } from "../utils/survey-assignments";

export interface ISurveyAssignment extends SurveyPairing {
    createdBy: number;
    snapshotRunId: string;
    snapshotSha256: string;
    snapshotRetrievedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ISurveyAssignment>(
    {
        semester: {
            type: String,
            required: true,
            match: /^(FALL|SPRING)-\d{4}$/,
        },
        projectPk: { type: String, required: true },
        respondentPk: { type: Number, required: true },
        techLeadPk: { type: Number, required: true },
        createdBy: { type: Number, required: true },
        snapshotRunId: { type: String, required: true },
        snapshotSha256: { type: String, required: true },
        snapshotRetrievedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

schema.index(
    { semester: 1, projectPk: 1, respondentPk: 1, techLeadPk: 1 },
    { unique: true },
);
schema.index({ respondentPk: 1, semester: 1 });

export const SurveyAssignment = model<ISurveyAssignment>(
    "SurveyAssignment",
    schema,
);
