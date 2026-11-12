import { DateTime } from "luxon";
import { CustomValidationError } from "./errors";

export const SURVEY_TIMEZONE = "America/New_York";
export interface SurveySeason { seasonType: "FALL" | "SPRING"; seasonYear: number; }

export function monthlySurveyWindow(month: string): { opensAt: Date; closesAt: Date } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new CustomValidationError(400, "Month must be YYYY-MM");
    }
    const opens = DateTime.fromISO(`${month}-24`, { zone: SURVEY_TIMEZONE }).startOf("day");
    if (!opens.isValid) throw new CustomValidationError(400, "Invalid survey month");
    return { opensAt: opens.toJSDate(), closesAt: opens.plus({ days: 7 }).toJSDate() };
}

/** Calendar default for automated rounds: January–June spring, July–December fall. */
export function surveySeasonAt(now: Date): SurveySeason {
    const local = DateTime.fromJSDate(now, { zone: SURVEY_TIMEZONE });
    return { seasonType: local.month <= 6 ? "SPRING" : "FALL", seasonYear: local.year };
}

export function surveyMonthAt(now: Date): string {
    return DateTime.fromJSDate(now, { zone: SURVEY_TIMEZONE }).toFormat("yyyy-MM");
}
