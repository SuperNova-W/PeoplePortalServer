const assert = require('node:assert/strict');
const test = require('node:test');
const { SurveyRound } = require('../../dist/models/SurveyRound');
const { MonthlySurveyAssignment } = require('../../dist/models/MonthlySurveyAssignment');
const { SurveyResponse } = require('../../dist/models/SurveyResponse');

const scope = {
  roundId: 'fall-2026-11', projectPk: 'project-42',
  respondentPk: '123', respondentRole: 'engineer',
  rateePk: '456', rateeRole: 'tech_lead',
};
const response = (answers) => new SurveyResponse({
  ...scope, assignmentId: '507f1f77bcf86cd799439011',
  answers, submittedAt: new Date('2026-11-26T19:30:00Z'),
});

test('round defaults and calendar month validation', () => {
  const round = new SurveyRound({
    roundId: scope.roundId, seasonType: 'FALL', seasonYear: 2026,
    month: '2026-11', opensAt: new Date('2026-11-24T05:00:00Z'),
    closesAt: new Date('2026-12-01T05:00:00Z'), surveyVersion: '2026-11-v1',
  });
  assert.equal(round.validateSync(), undefined);
  assert.equal(round.status, 'scheduled');
  round.month = '2026-13';
  assert.ok(round.validateSync());
});

test('monthly assignment defaults and unique question keys', () => {
  const assignment = new MonthlySurveyAssignment({ ...scope, questionKeys: ['lead_guidance'] });
  assert.equal(assignment.validateSync(), undefined);
  assert.equal(assignment.status, 'pending');
  assert.equal(assignment.submittedAt, null);
  assignment.questionKeys = ['lead_guidance', 'lead_guidance'];
  assert.ok(assignment.validateSync());
  assignment.questionKeys = [];
  assert.ok(assignment.validateSync());
});

test('responses accept all scores and explicit N/A but reject missing or invalid scores', () => {
  for (const value of [1, 2, 3, null]) {
    assert.equal(response([{ questionKey: 'lead_guidance', value }]).validateSync(), undefined);
  }
  for (const value of [undefined, 0, 4, 1.5]) {
    assert.ok(response([{ questionKey: 'lead_guidance', value }]).validateSync());
  }
  assert.ok(response([]).validateSync());
  assert.ok(response([
    { questionKey: 'lead_guidance', value: 1 },
    { questionKey: 'lead_guidance', value: 2 },
  ]).validateSync());
});

test('survey models declare their uniqueness constraints', () => {
  for (const [model, keys] of [
    [SurveyRound, { seasonType: 1, seasonYear: 1, month: 1 }],
    [MonthlySurveyAssignment, { roundId: 1, projectPk: 1, respondentPk: 1, rateePk: 1 }],
    [SurveyResponse, { assignmentId: 1 }],
  ]) {
    assert.ok(model.schema.indexes().some(([index, options]) =>
      JSON.stringify(index) === JSON.stringify(keys) && options.unique));
  }
});
