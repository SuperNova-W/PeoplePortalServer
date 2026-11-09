# T3.1 — Engineer-to-tech-lead survey assignments

## Current integration status

The pairing rules and snapshot consumer are implemented and tested. The real
Track 1 project-membership export is still a dependency, so this is not yet a
verified connection to production Track 1 data.

Inspection of `upstream/feat/horizon-identity-pull-requests` shows that Track 1
persists `horizon_gt_features.member_roster_snapshot`, keyed by `run_id` and
`authentik_user_pk`, and marks completed runs in `pipeline_runs`. The roster
contains identity and active status. It does **not** contain project membership,
roles, semester, or project end dates. No existing membership snapshot table or
export was found in that branch. These facts must come from Track 1; they must
not be inferred from Git activity or fetched live during survey generation.

The JSON format below is a **proposed export contract** for connecting these
sources. It is not an output Track 1 already produces. The consumer returns
503 until an export is configured; there is no Authentik fallback.

## Respondent rules

An active engineer/developer in the selected project's saved membership rates
each active tech lead in that same project. Tech leads cannot rate themselves
or other tech leads. A tech-lead role takes precedence over an engineering
role, including roles recorded on separate memberships. Project leads are not
respondents, and project-lead-only people are not rated. A dual project/tech
lead may be rated as a tech lead.

Accepted respondent titles are Engineer or Developer, optionally preceded by
Software, Frontend, Backend, Full Stack, Full-Stack, Mobile, Data, ML, Machine
Learning, or DevOps. Titles are case-insensitive. Tech Lead and Technical Lead
identify rated leads. Combined titles may use commas, `/`, `&`, or `and`.
Unknown titles are excluded, not assumed to mean engineer. Confirm this title
mapping against Track 1's real role vocabulary when its export is available.

## Snapshot export contract (proposed, version 1)

Set `PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR` to a trusted, read-only export directory.
The service reads `<snapshotRunId>.json`; run IDs cannot contain path separators.
Only administrators/Track 1 infrastructure should be able to write this folder.
Roster field names mirror the current PostgreSQL table. The project membership
fields below need agreement and a producer on the Track 1 side.

```json
{
  "schemaVersion": 1,
  "run": {
    "run_id": "semester-end-run",
    "status": "complete",
    "completed_at": "2026-01-02T00:00:00Z",
    "roster_retrieved_at": "2026-01-01T12:00:00Z",
    "persisted_counts": { "member_roster_snapshot": 2 }
  },
  "membershipRunId": "semester-end-run",
  "membershipComplete": true,
  "roster": [
    { "run_id": "semester-end-run", "authentik_user_pk": "1", "is_active": true },
    { "run_id": "semester-end-run", "authentik_user_pk": "2", "is_active": true }
  ],
  "projects": [{
    "projectPk": "project-id",
    "semester": "FALL-2025",
    "teamType": "PROJECT",
    "endedAt": "2025-12-20T00:00:00Z",
    "memberships": [
      { "authentik_user_pk": "1", "roles": ["Engineer"] },
      { "authentik_user_pk": "2", "roles": ["Tech Lead"] }
    ]
  }]
}
```

The export must explicitly state that membership is complete and belongs to the
same run as the roster. The roster row count must match the run manifest; IDs
must be unique and every membership must resolve to a roster member. Project
membership roles must be consolidated into one row per person. The selected
project/semester must exist exactly once. The saved project end timestamp must
be at or before the roster capture timestamp, which must be at or before run
completion; these timestamps cannot be in the future. A missing or malformed
snapshot is an error, not an empty success.

## API and persistence

An executive generates assignments using:

```http
POST /api/surveys/projects/{projectPk}/assignments
Content-Type: application/json

{"semester":"FALL-2025","snapshotRunId":"semester-end-run"}
```

The caller selects a saved run explicitly; the service never chooses the newest
run implicitly. The requested semester must match the saved project record.
Assignments keep their original compound unique key: semester, project,
respondent, rated lead. They now also retain the source run ID, SHA-256 of the
export bytes, and roster retrieval timestamp.

A separate uniquely indexed batch record pins one project/semester to one
run/hash, including batches with zero assignments. This prevents concurrent
requests using different snapshots from mixing results. Same-snapshot reruns
are idempotent and can finish an interrupted generation. The API returns only
after all writes complete; it does not use multi-document transactions.

A different snapshot, changed file contents under the same run ID, or existing
legacy assignments from the previous live-data implementation returns 409 and
requires explicit review. No records are deleted automatically. Legacy rows
are hidden from the member-facing listing to avoid displaying old lead-to-lead
assignments. No live deployment/migration has been performed by this change.

```http
GET /api/surveys/assignments/mine?semester=FALL-2025
```

Listing is OIDC-protected, binds the respondent to the session, and returns only
assignments with snapshot provenance. Existing executive permissions protect
generation. Authentication may contact identity services; assignment generation
itself does not fetch live roster, role, or membership data.

## Verification

Run `./nx run pplserver:test` from the repository root. Tests cover engineer-only
rules, leadership precedence, duplicate identities, missing/incomplete/wrong
snapshot data, wrong semester/project, roster count mismatches, no live-data
fallback, MongoDB persistence, concurrent generation, snapshot pinning, legacy
row protection, and member-scoped listing. The survey form, answers, and scoring
remain T3.2–T3.4.
