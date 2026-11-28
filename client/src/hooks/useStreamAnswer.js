import { useReducer, useCallback, useRef } from 'react';
import { answerReducer, initialState } from '../reducers/answerReducer';
import { questionApi } from '../services/api';
import { useModel } from '../context/ModelContext';

export const useStreamAnswer = () => {
  const [state, dispatch] = useReducer(answerReducer, initialState);
  const { modelConfig, isCustomActive } = useModel();

  // Always keep a ref to the latest modelConfig so callbacks never use stale closures
  const modelConfigRef = useRef(modelConfig);
  const isCustomActiveRef = useRef(isCustomActive);
  modelConfigRef.current = modelConfig;
  isCustomActiveRef.current = isCustomActive;

  const ask = useCallback(async (rawQuestion) => {
    if (!rawQuestion || !rawQuestion.trim()) return;

    dispatch({ type: 'START_ASKING', payload: { rawQuestion } });

    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('clario_auth_token') : null;
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          question: rawQuestion,
          ...(modelConfigRef.current?.model && (modelConfigRef.current.enabled || isCustomActiveRef.current)
            ? { modelConfig: { ...modelConfigRef.current, enabled: true } }
            : {}),
        }),
        credentials: 'include',
      });

      // Handle HTTP Errors (e.g. 429 Rate Limit, 401 Unauthorized)
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (_) {}

        if (response.status === 429) {
          throw new Error(
            errorData.message ||
              'Daily rate limit exceeded (10 questions/day). Please try again tomorrow.'
          );
        }

        throw new Error(errorData.message || `Server error (${response.status})`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep partial line in buffer

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let dataText = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataText = line.slice(6).trim();
            }
          }

          if (!dataText) continue;

          try {
            const parsedData = JSON.parse(dataText);

            switch (eventType) {
              case 'status':
                dispatch({ type: 'STATUS_UPDATE', payload: parsedData });
                break;

              case 'refined_prompt':
                dispatch({ type: 'SET_REFINED_PROMPT', payload: parsedData });
                break;

              case 'chunk':
                dispatch({ type: 'APPEND_CHUNK', payload: parsedData });
                break;

              case 'done':
                dispatch({
                  type: 'FINISH_STREAM',
                  payload: {
                    question: parsedData.question,
                    isCached: parsedData.isCached,
                  },
                });
                break;

              case 'error':
                dispatch({
                  type: 'SET_ERROR',
                  payload: { error: parsedData.message || 'Stream processing failed' },
                });
                break;

              default:
                break;
            }
          } catch (e) {
            console.warn('Could not parse SSE block:', block, e);
          }
        }
      }
    } catch (err) {
      console.error('useStreamAnswer error:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: { error: err.message || 'Network error occurred while fetching explanation.' },
      });
    }
  }, []);

  const askFollowUp = useCallback(async (followUpText) => {
    if (!followUpText || !followUpText.trim()) return;
    if (!state.questionId) return;

    dispatch({ type: 'START_FOLLOW_UP', payload: { question: followUpText.trim() } });

    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('clario_auth_token') : null;
      const response = await fetch(`/api/questions/${state.questionId}/follow-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          question: followUpText.trim(),
          ...(modelConfigRef.current?.model && (modelConfigRef.current.enabled || isCustomActiveRef.current)
            ? { modelConfig: { ...modelConfigRef.current, enabled: true } }
            : {}),
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        let errData = {};
        try {
          errData = await response.json();
        } catch (_) {}
        throw new Error(errData.message || `Server error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let dataText = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataText = line.slice(6).trim();
            }
          }

          if (!dataText) continue;

          try {
            const parsedData = JSON.parse(dataText);

            switch (eventType) {
              case 'chunk':
                dispatch({ type: 'APPEND_FOLLOW_UP_CHUNK', payload: parsedData });
                break;

              case 'done':
                dispatch({
                  type: 'FINISH_FOLLOW_UP',
                  payload: {
                    question: parsedData.question,
                    followUps: parsedData.followUps,
                  },
                });
                break;

              case 'error':
                dispatch({
                  type: 'SET_ERROR',
                  payload: { error: parsedData.message || 'Follow-up streaming failed' },
                });
                break;

              default:
                break;
            }
          } catch (e) {
            console.warn('Could not parse follow-up block:', block, e);
          }
        }
      }
    } catch (err) {
      console.error('askFollowUp error:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: { error: err.message || 'Error processing follow-up question.' },
      });
    }
  }, [state.questionId]);

  const simplify = useCallback(async () => {
    if (!state.questionId) return;

    dispatch({ type: 'START_SIMPLIFY' });
    try {
      const res = await questionApi.simplifyQuestion(
        state.questionId,
        isCustomActiveRef.current && modelConfigRef.current?.enabled ? modelConfigRef.current : undefined
      );
      if (res.success && res.simplified) {
        dispatch({
          type: 'FINISH_SIMPLIFY',
          payload: { simplified: res.simplified },
        });
      }
    } catch (err) {
      console.error('Failed to simplify explanation:', err);
      dispatch({ type: 'FINISH_SIMPLIFY', payload: { simplified: null } });
    }
  }, [state.questionId]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    ask,
    askFollowUp,
    simplify,
    reset,
  };
};
