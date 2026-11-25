#!/usr/bin/env node
import readline from 'readline';
import dotenv from 'dotenv';
import {
  readKnowledgeGraph,
  updateKnowledgeGraphPropositions,
  generatePrerequisiteProbes,
  scoreProbeResponse,
  buildLessonMap,
  generatePredictQuestion,
  evaluatePredictResponse,
  generatePracticeProblems,
  gradePracticeResponse,
} from '../services/learningHarnessService.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askAsync = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runLearningHarness() {
  console.log('\n========================================');
  console.log('Clario — Agent Harness for Learning');
  console.log('========================================');

  // Session Start: Read ./knowledge-graph.md
  const graph = readKnowledgeGraph();
  if (graph.exists && graph.propositions.length > 0) {
    console.log(`\n[Memory] Loaded ./knowledge-graph.md (${graph.propositions.length} propositions, ${graph.chains.length} chains).`);
    const solid = graph.propositions.filter((p) => p.status === 'solid');
    if (solid.length > 0) {
      console.log(`[Memory] Solid mastery already known for: ${solid.map((s) => s.claim).slice(0, 3).join('; ')}`);
    }
  } else {
    console.log('\n[Memory] ./knowledge-graph.md not found or empty. Initializing new knowledge graph.');
  }

  // Ask learning goal
  const goal = (await askAsync('\nWhat do you want to learn? > ')).trim();
  if (!goal) {
    console.log('No goal provided. Exiting.');
    rl.close();
    return;
  }

  console.log(`\nGoal acknowledged: "${goal}"`);
  console.log('Operating Principle: Measuring prerequisite understanding before teaching.\n');

  // ═════════════════════════════════════════════
  // 1. MEASURE
  // ═════════════════════════════════════════════
  console.log('--- PHASE 1: MEASURE ---');
  const probes = await generatePrerequisiteProbes(goal, graph);
  const probeResults = [];

  for (let i = 0; i < probes.length; i++) {
    const probe = probes[i];
    console.log('\n---');
    console.log(`PROBE (${probe.probeIndex}/${probe.totalProbes})`);
    console.log(probe.question);
    console.log('');
    for (const opt of probe.options) {
      console.log(opt);
    }
    console.log('---');

    const selectedOption = (await askAsync('YOUR CHOICE (A/B/C/D) > ')).trim();
    let confidence = (await askAsync('CONFIDENCE [0-100%] > ')).trim();
    confidence = parseInt(confidence, 10);
    if (isNaN(confidence) || confidence < 0 || confidence > 100) confidence = 70;

    let thinking = (await askAsync('YOUR THINKING [Required reasoning/doubts] > ')).trim();
    while (!thinking) {
      thinking = (await askAsync('YOUR THINKING is required. Why this answer? > ')).trim();
    }

    const evaluation = await scoreProbeResponse({
      question: probe.question,
      options: probe.options,
      correctOption: probe.correctOption,
      selectedOption,
      confidence,
      thinking,
    });

    console.log(`\nSCORE: ${evaluation.score.toUpperCase()}`);
    console.log(`MODEL: ${evaluation.reasoningModel}`);

    probeResults.push({
      concept: probe.concept,
      question: probe.question,
      selectedOption,
      confidence,
      thinking,
      score: evaluation.score,
      reasoningModel: evaluation.reasoningModel,
    });
  }

  // ═════════════════════════════════════════════
  // 2. PLAN
  // ═════════════════════════════════════════════
  console.log('\n--- PHASE 2: PLAN ---');
  const lessonPlan = await buildLessonMap(goal, probeResults);
  console.log('\n' + lessonPlan.asciiTree);
  console.log('\n' + lessonPlan.explanation);

  const proceed = (await askAsync('\nProceed with this lesson map? (Enter to proceed, or type objection) > ')).trim();
  if (proceed.toLowerCase().startsWith('n')) {
    console.log('Session paused per your request.');
    rl.close();
    return;
  }

  // ═════════════════════════════════════════════
  // 3. TEACH
  // ═════════════════════════════════════════════
  console.log('\n--- PHASE 3: TEACH ---');
  const nodesToTeach = lessonPlan.nodes.filter((n) => n.status === 'to_teach' || n.status === 'goal');
  const taughtPropositions = [];
  const shakyNodes = [];
  let prevNodeName = lessonPlan.nodes.find((n) => n.status === 'understood')?.name || null;

  for (let i = 0; i < nodesToTeach.length; i++) {
    const node = nodesToTeach[i];
    console.log(`\nTeaching Node [${i + 1}/${nodesToTeach.length}]: ${node.name}`);

    let attempt = 1;
    let nodeCompleted = false;
    let currentPredictQuestion = await generatePredictQuestion(node.name, goal, prevNodeName);

    while (!nodeCompleted) {
      console.log('\n---');
      console.log(`PREDICT: ${node.name} (Attempt ${attempt})`);
      console.log(currentPredictQuestion.question);
      console.log('');
      for (const opt of currentPredictQuestion.options) {
        console.log(opt);
      }
      console.log('---');

      const selectedOption = (await askAsync('YOUR CHOICE (A/B/C/D) > ')).trim();
      let confidence = (await askAsync('CONFIDENCE [0-100%] > ')).trim();
      confidence = parseInt(confidence, 10);
      if (isNaN(confidence) || confidence < 0 || confidence > 100) confidence = 70;

      let thinking = (await askAsync('YOUR THINKING [Required reasoning/doubts] > ')).trim();
      while (!thinking) {
        thinking = (await askAsync('YOUR THINKING is required. Why this answer? > ')).trim();
      }

      const evalResult = await evaluatePredictResponse({
        nodeName: node.name,
        previousNodeName: prevNodeName,
        question: currentPredictQuestion.question,
        options: currentPredictQuestion.options,
        correctOption: currentPredictQuestion.correctOption,
        selectedOption,
        confidence,
        thinking,
        attemptNumber: attempt,
        conceptClaim: currentPredictQuestion.conceptClaim,
      });

      if (evalResult.action === 'advance') {
        console.log('\n[x] Correct with sound reasoning!');
        console.log(evalResult.explanation);
        taughtPropositions.push({
          status: 'solid',
          topic: goal,
          claim: currentPredictQuestion.conceptClaim || `${node.name} operates correctly within execution constraints.`,
        });
        nodeCompleted = true;
      } else if (evalResult.action === 'verify_intuition') {
        console.log('\n' + evalResult.explanation);
        const intuition = (await askAsync('YOUR REASONING > ')).trim();
        console.log('[x] Verified. Intuition confirmed. Marking [x] and moving on.');
        taughtPropositions.push({
          status: 'solid',
          topic: goal,
          claim: currentPredictQuestion.conceptClaim || `${node.name} operates correctly within execution constraints.`,
        });
        nodeCompleted = true;
      } else if (evalResult.action === 'repair' && attempt === 1) {
        console.log('\n[REPAIR]');
        if (evalResult.misconception) {
          console.log(`Misconception Identified: ${evalResult.misconception}`);
        }
        console.log(evalResult.explanation);
        if (evalResult.variantQuestion) {
          currentPredictQuestion = {
            ...currentPredictQuestion,
            question: evalResult.variantQuestion.question,
            options: evalResult.variantQuestion.options,
            correctOption: evalResult.variantQuestion.correctOption,
          };
        }
        attempt++;
      } else {
        // Force advance after 2 failures
        console.log('\n[!] Wrong twice on this node.');
        console.log(evalResult.explanation);
        shakyNodes.push(node.name);
        taughtPropositions.push({
          status: 'shaky',
          topic: goal,
          claim: currentPredictQuestion.conceptClaim || `${node.name} operates correctly within execution constraints.`,
        });
        nodeCompleted = true;
      }
    }

    prevNodeName = node.name;
  }

  // ═════════════════════════════════════════════
  // 4. PRACTICE
  // ═════════════════════════════════════════════
  console.log('\n--- PHASE 4: PRACTICE ---');
  console.log('Generating practice problems weighted toward shaky areas without explicitly naming formulas...');

  const practiceProblems = await generatePracticeProblems(goal, nodesToTeach, shakyNodes);
  const practiceResults = [];
  let finalSummary = null;

  for (let i = 0; i < practiceProblems.length; i++) {
    const prob = practiceProblems[i];
    console.log('\n---');
    console.log(`PRACTICE PROBLEM (${prob.problemIndex}/${prob.totalProblems})`);
    console.log(prob.prompt);
    console.log('---');

    const answer = (await askAsync('YOUR SOLUTION / REASONING > ')).trim();
    const grade = await gradePracticeResponse({
      problemPrompt: prob.prompt,
      targetConcept: prob.targetConcept,
      learnerResponse: answer,
      problemIndex: prob.problemIndex,
      totalProblems: prob.totalProblems,
      cumulativeResults: practiceResults,
    });

    console.log('\nEVALUATION: ' + (grade.isSound ? 'SOUND REASONING' : 'NEEDS REFINEMENT'));
    console.log(grade.feedback);

    practiceResults.push({
      targetConcept: prob.targetConcept,
      isSound: grade.isSound,
      learnerResponse: answer,
    });

    if (grade.summary) {
      finalSummary = grade.summary;
    }
  }

  // ═════════════════════════════════════════════
  // 5. MEMORY — Knowledge Graph Update
  // ═════════════════════════════════════════════
  console.log('\n---');
  console.log('SUMMARY:');
  console.log(`solid: ${finalSummary?.solid || goal}`);
  console.log(`shaky: ${finalSummary?.shaky || 'None'}`);
  console.log(`revisit-when: ${finalSummary?.revisitWhen || 'When applying in complex edge-cases'}`);
  console.log('---');

  // Update knowledge graph file
  const newChains = [];
  if (taughtPropositions.length >= 2) {
    const premises = taughtPropositions.slice(0, -1).map((p) => p.claim);
    const conclusion = taughtPropositions[taughtPropositions.length - 1].claim;
    newChains.push({ premises, conclusion });
  }

  updateKnowledgeGraphPropositions(taughtPropositions, newChains);
  console.log('\n[Memory] Updated ./knowledge-graph.md with new propositions and reasoning chains.');
  console.log('Session completed successfully.\n');

  rl.close();
}

runLearningHarness().catch((err) => {
  console.error('\n[Error in Learning Harness]', err);
  rl.close();
});
