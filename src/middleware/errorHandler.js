const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`, 404));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message;
  let errors = err.errors;

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    errors = undefined;
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
    errors = undefined;
  } else if (err.name === 'ValidationError' && err.errors && !err.isOperational) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier format';
    errors = undefined;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with the same unique value already exists';
    errors = undefined;
  } else if (!err.isOperational) {
    // Unknown / programming error: log on the server only, never leak details to the client
    console.error(err);
    if (statusCode >= 500) message = 'Internal server error';
    else message = 'Bad request';
    errors = undefined;
  }

  const body = { success: false, message };
  if (errors && errors.length) body.errors = errors;
  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
