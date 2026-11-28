import Question from '../models/Question.js';
import { getCachedAnswer, setCachedAnswer } from '../services/cacheService.js';
import {
  refinePrompt,
  generateStructuredAnswer,
  simplifyExplanation,
  generateFollowUpAnswer,
  isGreetingOrCasual,
} from '../services/llmService.js';
import { detectAndGenerateVisualizationTrace } from '../services/visualizerService.js';

/**
 * Helper to stream text in small smooth chunks for realistic SSE delivery
 */
const streamTextInChunks = async (text, res, chunkSize = 4, delayMs = 25) => {
  const words = text.split(/(\s+)/); // Preserves whitespace
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join('');
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Ask Question - Real-Time SSE Stream with Redis Caching and AI Refinement
 * POST /api/questions
 */
export const askQuestion = async (req, res, next) => {
  const { question: rawQuestion, parentQuestionId, modelConfig } = req.body;
  const customModelConfig = modelConfig || req.user?.customModel || null;

  if (parentQuestionId) {
    return handleFollowUpStream(req, res, parentQuestionId, rawQuestion, customModelConfig);
  }
  const userId = req.user._id;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });

  try {
    // 1. Check Redis Answer Cache
    const cached = await getCachedAnswer(rawQuestion);
    if (cached) {
      res.write(`event: status\ndata: ${JSON.stringify({ stage: 'cache_hit', message: 'Instant response retrieved from Redis cache.' })}\n\n`);

      // Even on cache hit, show the refined prompt
      res.write(`event: refined_prompt\ndata: ${JSON.stringify({ refinedPrompt: cached.refinedPrompt })}\n\n`);

      // Stream the cached text smoothly so the student experiences reading pace
      await streamTextInChunks(cached.explanation, res, 8, 10);

      // Save question in current user's history if not already duplicate for this user today
      let savedQuestion = await Question.findOne({
        userId,
        rawQuestion: cached.rawQuestion,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (!savedQuestion) {
        savedQuestion = await Question.create({
          userId,
          rawQuestion: cached.rawQuestion,
          refinedPrompt: cached.refinedPrompt,
          explanation: cached.explanation,
          keyPoints: cached.keyPoints || [],
          slides: cached.slides || [],
          chartData: cached.chartData || null,
          subjectTag: cached.subjectTag || 'general_engineering',
          searchKeywords: cached.searchKeywords || [],
          visualizationTrace: cached.visualizationTrace || null,
        });
      }

      res.write(
        `event: done\ndata: ${JSON.stringify({
          question: savedQuestion || cached,
          isCached: true,
        })}\n\n`
      );

      clearInterval(heartbeat);
      return res.end();
    }

    // 2. Cache Miss: Stage 1 - Prompt Refinement
    const isCasual = isGreetingOrCasual(rawQuestion);
    res.write(
      `event: status\ndata: ${JSON.stringify({
        stage: 'refining',
        message: isCasual
          ? 'Connecting to Clario AI tutor...'
          : 'Synthesizing pedagogical prompt via AI layer...',
      })}\n\n`
    );

    const refined = await refinePrompt(rawQuestion, customModelConfig);

    // Send refined prompt immediately to student UI
    res.write(`event: refined_prompt\ndata: ${JSON.stringify({ refinedPrompt: refined })}\n\n`);

    // 3. Stage 2 - Structured Answer Generation
    res.write(
      `event: status\ndata: ${JSON.stringify({
        stage: 'generating',
        message: isCasual
          ? 'Preparing response...'
          : 'Generating comprehensive explanation and analytical deck...',
      })}\n\n`
    );

    const structuredAnswer = await generateStructuredAnswer(refined, rawQuestion, customModelConfig);

    // 4. Stream explanation content progressively
    await streamTextInChunks(structuredAnswer.explanation, res, 4, 30);

    // 5. Persist to MongoDB
    const newQuestion = await Question.create({
      userId,
      rawQuestion,
      refinedPrompt: refined,
      explanation: structuredAnswer.explanation,
      keyPoints: structuredAnswer.keyPoints,
      slides: structuredAnswer.slides || [],
      chartData: structuredAnswer.chartData,
      subjectTag: structuredAnswer.subjectTag,
      searchKeywords: structuredAnswer.searchKeywords || [],
      visualizationTrace: structuredAnswer.visualizationTrace || null,
    });

    // 6. Cache in Redis for instant repeat retrieval (7 days TTL)
    await setCachedAnswer(rawQuestion, {
      _id: newQuestion._id,
      rawQuestion,
      refinedPrompt: refined,
      explanation: structuredAnswer.explanation,
      keyPoints: structuredAnswer.keyPoints,
      slides: structuredAnswer.slides || [],
      chartData: structuredAnswer.chartData,
      subjectTag: structuredAnswer.subjectTag,
      searchKeywords: structuredAnswer.searchKeywords || [],
      visualizationTrace: structuredAnswer.visualizationTrace || null,
    });

    // 7. Emit final payload with complete chartData, keyPoints, and MongoDB document ID
    res.write(
      `event: done\ndata: ${JSON.stringify({
        question: newQuestion,
        isCached: false,
      })}\n\n`
    );

    clearInterval(heartbeat);
    res.end();
  } catch (error) {
    console.error('Error in askQuestion SSE stream:', error);
    clearInterval(heartbeat);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: error.message || 'Failed to complete AI explanation generation.',
      })}\n\n`
    );
    res.end();
  }
};

/**
 * Handle Streaming Follow-up Question in Existing Conversation Thread (ChatGPT UX)
 * POST /api/questions/:id/follow-up or POST /api/questions with parentQuestionId
 */
export const handleFollowUpStream = async (req, res, parentQuestionId, followUpText, customModelConfig = null) => {
  const userId = req.user._id;

  if (!res.headersSent) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  }

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });

  try {
    const parentQuestion = await Question.findById(parentQuestionId);
    if (!parentQuestion) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Original conversation question not found.' })}\n\n`);
      clearInterval(heartbeat);
      return res.end();
    }

    // Append user follow-up message to thread
    parentQuestion.followUps = parentQuestion.followUps || [];
    parentQuestion.followUps.push({
      role: 'user',
      content: followUpText,
      createdAt: new Date(),
    });

    res.write(`event: status\ndata: ${JSON.stringify({ stage: 'thinking', message: 'Analyzing follow-up in context of previous explanation...' })}\n\n`);

    // Generate contextual response
    const followUpAnswer = await generateFollowUpAnswer(
      followUpText,
      parentQuestion.followUps,
      parentQuestion.rawQuestion,
      customModelConfig
    );

    // Stream the content progressively
    await streamTextInChunks(followUpAnswer.content, res, 4, 25);

    // Append assistant response to thread
    const trace = detectAndGenerateVisualizationTrace(followUpText);
    const assistantEntry = {
      role: 'assistant',
      content: followUpAnswer.content,
      slides: followUpAnswer.slides || [],
      chartData: followUpAnswer.chartData || null,
      visualizationTrace: trace || null,
      createdAt: new Date(),
    };
    parentQuestion.followUps.push(assistantEntry);

    // If follow-up mentions or triggers an algorithm, update the active visualization trace
    if (trace) {
      parentQuestion.visualizationTrace = trace;
    }

    // If this follow-up generated a new slide deck, update parentQuestion slides so the presentation view reflects it
    if (assistantEntry.slides?.length > 0) {
      parentQuestion.slides = assistantEntry.slides;
      if (assistantEntry.chartData) {
        parentQuestion.chartData = assistantEntry.chartData;
      }
      parentQuestion.rawQuestion = followUpText;
      parentQuestion.explanation = assistantEntry.content;
      if (followUpAnswer.keyTakeaways?.length > 0) {
        parentQuestion.keyPoints = followUpAnswer.keyTakeaways;
      }
    }

    await parentQuestion.save();

    // Emit final done event with full updated thread
    res.write(
      `event: done\ndata: ${JSON.stringify({
        question: parentQuestion,
        isFollowUp: true,
        followUps: parentQuestion.followUps,
        latestResponse: assistantEntry,
        visualizationTrace: trace || parentQuestion.visualizationTrace,
        slides: assistantEntry.slides?.length > 0 ? assistantEntry.slides : parentQuestion.slides,
      })}\n\n`
    );

    clearInterval(heartbeat);
    res.end();
  } catch (err) {
    console.error('Error in handleFollowUpStream:', err);
    clearInterval(heartbeat);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message || 'Failed generating follow-up response' })}\n\n`);
    res.end();
  }
};

export const askFollowUp = async (req, res, next) => {
  const { id } = req.params;
  const { question: followUpText, modelConfig } = req.body;
  const customModelConfig = modelConfig || req.user?.customModel || null;
  return handleFollowUpStream(req, res, id, followUpText, customModelConfig);
};

/**
 * Simplify Question Answer (ELI5 Toggle)
 * POST /api/questions/simplify
 */
export const simplifyQuestion = async (req, res, next) => {
  try {
    const { questionId, modelConfig } = req.body;
    const customModelConfig = modelConfig || req.user?.customModel || null;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.simplifiedVersion && !customModelConfig?.enabled) {
      return res.status(200).json({
        success: true,
        simplified: question.simplifiedVersion,
        isCached: true,
      });
    }

    const simplified = await simplifyExplanation(question.explanation, question.rawQuestion, customModelConfig);

    question.isSimplified = true;
    question.simplifiedVersion = simplified;
    await question.save();

    res.status(200).json({
      success: true,
      simplified,
      isCached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Question History (Paginated, Searchable, Tag-filterable)
 * GET /api/questions
 */
export const getQuestions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Students only see their own history; Teachers/Admins can see all or filter
    if (req.user.role === 'student' || req.query.self === 'true') {
      filter.userId = req.user._id;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    // Tag filter
    if (req.query.tag && req.query.tag !== 'all') {
      filter.subjectTag = req.query.tag.toLowerCase();
    }

    // Text search query
    if (req.query.search && req.query.search.trim()) {
      filter.$text = { $search: req.query.search.trim() };
    }

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      count: questions.length,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Question by ID
 * GET /api/questions/:id
 */
export const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('userId', 'name email role');
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check ownership if student
    if (req.user.role === 'student' && question.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this question' });
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Question
 * DELETE /api/questions/:id
 */
export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Only owner or admin can delete
    if (req.user.role !== 'admin' && question.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this question' });
    }

    await question.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unique subject tags used in the system
 * GET /api/questions/tags
 */
export const getTags = async (req, res, next) => {
  try {
    const tags = await Question.distinct('subjectTag');
    res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};
