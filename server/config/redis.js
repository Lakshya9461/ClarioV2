import Redis from 'ioredis';

class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.expiries = new Map();
  }

  _cleanup(key) {
    if (this.expiries.has(key)) {
      const exp = this.expiries.get(key);
      if (Date.now() > exp) {
        this.store.delete(key);
        this.expiries.delete(key);
        return true;
      }
    }
    return false;
  }

  async get(key) {
    if (this._cleanup(key)) return null;
    const val = this.store.get(key);
    return val !== undefined ? String(val) : null;
  }

  async set(key, value, exFlag, ttlSeconds) {
    this.store.set(key, String(value));
    if (exFlag === 'EX' && ttlSeconds) {
      this.expiries.set(key, Date.now() + ttlSeconds * 1000);
    }
    return 'OK';
  }

  async incr(key) {
    this._cleanup(key);
    const curr = parseInt(this.store.get(key) || '0', 10);
    const next = curr + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.expiries.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key) {
    if (this._cleanup(key)) return -2;
    if (!this.store.has(key)) return -2;
    if (!this.expiries.has(key)) return -1;
    const diff = Math.ceil((this.expiries.get(key) - Date.now()) / 1000);
    return diff > 0 ? diff : -2;
  }

  async del(key) {
    const existed = this.store.delete(key);
    this.expiries.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern) {
    const now = Date.now();
    const result = [];
    for (const [key, exp] of this.expiries.entries()) {
      if (now > exp) {
        this.store.delete(key);
        this.expiries.delete(key);
      }
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  on() { return this; }
}

let redisClient;
let isInMemoryFallback = false;

export const initRedis = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL provided. Initializing in-memory fallback store.');
    redisClient = new InMemoryCache();
    isInMemoryFallback = true;
    return redisClient;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Connection failed after 3 attempts. Switching to in-memory fallback.');
          redisClient = new InMemoryCache();
          isInMemoryFallback = true;
          return null; // Stop retrying
        }
        return Math.min(times * 100, 1000);
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ [Redis] Connected successfully to Redis server');
      isInMemoryFallback = false;
    });

    redisClient.on('error', (err) => {
      console.warn(`⚠️ [Redis] Error: ${err.message}. Ensuring fallback availability.`);
      if (!isInMemoryFallback && redisClient && typeof redisClient.status === 'string' && redisClient.status !== 'ready') {
        redisClient = new InMemoryCache();
        isInMemoryFallback = true;
      }
    });

    return redisClient;
  } catch (err) {
    console.warn(`⚠️ [Redis] Failed to initialize ioredis (${err.message}). Using in-memory fallback.`);
    redisClient = new InMemoryCache();
    isInMemoryFallback = true;
    return redisClient;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};

export const isRedisFallback = () => isInMemoryFallback;
