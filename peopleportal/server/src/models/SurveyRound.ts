import { Schema, model } from "mongoose";

export interface ISurveyRound {
    roundId: string;
    seasonType: "FALL" | "SPRING";
    seasonYear: number;
    month: string;
    opensAt: Date;
    closesAt: Date;
    status: "scheduled" | "open" | "closed";
    surveyVersion: string;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<ISurveyRound>(
    {
        roundId: { type: String, required: true, unique: true },
        seasonType: { type: String, required: true, enum: ["FALL", "SPRING"] },
        seasonYear: { type: Number, required: true, validate: Number.isInteger },
        month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
        opensAt: { type: Date, required: true },
        closesAt: { type: Date, required: true },
        status: {
            type: String,
            enum: ["scheduled", "open", "closed"],
            default: "scheduled",
            required: true,
        },
        surveyVersion: { type: String, required: true },
    },
    { timestamps: true },
);

schema.index({ seasonType: 1, seasonYear: 1, month: 1 }, { unique: true });

export const SurveyRound = model<ISurveyRound>("SurveyRound", schema);
