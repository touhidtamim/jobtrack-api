const Joi = require('joi');
const { INTERVIEW_TYPES, INTERVIEW_MODES, INTERVIEW_RESULTS } = require('../config/constants');

const fields = {
  round: Joi.number().integer().min(1).max(20),
  type: Joi.string().valid(...INTERVIEW_TYPES),
  mode: Joi.string().valid(...INTERVIEW_MODES),
  scheduledAt: Joi.date().iso(),
  locationOrLink: Joi.string().trim().max(300).allow(''),
  notes: Joi.string().trim().max(2000).allow(''),
  result: Joi.string().valid(...INTERVIEW_RESULTS),
};

const create = Joi.object({
  ...fields,
  round: fields.round.required(),
  type: fields.type.required(),
  scheduledAt: fields.scheduledAt.required(),
});

const patch = Joi.object(fields)
  .min(1)
  .messages({ 'object.min': 'At least one field is required' });

const list = Joi.object({
  result: Joi.string().valid(...INTERVIEW_RESULTS),
  type: Joi.string().valid(...INTERVIEW_TYPES),
});

module.exports = { create, patch, list };
