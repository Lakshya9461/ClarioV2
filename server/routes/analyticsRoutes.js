import express from 'express';
import { getTeacherAnalytics } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.get('/', getTeacherAnalytics);

export default router;
