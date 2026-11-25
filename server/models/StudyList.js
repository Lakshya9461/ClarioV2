import mongoose from 'mongoose';

const studyListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a study list name'],
      trim: true,
      maxlength: [100, 'Study list name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

studyListSchema.virtual('questions').get(function () {
  return this.questionIds || [];
});

studyListSchema.index({ userId: 1, name: 1 });

const StudyList = mongoose.model('StudyList', studyListSchema);
export default StudyList;
