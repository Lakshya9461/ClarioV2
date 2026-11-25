import mongoose from 'mongoose';

const chartDataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
      default: 'bar',
    },
    title: {
      type: String,
      default: 'Concept Breakdown',
    },
    labels: {
      type: [String],
      default: [],
    },
    values: {
      type: [Number],
      default: [],
    },
    datasetLabel: {
      type: String,
      default: 'Metrics',
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rawQuestion: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    refinedPrompt: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    slides: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    chartData: {
      type: chartDataSchema,
      default: null,
    },
    subjectTag: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    searchKeywords: {
      type: [String],
      default: [],
    },
    visualizationTrace: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isSimplified: {
      type: Boolean,
      default: false,
    },
    simplifiedVersion: {
      type: String,
      default: null,
    },
    followUps: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        slides: {
          type: [mongoose.Schema.Types.Mixed],
          default: [],
        },
        chartData: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        visualizationTrace: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for user history ordering
questionSchema.index({ userId: 1, createdAt: -1 });

// Index for subject tag analytics and filtering
questionSchema.index({ subjectTag: 1, createdAt: -1 });

// Full text search index
questionSchema.index({
  rawQuestion: 'text',
  explanation: 'text',
  refinedPrompt: 'text',
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
