import { useState, useEffect, useCallback } from 'react';
import { shortsApi } from '../services/api.js';

export const useShorts = (topic, prompt = '') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const fetchShorts = useCallback(async () => {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsRateLimited(false);

    try {
      const res = await shortsApi.getShorts(topic.trim(), (prompt || '').trim());
      setData(res.shorts || []);
      setIsCached(Boolean(res.cached));
    } catch (err) {
      console.error('Failed to load shorts:', err);
      if (err.status === 429) {
        setIsRateLimited(true);
        setError(err.message || 'Daily shorts quota exceeded. Maximum 30 shorts searches per day.');
      } else {
        setError(err.message || 'Unable to load related shorts for this concept.');
      }
    } finally {
      setLoading(false);
    }
  }, [topic, prompt]);

  useEffect(() => {
    fetchShorts();
  }, [fetchShorts]);

  return {
    shorts: data,
    loading,
    error,
    isRateLimited,
    isCached,
    refetch: fetchShorts,
  };
};

export default useShorts;
