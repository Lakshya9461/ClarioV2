import mongoose from 'mongoose';

const harnessSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
    },
    phase: {
      type: String,
      enum: ['MEASURE', 'PLAN', 'TEACH', 'PRACTICE', 'COMPLETED'],
      default: 'MEASURE',
    },
    probes: [
      {
        probeIndex: Number,
        totalProbes: Number,
        concept: String,
        question: String,
        options: [String],
        correctOption: String,
        selectedOption: String,
        confidence: Number,
        thinking: String,
        score: {
          type: String,
          enum: ['correct', 'partially correct', 'wrong', 'unknown', 'pending'],
          default: 'pending',
        },
        reasoningModel: String,
      },
    ],
    currentProbeIndex: {
      type: Number,
      default: 0,
    },
    lessonPlan: {
      asciiTree: String,
      nodes: [
        {
          id: String,
          name: String,
          status: String,
          dependsOn: String,
        },
      ],
      explanation: String,
      accepted: {
        type: Boolean,
        default: false,
      },
    },
    teaching: {
      currentNodeIndex: {
        type: Number,
        default: 0,
      },
      nodes: [
        {
          id: String,
          name: String,
          status: {
            type: String,
            enum: ['to_teach', 'solid', 'shaky', 'weak'],
            default: 'to_teach',
          },
          attempts: {
            type: Number,
            default: 0,
          },
          predictQuestion: {
            question: String,
            options: [String],
            correctOption: String,
            conceptClaim: String,
          },
          history: [
            {
              selectedOption: String,
              confidence: Number,
              thinking: String,
              action: String,
              explanation: String,
            },
          ],
        },
      ],
    },
    practice: {
      problems: [
        {
          problemIndex: Number,
          totalProblems: Number,
          prompt: String,
          targetConcept: String,
          isTargetShaky: Boolean,
          learnerResponse: String,
          isSound: Boolean,
          feedback: String,
        },
      ],
      currentProblemIndex: {
        type: Number,
        default: 0,
      },
      summary: {
        solid: String,
        shaky: String,
        revisitWhen: String,
      },
    },
    visualizationTrace: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active session retrieval
harnessSessionSchema.index({ userId: 1, updatedAt: -1 });

const HarnessSession = mongoose.model('HarnessSession', harnessSessionSchema);
export default HarnessSession;
