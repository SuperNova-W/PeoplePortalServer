import { Schema, model } from "mongoose";

export const SURVEY_ROLES = ["engineer", "tech_lead", "project_lead"] as const;
export type SurveyRole = (typeof SURVEY_ROLES)[number];

export interface IMonthlySurveyAssignment {
    roundId: string;
    projectPk: string;
    respondentPk: string;
    respondentRole: SurveyRole;
    rateePk: string;
    rateeRole: SurveyRole;
    questionKeys: string[];
    status: "pending" | "submitted";
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// The existing SurveyAssignment model serves the semester snapshot endpoints.
// Monthly assignments use their own collection to preserve that contract.
const schema = new Schema<IMonthlySurveyAssignment>(
    {
        roundId: { type: String, required: true },
        projectPk: { type: String, required: true },
        respondentPk: { type: String, required: true },
        respondentRole: { type: String, required: true, enum: SURVEY_ROLES },
        rateePk: { type: String, required: true },
        rateeRole: { type: String, required: true, enum: SURVEY_ROLES },
        questionKeys: {
            type: [{ type: String, required: true }],
            required: true,
            validate: (keys: string[]) => keys.length > 0 && new Set(keys).size === keys.length,
        },
        status: { type: String, required: true, enum: ["pending", "submitted"], default: "pending" },
        submittedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

schema.index({ roundId: 1, projectPk: 1, respondentPk: 1, rateePk: 1 }, { unique: true });
schema.index({ respondentPk: 1, roundId: 1, status: 1 });

export const MonthlySurveyAssignment = model<IMonthlySurveyAssignment>("MonthlySurveyAssignment", schema);
