import express from 'express';
import {
  getKnowledgeGraph,
  getActiveSession,
  startSession,
  submitResponse,
} from '../controllers/learningHarnessController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/graph', getKnowledgeGraph);
router.get('/session', getActiveSession);
router.post('/session', startSession);
router.post('/session/:id/respond', submitResponse);

export default router;
