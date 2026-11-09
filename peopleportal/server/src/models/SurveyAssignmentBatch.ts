import { Schema, model } from "mongoose";

const schema = new Schema(
    {
        semester: { type: String, required: true },
        projectPk: { type: String, required: true },
        snapshotRunId: { type: String, required: true },
        snapshotSha256: { type: String, required: true },
    },
    { timestamps: true },
);
schema.index({ semester: 1, projectPk: 1 }, { unique: true });
export const SurveyAssignmentBatch = model("SurveyAssignmentBatch", schema);
