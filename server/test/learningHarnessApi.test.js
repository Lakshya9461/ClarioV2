import assert from 'node:assert/strict';
import http from 'node:http';
import { after, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const [{ default: app }, { disconnectDB }] = await Promise.all([
  import('../server.js'),
  import('../config/db.js'),
]);

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const serverUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await disconnectDB();
});

const register = async (label) => {
  const response = await fetch(`${serverUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Harness ${label}`,
      email: `harness-${label}-${Date.now()}@clario.edu`,
      password: 'password123',
      role: 'student',
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  const setCookie = response.headers.get('set-cookie');
  return {
    cookie: setCookie ? setCookie.split(';')[0] : `token=${body.token}`,
    userId: body.user._id,
  };
};

const request = (path, cookie, method = 'GET', body) =>
  fetch(`${serverUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

test('harness API routes authenticate and walk through MEASURE, PLAN, TEACH, and PRACTICE phases', async () => {
  const student = await register('student');
  const studentCookie = student.cookie;

  // 1. Unauthenticated checks fail with 401
  const unauthed = await request('/api/harness/graph');
  assert.equal(unauthed.status, 401);

  // 2. Read knowledge graph
  const graphRes = await request('/api/harness/graph', studentCookie);
  assert.equal(graphRes.status, 200);
  const graphBody = await graphRes.json();
  assert.equal(graphBody.ok, true);
  assert.ok(Array.isArray(graphBody.graph.propositions));

  // 3. Start a new harness session (MEASURE phase)
  const startRes = await request('/api/harness/session', studentCookie, 'POST', {
    goal: 'Recursion and Call Stack',
  });
  assert.equal(startRes.status, 201);
  const startBody = await startRes.json();
  assert.equal(startBody.ok, true);
  assert.equal(startBody.session.phase, 'MEASURE');
  assert.ok(startBody.session.probes.length >= 2);
  const sessionId = startBody.session._id;

  // 4. Respond to all probes
  let sessionState = startBody.session;
  while (sessionState.phase === 'MEASURE') {
    const probe = sessionState.probes[sessionState.currentProbeIndex];
    const probeRes = await request(`/api/harness/session/${sessionId}/respond`, studentCookie, 'POST', {
      responseType: 'probe',
      data: {
        selectedOption: probe.correctOption || 'B',
        confidence: 85,
        thinking: 'Testing prerequisite invariant understanding.',
      },
    });
    assert.equal(probeRes.status, 200);
    const probeBody = await probeRes.json();
    assert.equal(probeBody.ok, true);
    sessionState = probeBody.session;
  }

  // 5. Verify transitioned to PLAN phase
  assert.equal(sessionState.phase, 'PLAN');
  assert.ok(sessionState.lessonPlan.asciiTree);
  assert.match(sessionState.lessonPlan.asciiTree, /LESSON MAP/);

  // 6. Accept Lesson Plan -> transitions to TEACH
  const planAcceptRes = await request(`/api/harness/session/${sessionId}/respond`, studentCookie, 'POST', {
    responseType: 'plan_accept',
    data: {},
  });
  assert.equal(planAcceptRes.status, 200);
  const planAcceptBody = await planAcceptRes.json();
  sessionState = planAcceptBody.session;
  assert.equal(sessionState.phase, 'TEACH');
  assert.ok(sessionState.teaching.nodes.length > 0);

  // 7. Teach all nodes (PREDICT responses)
  while (sessionState.phase === 'TEACH') {
    const teachRes = await request(`/api/harness/session/${sessionId}/respond`, studentCookie, 'POST', {
      responseType: 'predict',
      data: {
        selectedOption: 'B) Invariant guarantees hold',
        confidence: 90,
        thinking: 'Subroutine state transitions preserve invariant guarantees.',
      },
    });
    assert.equal(teachRes.status, 200);
    const teachBody = await teachRes.json();
    sessionState = teachBody.session;
  }

  // 8. Verify transitioned to PRACTICE phase
  assert.equal(sessionState.phase, 'PRACTICE');
  assert.ok(sessionState.practice.problems.length > 0);

  // 9. Answer practice problems
  while (sessionState.phase === 'PRACTICE') {
    const practiceRes = await request(`/api/harness/session/${sessionId}/respond`, studentCookie, 'POST', {
      responseType: 'practice',
      data: {
        learnerResponse: 'Convert recursion into iteration using bounded accumulator to preserve stack.',
      },
    });
    assert.equal(practiceRes.status, 200);
    const practiceBody = await practiceRes.json();
    sessionState = practiceBody.session;
  }

  // 10. Completed!
  assert.equal(sessionState.phase, 'COMPLETED');
  assert.ok(sessionState.practice.summary);
  assert.ok(sessionState.practice.summary.solid);
});
