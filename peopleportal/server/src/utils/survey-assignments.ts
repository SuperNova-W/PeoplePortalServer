/** A membership snapshot, restricted to one project and semester by the caller. */
export interface SurveyMember {
    pk: number;
    eligible: boolean;
    roles: string[];
}

export interface SurveyPairing {
    semester: string;
    projectPk: string;
    respondentPk: number;
    techLeadPk: number;
}

/** Match explicit role titles, never generic leadership group membership. */
export function isSurveyTechLead(role: string): boolean {
    return role
        .toLowerCase()
        .split(/\s*(?:,|\/|&|\band\b)\s*/)
        .some((title) => /^(tech|technical) lead$/.test(title.trim()));
}

/** Unknown roles are not assumed to be engineers. Leadership takes precedence. */
export function isSurveyEngineer(roles: string[]): boolean {
    const titles = roles.flatMap((role) =>
        role
            .toLowerCase()
            .split(/\s*(?:,|\/|&|\band\b)\s*/)
            .map((title) => title.trim()),
    );
    if (roles.some(isSurveyTechLead) || titles.includes("project lead"))
        return false;
    return titles.some((title) =>
        /^(?:(?:software|frontend|backend|full stack|full-stack|mobile|data|ml|machine learning|devops) )?(?:engineer|developer)$/.test(
            title,
        ),
    );
}

/** Deterministic, deduplicated Cartesian product without self-ratings. */
export function buildSurveyPairings(
    semester: string,
    projectPk: string,
    members: SurveyMember[],
): SurveyPairing[] {
    if (!/^(FALL|SPRING)-\d{4}$/.test(semester) || !projectPk.trim()) {
        throw new Error(
            "A semester (FALL-YYYY or SPRING-YYYY) and project are required",
        );
    }
    const respondents = new Set<number>();
    const leads = new Set<number>();
    for (const member of members) {
        if (!Number.isSafeInteger(member.pk) || member.pk <= 0) {
            throw new Error("Members must have a valid Authentik PK");
        }
        if (!member.eligible) continue;
        if (isSurveyEngineer(member.roles)) respondents.add(member.pk);
        if (member.roles.some(isSurveyTechLead)) leads.add(member.pk);
    }
    // A duplicate membership must not let a lead respond under another role.
    const leaders = new Set(
        members
            .filter(
                (member) =>
                    member.roles.some(isSurveyTechLead) ||
                    member.roles.some((role) =>
                        role
                            .toLowerCase()
                            .split(/\s*(?:,|\/|&|\band\b)\s*/)
                            .includes("project lead"),
                    ),
            )
            .map((member) => member.pk),
    );
    for (const pk of leaders) respondents.delete(pk);
    return [...respondents]
        .sort((a, b) => a - b)
        .flatMap((respondentPk) =>
            [...leads]
                .sort((a, b) => a - b)
                .filter((techLeadPk) => techLeadPk !== respondentPk)
                .map((techLeadPk) => ({
                    semester,
                    projectPk,
                    respondentPk,
                    techLeadPk,
                })),
        );
}
