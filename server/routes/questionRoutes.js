import express from 'express';
import {
  askQuestion,
  askFollowUp,
  simplifyQuestion,
  getQuestions,
  getQuestionById,
  deleteQuestion,
  getTags,
} from '../controllers/questionController.js';
import { protect } from '../middleware/auth.js';
import { questionRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validation.js';
import { askQuestionSchema, simplifySchema, followUpSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(protect); // All question actions require auth

router.post('/', questionRateLimiter, validateBody(askQuestionSchema), askQuestion);
router.post('/:id/follow-up', questionRateLimiter, validateBody(followUpSchema), askFollowUp);
router.post('/simplify', validateBody(simplifySchema), simplifyQuestion);
router.get('/tags', getTags);
router.get('/', getQuestions);
router.get('/:id', getQuestionById);
router.delete('/:id', deleteQuestion);

export default router;
