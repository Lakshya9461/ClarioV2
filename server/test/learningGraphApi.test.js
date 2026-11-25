import assert from 'node:assert/strict';
import http from 'node:http';
import { after, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const [{ default: app }, { disconnectDB }, { default: Question }] = await Promise.all([
  import('../server.js'),
  import('../config/db.js'),
  import('../models/Question.js'),
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
      name: `Learning Map ${label}`,
      email: `learning-map-${label}-${Date.now()}@clario.edu`,
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

test('learning graph API authenticates, scopes data, and advances an accepted path', async () => {
  const student = await register('student');
  const studentCookie = student.cookie;

  const unauthenticated = await request('/api/learning-graph');
  assert.equal(unauthenticated.status, 401);

  const initialGraphResponse = await request('/api/learning-graph', studentCookie);
  assert.equal(initialGraphResponse.status, 200);
  assert.deepEqual((await initialGraphResponse.json()).data.concepts, []);

  for (const [conceptId, name] of [
    ['basics', 'Programming basics'],
    ['functions', 'Functions'],
    ['recursion', 'Recursion'],
    ['sorting', 'Sorting'],
  ]) {
    const response = await request('/api/learning-graph/concepts', studentCookie, 'POST', {
      conceptId,
      name,
      statement: '',
    });
    assert.equal(response.status, 201);
  }

  for (const [from, to] of [
    ['basics', 'functions'],
    ['functions', 'recursion'],
  ]) {
    const response = await request('/api/learning-graph/relationships', studentCookie, 'POST', {
      from,
      to,
      type: 'prerequisite',
    });
    assert.equal(response.status, 201);
  }

  const cycleResponse = await request(
    '/api/learning-graph/relationships',
    studentCookie,
    'POST',
    { from: 'recursion', to: 'basics', type: 'prerequisite' }
  );
  assert.equal(cycleResponse.status, 409);

  const assessmentResponse = await request(
    '/api/learning-graph/concepts/basics/assessment',
    studentCookie,
    'PATCH',
    { status: 'demonstrated', evidence: ['Explained variables and control flow'], summary: '' }
  );
  assert.equal(assessmentResponse.status, 200);

  const draftResponse = await request('/api/learning-graph/sessions', studentCookie, 'POST', {
    goalConceptId: 'recursion',
  });
  assert.equal(draftResponse.status, 201);
  const draft = (await draftResponse.json()).data;
  assert.equal(draft.status, 'proposed');
  assert.deepEqual(draft.plan.nodes.map((node) => node.id), ['functions', 'recursion']);
  assert.equal(draft.plan.currentNodeId, null);

  const acceptResponse = await request(
    `/api/learning-graph/sessions/${draft._id}/accept`,
    studentCookie,
    'POST'
  );
  assert.equal(acceptResponse.status, 200);
  const accepted = (await acceptResponse.json()).data;
  assert.equal(accepted.status, 'active');
  assert.equal(accepted.plan.currentNodeId, 'functions');

  const savedQuestion = await Question.create({
    userId: student.userId,
    rawQuestion: 'How does a function return a value?',
    refinedPrompt: 'Explain function return values.',
    explanation: 'A return value is the result sent back to the caller.',
    subjectTag: 'functions',
  });
  const linkQuestionResponse = await request(
    `/api/learning-graph/sessions/${draft._id}/questions`,
    studentCookie,
    'POST',
    { questionId: String(savedQuestion._id), nodeId: 'functions', kind: 'predict' }
  );
  assert.equal(linkQuestionResponse.status, 201);
  const linkedSession = (await linkQuestionResponse.json()).data;
  assert.equal(String(linkedSession.questions[0].questionId), String(savedQuestion._id));
  assert.equal(linkedSession.questions[0].kind, 'predict');

  const wrongStepResponse = await request(
    `/api/learning-graph/sessions/${draft._id}/advance`,
    studentCookie,
    'POST',
    { nodeId: 'recursion', evidence: '' }
  );
  assert.equal(wrongStepResponse.status, 409);

  const firstStepResponse = await request(
    `/api/learning-graph/sessions/${draft._id}/advance`,
    studentCookie,
    'POST',
    { nodeId: 'functions', evidence: 'Practiced a function call' }
  );
  assert.equal(firstStepResponse.status, 200);
  const firstStep = (await firstStepResponse.json()).data;
  assert.equal(firstStep.status, 'active');
  assert.equal(firstStep.plan.currentNodeId, 'recursion');

  const secondStepResponse = await request(
    `/api/learning-graph/sessions/${draft._id}/advance`,
    studentCookie,
    'POST',
    { nodeId: 'recursion', evidence: '' }
  );
  assert.equal(secondStepResponse.status, 200);
  const completed = (await secondStepResponse.json()).data;
  assert.equal(completed.status, 'completed');
  assert.equal(completed.plan.currentNodeId, null);

  const other = await register('other');
  const otherGraphResponse = await request('/api/learning-graph', other.cookie);
  assert.equal(otherGraphResponse.status, 200);
  assert.deepEqual((await otherGraphResponse.json()).data.concepts, []);
  const otherSessionsResponse = await request('/api/learning-graph/sessions', other.cookie);
  assert.deepEqual((await otherSessionsResponse.json()).data, []);
});
