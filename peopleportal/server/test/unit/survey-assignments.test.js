const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSurveyPairings, isSurveyEngineer } = require('../../dist/utils/survey-assignments.js');
const member = (pk, roles = ['Engineer'], eligible = true) => ({ pk, roles, eligible });
test('engineers rate every tech lead; leaders, inactive members and unknown roles do not respond', () => {
  const pairs = buildSurveyPairings('FALL-2025', 'p', [member(1), member(2,['Tech Lead','Engineer']), member(3,['Project Lead']), member(4,['Technical Lead']), member(5,['Engineer'],false), member(6,['Designer'])]);
  assert.deepEqual(pairs.map(p => [p.respondentPk,p.techLeadPk]), [[1,2],[1,4]]);
});
test('separate duplicate memberships cannot let a lead respond as an engineer', () => {
  const members = [member(1), member(1), member(2,['Engineer']), member(2,['Tech Lead'])];
  const expected = [{semester:'FALL-2025',projectPk:'p',respondentPk:1,techLeadPk:2}];
  assert.deepEqual(buildSurveyPairings('FALL-2025','p',members), expected);
  assert.deepEqual(buildSurveyPairings('FALL-2025','p',members.reverse()), expected);
});
test('only explicit engineering titles qualify and leadership wins over combined roles', () => {
  for (const roles of [['Engineer'], ['Software Engineer'], ['Backend Developer']]) assert.equal(isSurveyEngineer(roles),true);
  for (const roles of [[],['Member'],['Engineering Manager'],['Tech Lead / Engineer'],['Engineer and Project Lead']]) assert.equal(isSurveyEngineer(roles),false);
});
test('missing scope and invalid identities are rejected; no leads yields no assignments', () => {
  assert.deepEqual(buildSurveyPairings('FALL-2025','p',[member(1)]),[]);
  assert.throws(()=>buildSurveyPairings('', 'p', []));
  assert.throws(()=>buildSurveyPairings('FALL-2025','',[]));
  assert.throws(()=>buildSurveyPairings('FALL-2025','p',[member(NaN)]));
});
