const User = require('../models/User');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination } = require('../utils/helpers');
const { APPLICATION_STATUSES, ROLES } = require('../config/constants');

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.search) {
    const regex = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    pagination: buildPagination(q.page, q.limit, total),
    data: users,
  });
});

// GET /api/admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const applicationCount = await Application.countDocuments({ user: user._id });

  res.status(200).json({ success: true, data: { ...user.toJSON(), applicationCount } });
});

// PATCH /api/admin/users/:id  (change role)
const updateUser = asyncHandler(async (req, res) => {
  if (req.params.id.toLowerCase() === req.user.id) {
    throw new AppError('You cannot change your own role', 400);
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  user.role = req.body.role;
  await user.save();
  res.status(200).json({ success: true, message: 'User role updated', data: user });
});

// DELETE /api/admin/users/:id  (also removes the user's applications and interviews)
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id.toLowerCase() === req.user.id) {
    throw new AppError('You cannot delete your own account', 400);
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  const [interviews, applications] = await Promise.all([
    Interview.deleteMany({ user: user._id }),
    Application.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User and related data deleted',
    data: {
      id: user._id,
      deletedApplications: applications.deletedCount,
      deletedInterviews: interviews.deletedCount,
    },
  });
});

// GET /api/admin/stats
const getPlatformStats = asyncHandler(async (req, res) => {
  const [usersByRole, applicationsByStatus, totalInterviews] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Interview.countDocuments(),
  ]);

  const byRole = Object.fromEntries(ROLES.map((r) => [r, 0]));
  usersByRole.forEach((row) => { byRole[row._id] = row.count; });
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  applicationsByStatus.forEach((row) => { byStatus[row._id] = row.count; });

  res.status(200).json({
    success: true,
    data: {
      users: { total: Object.values(byRole).reduce((a, b) => a + b, 0), byRole },
      applications: { total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus },
      interviews: { total: totalInterviews },
    },
  });
});

module.exports = { listUsers, getUser, updateUser, deleteUser, getPlatformStats };
