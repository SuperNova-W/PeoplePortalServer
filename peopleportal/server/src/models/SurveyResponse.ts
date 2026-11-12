import { Schema, model, Types } from "mongoose";
import { SURVEY_ROLES, SurveyRole } from "./MonthlySurveyAssignment";

export interface ISurveyAnswer {
    questionKey: string;
    value: 1 | 2 | 3 | null;
}

export interface ISurveyResponse {
    assignmentId: Types.ObjectId;
    roundId: string;
    projectPk: string;
    respondentPk: string;
    respondentRole: SurveyRole;
    rateePk: string;
    rateeRole: SurveyRole;
    answers: ISurveyAnswer[];
    submittedAt: Date;
}

const answerSchema = new Schema<ISurveyAnswer>(
    {
        questionKey: { type: String, required: true },
        value: {
            type: Number,
            // Explicit null is N/A; an omitted answer is invalid.
            required: function (this: ISurveyAnswer): boolean { return this.value !== null; },
            validate: (value: number | null) => value === null || value === 1 || value === 2 || value === 3,
        },
    },
    { _id: false },
);

const schema = new Schema<ISurveyResponse>({
    assignmentId: { type: Schema.Types.ObjectId, ref: "MonthlySurveyAssignment", required: true, unique: true },
    roundId: { type: String, required: true },
    projectPk: { type: String, required: true },
    respondentPk: { type: String, required: true },
    respondentRole: { type: String, required: true, enum: SURVEY_ROLES },
    rateePk: { type: String, required: true },
    rateeRole: { type: String, required: true, enum: SURVEY_ROLES },
    answers: {
        type: [answerSchema],
        required: true,
        validate: (answers: ISurveyAnswer[]) => answers.length > 0 && new Set(answers.map(answer => answer.questionKey)).size === answers.length,
    },
    submittedAt: { type: Date, required: true },
});

schema.index({ roundId: 1, projectPk: 1 });

export const SurveyResponse = model<ISurveyResponse>("SurveyResponse", schema);
