import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';

export const normalizeQuestion = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:()"'`]/g, '')
    .replace(/\s+/g, ' ');
};

export const hashQuestion = (normalizedText) => {
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
};

export const getCachedAnswer = async (rawQuestion) => {
  try {
    const redis = getRedisClient();
    const normalized = normalizeQuestion(rawQuestion);
    const hash = hashQuestion(normalized);
    const key = `cache:answer:${hash}`;

    const data = await redis.get(key);
    if (!data) return null;

    console.log(`⚡ [Cache Hit] Serving cached answer for: "${rawQuestion.slice(0, 40)}..." (hash: ${hash.slice(0, 8)})`);
    return JSON.parse(data);
  } catch (error) {
    console.warn(`[Cache Error] Failed reading cache: ${error.message}`);
    return null;
  }
};

export const setCachedAnswer = async (rawQuestion, answerData, ttl = 604800) => {
  try {
    const redis = getRedisClient();
    const normalized = normalizeQuestion(rawQuestion);
    const hash = hashQuestion(normalized);
    const key = `cache:answer:${hash}`;

    await redis.set(key, JSON.stringify(answerData), 'EX', ttl);
    console.log(`💾 [Cache Stored] Cached answer for hash: ${hash.slice(0, 8)} (TTL: ${ttl}s)`);
  } catch (error) {
    console.warn(`[Cache Error] Failed writing cache: ${error.message}`);
  }
};

export const deleteCachedAnswer = async (rawQuestion) => {
  try {
    const redis = getRedisClient();
    const normalized = normalizeQuestion(rawQuestion);
    const hash = hashQuestion(normalized);
    const key = `cache:answer:${hash}`;
    await redis.del(key);
  } catch (error) {
    console.warn(`[Cache Error] Failed deleting cache: ${error.message}`);
  }
};
