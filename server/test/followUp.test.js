import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateFollowUpAnswer } from '../services/llmService.js';
import { detectAndGenerateVisualizationTrace } from '../services/visualizerService.js';

describe('Follow-Up & Knowledge Base Fallback', () => {
  it('should generate rich Bubble Sort explanation, slides, and trace on follow-up when offline', async () => {
    const parentTopic = 'selection sort vs insertion sort';
    const followUp = 'bubble sort';

    const answer = await generateFollowUpAnswer(followUp, [], parentTopic, null);
    assert.ok(answer.content.includes('Bubble Sort'));
    assert.ok(answer.content.includes('Adjacent Comparisons') || answer.content.includes('swapped'));
    assert.ok(!answer.content.includes('Recite syntax'));
    assert.ok(Array.isArray(answer.slides));
    assert.ok(answer.slides.length >= 2, 'Should have at least 2 slides for Bubble Sort');
    assert.ok(answer.slides[0].title.includes('Bubble Sort'));

    const trace = detectAndGenerateVisualizationTrace(followUp);
    assert.ok(trace);
    assert.strictEqual(trace.algorithm, 'bubblesort');
  });

  it('should generate rich Selection Sort vs Insertion Sort comparison and slides', async () => {
    const followUp = 'selection sort vs insertion sort';
    const answer = await generateFollowUpAnswer(followUp, [], 'sorting algorithms', null);
    assert.ok(answer.content.includes('Selection Sort vs Insertion Sort'));
    assert.ok(Array.isArray(answer.slides));
    assert.ok(answer.slides.length >= 2);

    const trace = detectAndGenerateVisualizationTrace(followUp);
    assert.ok(trace);
    assert.ok(trace.comparison?.isComparison);
    const algIds = trace.comparison.algorithms.map((a) => a.id);
    assert.ok(algIds.includes('selectionsort'));
    assert.ok(algIds.includes('insertionsort'));
  });

  it('should answer when to choose Mergesort over Quicksort directly rather than repeating static comparison', async () => {
    const parentTopic = 'Quicksort vs Mergesort';
    const followUp = 'When should I use Mergesort instead of Quicksort?';

    const answer = await generateFollowUpAnswer(followUp, [], parentTopic, null);
    assert.ok(answer.content.includes('When to Choose Mergesort Over Quicksort'));
    assert.ok(answer.content.includes('Linked Lists'));
    assert.ok(answer.content.includes('Stability') || answer.content.includes('Stable'));
    assert.ok(!answer.content.includes('Recite syntax'));
    assert.ok(Array.isArray(answer.keyTakeaways));
    assert.ok(answer.keyTakeaways.length > 0);
  });

  it('should generate deep technical breakdown for database secure transactions', async () => {
    const query = 'can you tell me which database is suitable for secure transactions';
    const { generateStructuredAnswer } = await import('../services/llmService.js');
    const answer = await generateStructuredAnswer(query, query, null);

    assert.ok(answer.explanation.includes('ACID') || answer.explanation.includes('PostgreSQL'));
    assert.ok(answer.explanation.includes('PostgreSQL'));
    assert.ok(answer.explanation.includes('Serializable') || answer.explanation.includes('CockroachDB'));
    assert.ok(!answer.explanation.includes('Mastering can you tell me'));
    assert.ok(Array.isArray(answer.keyPoints));
    assert.ok(answer.keyPoints.length >= 2);
  });

  it('should surface custom model error instead of "Connect a custom LLM model" when custom model is enabled and fails', async () => {
    const query = 'what is a harness';
    const { generateStructuredAnswer } = await import('../services/llmService.js');
    const customConfig = {
      enabled: true,
      provider: 'custom',
      apiUrl: 'http://127.0.0.1:59999/v1',
      apiKey: 'test-key',
      model: 'test-model',
    };

    const answer = await generateStructuredAnswer(query, query, customConfig);
    assert.ok(answer.explanation.includes('Custom Model Request Failed'));
    assert.ok(answer.explanation.includes('test-model'));
    assert.ok(!answer.explanation.includes('Connect a custom LLM model'));
    assert.strictEqual(answer.isFallbackStub, true);
  });

  it('should repair truncated JSON with unescaped LaTeX backslashes in parseLlmJson', async () => {
    const { parseLlmJson } = await import('../services/llmService.js');
    const truncatedWithLatex = `{
      "explanation": "Voltage Drop ($\\Delta V$) is $V = IR$.",
      "keyPoints": ["Point 1", "Point 2"],
      "chartData": { "type": "bar", "title": "AWG", "labels": ["18 AWG"], "values": [16], "datasetLabel": "Amps" },
      "slides": [
        { "slideNumber": 1, "title": "Slide 1", "codeOrFormula": "R = \\rho \\frac{L}{A} \\quad \\implies \\quad \\Delta V" },
        { "slideNumber": 2, "title": "Truncated Slide`;

    const parsed = parseLlmJson(truncatedWithLatex);
    assert.ok(parsed.explanation.includes('Voltage Drop'));
    assert.strictEqual(parsed.keyPoints.length, 2);
    assert.ok(Array.isArray(parsed.slides));
    assert.ok(parsed.slides.length >= 1);
    assert.strictEqual(parsed.slides[0].title, 'Slide 1');
  });
});
