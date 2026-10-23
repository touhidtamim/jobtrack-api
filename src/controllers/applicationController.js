const Application = require('../models/Application');
const Interview = require('../models/Interview');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, parseSort, buildPagination } = require('../utils/helpers');
const { APPLICATION_STATUSES, STATUS_TRANSITIONS } = require('../config/constants');

const COLLATION = { locale: 'en', strength: 2 };

const EDITABLE_FIELDS = [
  'company', 'position', 'jobUrl', 'location', 'workType', 'jobType', 'source', 'status',
  'salaryMin', 'salaryMax', 'currency', 'priority', 'appliedAt', 'deadline', 'notes',
];

// Values applied by PUT when an optional field is omitted (full replacement)
const PUT_DEFAULTS = {
  workType: 'onsite', jobType: 'full-time', source: 'other', currency: 'BDT', priority: 'medium',
};

const findOwned = async (id, userId) => {
  // Always scoped by owner: other users' applications look like "not found"
  const application = await Application.findOne({ _id: id, user: userId });
  if (!application) throw new AppError('Application not found', 404);
  return application;
};

const assertBusinessRules = (data) => {
  const errors = [];
  if (data.salaryMin != null && data.salaryMax != null && data.salaryMax < data.salaryMin) {
    errors.push({ field: 'salaryMax', message: 'salaryMax must be greater than or equal to salaryMin' });
  }
  if (data.appliedAt && new Date(data.appliedAt).getTime() > Date.now() + 5 * 60 * 1000) {
    errors.push({ field: 'appliedAt', message: 'appliedAt cannot be in the future' });
  }
  if (errors.length) throw new AppError('Validation failed', 400, errors);
};

const assertNoDuplicate = async (userId, company, position, excludeId) => {
  const filter = { user: userId, company, position };
  if (excludeId) filter._id = { $ne: excludeId };
  const duplicate = await Application.findOne(filter).collation(COLLATION).select('_id');
  if (duplicate) {
    throw new AppError('You already have an application for this company and position', 409);
  }
};

const assertStatusTransition = (currentStatus, nextStatus) => {
  if (nextStatus === undefined || nextStatus === currentStatus) return;
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(`Invalid status transition: ${currentStatus} -> ${nextStatus}`, 400, [
      {
        field: 'status',
        message: allowed.length
          ? `Cannot change status from '${currentStatus}' to '${nextStatus}'. Allowed: ${allowed.join(', ')}`
          : `Status '${currentStatus}' is final and cannot be changed`,
      },
    ]);
  }
};

const ensureAppliedAt = (application) => {
  if (application.status !== 'saved' && !application.appliedAt) {
    application.appliedAt = new Date();
  }
};

// POST /api/applications
const createApplication = asyncHandler(async (req, res) => {
  const data = { ...req.body, user: req.user._id };

  assertBusinessRules(data);
  await assertNoDuplicate(req.user._id, data.company, data.position);
  if (data.status && data.status !== 'saved' && !data.appliedAt) data.appliedAt = new Date();

  const application = await Application.create(data);
  res.status(201).json({ success: true, message: 'Application created', data: application });
});

// GET /api/applications
const getApplications = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = { user: req.user._id };

  ['status', 'workType', 'jobType', 'source', 'priority'].forEach((key) => {
    if (q[key]) filter[key] = q[key];
  });
  if (q.search) {
    const regex = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ company: regex }, { position: regex }];
  }

  const [items, total] = await Promise.all([
    Application.find(filter)
      .collation(COLLATION)
      .sort(parseSort(q.sort))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Application.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: items.length,
    pagination: buildPagination(q.page, q.limit, total),
    data: items,
  });
});

// GET /api/applications/stats
const getStats = asyncHandler(async (req, res) => {
  const [grouped, totalInterviews, upcomingInterviews] = await Promise.all([
    Application.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Interview.countDocuments({ user: req.user._id }),
    Interview.countDocuments({ user: req.user._id, result: 'pending', scheduledAt: { $gte: new Date() } }),
  ]);

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  grouped.forEach((row) => { byStatus[row._id] = row.count; });
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

  res.status(200).json({
    success: true,
    data: { total, byStatus, totalInterviews, upcomingInterviews },
  });
});

// GET /api/applications/:id
const getApplication = asyncHandler(async (req, res) => {
  const application = await findOwned(req.params.id, req.user._id);
  const interviews = await Interview.find({ application: application._id }).sort({ round: 1 });

  res.status(200).json({
    success: true,
    data: { ...application.toObject(), interviews },
  });
});

// PUT /api/applications/:id  (full replacement of editable fields)
const replaceApplication = asyncHandler(async (req, res) => {
  const application = await findOwned(req.params.id, req.user._id);
  const body = req.body;

  const next = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) next[field] = body[field];
    else if (field === 'status') next.status = application.status; // status & appliedAt are kept if omitted
    else if (field === 'appliedAt') next.appliedAt = application.appliedAt;
    else next[field] = PUT_DEFAULTS[field]; // undefined => field is removed
  });

  assertBusinessRules(next);
  assertStatusTransition(application.status, next.status);
  await assertNoDuplicate(req.user._id, next.company, next.position, application._id);

  application.set(next);
  ensureAppliedAt(application);
  await application.save();

  res.status(200).json({ success: true, message: 'Application replaced', data: application });
});

// PATCH /api/applications/:id  (partial update)
const updateApplication = asyncHandler(async (req, res) => {
  const application = await findOwned(req.params.id, req.user._id);
  const updates = req.body;
  const merged = { ...application.toObject(), ...updates };

  assertBusinessRules(merged);
  assertStatusTransition(application.status, updates.status);
  if (updates.company !== undefined || updates.position !== undefined) {
    await assertNoDuplicate(req.user._id, merged.company, merged.position, application._id);
  }

  application.set(updates);
  ensureAppliedAt(application);
  await application.save();

  res.status(200).json({ success: true, message: 'Application updated', data: application });
});

// DELETE /api/applications/:id
const deleteApplication = asyncHandler(async (req, res) => {
  const application = await findOwned(req.params.id, req.user._id);
  const { deletedCount } = await Interview.deleteMany({ application: application._id });
  await application.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Application and its interviews deleted',
    data: { id: application._id, deletedInterviews: deletedCount },
  });
});

module.exports = {
  createApplication,
  getApplications,
  getStats,
  getApplication,
  replaceApplication,
  updateApplication,
  deleteApplication,
};
