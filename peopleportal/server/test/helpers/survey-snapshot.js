const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
function fixture(runId = 'run-a') {
  return {
    schemaVersion: 1,
    run: { run_id: runId, status: 'complete', completed_at: '2026-01-02T00:00:00Z', roster_retrieved_at: '2026-01-01T12:00:00Z', persisted_counts: { member_roster_snapshot: 6 } },
    membershipRunId: runId, membershipComplete: true,
    roster: [1,2,3,4,5,6].map(pk => ({ run_id: runId, authentik_user_pk: String(pk), is_active: pk !== 5 })),
    projects: [{ projectPk: 'p', semester: 'FALL-2025', teamType: 'PROJECT', endedAt: '2025-12-20T00:00:00Z', memberships: [
      { authentik_user_pk: '1', roles: ['Software Engineer'] },
      { authentik_user_pk: '2', roles: ['Tech Lead', 'Engineer'] },
      { authentik_user_pk: '3', roles: ['Project Lead'] },
      { authentik_user_pk: '4', roles: ['Tech Lead'] },
      { authentik_user_pk: '5', roles: ['Engineer'] },
    ] }],
  };
}
async function withSnapshot(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'horizon-survey-'));
  const previous = process.env.PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR;
  process.env.PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR = dir;
  try {
    const data = fixture();
    await fs.writeFile(path.join(dir, 'run-a.json'), JSON.stringify(data));
    return await fn({ dir, data, write: async (value, runId = 'run-a') => fs.writeFile(path.join(dir, `${runId}.json`), JSON.stringify(value)) });
  } finally {
    if (previous === undefined) delete process.env.PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR;
    else process.env.PEOPLEPORTAL_SURVEY_SNAPSHOT_DIR = previous;
    await fs.rm(dir, { recursive: true, force: true });
  }
}
module.exports = { fixture, withSnapshot };
