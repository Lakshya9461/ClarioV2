import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema(
  {
    conceptId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    statement: { type: String, default: '', trim: true, maxlength: 1000 },
    assessment: {
      status: {
        type: String,
        enum: ['unknown', 'developing', 'demonstrated'],
        default: 'unknown',
      },
      evidence: { type: [String], default: [] },
      summary: { type: String, default: '' },
      updatedAt: { type: Date, default: null },
    },
  },
  { _id: false }
);

const relationshipSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    type: { type: String, enum: ['prerequisite', 'related'], required: true },
  },
  { _id: false }
);

const learnerGraphSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    concepts: { type: [conceptSchema], default: [] },
    relationships: { type: [relationshipSchema], default: [] },
  },
  { timestamps: true }
);

const LearnerGraph = mongoose.model('LearnerGraph', learnerGraphSchema);
export default LearnerGraph;
