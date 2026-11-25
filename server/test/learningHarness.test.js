import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  parseKnowledgeGraph,
  serializeKnowledgeGraph,
  readKnowledgeGraph,
  writeKnowledgeGraph,
  updateKnowledgeGraphPropositions,
  generatePrerequisiteProbes,
  scoreProbeResponse,
  buildLessonMap,
  generatePredictQuestion,
  evaluatePredictResponse,
  generatePracticeProblems,
  gradePracticeResponse,
} from '../services/learningHarnessService.js';

describe('Learning Harness Service Tests', () => {
  it('parses and serializes knowledge-graph.md correctly', () => {
    const rawMd = `# Clario Knowledge Graph

## Propositions
- [solid] [topic: recursion] Base cases prevent unbounded recursion by returning without further calls.
- [shaky] [topic: recursion] Call stack frames store return addresses and local variables for each invocation.
- [weak] [topic: trees] Binary search trees maintain the left-less-than-root invariant.

## Chains
- Base cases prevent unbounded recursion + Call stack frames store return addresses -> Recursive functions can safely compute divide-and-conquer solutions.
`;

    const parsed = parseKnowledgeGraph(rawMd);
    assert.equal(parsed.propositions.length, 3);
    assert.equal(parsed.propositions[0].status, 'solid');
    assert.equal(parsed.propositions[0].topic, 'recursion');
    assert.equal(parsed.propositions[0].claim, 'Base cases prevent unbounded recursion by returning without further calls.');
    assert.equal(parsed.chains.length, 1);
    assert.equal(parsed.chains[0].premises.length, 2);
    assert.equal(parsed.chains[0].conclusion, 'Recursive functions can safely compute divide-and-conquer solutions.');

    const serialized = serializeKnowledgeGraph(parsed);
    assert.match(serialized, /\[solid\] \[topic: recursion\] Base cases prevent unbounded recursion/);
    assert.match(serialized, /Base cases prevent unbounded recursion \+ Call stack frames store return addresses -> Recursive functions/);
  });

  it('reads and writes knowledge graph file safely on disk', () => {
    const tmpFile = path.join(os.tmpdir(), `test-kg-${Date.now()}.md`);
    try {
      const initial = readKnowledgeGraph(tmpFile);
      assert.equal(initial.exists, false);
      assert.equal(initial.propositions.length, 0);

      const written = writeKnowledgeGraph(
        {
          propositions: [
            { status: 'solid', topic: 'sorting', claim: 'Comparison sorts have an Omega(n log n) lower bound.' },
          ],
          chains: [],
        },
        tmpFile
      );
      assert.equal(written.exists, true);

      const readBack = readKnowledgeGraph(tmpFile);
      assert.equal(readBack.exists, true);
      assert.equal(readBack.propositions.length, 1);
      assert.equal(readBack.propositions[0].claim, 'Comparison sorts have an Omega(n log n) lower bound.');

      // Update propositions
      updateKnowledgeGraphPropositions(
        [
          { status: 'solid', topic: 'sorting', claim: 'Comparison sorts have an Omega(n log n) lower bound.' },
          { status: 'shaky', topic: 'sorting', claim: 'QuickSort partition takes linear time.' },
        ],
        [],
        tmpFile
      );

      const updated = readKnowledgeGraph(tmpFile);
      assert.equal(updated.propositions.length, 2);
      assert.equal(updated.propositions[1].status, 'shaky');
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });

  it('generates prerequisite diagnostic probes for MEASURE phase', async () => {
    const probes = await generatePrerequisiteProbes('Recursion and Call Stack');
    assert.ok(Array.isArray(probes));
    assert.ok(probes.length >= 2);
    assert.ok(probes[0].question);
    assert.ok(Array.isArray(probes[0].options));
    assert.equal(probes[0].options.length, 4);
    assert.match(probes[0].options[3], /I don't know/i);
  });

  it('scores probe response taking thinking field into account', async () => {
    const evaluation = await scoreProbeResponse({
      question: 'How do stack frames preserve local variables?',
      options: ['A) Overwrite global', 'B) Stack frame isolates variables', 'C) Thread network', "D) I don't know"],
      correctOption: 'B',
      selectedOption: 'B) Stack frame isolates variables',
      confidence: 90,
      thinking: 'Because LIFO stack frames push upon call and pop on return, isolating frame variables.',
    });

    assert.ok(['correct', 'partially correct'].includes(evaluation.score));
    assert.ok(evaluation.reasoningModel);

    // "I don't know" probe
    const idkEval = await scoreProbeResponse({
      question: 'How do stack frames preserve local variables?',
      options: ['A) Overwrite global', 'B) Stack frame isolates variables', 'C) Thread network', "D) I don't know"],
      correctOption: 'B',
      selectedOption: "D) I don't know",
      confidence: 10,
      thinking: 'Not sure how frame registers work.',
    });
    assert.equal(idkEval.score, 'unknown');
  });

  it('builds minimal dependency tree LESSON MAP for PLAN phase', async () => {
    const probeResults = [
      { concept: 'Basic variable scoping', score: 'correct' },
      { concept: 'Stack frame push and pop', score: 'wrong' },
      { concept: 'Base case termination condition', score: 'partially correct' },
    ];

    const plan = await buildLessonMap('Recursion and Call Stack', probeResults);
    assert.ok(plan.asciiTree);
    assert.match(plan.asciiTree, /LESSON MAP/);
    assert.match(plan.asciiTree, /\[x\]/);
    assert.match(plan.asciiTree, /\[ \]/);
    assert.match(plan.asciiTree, /GOAL:/);
    assert.ok(plan.explanation);
  });

  it('generates PREDICT questions and handles TEACH actions (advance, repair, force_advance)', async () => {
    const predictQ = await generatePredictQuestion('Stack Frame Lifecycle', 'Recursion');
    assert.ok(predictQ.question);
    assert.ok(Array.isArray(predictQ.options));
    assert.equal(predictQ.options.length, 4);

    // 1. Correct response -> advance
    const advanceEval = await evaluatePredictResponse({
      nodeName: 'Stack Frame Lifecycle',
      question: predictQ.question,
      options: predictQ.options,
      correctOption: 'B',
      selectedOption: 'B) The input values must satisfy the step precondition',
      confidence: 85,
      thinking: 'Invariants must be verified before executing the subroutine.',
      attemptNumber: 1,
    });
    assert.ok(['advance', 'verify_intuition'].includes(advanceEval.action));
    assert.ok(advanceEval.explanation);

    // 2. Wrong response attempt 1 -> repair
    const repairEval = await evaluatePredictResponse({
      nodeName: 'Stack Frame Lifecycle',
      question: predictQ.question,
      options: predictQ.options,
      correctOption: 'B',
      selectedOption: 'A) State is restored from disk automatically',
      confidence: 50,
      thinking: 'Maybe the OS loads it from a swap file.',
      attemptNumber: 1,
    });
    assert.ok(['repair', 'force_advance'].includes(repairEval.action));

    // 3. Wrong response attempt 2 -> force advance with [!]
    const forceAdvanceEval = await evaluatePredictResponse({
      nodeName: 'Stack Frame Lifecycle',
      question: predictQ.question,
      options: predictQ.options,
      correctOption: 'B',
      selectedOption: 'C) The step ignores all earlier parameters',
      confidence: 40,
      thinking: 'Still confused about memory registers.',
      attemptNumber: 2,
    });
    assert.equal(forceAdvanceEval.action, 'force_advance');
    assert.equal(forceAdvanceEval.nodeStatus, 'shaky');
    assert.match(forceAdvanceEval.explanation, /\[!\]/);
  });

  it('generates practice problems and evaluates final summary', async () => {
    const problems = await generatePracticeProblems('Recursion', [{ name: 'Stack frames' }], ['Stack frames']);
    assert.ok(Array.isArray(problems));
    assert.ok(problems.length >= 2);

    const grade = await gradePracticeResponse({
      problemPrompt: problems[0].prompt,
      targetConcept: problems[0].targetConcept,
      learnerResponse: 'Convert the recursive call to an explicit loop with a bounded accumulator to avoid stack overflow.',
      problemIndex: 3,
      totalProblems: 3,
      cumulativeResults: [
        { targetConcept: 'Frame limits', isSound: true },
        { targetConcept: 'Base conditions', isSound: true },
      ],
    });

    assert.ok(typeof grade.isSound === 'boolean');
    assert.ok(grade.feedback);
    assert.equal(grade.isFinalProblem, true);
    assert.ok(grade.summary);
    assert.ok(grade.summary.solid);
    assert.ok(grade.summary.shaky);
    assert.ok(grade.summary.revisitWhen);
  });
});
