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
});
