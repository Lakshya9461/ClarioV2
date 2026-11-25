import HarnessSession from '../models/HarnessSession.js';
import { detectAndGenerateVisualizationTrace } from '../services/visualizerService.js';
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

/**
 * Get Knowledge Graph (reads ./knowledge-graph.md)
 * GET /api/harness/graph
 */
export const getKnowledgeGraph = async (req, res, next) => {
  try {
    const graph = readKnowledgeGraph();
    res.status(200).json({ ok: true, graph });
  } catch (err) {
    next(err);
  }
};

/**
 * Get User's Active or Latest Session
 * GET /api/harness/session
 */
export const getActiveSession = async (req, res, next) => {
  try {
    const session = await HarnessSession.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json({ ok: true, session });
  } catch (err) {
    next(err);
  }
};

/**
 * Start a new Learning Harness Session (MEASURE Phase)
 * POST /api/harness/session
 */
export const startSession = async (req, res, next) => {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({ ok: false, message: 'Learning goal is required.' });
    }

    const trimmedGoal = goal.trim();
    const graph = readKnowledgeGraph();
    const probes = await generatePrerequisiteProbes(trimmedGoal, graph);
    const visualizationTrace = detectAndGenerateVisualizationTrace(trimmedGoal);

    const session = await HarnessSession.create({
      userId: req.user._id,
      goal: trimmedGoal,
      phase: 'MEASURE',
      currentProbeIndex: 0,
      probes,
      visualizationTrace,
    });

    res.status(201).json({ ok: true, session });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit response and transition harness state machine
 * POST /api/harness/session/:id/respond
 */
