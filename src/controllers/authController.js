const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Used to keep response time similar when the email does not exist
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const signToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email is already registered', 409);

  // role is never taken from the request: every public registration is a normal user
  const user = await User.create({ name, email, password });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user, token: signToken(user) },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  const passwordOk = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

  // Same message for unknown email and wrong password (no user enumeration)
  if (!user || !passwordOk) throw new AppError('Invalid email or password', 401);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token: signToken(user), expiresIn: env.jwtExpiresIn },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

module.exports = { register, login, getMe };
