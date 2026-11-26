import test from 'node:test';
import assert from 'node:assert/strict';
import { testModelConnection } from '../services/llmService.js';
import { PROVIDER_PRESETS, testModelConnectionEndpoint } from '../controllers/modelController.js';

test('Model Configuration & Presets Unit Tests', async (t) => {
  await t.test('PROVIDER_PRESETS contains standard providers', () => {
    assert.ok(Array.isArray(PROVIDER_PRESETS));
    const ids = PROVIDER_PRESETS.map((p) => p.id);
    assert.ok(ids.includes('openai'));
    assert.ok(ids.includes('anthropic'));
    assert.ok(ids.includes('gemini'));
    assert.ok(ids.includes('groq'));
    assert.ok(ids.includes('deepseek'));
    assert.ok(ids.includes('ollama'));
    assert.ok(ids.includes('custom'));
  });

  await t.test('testModelConnection rejects empty model identifier', async () => {
    await assert.rejects(
      async () => {
        await testModelConnection({});
      },
      {
        name: 'Error',
        message: 'Model identifier is required.',
      }
    );
  });

  await t.test('testModelConnection throws on missing API key for authenticated provider', async () => {
    await assert.rejects(
      async () => {
        await testModelConnection({
          provider: 'openai',
          apiUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          apiKey: '',
        });
      },
      (err) => {
        return err instanceof Error;
      }
    );
  });

  await t.test('testModelConnectionEndpoint responds with 400 when model name is missing', async () => {
    let statusCode = 200;
    let responseBody = null;
    const req = { body: { provider: 'openai' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await testModelConnectionEndpoint(req, res);
    assert.equal(statusCode, 400);
    assert.equal(responseBody.ok, false);
    assert.match(responseBody.message, /Model name or identifier is required/);
  });
});
