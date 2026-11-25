import express from 'express';
import {
  acceptLearningSession,
  addRelationship,
  advanceLearningSessionRoute,
  createConcept,
  createLearningSession,
  getLearningGraph,
  getLearningSessions,
  linkQuestionToNode,
  updateConceptAssessment,
} from '../controllers/learningGraphController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import {
  learningAssessmentSchema,
  learningConceptSchema,
  learningProgressSchema,
  learningQuestionLinkSchema,
  learningRelationshipSchema,
  learningSessionSchema,
} from '../validators/schemas.js';

const router = express.Router();

router.use(protect);

router.get('/', getLearningGraph);
router.post('/concepts', validateBody(learningConceptSchema), createConcept);
router.patch(
  '/concepts/:conceptId/assessment',
  validateBody(learningAssessmentSchema),
  updateConceptAssessment
);
router.post('/relationships', validateBody(learningRelationshipSchema), addRelationship);
router.get('/sessions', getLearningSessions);
router.post('/sessions', validateBody(learningSessionSchema), createLearningSession);
router.post('/sessions/:id/accept', acceptLearningSession);
router.post(
  '/sessions/:id/questions',
  validateBody(learningQuestionLinkSchema),
  linkQuestionToNode
);
router.post(
  '/sessions/:id/advance',
  validateBody(learningProgressSchema),
  advanceLearningSessionRoute
);

export default router;
