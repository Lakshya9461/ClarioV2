import Feedback from '../models/Feedback.js';
import Question from '../models/Question.js';

/**
 * Submit or update rating and feedback for an answer
 * POST /api/feedback
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { questionId, rating, comment } = req.body;
    const userId = req.user._id;

    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Upsert feedback
    const feedback = await Feedback.findOneAndUpdate(
      { userId, questionId },
      { rating, comment: comment || '' },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback feed (Teacher / Admin access)
 * GET /api/feedback
 */
export const getFeedbackFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const total = await Feedback.countDocuments();
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role')
      .populate('questionId', 'rawQuestion subjectTag');

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user feedback for a specific question
 * GET /api/feedback/question/:questionId
 */
export const getQuestionFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({
      questionId: req.params.questionId,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: feedback || null,
    });
  } catch (error) {
    next(error);
  }
};
