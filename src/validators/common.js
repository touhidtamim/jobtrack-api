const Joi = require('joi');

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid id format', 'string.base': 'Invalid id format' });

const idParam = (name = 'id') => Joi.object({ [name]: objectId.required() });

const idParams = (...names) =>
  Joi.object(names.reduce((acc, name) => ({ ...acc, [name]: objectId.required() }), {}));

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
};

module.exports = { objectId, idParam, idParams, pagination };
