const Joi = require('joi');
const { ROLES } = require('../config/constants');
const { pagination } = require('./common');

const listUsers = Joi.object({
  ...pagination,
  role: Joi.string().valid(...ROLES),
  search: Joi.string().trim().max(100),
});

const updateUser = Joi.object({
  role: Joi.string().valid(...ROLES).required(),
});

module.exports = { listUsers, updateUser };
