import express from 'express';
import {
  submitFeedback,
  getFeedbackFeed,
  getQuestionFeedback,
} from '../controllers/feedbackController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { feedbackSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(feedbackSchema), submitFeedback);
router.get('/question/:questionId', getQuestionFeedback);
router.get('/', authorize('teacher', 'admin'), getFeedbackFeed);

export default router;
