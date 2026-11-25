import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDurationToSeconds,
  slugifyTopic,
  getShortsForTopic,
  setYouTubeClient,
} from '../services/shortsService.js';
import { curateShortsWithLLM } from '../services/llmService.js';
import { shortsRateLimiter } from '../middleware/rateLimiter.js';
import { getRedisClient } from '../config/redis.js';

describe('Shorts Mode Backend Unit & Integration Tests', () => {
  describe('1. ISO-8601 Duration Parser', () => {
    test('parses seconds only (PT45S -> 45s)', () => {
      assert.equal(parseDurationToSeconds('PT45S'), 45);
    });

    test('parses minutes only (PT1M -> 60s)', () => {
      assert.equal(parseDurationToSeconds('PT1M'), 60);
    });

    test('parses minutes and seconds (PT1M15S -> 75s)', () => {
      assert.equal(parseDurationToSeconds('PT1M15S'), 75);
    });

    test('parses hours, minutes, and seconds (PT1H2M3S -> 3723s)', () => {
      assert.equal(parseDurationToSeconds('PT1H2M3S'), 3723);
    });

    test('parses boundary 60s video (PT60S -> 60s)', () => {
      assert.equal(parseDurationToSeconds('PT60S'), 60);
    });

    test('returns 0 for invalid or empty duration strings', () => {
      assert.equal(parseDurationToSeconds(''), 0);
      assert.equal(parseDurationToSeconds(null), 0);
      assert.equal(parseDurationToSeconds(undefined), 0);
      assert.equal(parseDurationToSeconds('invalid'), 0);
      assert.equal(parseDurationToSeconds('12:34'), 0);
    });
  });

  describe('2. Slugify Topic Utility', () => {
    test('slugifies simple topic', () => {
      assert.equal(slugifyTopic('Recursion'), 'recursion');
    });

    test('slugifies comparison queries with special symbols', () => {
      assert.equal(slugifyTopic('C vs Python'), 'c-vs-python');
      assert.equal(slugifyTopic('C++ & Memory Management!'), 'c-memory-management');
    });

    test('handles empty or whitespace inputs gracefully', () => {
      assert.equal(slugifyTopic('   '), 'general');
      assert.equal(slugifyTopic(null), 'general');
    });
  });

  describe('3. Cache-Miss Path (Mock googleapis YouTube Client)', () => {
    const testTopic = 'graph-bfs';
    const slug = slugifyTopic(testTopic);
    const redis = getRedisClient();

    before(async () => {
      // Clear test key in Redis
      await redis.del(`shorts:${slug}`);

      // Mock googleapis youtube client
      const mockYouTube = {
        search: {
          list: async (params) => {
            assert.ok(params.q.includes(testTopic));
            assert.equal(params.type, 'video');
            assert.equal(params.videoDuration, 'short');
            return {
              data: {
                items: [
                  { id: { videoId: 'vid1' } },
                  { id: { videoId: 'vid2' } },
                  { id: { videoId: 'vid3_too_long' } },
                ],
              },
            };
          },
        },
        videos: {
          list: async (params) => {
            assert.ok(params.id.includes('vid1'));
            return {
              data: {
                items: [
                  {
                    id: 'vid1',
                    snippet: {
                      title: 'BFS in 50 Seconds',
                      channelTitle: 'Algorithms Daily',
                      thumbnails: { high: { url: 'https://img.youtube.com/vi/vid1/hqdefault.jpg' } },
                    },
                    contentDetails: { duration: 'PT50S' },
                  },
                  {
                    id: 'vid2',
                    snippet: {
                      title: 'Breadth First Search #shorts',
                      channelTitle: 'CodeBites',
                      thumbnails: { high: { url: 'https://img.youtube.com/vi/vid2/hqdefault.jpg' } },
                    },
                    contentDetails: { duration: 'PT59S' },
                  },
                  {
                    id: 'vid3_too_long',
                    snippet: {
                      title: 'Full Graph Tutorial',
                      channelTitle: 'Long Tutorials',
                      thumbnails: { high: { url: 'https://img.youtube.com/vi/vid3/hqdefault.jpg' } },
                    },
                    contentDetails: { duration: 'PT2M10S' }, // 130s > 60s, should be filtered out
                  },
                ],
              },
            };
          },
        },
      };

      setYouTubeClient(mockYouTube);
    });

    after(async () => {
      setYouTubeClient(null);
      await redis.del(`shorts:${slug}`);
    });

    test('fetches from mock YouTube API, filters <= 60s, and saves to Redis', async () => {
      const res = await getShortsForTopic(testTopic);

      assert.equal(res.cached, false);
      assert.equal(res.topic, testTopic);
      assert.equal(res.shorts.length, 2); // vid3_too_long filtered out!

      assert.equal(res.shorts[0].videoId, 'vid1');
      assert.equal(res.shorts[0].durationSec, 50);
      assert.equal(res.shorts[0].title, 'BFS in 50 Seconds');

      assert.equal(res.shorts[1].videoId, 'vid2');
      assert.equal(res.shorts[1].durationSec, 59);

      // Verify it was stored in Redis
      const stored = await redis.get(`shorts:${slug}`);
      assert.ok(stored);
      const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
      assert.equal(parsed.length, 2);
    });
  });

  describe('4. Cache-Hit Path (Mock Redis Hit)', () => {
    const testTopic = 'binary-search-tree';
    const slug = slugifyTopic(testTopic);
    const redis = getRedisClient();

    before(async () => {
      const cachedData = [
        {
          videoId: 'cachedVid1',
          title: 'BST in 45 Seconds',
          channel: 'DataStructureShorts',
          thumbnail: 'https://img.youtube.com/cachedVid1.jpg',
          durationSec: 45,
        },
      ];
      await redis.set(`shorts:${slug}`, JSON.stringify(cachedData), 'EX', 86400);

      // Mock YouTube client that throws if called
      setYouTubeClient({
        search: {
          list: async () => {
            throw new Error('API should not be called on cache hit');
          },
        },
      });
    });

    after(async () => {
      setYouTubeClient(null);
      await redis.del(`shorts:${slug}`);
    });

    test('returns cached shorts without calling YouTube API', async () => {
      const res = await getShortsForTopic(testTopic);

      assert.equal(res.cached, true);
      assert.equal(res.topic, testTopic);
      assert.equal(res.shorts.length, 1);
      assert.equal(res.shorts[0].videoId, 'cachedVid1');
      assert.equal(res.shorts[0].title, 'BST in 45 Seconds');
    });
  });

  describe('5. Shorts Rate Limiter (rl:shorts:{userId})', () => {
    const testUserId = `testuser_${Date.now()}`;
    const redis = getRedisClient();

    after(async () => {
      await redis.del(`rl:shorts:${testUserId}`);
    });

    test('allows up to 30 requests and blocks the 31st with 429', async () => {
      const req = {
        user: { _id: testUserId, role: 'student' },
        headers: {},
      };

      const headers = {};
      const res = {
        setHeader: (k, v) => {
          headers[k] = v;
        },
        status: (code) => {
          res.statusCode = code;
          return {
            json: (payload) => {
              res.body = payload;
              return res;
            },
          };
        },
      };

      // Execute 30 calls -> all should call next()
      for (let i = 1; i <= 30; i++) {
        let calledNext = false;
        await shortsRateLimiter(req, res, () => {
          calledNext = true;
        });
        assert.ok(calledNext, `Call #${i} should pass rate limit`);
      }

      // 31st call -> should return 429 status code
      let calledNextOn31 = false;
      await shortsRateLimiter(req, res, () => {
        calledNextOn31 = true;
      });

      assert.equal(calledNextOn31, false, '31st call must NOT call next()');
      assert.equal(res.statusCode, 429, '31st call must return 429');
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('quota exceeded'));
      assert.equal(headers['X-RateLimit-Limit'], 30);
      assert.equal(headers['X-RateLimit-Remaining'], 0);
    });
  });

  describe('6. LLM Curation & Decision for Shorts', () => {
    test('filters and ranks candidate shorts according to topic relevance', async () => {
      const candidates = [
        { videoId: 'unrelated1', title: 'Funny Cat Memes Compilation #shorts', channel: 'Meme Central' },
        { videoId: 'gaming_distro_1', title: 'The Best Linux Distro For Gaming #shorts', channel: 'Linux Gamer' },
        { videoId: 'unrelated2', title: 'Minecraft Speedrun World Record #shorts', channel: 'GamerX' },
        { videoId: 'gaming_distro_2', title: 'Why Nobara is the Best Gaming Distro', channel: 'OpenSourceHub' },
      ];

      const prompt = 'which is the best distro for gaming';
      const result = await curateShortsWithLLM(prompt, candidates);

      assert.ok(Array.isArray(result));
      assert.ok(result.length >= 2);
      // The top result should be one of the gaming distro videos, not the cat meme
      assert.ok(
        result[0].videoId === 'gaming_distro_1' || result[0].videoId === 'gaming_distro_2',
        'Top short should be directly relevant to gaming distro'
      );
      assert.ok(result.every((r) => r.videoId && r.title));
    });
  });
});
