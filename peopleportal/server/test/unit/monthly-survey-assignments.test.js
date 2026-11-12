const assert = require('node:assert/strict');
const test = require('node:test');
const { buildMonthlySurveyAssignments: build } = require('../../dist/utils/monthly-survey-assignments');

const member = (userPk, ...roles) => ({ userPk, roles });
const input = (members) => ({ roundId: 'fall-2026-11', projectPk: 'project-42', members });
const engineerKeys = ['eng_quality', 'eng_ownership', 'eng_initiative', 'eng_design', 'eng_collaboration'];
const techLeadKeys = ['lead_organization', 'lead_guidance', 'lead_design', 'lead_momentum', 'lead_communication'];
const projectLeadKeys = ['pl_organization', 'pl_priorities', 'pl_support', 'pl_delivery', 'pl_communication'];
const roster = [
  member('pl', 'project_lead'), member('tl1', 'tech_lead'), member('tl2', 'tech_lead'),
  ...['e1', 'e2', 'e3', 'e4'].map(pk => member(pk, 'engineer')),
  member('pm', 'pm'), member('designer', 'designer'), member('unknown', 'unknown'),
];

test('full roster yields exactly the 24 expected pairs and question sets', () => {
  const actual = build(input(roster));
  const expected = [];
  const add = (respondentPk, respondentRole, rateePk, rateeRole, questionKeys) => expected.push({
    roundId: 'fall-2026-11', projectPk: 'project-42',
    respondentPk, respondentRole, rateePk, rateeRole, questionKeys,
  });
  for (const engineer of ['e1', 'e2', 'e3', 'e4']) {
    for (const tl of ['tl1', 'tl2']) {
      add(engineer, 'engineer', tl, 'tech_lead', techLeadKeys);
      add(tl, 'tech_lead', engineer, 'engineer', engineerKeys);
    }
    add(engineer, 'engineer', 'pl', 'project_lead', projectLeadKeys);
  }
  for (const tl of ['tl1', 'tl2']) {
    add(tl, 'tech_lead', 'pl', 'project_lead', projectLeadKeys);
    add('pl', 'project_lead', tl, 'tech_lead', techLeadKeys.filter(key => key !== 'lead_guidance'));
  }
  expected.sort((a, b) => a.respondentPk < b.respondentPk ? -1 :
    a.respondentPk > b.respondentPk ? 1 : a.rateePk < b.rateePk ? -1 : 1);
  assert.equal(actual.length, 24);
  assert.deepEqual(actual, expected);
  assert.ok(actual.every(a => a.respondentPk !== a.rateePk));
});

test('duplicate memberships merge before role precedence; no self or duplicate pairs', () => {
  const members = [
    member('a', 'engineer'), member('a', 'tech_lead'), member('a', 'project_lead'),
    member('b', 'engineer', 'tech_lead'), member('b', 'engineer'), member('c', 'engineer'),
  ];
  const actual = build(input(members));
  assert.deepEqual(actual.map(a => [a.respondentPk, a.rateePk]), [
    ['a', 'b'], ['b', 'a'], ['b', 'c'], ['c', 'a'], ['c', 'b'],
  ]);
  assert.ok(actual.filter(a => a.respondentPk === 'a').every(a => a.respondentRole === 'project_lead'));
  assert.ok(actual.filter(a => a.respondentPk === 'b').every(a => a.respondentRole === 'tech_lead'));
  assert.deepEqual(build(input([...members].reverse())), actual);
});

test('empty, excluded, single-member and engineer-only rosters yield no assignments', () => {
  for (const members of [[], [member('a', 'pm')], [member('a', 'engineer')],
    [member('a', 'engineer'), member('b', 'engineer')], [member('a', 'Engineer')]]) {
    assert.deepEqual(build(input(members)), []);
  }
});

test('input remains unchanged and repeated calls return independent results', () => {
  const frozen = Object.freeze(roster.map(m => Object.freeze({ ...m, roles: Object.freeze([...m.roles]) })));
  const first = build(input(frozen));
  const second = build(input(frozen));
  assert.deepEqual(first, second);
  assert.deepEqual(build(input([...frozen].reverse())), second);
  first[0].questionKeys.pop();
  assert.deepEqual(build(input(frozen)), second);
});

test('rejects missing scope and invalid string identities', () => {
  for (const field of ['roundId', 'projectPk']) {
    for (const value of ['', ' ', undefined]) {
      assert.throws(() => build({ ...input([]), [field]: value }));
    }
  }
  for (const pk of ['', ' ', ' 123 ', 123, null]) {
    assert.throws(() => build(input([member(pk, 'engineer')])));
  }
});
