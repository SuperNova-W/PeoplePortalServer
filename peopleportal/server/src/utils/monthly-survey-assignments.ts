import { SURVEY_QUESTIONS } from "../config/surveyQuestions";
import type { SurveyRole } from "../models/MonthlySurveyAssignment";

export interface MonthlySurveyMember {
    userPk: string;
    /** Normalized roles, not free-text titles. Unrecognized roles do not participate. */
    roles: readonly string[];
}

export interface MonthlyAssignmentInput {
    roundId: string;
    projectPk: string;
    members: readonly MonthlySurveyMember[];
}

export interface GeneratedAssignment {
    roundId: string;
    projectPk: string;
    respondentPk: string;
    respondentRole: SurveyRole;
    rateePk: string;
    rateeRole: SurveyRole;
    questionKeys: string[];
}

const ROLE_PRIORITY: readonly SurveyRole[] = ["project_lead", "tech_lead", "engineer"];
const RATEE_ROLES: Record<SurveyRole, readonly SurveyRole[]> = {
    engineer: ["tech_lead", "project_lead"],
    tech_lead: ["engineer", "project_lead"],
    project_lead: ["tech_lead"],
};

/**
 * Generate monthly assignments without I/O or mutation. Duplicate memberships
 * are merged before selecting one role: project lead > tech lead > engineer.
 * Caller supplies only the current, eligible roster for this project.
 */
export function buildMonthlySurveyAssignments(input: MonthlyAssignmentInput): GeneratedAssignment[] {
    const { roundId, projectPk, members } = input;
    if (typeof roundId !== "string" || !roundId.trim() ||
        typeof projectPk !== "string" || !projectPk.trim()) {
        throw new Error("A round ID and project ID are required");
    }

    const rolesByPerson = new Map<string, Set<string>>();
    for (const member of members) {
        if (typeof member.userPk !== "string" || !member.userPk.trim() ||
            member.userPk !== member.userPk.trim()) {
            throw new Error("Members must have a nonempty string Authentik PK without surrounding whitespace");
        }
        const roles = rolesByPerson.get(member.userPk) ?? new Set<string>();
        for (const role of member.roles) roles.add(role);
        rolesByPerson.set(member.userPk, roles);
    }

    const participants: { userPk: string; role: SurveyRole }[] = [];
    for (const userPk of [...rolesByPerson.keys()].sort()) {
        const roles = rolesByPerson.get(userPk)!;
        const role = ROLE_PRIORITY.find(candidate => roles.has(candidate));
        if (role) participants.push({ userPk, role });
    }

    const assignments: GeneratedAssignment[] = [];
    for (const respondent of participants) {
        for (const ratee of participants) {
            if (respondent.userPk === ratee.userPk ||
                !RATEE_ROLES[respondent.role].includes(ratee.role)) continue;
            const questionKeys = SURVEY_QUESTIONS[ratee.role]
                .map(question => question.key)
                .filter(key => !(respondent.role === "project_lead" && key === "lead_guidance"));
            assignments.push({
                roundId, projectPk,
                respondentPk: respondent.userPk, respondentRole: respondent.role,
                rateePk: ratee.userPk, rateeRole: ratee.role, questionKeys,
            });
        }
    }
    return assignments;
}
