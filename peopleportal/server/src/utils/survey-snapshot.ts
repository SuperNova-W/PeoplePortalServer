import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ResourceAccessError } from "./errors";
import { SurveyMember } from "./survey-assignments";

export interface SurveyProjectSnapshot {
    runId: string;
    sha256: string;
    retrievedAt: string;
    members: SurveyMember[];
}

/**
 * Consumer contract for an exported Track 1 snapshot. Roster fields mirror
 * member_roster_snapshot. Project membership export is a pending Track 1 dependency;
 * no producer currently writes it. Never fall back to Authentik.
 */
export async function loadSurveySnapshot(
    runId: string,
    projectPk: string,
    semester: string,
): Promise<SurveyProjectSnapshot> {
    const directory = process.env.PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR;
    if (!directory)
        throw new ResourceAccessError(
            503,
            "Track 1 snapshot exports are not configured",
        );
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(runId))
        throw new ResourceAccessError(400, "Invalid snapshot run ID");
    let bytes: Buffer;
    try {
        bytes = await readFile(join(directory, `${runId}.json`));
    } catch {
        throw new ResourceAccessError(
            503,
            "The requested saved Track 1 snapshot is unavailable",
        );
    }
    try {
        const data = JSON.parse(bytes.toString("utf8"));
        const validTime = (value: unknown): value is string =>
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
            Number.isFinite(Date.parse(value)) &&
            Date.parse(value) <= Date.now();
        if (
            data.schemaVersion !== 1 ||
            data.run?.run_id !== runId ||
            data.run.status !== "complete" ||
            !validTime(data.run.completed_at) ||
            !validTime(data.run.roster_retrieved_at) ||
            data.membershipRunId !== runId ||
            data.membershipComplete !== true ||
            !Array.isArray(data.roster) ||
            !Array.isArray(data.projects)
        )
            throw new Error();
        if (
            Date.parse(data.run.roster_retrieved_at) >
            Date.parse(data.run.completed_at)
        )
            throw new Error();
        const roster = new Map<number, boolean>();
        for (const row of data.roster) {
            const pk = Number(row.authentik_user_pk);
            if (
                row.run_id !== runId ||
                !Number.isSafeInteger(pk) ||
                pk <= 0 ||
                roster.has(pk) ||
                typeof row.is_active !== "boolean"
            )
                throw new Error();
            roster.set(pk, row.is_active);
        }
        if (
            !roster.size ||
            data.run.persisted_counts?.member_roster_snapshot !== roster.size
        )
            throw new Error();
        const projects = data.projects.filter(
            (project: any) =>
                project.projectPk === projectPk &&
                project.semester === semester,
        );
        if (projects.length !== 1)
            throw new ResourceAccessError(
                409,
                "The snapshot must contain exactly one matching project and semester",
            );
        const project = projects[0];
        if (
            project.teamType !== "PROJECT" ||
            !validTime(project.endedAt) ||
            !Array.isArray(project.memberships) ||
            Date.parse(project.endedAt) >
                Date.parse(data.run.roster_retrieved_at)
        )
            throw new Error();
        const members: SurveyMember[] = [];
        const seen = new Set<number>();
        for (const membership of project.memberships) {
            const pk = Number(membership.authentik_user_pk);
            if (
                !roster.has(pk) ||
                seen.has(pk) ||
                !Array.isArray(membership.roles) ||
                !membership.roles.length ||
                membership.roles.some(
                    (role: unknown) => typeof role !== "string" || !role.trim(),
                )
            )
                throw new Error();
            seen.add(pk);
            members.push({
                pk,
                eligible: roster.get(pk)!,
                roles: membership.roles,
            });
        }
        return {
            runId,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            retrievedAt: data.run.roster_retrieved_at,
            members,
        };
    } catch (error) {
        if (error instanceof ResourceAccessError) throw error;
        throw new ResourceAccessError(
            503,
            "The saved snapshot is incomplete or invalid; roster, project membership, roles and semester are required",
        );
    }
}
