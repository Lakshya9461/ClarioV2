import mongoose from 'mongoose';

const planNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    conceptId: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
  },
  { _id: false }
);

const planEdgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const assessmentSnapshotSchema = new mongoose.Schema(
  {
    conceptId: { type: String, required: true },
    status: { type: String, enum: ['unknown', 'developing', 'demonstrated'], required: true },
    evidence: { type: [String], default: [] },
    summary: { type: String, default: '' },
  },
  { _id: false }
);

const sessionEventSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true },
    kind: { type: String, enum: ['practiced'], required: true },
    evidence: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const linkedQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    nodeId: { type: String, required: true },
    kind: { type: String, enum: ['predict', 'check'], required: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const learningSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalConceptId: { type: String, required: true },
    goalName: { type: String, required: true },
    status: { type: String, enum: ['proposed', 'active', 'completed'], default: 'proposed' },
    assessmentSnapshot: { type: [assessmentSnapshotSchema], default: [] },
    plan: {
      nodes: { type: [planNodeSchema], default: [] },
      edges: { type: [planEdgeSchema], default: [] },
      currentNodeId: { type: String, default: null },
    },
    events: { type: [sessionEventSchema], default: [] },
    questions: { type: [linkedQuestionSchema], default: [] },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

learningSessionSchema.index({ userId: 1, createdAt: -1 });

const LearningSession = mongoose.model('LearningSession', learningSessionSchema);
export default LearningSession;
