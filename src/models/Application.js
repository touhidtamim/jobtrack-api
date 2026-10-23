const mongoose = require('mongoose');
const {
  APPLICATION_STATUSES, WORK_TYPES, JOB_TYPES, SOURCES, PRIORITIES,
} = require('../config/constants');

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    position: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    jobUrl: { type: String, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 100 },
    workType: { type: String, enum: WORK_TYPES, default: 'onsite' },
    jobType: { type: String, enum: JOB_TYPES, default: 'full-time' },
    source: { type: String, enum: SOURCES, default: 'other' },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'saved' },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    currency: { type: String, default: 'BDT', uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    appliedAt: { type: Date },
    deadline: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true, versionKey: false }
);

// One application per user + company + position (case-insensitive)
applicationSchema.index(
  { user: 1, company: 1, position: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
applicationSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
