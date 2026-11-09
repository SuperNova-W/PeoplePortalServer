# T3.1 change report — November 5, 2026

## Requested correction

Yash confirmed that engineers should rate tech leads, tech leads should not rate
themselves or each other, and assignment generation should use Track 1's saved
snapshots. The previous implementation read live People Portal/Authentik data
and allowed every active project member to respond.

## What changed and how

1. **Engineer-only respondents.** `utils/survey-assignments.ts` now separates
   respondent eligibility from rated-lead eligibility. It recognizes explicit
   engineering/developer titles, excludes leadership and unknown titles, and
   lets tech-lead status override an engineer title. Duplicate records cannot
   reintroduce a leader as a respondent. Eligible engineers are paired with
   every eligible tech lead within the selected saved project/semester.

2. **Live assignment-data reads removed.** `SurveyController.ts` no longer calls
   Authentik to fetch the project, subteams, users, roles, or semester. Its POST
   body now requires both `semester` and `snapshotRunId`.

3. **Saved snapshot consumer added.** `utils/survey-snapshot.ts` reads a trusted
   local JSON export, validates completed-run provenance and roster counts,
   and resolves saved project memberships against canonical roster IDs. It
   rejects incomplete exports, cross-run data, missing roles, missing members,
   duplicate IDs, mismatched project/semester, and invalid capture/end dates.
   No export/configuration means an explicit 503 response. It never fetches
   live data to fill missing fields.

4. **Assignments retain source evidence.** `models/SurveyAssignment.ts` adds
   the source run ID, export hash, and roster retrieval time. Existing compound
   unique indexing still prevents duplicate pairings. Insert-only writes
   preserve creation metadata when rerun.

5. **Runs cannot mix.** `models/SurveyAssignmentBatch.ts` adds one unique batch
   per project/semester. Atomic insert-if-absent pins the run/hash before any
   assignment writes. Concurrent requests for another snapshot receive 409.
   The pin also exists when no assignments are generated.

6. **Old assignments require review.** Existing rows without snapshot provenance
   block regeneration with 409 and are hidden from members. Nothing is deleted
   automatically. This avoids presenting assignments from the old live-data
   rules as if they satisfied Yash's updated requirements.

7. **Tests and API definitions updated.** Unit and real MongoDB integration
   coverage now use saved snapshot fixtures instead of mocked live rosters.
   Tsoa-generated routes reflect the required request body and preserve
   executive-only generation and signed-in member-only retrieval.

## The Track 1 dependency that remains

The fetched Track 1 branch currently saves a PostgreSQL roster with run ID,
member PK, username, email, display name, active flag, retrieval time and source.
It does not save project membership, role, semester, or project end date in that
roster. A project-membership snapshot/export producer was not found.

Consequently, **the consumer contract in this change is proposed, not an
already functioning Track 1 integration**. The JSON reader is a testable adapter
boundary. No production snapshot was available or used, and no fake production
snapshot was created. Track 1 must supply/confirm the membership fields and an
export path, or the reader must be adapted to its eventual table/API format.
The role vocabulary must also be checked against the actual export.

The full proposed contract, endpoint examples, eligibility rules, operational
behavior and migration notes are in `survey-assignments.md` beside this report.

## Example behavior

For a saved project with Alice (Engineer), Bob (Tech Lead), Carol (Tech Lead +
Engineer), and Dan (Project Lead), only Alice responds. She receives assignments
to rate Bob and Carol. Bob and Carol do not receive assignments to rate each
other. Dan is neither a respondent nor a rated tech lead.

## Delivery status

Implementation is on `feat/t3-1-survey-assignments`. On November 9, 2026,
the branch was prepared for publication to the personal fork at Yash's request.
The Track 1 integration dependency remains open. No production assignment
generation or Track 1 schema change is included.

## Verification results

- `./nx run pplserver:test`: build succeeded; 155 tests passed, 0 failed,
  0 skipped. This includes the existing server suite and the updated snapshot
  and real MongoDB tests.
- Prettier: the changed source files were formatted with the repository's pinned
  version 3.9.10.
- `git diff --check`: passed.
- Limits: no real Track 1 export was available; no live environment or frontend
  survey flow was exercised. T3.2 form/response capture remains outside this work.
