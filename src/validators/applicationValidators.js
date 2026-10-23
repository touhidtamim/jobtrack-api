const Joi = require('joi');
const {
  APPLICATION_STATUSES, WORK_TYPES, JOB_TYPES, SOURCES, PRIORITIES, SORT_FIELDS,
} = require('../config/constants');
const { pagination } = require('./common');

const fields = {
  company: Joi.string().trim().min(2).max(100),
  position: Joi.string().trim().min(2).max(100),
  jobUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
  location: Joi.string().trim().max(100).allow(''),
  workType: Joi.string().valid(...WORK_TYPES),
  jobType: Joi.string().valid(...JOB_TYPES),
  source: Joi.string().valid(...SOURCES),
  status: Joi.string().valid(...APPLICATION_STATUSES),
  salaryMin: Joi.number().min(0).max(1000000000),
  salaryMax: Joi.number().min(0).max(1000000000),
  currency: Joi.string().trim().uppercase().length(3),
  priority: Joi.string().valid(...PRIORITIES),
  appliedAt: Joi.date().iso(),
  deadline: Joi.date().iso(),
  notes: Joi.string().trim().max(2000).allow(''),
};

// POST and PUT: company + position are required
const create = Joi.object({
  ...fields,
  company: fields.company.required(),
  position: fields.position.required(),
});

// PATCH: any subset, but at least one field
const patch = Joi.object(fields)
  .min(1)
  .messages({ 'object.min': 'At least one field is required' });

const list = Joi.object({
  ...pagination,
  status: Joi.string().valid(...APPLICATION_STATUSES),
  workType: Joi.string().valid(...WORK_TYPES),
  jobType: Joi.string().valid(...JOB_TYPES),
  source: Joi.string().valid(...SOURCES),
  priority: Joi.string().valid(...PRIORITIES),
  search: Joi.string().trim().max(100),
  sort: Joi.string()
    .valid(...SORT_FIELDS.flatMap((f) => [f, `-${f}`]))
    .default('-createdAt'),
});

module.exports = { create, patch, list };
