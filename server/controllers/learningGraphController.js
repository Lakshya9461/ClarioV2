import LearnerGraph from '../models/LearnerGraph.js';
import LearningSession from '../models/LearningSession.js';
import Question from '../models/Question.js';
import {
  advanceLearningSession,
  buildLearningPlan,
  LearningGraphError,
  validateConcept,
  validateRelationship,
} from '../services/learningGraphService.js';

const getOrCreateGraph = (userId) =>
  LearnerGraph.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, concepts: [], relationships: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const handleError = (error, res, next) => {
  if (error instanceof LearningGraphError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }
  return next(error);
};

export const getLearningGraph = async (req, res, next) => {
  try {
    const graph = await getOrCreateGraph(req.user._id);
    res.status(200).json({ success: true, data: graph });
  } catch (error) {
    next(error);
  }
};

export const createConcept = async (req, res, next) => {
  try {
    const graph = await getOrCreateGraph(req.user._id);
    const concept = validateConcept(req.body);

    if (graph.concepts.some((item) => item.conceptId === concept.conceptId)) {
      throw new LearningGraphError('A concept with this ID already exists.', 409, 'concept_exists');
    }

    graph.concepts.push(concept);
    await graph.save();
    res.status(201).json({ success: true, data: graph });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const updateConceptAssessment = async (req, res, next) => {
  try {
    const graph = await LearnerGraph.findOne({ userId: req.user._id });
    if (!graph) {
      throw new LearningGraphError('Learner graph not found.', 404, 'graph_not_found');
    }

    const concept = graph.concepts.find((item) => item.conceptId === req.params.conceptId);
    if (!concept) {
      throw new LearningGraphError('Concept was not found in the learner graph.', 404, 'concept_not_found');
    }

    concept.assessment.status = req.body.status;
    concept.assessment.evidence = req.body.evidence;
    concept.assessment.summary = req.body.summary;
    concept.assessment.updatedAt = new Date();
    await graph.save();
    res.status(200).json({ success: true, data: graph });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const addRelationship = async (req, res, next) => {
  try {
    const graph = await LearnerGraph.findOne({ userId: req.user._id });
    if (!graph) {
      throw new LearningGraphError('Learner graph not found.', 404, 'graph_not_found');
    }

    const relationship = validateRelationship(graph, req.body);
    graph.relationships.push(relationship);
    await graph.save();
    res.status(201).json({ success: true, data: graph });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const getLearningSessions = async (req, res, next) => {
  try {
    const sessions = await LearningSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const createLearningSession = async (req, res, next) => {
  try {
    const graph = await LearnerGraph.findOne({ userId: req.user._id });
    if (!graph) {
      throw new LearningGraphError('Add concepts to your learning graph before creating a path.', 409, 'empty_graph');
    }

    const plan = buildLearningPlan(graph, req.body.goalConceptId);
    const goal = graph.concepts.find((concept) => concept.conceptId === req.body.goalConceptId);
    const selectedConceptIds = new Set(plan.nodes.map((node) => node.conceptId));
    const assessmentSnapshot = graph.concepts
      .filter((concept) => selectedConceptIds.has(concept.conceptId))
      .map((concept) => ({
        conceptId: concept.conceptId,
        status: concept.assessment.status,
        evidence: concept.assessment.evidence,
        summary: concept.assessment.summary,
      }));

    const session = await LearningSession.create({
      userId: req.user._id,
      goalConceptId: goal.conceptId,
      goalName: goal.name,
      status: 'proposed',
      assessmentSnapshot,
      plan: { ...plan, currentNodeId: null },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const acceptLearningSession = async (req, res, next) => {
  try {
    const session = await LearningSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      throw new LearningGraphError('Learning session was not found.', 404, 'session_not_found');
    }
    if (session.status !== 'proposed') {
      throw new LearningGraphError('Only a proposed learning path can be accepted.', 409, 'session_not_proposed');
    }

    session.status = 'active';
    session.plan.currentNodeId = session.plan.nodes[0]?.id || null;
    session.acceptedAt = new Date();
    await session.save();
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const linkQuestionToNode = async (req, res, next) => {
  try {
    const session = await LearningSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      throw new LearningGraphError('Learning session was not found.', 404, 'session_not_found');
    }
    if (session.status !== 'active') {
      throw new LearningGraphError(
        'Questions can only be linked to an active learning path.',
        409,
        'session_not_active'
      );
    }
    if (!session.plan.nodes.some((node) => node.id === req.body.nodeId)) {
      throw new LearningGraphError('Plan node was not found in this learning path.', 404, 'node_not_found');
    }

    const questionExists = await Question.exists({
      _id: req.body.questionId,
      userId: req.user._id,
    });
    if (!questionExists) {
      throw new LearningGraphError(
        'Saved tutor question was not found for this user.',
        404,
        'question_not_found'
      );
    }

    const alreadyLinked = session.questions.some(
      (link) =>
        String(link.questionId) === req.body.questionId && link.nodeId === req.body.nodeId
    );
    if (alreadyLinked) {
      throw new LearningGraphError(
        'This tutor question is already linked to the plan node.',
        409,
        'question_already_linked'
      );
    }

    session.questions.push({
      questionId: req.body.questionId,
      nodeId: req.body.nodeId,
      kind: req.body.kind,
    });
    await session.save();
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    handleError(error, res, next);
  }
};

export const advanceLearningSessionRoute = async (req, res, next) => {
  try {
    const session = await LearningSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      throw new LearningGraphError('Learning session was not found.', 404, 'session_not_found');
    }

    const result = advanceLearningSession(session.toObject(), req.body.nodeId);
    session.status = result.status;
    session.plan = result.plan;
    session.events.push({
      nodeId: req.body.nodeId,
      kind: 'practiced',
      evidence: req.body.evidence,
      createdAt: new Date(),
    });
    if (result.status === 'completed') session.completedAt = new Date();

    await session.save();
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    handleError(error, res, next);
  }
};
