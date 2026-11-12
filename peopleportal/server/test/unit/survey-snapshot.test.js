const assert = require('node:assert/strict');
const test = require('node:test');
const { withSnapshot } = require('../helpers/survey-snapshot');
const { loadSurveySnapshot } = require('../../dist/utils/survey-snapshot');
test('loads only the selected saved project/semester with canonical roster identities', async () => withSnapshot(async () => {
  const result = await loadSurveySnapshot('run-a','p','FALL-2025');
  assert.equal(result.runId,'run-a'); assert.match(result.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(result.members.map(m=>m.pk),[1,2,3,4,5]);
  assert.equal(result.members[4].eligible,false);
}));
for (const [name, mutate] of [
  ['incomplete run', d=>{d.run.status='incomplete';}],
  ['membership from another run', d=>{d.membershipRunId='other';}],
  ['missing membership', d=>{delete d.projects;}],
  ['incomplete membership', d=>{d.membershipComplete=false;}],
  ['wrong roster count', d=>{d.run.persisted_counts.member_roster_snapshot=100;}],
  ['missing roster user', d=>{d.projects[0].memberships[0].authentik_user_pk='999';}],
  ['missing roles', d=>{d.projects[0].memberships[0].roles=[];}],
  ['duplicate roster ID', d=>{d.roster[1].authentik_user_pk='1';}],
  ['snapshot before semester end', d=>{d.projects[0].endedAt='2026-02-01T00:00:00Z';}],
]) test(`rejects ${name} without a live fallback`, async()=>withSnapshot(async({data,write})=>{
  mutate(data); await write(data); await assert.rejects(()=>loadSurveySnapshot('run-a','p','FALL-2025'),{status:503});
}));
test('rejects wrong project or semester, missing files, and path traversal',async()=>withSnapshot(async()=>{
  await assert.rejects(()=>loadSurveySnapshot('run-a','other','FALL-2025'),{status:409});
  await assert.rejects(()=>loadSurveySnapshot('run-a','p','SPRING-2025'),{status:409});
  await assert.rejects(()=>loadSurveySnapshot('absent','p','FALL-2025'),{status:503});
  await assert.rejects(()=>loadSurveySnapshot('../run-a','p','FALL-2025'),{status:400});
}));
