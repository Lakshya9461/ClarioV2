import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../server.js';
import { disconnectDB } from '../config/db.js';

let server;
let serverUrl;
let studentCookie = '';
let teacherCookie = '';
let testQuestionId = '';

before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Running at ${serverUrl}`);
      resolve();
    });
  });
});

after(async () => {
  if (server) server.close();
  await disconnectDB();
  setTimeout(() => process.exit(0), 100);
});

describe('Clario API Integration & Viva Verification Test Suite', () => {
  test('1. Health check returns 200 with online status', async () => {
    const res = await fetch(`${serverUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'online');
    assert.equal(body.app, 'Clario AI Learning Portal API');
  });

  test('2. Auth: Register a student account', async () => {
    const email = `teststudent_${Date.now()}@clario.edu`;
    const res = await fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email,
        password: 'password123',
        role: 'student',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'student');

    // Extract cookie
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      studentCookie = setCookie.split(';')[0];
    } else if (body.token) {
      studentCookie = `token=${body.token}`;
    }
    assert.ok(studentCookie, 'Student auth cookie must exist');
  });

  test('3. Auth: Register a teacher account', async () => {
    const email = `testteacher_${Date.now()}@clario.edu`;
    const res = await fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof. Tester',
        email,
        password: 'password123',
        role: 'teacher',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'teacher');

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      teacherCookie = setCookie.split(';')[0];
    } else if (body.token) {
      teacherCookie = `token=${body.token}`;
    }
  });

  test('4. Auth: Access /api/auth/me with cookie', async () => {
    const res = await fetch(`${serverUrl}/api/auth/me`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'student');
  });

  test('5. RBAC: Student forbidden from Teacher Analytics (403)', async () => {
    const res = await fetch(`${serverUrl}/api/analytics`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Forbidden/i);
  });

  test('6. RBAC: Teacher allowed access to Analytics (200)', async () => {
    const res = await fetch(`${serverUrl}/api/analytics`, {
      headers: { Cookie: teacherCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.summary, 'Summary stats must exist');
    assert.ok(Array.isArray(body.data.questionsPerTag), 'questionsPerTag array must exist');
  });

  test('7. SSE Streaming & Caching: Ask question via POST /api/questions', async () => {
    const res = await fetch(`${serverUrl}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({ question: 'explain recursion' }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');

    const text = await res.text();
    assert.ok(text.includes('event: refined_prompt'), 'Must contain refined_prompt event');
    assert.ok(text.includes('event: chunk'), 'Must stream chunk events');
    assert.ok(text.includes('event: done'), 'Must complete with done event');

    // Extract question ID from done event
    const doneLine = text
      .split('\n')
      .find((line) => line.startsWith('data: ') && line.includes('"question"'));
    if (doneLine) {
      const parsed = JSON.parse(doneLine.replace('data: ', ''));
      testQuestionId = parsed.question._id;
      assert.ok(testQuestionId, 'Question ID was returned and saved');
      assert.ok(parsed.question.chartData, 'Chart data was generated');
    }
  });

  test('8. Redis Cache Hit: Second identical question is served from cache', async () => {
    const res = await fetch(`${serverUrl}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({ question: 'explain recursion' }),
    });

    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(
      text.includes('cache_hit') || text.includes('"isCached":true'),
      'Must identify cache hit'
    );
  });

  test('9. Study Lists: Create and retrieve student study list', async () => {
    const createRes = await fetch(`${serverUrl}/api/study-lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({
        name: 'Algorithms Exam Revision',
        description: 'Key recursive and sorting algorithms',
        questionId: testQuestionId,
      }),
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.equal(createBody.success, true);
    assert.equal(createBody.data.name, 'Algorithms Exam Revision');

    // Fetch lists
    const getRes = await fetch(`${serverUrl}/api/study-lists`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.ok(getBody.data.length >= 1);
  });

  test('10. Feedback: Rate question (1-5 stars) and view in teacher feed', async () => {
    const feedRes = await fetch(`${serverUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({
        questionId: testQuestionId,
        rating: 5,
        comment: 'Call stack visualization made the concept crystal clear!',
      }),
    });

    assert.equal(feedRes.status, 200);
    const feedBody = await feedRes.json();
    assert.equal(feedBody.success, true);
    assert.equal(feedBody.data.rating, 5);

    // Verify Teacher can read feedback
    const teacherFeedRes = await fetch(`${serverUrl}/api/feedback`, {
      headers: { Cookie: teacherCookie },
    });
    assert.equal(teacherFeedRes.status, 200);
    const teacherFeedBody = await teacherFeedRes.json();
    assert.ok(teacherFeedBody.data.length >= 1);
  });

  test('11. Multi-turn Follow-up: Ask follow-up question via POST /api/questions/:id/follow-up', async () => {
    assert.ok(testQuestionId, 'Original test question must exist to test follow-up');

    const res = await fetch(`${serverUrl}/api/questions/${testQuestionId}/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({
        question: 'Can you show how stack frames are allocated during recursion?',
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');

    const text = await res.text();
    assert.ok(text.includes('event: chunk'), 'Must stream chunk events for follow-up');
    assert.ok(text.includes('event: done'), 'Must complete follow-up with done event');
    assert.ok(text.includes('followUps'), 'Done event payload must contain updated followUps array');
  });

  test('12. Greetings: Saying "Hi" returns conversational response with NO slides and NO chart', async () => {
    const res = await fetch(`${serverUrl}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({ question: 'Hi' }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');

    const text = await res.text();
    assert.ok(text.includes('event: done'), 'Must complete greeting with done event');

    const doneLine = text
      .split('\n')
      .find((line) => line.startsWith('data: ') && line.includes('"question"'));
    assert.ok(doneLine, 'Done line must exist');

    const parsed = JSON.parse(doneLine.replace('data: ', ''));
    const greetingQ = parsed.question;

    assert.equal(greetingQ.slides.length, 0, 'Greeting MUST NOT generate PPT slides');
    assert.equal(greetingQ.chartData, null, 'Greeting MUST NOT generate a chart');
    assert.match(greetingQ.explanation, /Clario/i, 'Explanation must introduce Clario');
  });

  test('13. Follow-up after Greeting: "which is better linux or windows" returns OS breakdown and NO "context of hi"', async () => {
    // 1. Post greeting "hi"
    const greetRes = await fetch(`${serverUrl}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({ question: 'Hi' }),
    });
    const greetText = await greetRes.text();
    const doneLine = greetText.split('\n').find((line) => line.startsWith('data: ') && line.includes('"question"'));
    const greetingQ = JSON.parse(doneLine.replace('data: ', '')).question;

    // 2. Ask follow-up
    const followRes = await fetch(`${serverUrl}/api/questions/${greetingQ._id}/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': studentCookie,
      },
      body: JSON.stringify({ question: 'which is better linux or windows' }),
    });

    assert.equal(followRes.status, 200);
    const followText = await followRes.text();

    assert.ok(!followText.includes('context of hi'), 'Must NOT contain "context of hi"');
    assert.ok(followText.includes('Linux vs Microsoft Windows') || followText.includes('Monolithic Kernel'), 'Must contain actual OS comparison analysis');
  });

  test('14. Shorts Endpoint: Unauthenticated request to /api/shorts returns 401', async () => {
    const res = await fetch(`${serverUrl}/api/shorts?topic=recursion`);
    assert.equal(res.status, 401);
  });

  test('15. Shorts Endpoint: Authenticated student accesses /api/shorts?topic=recursion', async () => {
    const res = await fetch(`${serverUrl}/api/shorts?topic=recursion`, {
      headers: {
        'Cookie': studentCookie,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.topic, 'recursion');
    assert.ok(Array.isArray(body.shorts));
    assert.ok(body.shorts.length > 0);
    assert.ok(body.shorts[0].videoId);
    assert.ok(body.shorts[0].title);
    assert.ok(body.shorts[0].channel);
  });
});