export const submitResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseType, data } = req.body;

    let session = await HarnessSession.findOne({ _id: id, userId: req.user._id });
    if (!session) {
      // If server re-authenticated under demo role fallback, check by ID
      session = await HarnessSession.findById(id);
      if (session && String(session.userId) !== String(req.user._id)) {
        session.userId = req.user._id;
      }
    }

    if (!session) {
      return res.status(404).json({
        ok: false,
        message: 'Harness session not found. The in-memory database may have reset during a server reload. Please start a new session.',
      });
    }

    let lastEvaluation = null;

    // ═════════════════════════════════════════════
    // PHASE 1: MEASURE
    // ═════════════════════════════════════════════
    if (session.phase === 'MEASURE') {
      const { selectedOption, confidence, thinking } = data || {};
      const currentProbe = session.probes[session.currentProbeIndex];

      if (!currentProbe) {
        return res.status(400).json({ ok: false, message: 'No active probe to evaluate.' });
      }

      const evaluation = await scoreProbeResponse({
        question: currentProbe.question,
        options: currentProbe.options,
        correctOption: currentProbe.correctOption,
        selectedOption,
        confidence: Number(confidence) || 50,
        thinking: thinking || '',
      });

      currentProbe.selectedOption = selectedOption;
      currentProbe.confidence = Number(confidence) || 50;
      currentProbe.thinking = thinking || '';
      currentProbe.score = evaluation.score;
      currentProbe.reasoningModel = evaluation.reasoningModel;
      lastEvaluation = evaluation;

      // Check if more probes remain
      if (session.currentProbeIndex + 1 < session.probes.length) {
        session.currentProbeIndex += 1;
      } else {
        // All probes complete -> Generate Lesson Map & transition to PLAN
        const lessonPlan = await buildLessonMap(session.goal, session.probes);
        session.lessonPlan = {
          asciiTree: lessonPlan.asciiTree,
          nodes: lessonPlan.nodes,
          explanation: lessonPlan.explanation,
          accepted: false,
        };
        session.phase = 'PLAN';
      }

      await session.save();
      return res.status(200).json({ ok: true, session, lastEvaluation });
    }

    // ═════════════════════════════════════════════
    // PHASE 2: PLAN
    // ═════════════════════════════════════════════
    if (session.phase === 'PLAN') {
      session.lessonPlan.accepted = true;

      // Build teaching node list
      const toTeach = session.lessonPlan.nodes.filter(
        (n) => n.status === 'to_teach' || n.status === 'goal'
      );

      const teachingNodes = toTeach.map((t) => ({
        id: t.id,
        name: t.name,
        status: 'to_teach',
        attempts: 0,
        history: [],
      }));

      // Generate predict question for the first node
      const firstNode = teachingNodes[0];
      const prevNode = session.lessonPlan.nodes.find((n) => n.status === 'understood')?.name || null;
      if (firstNode) {
        const predictQ = await generatePredictQuestion(firstNode.name, session.goal, prevNode);
        firstNode.predictQuestion = {
          question: predictQ.question,
          options: predictQ.options,
          correctOption: predictQ.correctOption,
          conceptClaim: predictQ.conceptClaim,
        };
      }

      session.teaching = {
        currentNodeIndex: 0,
        nodes: teachingNodes,
      };
      session.phase = 'TEACH';

      await session.save();
      return res.status(200).json({ ok: true, session });
    }

    // ═════════════════════════════════════════════
    // PHASE 3: TEACH
    // ═════════════════════════════════════════════
    if (session.phase === 'TEACH') {
      const { selectedOption, confidence, thinking } = data || {};
      const teaching = session.teaching;
      const currentNode = teaching.nodes[teaching.currentNodeIndex];

      if (!currentNode || !currentNode.predictQuestion) {
        return res.status(400).json({ ok: false, message: 'No active node in teaching phase.' });
      }

      currentNode.attempts += 1;
      const prevNodeName = teaching.currentNodeIndex > 0 ? teaching.nodes[teaching.currentNodeIndex - 1].name : null;

      const evalResult = await evaluatePredictResponse({
        nodeName: currentNode.name,
        previousNodeName: prevNodeName,
        question: currentNode.predictQuestion.question,
        options: currentNode.predictQuestion.options,
        correctOption: currentNode.predictQuestion.correctOption,
        selectedOption,
        confidence: Number(confidence) || 50,
        thinking: thinking || '',
        attemptNumber: currentNode.attempts,
        conceptClaim: currentNode.predictQuestion.conceptClaim,
      });

      currentNode.history.push({
        selectedOption,
        confidence: Number(confidence) || 50,
        thinking: thinking || '',
        action: evalResult.action,
        explanation: evalResult.explanation,
      });

      lastEvaluation = evalResult;

      // Handle teaching action
      if (evalResult.action === 'advance' || evalResult.action === 'verify_intuition' || evalResult.action === 'force_advance') {
        currentNode.status = evalResult.action === 'force_advance' ? 'shaky' : 'solid';

        // Update knowledge graph proposition
        updateKnowledgeGraphPropositions([
          {
            status: currentNode.status,
            topic: session.goal,
            claim: currentNode.predictQuestion.conceptClaim || `${currentNode.name} invariant behavior established.`,
          },
        ]);

        // Check if more nodes remain
        if (teaching.currentNodeIndex + 1 < teaching.nodes.length) {
          teaching.currentNodeIndex += 1;
          const nextNode = teaching.nodes[teaching.currentNodeIndex];
          const nextPredictQ = await generatePredictQuestion(nextNode.name, session.goal, currentNode.name);
          nextNode.predictQuestion = {
            question: nextPredictQ.question,
            options: nextPredictQ.options,
            correctOption: nextPredictQ.correctOption,
            conceptClaim: nextPredictQ.conceptClaim,
          };
        } else {
          // All nodes taught! Transition to PRACTICE
          const shakyNodes = teaching.nodes.filter((n) => n.status === 'shaky').map((n) => n.name);
          const practiceProblems = await generatePracticeProblems(session.goal, teaching.nodes, shakyNodes);

          session.practice = {
            problems: practiceProblems.map((p) => ({
              problemIndex: p.problemIndex,
              totalProblems: p.totalProblems,
              prompt: p.prompt,
              targetConcept: p.targetConcept,
              isTargetShaky: p.isTargetShaky,
            })),
            currentProblemIndex: 0,
          };
          session.phase = 'PRACTICE';
        }
      } else if (evalResult.action === 'repair' && evalResult.variantQuestion) {
        // Update predict question to the repair variant question
        currentNode.predictQuestion.question = evalResult.variantQuestion.question;
        currentNode.predictQuestion.options = evalResult.variantQuestion.options;
        currentNode.predictQuestion.correctOption = evalResult.variantQuestion.correctOption;
      }

      await session.save();
      return res.status(200).json({ ok: true, session, lastEvaluation });
    }

    // ═════════════════════════════════════════════
    // PHASE 4: PRACTICE
    // ═════════════════════════════════════════════
    if (session.phase === 'PRACTICE') {
      const { learnerResponse } = data || {};
      const practice = session.practice;
      const currentProb = practice.problems[practice.currentProblemIndex];

      if (!currentProb) {
        return res.status(400).json({ ok: false, message: 'No active practice problem.' });
      }

      const grade = await gradePracticeResponse({
        problemPrompt: currentProb.prompt,
        targetConcept: currentProb.targetConcept,
        learnerResponse: learnerResponse || '',
        problemIndex: currentProb.problemIndex,
        totalProblems: currentProb.totalProblems,
        cumulativeResults: practice.problems.filter((p) => p.isSound !== undefined),
      });

      currentProb.learnerResponse = learnerResponse || '';
      currentProb.isSound = grade.isSound;
      currentProb.feedback = grade.feedback;
      lastEvaluation = grade;

      if (practice.currentProblemIndex + 1 < practice.problems.length) {
        practice.currentProblemIndex += 1;
      } else {
        // Completed all practice problems
        practice.summary = grade.summary || {
          solid: session.goal,
          shaky: 'None',
          revisitWhen: 'When testing under scale constraints',
        };
        session.phase = 'COMPLETED';

        // Update knowledge graph tags and chains
        const newChains = [];
        const solidProps = (session.teaching?.nodes || [])
          .filter((n) => n.status === 'solid')
          .map((n) => n.predictQuestion?.conceptClaim || n.name);

        if (solidProps.length >= 2) {
          newChains.push({
            premises: solidProps.slice(0, -1),
            conclusion: solidProps[solidProps.length - 1],
          });
        }

        updateKnowledgeGraphPropositions(
          (session.teaching?.nodes || []).map((n) => ({
            status: n.status,
            topic: session.goal,
            claim: n.predictQuestion?.conceptClaim || n.name,
          })),
          newChains
        );
      }

      await session.save();
      return res.status(200).json({ ok: true, session, lastEvaluation });
    }

    return res.status(400).json({ ok: false, message: 'Session is already completed.' });
  } catch (err) {
    next(err);
  }
};
