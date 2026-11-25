import express from 'express';
import {
  createStudyList,
  getStudyLists,
  getStudyListById,
  updateStudyList,
  deleteStudyList,
} from '../controllers/studyListController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { studyListCreateSchema, studyListUpdateSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(studyListCreateSchema), createStudyList);
router.get('/', getStudyLists);
router.get('/:id', getStudyListById);
router.patch('/:id', validateBody(studyListUpdateSchema), updateStudyList);
router.delete('/:id', deleteStudyList);

export default router;
