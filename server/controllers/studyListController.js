import StudyList from '../models/StudyList.js';

/**
 * Create a new Study List
 * POST /api/study-lists
 */
export const createStudyList = async (req, res, next) => {
  try {
    const { name, description, questionId } = req.body;

    const questionIds = questionId ? [questionId] : [];

    const studyList = await StudyList.create({
      userId: req.user._id,
      name,
      description: description || '',
      questionIds,
    });

    res.status(201).json({
      success: true,
      data: studyList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Study Lists for the current user
 * GET /api/study-lists
 */
export const getStudyLists = async (req, res, next) => {
  try {
    const studyLists = await StudyList.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'questionIds',
        select: 'rawQuestion subjectTag createdAt chartData',
      });

    res.status(200).json({
      success: true,
      count: studyLists.length,
      data: studyLists,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single Study List with populated questions
 * GET /api/study-lists/:id
 */
export const getStudyListById = async (req, res, next) => {
  try {
    const studyList = await StudyList.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('questionIds');

    if (!studyList) {
      return res.status(404).json({ success: false, message: 'Study list not found' });
    }

    res.status(200).json({
      success: true,
      data: studyList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Study List (Rename, add question, or remove question)
 * PATCH /api/study-lists/:id
 */
export const updateStudyList = async (req, res, next) => {
  try {
    const { name, description, addQuestionId, removeQuestionId, questionIds } = req.body;

    const studyList = await StudyList.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!studyList) {
      return res.status(404).json({ success: false, message: 'Study list not found' });
    }

    if (name) studyList.name = name;
    if (description !== undefined) studyList.description = description;

    if (Array.isArray(questionIds)) {
      studyList.questionIds = questionIds;
    }

    if (addQuestionId) {
      const exists = studyList.questionIds.some(
        (id) => id.toString() === addQuestionId.toString()
      );
      if (!exists) {
        studyList.questionIds.push(addQuestionId);
      }
    }

    if (removeQuestionId) {
      studyList.questionIds = studyList.questionIds.filter(
        (id) => id.toString() !== removeQuestionId.toString()
      );
    }

    await studyList.save();
    await studyList.populate('questionIds');

    res.status(200).json({
      success: true,
      data: studyList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Study List
 * DELETE /api/study-lists/:id
 */
export const deleteStudyList = async (req, res, next) => {
  try {
    const studyList = await StudyList.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!studyList) {
      return res.status(404).json({ success: false, message: 'Study list not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Study list deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
