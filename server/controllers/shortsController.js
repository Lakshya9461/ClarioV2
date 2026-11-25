import { getShortsForTopic } from '../services/shortsService.js';

/**
 * Controller to handle GET /api/shorts?topic=...&prompt=...
 */
export const getShorts = async (req, res, next) => {
  try {
    const { topic, prompt } = req.query;

    const result = await getShortsForTopic(topic, prompt);

    return res.status(200).json({
      success: true,
      topic: result.topic,
      prompt: result.prompt,
      cached: result.cached,
      shorts: result.shorts,
    });
  } catch (error) {
    next(error);
  }
};
