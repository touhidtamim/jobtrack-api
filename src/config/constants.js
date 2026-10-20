const APPLICATION_STATUSES = ['saved', 'applied', 'assessment', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];

// Which status an application is allowed to move to. Empty array = final status.
const STATUS_TRANSITIONS = {
  saved: ['applied', 'withdrawn'],
  applied: ['assessment', 'interview', 'offer', 'rejected', 'withdrawn'],
  assessment: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['assessment', 'offer', 'rejected', 'withdrawn'],
  offer: ['accepted', 'rejected', 'withdrawn'],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

module.exports = {
  ROLES: ['user', 'admin'],
  APPLICATION_STATUSES,
  STATUS_TRANSITIONS,
  WORK_TYPES: ['remote', 'hybrid', 'onsite'],
  JOB_TYPES: ['full-time', 'part-time', 'internship', 'contract', 'freelance'],
  SOURCES: ['linkedin', 'bdjobs', 'company-website', 'referral', 'other'],
  PRIORITIES: ['low', 'medium', 'high'],
  INTERVIEW_TYPES: ['phone', 'technical', 'hr', 'behavioral', 'onsite', 'other'],
  INTERVIEW_MODES: ['online', 'onsite', 'phone'],
  INTERVIEW_RESULTS: ['pending', 'passed', 'failed', 'cancelled'],
  SORT_FIELDS: ['createdAt', 'updatedAt', 'appliedAt', 'deadline', 'company', 'position'],
};
