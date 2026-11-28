import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectAndGenerateVisualizationTrace,
  generateQuicksortTrace,
  generateMergeSortTrace,
  generateSortingComparisonTrace,
  generateBubbleSortTrace,
  generateBinarySearchTrace,
  generateRecursionTrace,
  generateBFSTrace,
  generateDFSTrace,
  generateCpuRamTrace,
} from '../services/visualizerService.js';

describe('Algorithm Visualizer Service', () => {
  it('should generate valid quicksort trace', () => {
    const trace = generateQuicksortTrace([38, 27, 43, 3, 9, 82, 10]);
    assert.strictEqual(trace.algorithm, 'quicksort');
    assert.strictEqual(trace.category, 'sorting');
    assert.ok(Array.isArray(trace.steps));
    assert.ok(trace.steps.length > 5);
    assert.ok(trace.pseudocode.length > 0);
    assert.ok(trace.complexity.timeBest);
    assert.ok(trace.complexity.space);

    // Verify initial step invariant
    const initialStep = trace.steps[0];
    assert.strictEqual(initialStep.state.action, 'INIT');
    assert.ok(Array.isArray(initialStep.state.array));
  });

  it('should generate valid mergesort trace', () => {
    const trace = generateMergeSortTrace([38, 27, 43, 3, 9, 82, 10]);
    assert.strictEqual(trace.algorithm, 'mergesort');
    assert.strictEqual(trace.category, 'sorting');
    assert.ok(Array.isArray(trace.steps));
    assert.ok(trace.steps.length > 10);
    assert.ok(trace.pseudocode.length > 0);
    assert.strictEqual(trace.complexity.timeWorst, 'O(N log N)');
    assert.strictEqual(trace.complexity.space, 'O(N)');

    const divideStep = trace.steps.find((s) => s.state?.action === 'DIVIDE');
    assert.ok(divideStep);
    const lastStep = trace.steps[trace.steps.length - 1];
    assert.strictEqual(lastStep.state.action, 'DONE');
  });

  it('should generate valid sorting comparison trace with both algorithms', () => {
    const trace = generateSortingComparisonTrace([38, 27, 43, 3, 9, 82, 10]);
    assert.ok(trace.comparison);
    assert.strictEqual(trace.comparison.isComparison, true);
    assert.strictEqual(trace.comparison.algorithms.length, 2);
    assert.strictEqual(trace.comparison.algorithms[0].id, 'quicksort');
    assert.strictEqual(trace.comparison.algorithms[1].id, 'mergesort');
    assert.ok(trace.comparison.algorithms[0].trace.steps.length > 0);
    assert.ok(trace.comparison.algorithms[1].trace.steps.length > 0);
  });

  it('should generate valid bubble sort trace', () => {
    const trace = generateBubbleSortTrace([64, 34, 25, 12, 22, 11, 90]);
    assert.strictEqual(trace.algorithm, 'bubblesort');
    assert.strictEqual(trace.category, 'sorting');
    assert.ok(trace.steps.length > 10);
    const lastStep = trace.steps[trace.steps.length - 1];
    assert.strictEqual(lastStep.state.action, 'DONE');
  });

  it('should generate valid binary search trace', () => {
    const trace = generateBinarySearchTrace([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23);
    assert.strictEqual(trace.algorithm, 'binary_search');
    assert.strictEqual(trace.category, 'sorting');
    assert.ok(trace.steps.length >= 3);
    const foundStep = trace.steps.find((s) => s.state?.action === 'FOUND');
    assert.ok(foundStep);
    assert.strictEqual(foundStep.state.pointers.mid, 5);
  });

  it('should generate valid recursion trace for fibonacci', () => {
    const trace = generateRecursionTrace(4);
    assert.strictEqual(trace.algorithm, 'recursion');
    assert.strictEqual(trace.category, 'recursion');
    assert.ok(trace.steps.length >= 8);
    const pushStep = trace.steps.find((s) => s.state?.action === 'PUSH_FRAME');
    assert.ok(pushStep);
    assert.ok(pushStep.callStack.length > 0);
  });

  it('should generate valid BFS graph traversal trace', () => {
    const trace = generateBFSTrace();
    assert.strictEqual(trace.algorithm, 'bfs');
    assert.strictEqual(trace.category, 'graph');
    assert.ok(trace.steps.length >= 6);
    const stepWithQueue = trace.steps.find((s) => s.state?.queue && s.state.queue.length > 0);
    assert.ok(stepWithQueue);
    const lastStep = trace.steps[trace.steps.length - 1];
    assert.strictEqual(lastStep.state.action, 'DONE');
  });

  it('should generate valid DFS graph traversal trace', () => {
    const trace = generateDFSTrace();
    assert.strictEqual(trace.algorithm, 'dfs');
    assert.strictEqual(trace.category, 'graph');
    assert.ok(trace.steps.length >= 6);
    const stepWithStack = trace.steps.find((s) => s.state?.stack && s.state.stack.length > 0);
    assert.ok(stepWithStack);
    const lastStep = trace.steps[trace.steps.length - 1];
    assert.strictEqual(lastStep.state.action, 'DONE');
  });

  it('should generate valid CPU vs RAM architecture trace', () => {
    const trace = generateCpuRamTrace();
    assert.strictEqual(trace.algorithm, 'cpu_vs_ram');
    assert.ok(Array.isArray(trace.steps));
    assert.ok(trace.steps.length >= 6);
    assert.ok(trace.steps[0].state.hardwareState.cpu);
    assert.ok(trace.steps[0].state.hardwareState.ram);
  });

  it('should detect algorithm intent accurately from prompt', () => {
    const qsortTrace = detectAndGenerateVisualizationTrace('How does quicksort partition work?');
    assert.ok(qsortTrace);
    assert.strictEqual(qsortTrace.algorithm, 'quicksort');

    const msortTrace = detectAndGenerateVisualizationTrace('Explain mergesort step by step');
    assert.ok(msortTrace);
    assert.strictEqual(msortTrace.algorithm, 'mergesort');

    const comparisonTrace = detectAndGenerateVisualizationTrace('compare quicksort and mergesort time complexity & stability');
    assert.ok(comparisonTrace);
    assert.ok(comparisonTrace.comparison);
    assert.strictEqual(comparisonTrace.comparison.isComparison, true);
    assert.strictEqual(comparisonTrace.comparison.algorithms.length, 2);

    const bsearchTrace = detectAndGenerateVisualizationTrace('Explain binary search on sorted array');
    assert.ok(bsearchTrace);
    assert.strictEqual(bsearchTrace.algorithm, 'binary_search');

    const fibTrace = detectAndGenerateVisualizationTrace('Explain recursion call stack with fibonacci');
    assert.ok(fibTrace);
    assert.strictEqual(fibTrace.algorithm, 'recursion');

    const bfsTrace = detectAndGenerateVisualizationTrace('Breadth first search traversal with queue');
    assert.ok(bfsTrace);
    assert.strictEqual(bfsTrace.algorithm, 'bfs');

    const dfsTrace = detectAndGenerateVisualizationTrace('Depth first search on undirected graph');
    assert.ok(dfsTrace);
    assert.strictEqual(dfsTrace.algorithm, 'dfs');

    const unrelatedTrace = detectAndGenerateVisualizationTrace('What is the capital of France?');
    assert.strictEqual(unrelatedTrace, null);
  });
});
