const mongoose = require('mongoose');
const { INTERVIEW_TYPES, INTERVIEW_MODES, INTERVIEW_RESULTS } = require('../config/constants');

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    round: { type: Number, required: true, min: 1, max: 20 },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
    mode: { type: String, enum: INTERVIEW_MODES, default: 'online' },
    scheduledAt: { type: Date, required: true },
    locationOrLink: { type: String, trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 2000 },
    result: { type: String, enum: INTERVIEW_RESULTS, default: 'pending' },
  },
  { timestamps: true, versionKey: false }
);

// A round number can only be used once per application
interviewSchema.index({ application: 1, round: 1 }, { unique: true });

module.exports = mongoose.model('Interview', interviewSchema);
