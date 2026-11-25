import { getRedisClient } from '../config/redis.js';

export const questionRateLimiter = async (req, res, next) => {
  try {
    // Teachers and Admins have unlimited or higher quota for review/analytics
    if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
      res.setHeader('X-RateLimit-Limit', 'Unlimited');
      res.setHeader('X-RateLimit-Remaining', 'Unlimited');
      return next();
    }

    const redis = getRedisClient();
    const userId = req.user ? req.user._id.toString() : req.ip;
    const limit = parseInt(process.env.DAILY_QUESTION_LIMIT || '10', 10);

    // Current date key for midnight rotation, or rolling 24h key
    const today = new Date().toISOString().slice(0, 10);
    const key = `ratelimit:question:${userId}:${today}`;

    // Atomically increment
    const count = await redis.incr(key);

    // If first request of the day, set expiration to 24 hours (86400s)
    if (count === 1) {
      await redis.expire(key, 86400);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - count);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', ttl > 0 ? ttl : 86400);

    if (count > limit) {
      return res.status(429).json({
        success: false,
        message: `Daily question quota exceeded. You have used all ${limit} free AI learning queries for today.`,
        limit,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : 86400,
        hint: 'Rate limiting protects LLM computing resources. Quota resets in 24 hours.',
      });
    }

    next();
  } catch (error) {
    console.error('RateLimiter error:', error);
    // Fail open to avoid blocking user in case of unexpected cache error
    next();
  }
};

export const shortsRateLimiter = async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const userId = req.user ? (req.user._id ? req.user._id.toString() : req.user.id) : req.ip;
    const limit = 30;
    const key = `rl:shorts:${userId}`;

    // Atomically increment
    const count = await redis.incr(key);

    // If first request of the day, set expiration to 24 hours (86400s)
    if (count === 1) {
      await redis.expire(key, 86400);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - count);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', ttl > 0 ? ttl : 86400);

    if (count > limit) {
      return res.status(429).json({
        success: false,
        message: `Daily shorts quota exceeded. You have used all ${limit} shorts requests for today.`,
        limit,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : 86400,
        hint: 'Daily quota resets in 24 hours.',
      });
    }

    next();
  } catch (error) {
    console.error('ShortsRateLimiter error:', error);
    next();
  }
};
