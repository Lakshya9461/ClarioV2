import Question from '../models/Question.js';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import StudyList from '../models/StudyList.js';

/**
 * Teacher Analytics Dashboard Aggregation Pipeline
 * GET /api/analytics
 */
export const getTeacherAnalytics = async (req, res, next) => {
  try {
    // 1. Summary Counts
    const [totalUsers, totalStudents, totalQuestions, totalFeedback, totalStudyLists] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        Question.countDocuments(),
        Feedback.countDocuments(),
        StudyList.countDocuments(),
      ]);

    // 2. Questions per Subject Tag Aggregation
    const questionsPerTag = await Question.aggregate([
      {
        $group: {
          _id: '$subjectTag',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    // 3. Feedback Rating Overview Aggregation
    const feedbackStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageRating =
      feedbackStats.length > 0 && feedbackStats[0].avgRating
        ? Math.round(feedbackStats[0].avgRating * 10) / 10
        : 0;

    // 4. Rating Distribution (1 to 5 stars)
    const ratingDistribution = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          rating: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    // 5. Average Rating per Subject Tag (Lookup + Aggregation)
    const tagRatings = await Feedback.aggregate([
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $group: {
          _id: '$question.subjectTag',
          avgRating: { $avg: '$rating' },
          feedbackCount: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
      {
        $project: {
          tag: '$_id',
          avgRating: { $round: ['$avgRating', 1] },
          feedbackCount: 1,
          _id: 0,
        },
      },
    ]);

    // 6. Most-Asked Topics / Questions Aggregation
    const mostAskedTopics = await Question.aggregate([
      {
        $group: {
          _id: { $toLower: '$rawQuestion' },
          count: { $sum: 1 },
          subjectTag: { $first: '$subjectTag' },
          lastAsked: { $max: '$createdAt' },
          sampleId: { $first: '$_id' },
        },
      },
      { $sort: { count: -1, lastAsked: -1 } },
      { $limit: 8 },
      {
        $project: {
          topic: '$_id',
          count: 1,
          subjectTag: 1,
          lastAsked: 1,
          sampleId: 1,
          _id: 0,
        },
      },
    ]);

    // 7. Activity Over Last 7 Days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityTrends = await Question.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          questionsAsked: '$count',
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalStudents,
          totalQuestions,
          totalFeedback,
          totalStudyLists,
          averageRating,
        },
        questionsPerTag,
        tagRatings,
        ratingDistribution,
        mostAskedTopics,
        activityTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};
