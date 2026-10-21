const AppError = require('../utils/AppError');

/**
 * validate({ params, query, body }) - each value is a Joi schema.
 * Validated + sanitised body replaces req.body, validated query is stored in req.validatedQuery.
 * Unknown keys are stripped (this also blocks mass-assignment such as role / user / _id).
 */
const validate = (schemas) => (req, res, next) => {
  const errors = [];

  ['params', 'query', 'body'].forEach((source) => {
    if (!schemas[source]) return;
    const { value, error } = schemas[source].validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      error.details.forEach((detail) => {
        errors.push({
          field: detail.path.join('.') || source,
          message: detail.message.replace(/"/g, ''),
        });
      });
    } else if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.validatedQuery = value;
    }
  });

  if (errors.length) return next(new AppError('Validation failed', 400, errors));
  return next();
};

module.exports = validate;
