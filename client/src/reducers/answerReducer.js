export const ANSWER_STATUS = {
  IDLE: 'IDLE',
  ASKING: 'ASKING',
  STREAMING: 'STREAMING',
  DONE: 'DONE',
  ERROR: 'ERROR',
};

export const initialState = {
  status: ANSWER_STATUS.IDLE,
  rawQuestion: '',
  refinedPrompt: '',
  explanation: '',
  keyPoints: [],
  slides: [],
  chartData: null,
  visualizationTrace: null,
  subjectTag: '',
  searchKeywords: [],
  isCached: false,
  questionId: null,
  stageMessage: '',
  error: null,
  simplified: null,
  isSimplifying: false,
  followUps: [],
  isFollowUpStreaming: false,
  currentFollowUpChunk: '',
};

export const answerReducer = (state, action) => {
  switch (action.type) {
    case 'START_ASKING':
      return {
        ...initialState,
        status: ANSWER_STATUS.ASKING,
        rawQuestion: action.payload.rawQuestion,
        stageMessage: 'Initiating AI concept analysis...',
      };

    case 'STATUS_UPDATE':
      return {
        ...state,
        stageMessage: action.payload.message || state.stageMessage,
      };

    case 'SET_REFINED_PROMPT':
      return {
        ...state,
        refinedPrompt: action.payload.refinedPrompt,
      };

    case 'APPEND_CHUNK':
      return {
        ...state,
        status: ANSWER_STATUS.STREAMING,
        explanation: (state.explanation || '') + action.payload.text,
      };

    case 'FINISH_STREAM': {
      const q = action.payload.question || {};
      return {
        ...state,
        status: ANSWER_STATUS.DONE,
        stageMessage: 'Explanation complete',
        questionId: q._id || state.questionId,
        refinedPrompt: q.refinedPrompt || state.refinedPrompt,
        explanation: q.explanation || state.explanation,
        keyPoints: q.keyPoints || state.keyPoints || [],
        slides: q.slides || state.slides || [],
        chartData: q.chartData || state.chartData || null,
        visualizationTrace: q.visualizationTrace || state.visualizationTrace || null,
        subjectTag: q.subjectTag || state.subjectTag || '',
        searchKeywords: q.searchKeywords || state.searchKeywords || [],
        isCached: !!action.payload.isCached,
        simplified: q.simplifiedVersion || null,
        followUps: q.followUps || state.followUps || [],
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        status: ANSWER_STATUS.ERROR,
        error: action.payload.error,
        stageMessage: 'An error occurred',
        isFollowUpStreaming: false,
      };

    case 'START_SIMPLIFY':
      return {
        ...state,
        isSimplifying: true,
      };

    case 'FINISH_SIMPLIFY':
      return {
        ...state,
        isSimplifying: false,
        simplified: action.payload.simplified,
      };

    case 'START_FOLLOW_UP':
      return {
        ...state,
        isFollowUpStreaming: true,
        currentFollowUpChunk: '',
        followUps: [
          ...(state.followUps || []),
          {
            role: 'user',
            content: action.payload.question,
            createdAt: new Date().toISOString(),
          },
        ],
      };

    case 'APPEND_FOLLOW_UP_CHUNK':
      return {
        ...state,
        currentFollowUpChunk: (state.currentFollowUpChunk || '') + action.payload.text,
      };

    case 'FINISH_FOLLOW_UP': {
      const q = action.payload.question || {};
      let updatedFollowUps = action.payload.followUps;
      if (!updatedFollowUps) {
        updatedFollowUps = [
          ...(state.followUps || []),
          {
            role: 'assistant',
            content: state.currentFollowUpChunk,
            createdAt: new Date().toISOString(),
          },
        ];
      }

      // Check if new slides or chart arrived from the follow-up or updated question document
      const latestAssistant = updatedFollowUps.slice().reverse().find((m) => m.role === 'assistant');
      const incomingSlides = (q.slides && q.slides.length > 0)
        ? q.slides
        : (latestAssistant?.slides && latestAssistant.slides.length > 0)
        ? latestAssistant.slides
        : state.slides;

      const incomingChart = q.chartData || latestAssistant?.chartData || state.chartData;
      const incomingTrace = q.visualizationTrace || latestAssistant?.visualizationTrace || state.visualizationTrace;
      const incomingRaw = q.rawQuestion || state.rawQuestion;
      const incomingExplanation = q.explanation || state.explanation;
      const incomingKeyPoints = q.keyPoints || state.keyPoints;

      return {
        ...state,
        isFollowUpStreaming: false,
        currentFollowUpChunk: '',
        followUps: updatedFollowUps,
        questionId: q._id || state.questionId,
        slides: incomingSlides,
        chartData: incomingChart,
        visualizationTrace: incomingTrace,
        rawQuestion: incomingRaw,
        explanation: incomingExplanation,
        keyPoints: incomingKeyPoints,
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
};
