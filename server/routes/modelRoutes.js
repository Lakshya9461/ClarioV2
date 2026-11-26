import express from 'express';
import {
  getPresets,
  getModelConfig,
  updateModelConfig,
  testModelConnectionEndpoint,
} from '../controllers/modelController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Optional user extractor helper
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      await protect(req, res, () => {});
    }
  } catch (_) {
    // Ignore error for optional auth
  }
  next();
};

router.get('/presets', getPresets);
router.get('/config', optionalAuth, getModelConfig);
router.put('/config', protect, updateModelConfig);
router.post('/test', testModelConnectionEndpoint);

export default router;
