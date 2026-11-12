const assert = require('node:assert/strict');
const { test } = require('node:test');
const { RegisterRoutes } = require('../../dist/routes');
const { OpenIdClient } = require('../../dist/clients/OpenIdClient');
const authentik = require('../../dist/clients/AuthentikClient');

// Exercise the actual generated route guards without opening a listening socket.
test('all three survey round endpoints require executive authorization', async t => {
  const paths = new Map();
  const app = new Proxy({}, { get: (_, method) => (path, ...handlers) => {
    if (method === 'post') paths.set(path, handlers);
  } });
  RegisterRoutes(app);
  t.mock.method(OpenIdClient, 'verifyAccessToken', async () => ({}));
  t.mock.method(authentik, 'AuthentikClient', function () {
    this.getRootTeamsForUsername = async () => ({ teams: [{ name: 'ExecutiveBoard' }] });
  });
  for (const path of ['/api/surveys/rounds', '/api/surveys/rounds/:roundId/close', '/api/surveys/rounds/:roundId/regenerate']) {
    assert.ok(paths.has(path), `Missing route: ${path}`);
    const guard = paths.get(path)[0];
    const check = async session => {
      let called = false; let failure;
      await guard({ session }, {}, error => { called = true; failure = error; });
      assert.ok(called); return failure;
    };
    assert.equal((await check({})).status, 401);
    const user = { username: 'member', groups: ['Engineering'], is_superuser: false };
    assert.equal((await check({ accessToken: 'test', authorizedUser: user })).status, 403);
    assert.equal(await check({ accessToken: 'test', authorizedUser: { ...user, groups: ['ExecutiveBoardMembers'] } }), undefined);
  }
});
