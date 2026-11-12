import { AuthentikClient } from "../clients/AuthentikClient";
import { GetGroupInfoResponse, TeamType } from "../clients/AuthentikClient/models";
import { isSurveyEngineer, isSurveyTechLead } from "./survey-assignments";
import type { MonthlySurveyMember } from "./monthly-survey-assignments";
import type { SurveySeason } from "./survey-round-dates";

export interface SurveyProjectRoster { projectPk: string; members: MonthlySurveyMember[]; }

/** Reuses existing survey title recognition; project leadership is added explicitly. */
export function monthlyRosterFromProject(project: GetGroupInfoResponse): MonthlySurveyMember[] {
    const members: MonthlySurveyMember[] = [];
    const visit = (team: GetGroupInfoResponse) => {
        for (const user of team.users ?? []) {
            if (user.active === false || user.attributes?.alumniAccount) continue;
            const title = user.attributes?.roles?.[team.pk] ?? "";
            const titles = title.toLowerCase().split(/\s*(?:,|\/|&|\band\b)\s*/).map(t => t.trim());
            const roles: string[] = [];
            if (titles.includes("project lead")) roles.push("project_lead");
            if (isSurveyTechLead(title)) roles.push("tech_lead");
            if (isSurveyEngineer([title])) roles.push("engineer");
            members.push({ userPk: String(user.pk), roles });
        }
        for (const child of team.subteams ?? []) visit(child);
    };
    visit(project);
    return members;
}

export async function loadMonthlySurveyRosters(season: SurveySeason): Promise<SurveyProjectRoster[]> {
    const client = new AuthentikClient();
    const loadTree = async (pk: string): Promise<GetGroupInfoResponse> => {
        const team = await client.getGroupInfo(pk, { disableSubteamMemberPopulate: true });
        team.subteams = [];
        for (const childPk of team.subteamPkList ?? []) team.subteams.push(await loadTree(childPk));
        return team;
    };
    const projects: SurveyProjectRoster[] = [];
    let cursor: string | undefined;
    do {
        const page = await client.getGroupsList({ limit: 100, ...(cursor ? { cursor } : {}) });
        for (const team of page.teams) {
            if (team.teamType !== TeamType.PROJECT || team.archivedAt || team.flaggedForDeletion ||
                team.seasonType !== season.seasonType || Number(team.seasonYear) !== season.seasonYear) continue;
            const project = await loadTree(team.pk);
            // Recheck after loading details, in case archiving raced the list request.
            if (project.attributes.archivedAt || project.attributes.flaggedForDeletion) continue;
            projects.push({ projectPk: project.pk, members: monthlyRosterFromProject(project) });
        }
        cursor = page.nextCursor;
    } while (cursor);
    return projects;
}
