const Joi = require('joi');

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(100);

const register = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: email.required(),
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .required()
    .messages({ 'string.pattern.base': 'password must contain at least one letter and one number' }),
});

const login = Joi.object({
  email: email.required(),
  password: Joi.string().max(72).required(),
});

module.exports = { register, login };
