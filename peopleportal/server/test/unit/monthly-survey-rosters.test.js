const assert = require('node:assert/strict');
const { test } = require('node:test');
const { monthlyRosterFromProject, loadMonthlySurveyRosters } = require('../../dist/utils/monthly-survey-rosters');
const authentik = require('../../dist/clients/AuthentikClient');
const user = (pk, team, title, extra = {}) => ({ pk, active: true, attributes: { roles: { [team]: title } }, ...extra });

test('roster adapter preserves per-team role recognition and excludes inactive/alumni', () => {
  const members = monthlyRosterFromProject({ pk: 'p', users: [user(1, 'p', 'Project Lead')], subteams: [
    { pk: 'eng', users: [user(2, 'eng', 'Software Engineer'), user(3, 'eng', 'Designer'),
      user(4, 'eng', 'Engineer', { active: false }),
      user(5, 'eng', 'Engineer', { attributes: { alumniAccount: true, roles: { eng: 'Engineer' } } })], subteams: [] },
    { pk: 'lead', users: [user(6, 'lead', 'Technical Lead')], subteams: [] },
  ] });
  assert.deepEqual(members, [
    { userPk: '1', roles: ['project_lead'] }, { userPk: '2', roles: ['engineer'] },
    { userPk: '3', roles: [] }, { userPk: '6', roles: ['tech_lead'] },
  ]);
});

test('roster loader pages projects, filters season/archive, and loads nested subteams', async t => {
  const pages = []; const loaded = [];
  t.mock.method(authentik, 'AuthentikClient', function () {
    this.getGroupsList = async options => {
      pages.push(options);
      return options.cursor ? { teams: [{ pk: 'p', teamType: 'PROJECT', seasonType: 'FALL', seasonYear: 2026 }] } : {
        teams: [{ pk: 'old', teamType: 'PROJECT', seasonType: 'SPRING', seasonYear: 2026 },
          { pk: 'archived', teamType: 'PROJECT', seasonType: 'FALL', seasonYear: 2026, archivedAt: 'date' }], nextCursor: 'next',
      };
    };
    this.getGroupInfo = async pk => {
      loaded.push(pk);
      return { pk, attributes: {}, subteamPkList: pk === 'p' ? ['child'] : pk === 'child' ? ['nested'] : [],
        users: pk === 'nested' ? [user(9, 'nested', 'Engineer')] : [] };
    };
  });
  assert.deepEqual(await loadMonthlySurveyRosters({ seasonType: 'FALL', seasonYear: 2026 }), [
    { projectPk: 'p', members: [{ userPk: '9', roles: ['engineer'] }] },
  ]);
  assert.equal(pages[1].cursor, 'next'); assert.deepEqual(loaded, ['p', 'child', 'nested']);
});
