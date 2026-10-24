const Application = require('../models/Application');
const Interview = require('../models/Interview');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getOwnedApplication = async (applicationId, userId) => {
  const application = await Application.findOne({ _id: applicationId, user: userId });
  if (!application) throw new AppError('Application not found', 404);
  return application;
};

const getOwnedInterview = async (applicationId, interviewId, userId) => {
  const application = await getOwnedApplication(applicationId, userId);
  const interview = await Interview.findOne({ _id: interviewId, application: application._id });
  if (!interview) throw new AppError('Interview not found', 404);
  return interview;
};

const assertRoundFree = async (applicationId, round, excludeId) => {
  const filter = { application: applicationId, round };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Interview.findOne(filter).select('_id');
  if (existing) throw new AppError(`Round ${round} already exists for this application`, 409);
};

// POST /api/applications/:applicationId/interviews
const createInterview = asyncHandler(async (req, res) => {
  const application = await getOwnedApplication(req.params.applicationId, req.user._id);

  if (application.status === 'saved') {
    throw new AppError('Cannot add an interview to an application that has not been applied yet', 400, [
      { field: 'applicationId', message: "Application status is 'saved'. Change it to 'applied' first." },
    ]);
  }
  await assertRoundFree(application._id, req.body.round);

  const interview = await Interview.create({
    ...req.body,
    application: application._id,
    user: req.user._id,
  });
  res.status(201).json({ success: true, message: 'Interview created', data: interview });
});

// GET /api/applications/:applicationId/interviews
const getInterviews = asyncHandler(async (req, res) => {
  const application = await getOwnedApplication(req.params.applicationId, req.user._id);
  const filter = { application: application._id };
  if (req.validatedQuery.result) filter.result = req.validatedQuery.result;
  if (req.validatedQuery.type) filter.type = req.validatedQuery.type;

  const interviews = await Interview.find(filter).sort({ round: 1 });
  res.status(200).json({ success: true, count: interviews.length, data: interviews });
});

// GET /api/applications/:applicationId/interviews/:interviewId
const getInterview = asyncHandler(async (req, res) => {
  const interview = await getOwnedInterview(req.params.applicationId, req.params.interviewId, req.user._id);
  res.status(200).json({ success: true, data: interview });
});

// PATCH /api/applications/:applicationId/interviews/:interviewId
const updateInterview = asyncHandler(async (req, res) => {
  const interview = await getOwnedInterview(req.params.applicationId, req.params.interviewId, req.user._id);

  if (req.body.round !== undefined && req.body.round !== interview.round) {
    await assertRoundFree(interview.application, req.body.round, interview._id);
  }

  interview.set(req.body);
  await interview.save();
  res.status(200).json({ success: true, message: 'Interview updated', data: interview });
});

// DELETE /api/applications/:applicationId/interviews/:interviewId
const deleteInterview = asyncHandler(async (req, res) => {
  const interview = await getOwnedInterview(req.params.applicationId, req.params.interviewId, req.user._id);
  await interview.deleteOne();
  res.status(200).json({ success: true, message: 'Interview deleted', data: { id: interview._id } });
});

module.exports = { createInterview, getInterviews, getInterview, updateInterview, deleteInterview };
