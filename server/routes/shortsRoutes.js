import express from 'express';
import { getShorts } from '../controllers/shortsController.js';
import { protect, authorize } from '../middleware/auth.js';
import { shortsRateLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../middleware/validation.js';
import { shortsQuerySchema } from '../validators/schemas.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student', 'teacher', 'admin'));

router.get('/', shortsRateLimiter, validateQuery(shortsQuerySchema), getShorts);

export default router;
