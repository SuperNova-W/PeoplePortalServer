const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SurveyRound } = require('../../dist/models/SurveyRound');
const { MonthlySurveyAssignment } = require('../../dist/models/MonthlySurveyAssignment');
const { SurveyRoundService } = require('../../dist/services/SurveyRoundService');
const { monthlySurveyWindow, surveySeasonAt } = require('../../dist/utils/survey-round-dates');
const { registerMonthlySurveyJobs, OPEN_SURVEY_JOB, CLOSE_SURVEY_JOB, RECOVER_SURVEYS_JOB } = require('../../dist/clients/AgendaClient/monthlySurveys');
const request = { seasonType: 'FALL', seasonYear: 2026, month: '2026-11' };
const rosters = [{ projectPk: 'p', members: [
  { userPk: 'e', roles: ['engineer'] }, { userPk: 't', roles: ['tech_lead'] },
  { userPk: 'l', roles: ['project_lead'] },
] }];

function memory(t) {
  const rounds = []; const assignments = [];
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.entries(value).every(([op, right]) =>
        op === '$lte' ? row[key] <= right : op === '$gt' ? row[key] > right :
        op === '$ne' ? row[key] !== right : false);
    }
    return row[key] === value;
  });
  const stub = (model, key, fn) => t.mock.method(model, key, fn);
  stub(SurveyRound, 'init', async () => {});
  stub(MonthlySurveyAssignment, 'init', async () => {});
  stub(SurveyRound, 'findOneAndUpdate', async (filter, update) => {
    let row = rounds.find(row => matches(row, filter));
    if (!row) { row = { ...update.$setOnInsert }; rounds.push(row); }
    return { ...row };
  });
  stub(SurveyRound, 'findOne', async filter => {
    const row = rounds.find(row => matches(row, filter)); return row ? { ...row } : null;
  });
  stub(SurveyRound, 'find', async filter => rounds.filter(row => matches(row, filter)).map(row => ({ ...row })));
  stub(SurveyRound, 'updateOne', async (filter, update) => {
    const row = rounds.find(row => matches(row, filter)); if (row) Object.assign(row, update.$set);
  });
  stub(SurveyRound, 'updateMany', async (filter, update) => {
    rounds.filter(row => matches(row, filter)).forEach(row => Object.assign(row, update.$set));
  });
  stub(MonthlySurveyAssignment, 'updateOne', async (filter, update, options) => {
    assert.equal(options.timestamps, false);
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    if (assignments.some(row => matches(row, filter))) return { upsertedCount: 0 };
    assignments.push({ ...update.$setOnInsert }); return { upsertedCount: 1 };
  });
  stub(MonthlySurveyAssignment, 'countDocuments', async filter => assignments.filter(row => matches(row, filter)).length);
  return { rounds, assignments };
}

function fixture(t, overrides = {}) {
  const db = memory(t); const scheduled = [];
  const deps = { now: () => new Date('2026-11-24T05:00:00Z'),
    loadRosters: async () => rosters,
    scheduleClose: async (...args) => { scheduled.push(args); }, ...overrides };
  return { ...db, scheduled, deps, service: new SurveyRoundService(deps) };
}

test('calendar windows use New York midnight and seven calendar days, including month rollover', () => {
  const november = monthlySurveyWindow('2026-11');
  assert.equal(november.opensAt.toISOString(), '2026-11-24T05:00:00.000Z');
  assert.equal(november.closesAt.toISOString(), '2026-12-01T05:00:00.000Z');
  assert.equal(monthlySurveyWindow('2027-02').closesAt.toISOString(), '2027-03-03T05:00:00.000Z');
  assert.equal(monthlySurveyWindow('2026-06').opensAt.toISOString(), '2026-06-24T04:00:00.000Z');
  assert.throws(() => monthlySurveyWindow('2026-13'), { status: 400 });
  assert.deepEqual(surveySeasonAt(new Date('2027-01-01T02:00:00Z')), { seasonType: 'FALL', seasonYear: 2026 });
});

test('creation and regeneration are insert-only and preserve submitted records', async t => {
  const { service, rounds, assignments } = fixture(t);
  const first = await service.createRound(request, true);
  assert.equal(first.status, 'open'); assert.equal(first.assignmentCount, 5); assert.equal(first.insertedCount, 5);
  assignments[0].status = 'submitted'; assignments[0].submittedAt = new Date();
  const submitted = structuredClone(assignments[0]);
  assert.equal((await service.createRound(request, true)).insertedCount, 0);
  assert.equal((await service.regenerateAssignments(first.roundId)).insertedCount, 0);
  assert.deepEqual(assignments[0], submitted); assert.equal(rounds.length, 1);
  assert.deepEqual(await service.closeRound(first.roundId), await service.closeRound(first.roundId));
  assert.equal((await service.createRound(request, true)).status, 'closed');
  await assert.rejects(() => service.regenerateAssignments(first.roundId), { status: 409 });
  await assert.rejects(() => service.closeRound('missing'), { status: 404 });
});

