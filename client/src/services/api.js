const BASE_URL = '/api';

const request = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Includes httpOnly cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register') &&
      data.message?.includes('no longer exists')
    ) {
      window.location.href = '/login';
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// Auth Services
export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request('/auth/me'),
};

// Question Services
export const questionApi = {
  getQuestions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/questions?${query}`);
  },

  getQuestionById: (id) => request(`/questions/${id}`),

  deleteQuestion: (id) =>
    request(`/questions/${id}`, {
      method: 'DELETE',
    }),

  simplifyQuestion: (questionId) =>
    request('/questions/simplify', {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    }),

  getTags: () => request('/questions/tags'),
};

// Study List Services
export const studyListApi = {
  getStudyLists: () => request('/study-lists'),

  getStudyListById: (id) => request(`/study-lists/${id}`),

  createStudyList: (data) =>
    request('/study-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStudyList: (id, data) =>
    request(`/study-lists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteStudyList: (id) =>
    request(`/study-lists/${id}`, {
      method: 'DELETE',
    }),
};

// Feedback Services
export const feedbackApi = {
  submitFeedback: (data) =>
    request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getQuestionFeedback: (questionId) => request(`/feedback/question/${questionId}`),

  getFeedbackFeed: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/feedback?${query}`);
  },
};

// Analytics Services (Teacher Dashboard)
export const analyticsApi = {
  getTeacherAnalytics: () => request('/analytics'),
};

// Shorts Services
export const shortsApi = {
  getShorts: (topic, prompt = '') => {
    const cleanTopic = (topic || '').slice(0, 150).trim();
    const cleanPrompt = (prompt || '').slice(0, 300).trim();
    const params = { topic: cleanTopic };
    if (cleanPrompt) {
      params.prompt = cleanPrompt;
    }
    const query = new URLSearchParams(params).toString();
    return request(`/shorts?${query}`);
  },
};

// Learner graph and prerequisite-aware learning paths
export const learningGraphApi = {
  getGraph: () => request('/learning-graph'),

  createConcept: (data) =>
    request('/learning-graph/concepts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssessment: (conceptId, data) =>
    request(`/learning-graph/concepts/${encodeURIComponent(conceptId)}/assessment`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  addRelationship: (data) =>
    request('/learning-graph/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSessions: () => request('/learning-graph/sessions'),

  linkQuestion: (id, data) =>
    request(`/learning-graph/sessions/${encodeURIComponent(id)}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createSession: (goalConceptId) =>
    request('/learning-graph/sessions', {
      method: 'POST',
      body: JSON.stringify({ goalConceptId }),
    }),

  acceptSession: (id) =>
    request(`/learning-graph/sessions/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
    }),

  advanceSession: (id, data) =>
    request(`/learning-graph/sessions/${encodeURIComponent(id)}/advance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
