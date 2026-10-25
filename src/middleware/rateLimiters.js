const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const passThrough = (req, res, next) => next();

const build = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });

module.exports = {
  apiLimiter: env.rateLimit.enabled ? build(env.rateLimit.max) : passThrough,
  authLimiter: env.rateLimit.enabled ? build(env.rateLimit.authMax) : passThrough,
};