test('retry after a partially failed assignment write fills only missing pairs', async t => {
  const f = fixture(t); const original = MonthlySurveyAssignment.updateOne; let writes = 0;
  MonthlySurveyAssignment.updateOne = async (...args) => {
    if (++writes === 3) throw new Error('temporary failure'); return original(...args);
  };
  await assert.rejects(() => f.service.createRound(request, true), /temporary failure/);
  assert.equal(f.rounds[0].status, 'scheduled'); assert.equal(f.assignments.length, 2);
  MonthlySurveyAssignment.updateOne = original;
  const retry = await f.service.createRound(request, true);
  assert.equal(retry.status, 'open'); assert.equal(retry.insertedCount, 3); assert.equal(f.assignments.length, 5);
});

test('manual create opens now, keeps original dates on retry, and spans DST in calendar days', async t => {
  const f = fixture(t, { now: () => new Date('2026-10-30T16:00:00Z') });
  const result = await f.service.createRound({ ...request, month: '2026-10' });
  assert.equal(result.opensAt.toISOString(), '2026-10-30T16:00:00.000Z');
  assert.equal(result.closesAt.toISOString(), '2026-11-06T17:00:00.000Z');
  f.deps.now = () => new Date('2026-10-31T16:00:00Z');
  assert.equal((await f.service.createRound({ ...request, month: '2026-10' })).closesAt.getTime(), result.closesAt.getTime());
  await assert.rejects(() => f.service.createRound(request), { status: 400 });
});

test('regeneration adds newly eligible pairs and rejects expired or mismatched-version rounds', async t => {
  const f = fixture(t); const result = await f.service.createRound(request, true);
  f.deps.loadRosters = async () => [{ ...rosters[0], members: [...rosters[0].members, { userPk: 'e2', roles: ['engineer'] }] }];
  assert.equal((await f.service.regenerateAssignments(result.roundId)).insertedCount, 3);
  f.rounds[0].surveyVersion = 'older';
  await assert.rejects(() => f.service.regenerateAssignments(result.roundId), { status: 409 });
  f.rounds[0].surveyVersion = '2026-11-v1'; f.deps.now = () => new Date('2026-12-01T05:00:00Z');
  await assert.rejects(() => f.service.regenerateAssignments(result.roundId), { status: 409 });
});

test('Agenda registers timezone cron, unique closing jobs and recovery; fake clock executes opening and closing', async t => {
  const { assignments, rounds } = memory(t);
  const handlers = {}; const repeating = []; const closing = [];
  const fakeAgenda = {
    define: (name, worker) => { handlers[name] = worker; },
    every: async (...args) => repeating.push(args),
    create: (name, data) => {
      const record = { name, data }; closing.push(record);
      const job = { unique: (filter, options) => { record.filter = filter; record.options = options; return job; },
        schedule: date => { record.date = date; return job; }, save: async () => {} };
      return job;
    },
  };
  const rosterModule = require('../../dist/utils/monthly-survey-rosters');
  t.mock.method(rosterModule, 'loadMonthlySurveyRosters', async () => rosters);
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-24T05:00:00Z') });
  await registerMonthlySurveyJobs(fakeAgenda);
  assert.deepEqual(repeating[0], ['0 0 24 * *', OPEN_SURVEY_JOB, {}, { timezone: 'America/New_York', skipImmediate: true }]);
  assert.equal(repeating[1][1], RECOVER_SURVEYS_JOB);
  await handlers[OPEN_SURVEY_JOB](); assert.equal(assignments.length, 5);
  assert.deepEqual(closing[0].filter, { name: CLOSE_SURVEY_JOB, 'data.roundId': 'fall-2026-11' });
  assert.deepEqual(closing[0].options, { insertOnly: true });
  t.mock.timers.setTime(new Date('2026-12-01T05:00:00Z').getTime());
  await handlers[CLOSE_SURVEY_JOB]({ attrs: { data: closing[0].data } });
  assert.equal(rounds[0].status, 'closed');
});

test('recovery retries missed opening and closes expired rounds', async t => {
  const { rounds } = memory(t);
  const { recoverSurveyRounds } = require('../../dist/clients/AgendaClient/monthlySurveys');
  const created = [];
  const service = { createRound: async (...args) => created.push(args) };
  await recoverSurveyRounds(service, new Date('2026-11-25T12:00:00Z'));
  assert.deepEqual(created, [[request, true]]);
  rounds.push({ roundId: 'expired', status: 'open', closesAt: new Date('2026-11-01') });
  await recoverSurveyRounds(service, new Date('2026-11-25T12:00:00Z'));
  assert.equal(rounds[0].status, 'closed');
});

test('concurrent creation keeps one round and one assignment per pair', async t => {
  const f = fixture(t);
  await Promise.all(Array.from({ length: 3 }, () => f.service.createRound(request, true)));
  assert.equal(f.rounds.length, 1); assert.equal(f.assignments.length, 5);
  assert.equal(f.rounds[0].status, 'open');
});

test('recovery does not repeatedly regenerate an already-open or manually-closed round', async t => {
  const f = fixture(t);
  await f.service.createRound(request, true);
  const { recoverSurveyRounds } = require('../../dist/clients/AgendaClient/monthlySurveys');
  const unexpected = { createRound: async () => { throw new Error('Must not regenerate an existing round'); } };
  await recoverSurveyRounds(unexpected, new Date('2026-11-25T12:00:00Z'));
  f.rounds[0].status = 'closed';
  await recoverSurveyRounds(unexpected, new Date('2026-11-25T12:00:00Z'));
});
