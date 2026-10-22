const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const schemas = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: schemas.register }), register);
router.post('/login', authLimiter, validate({ body: schemas.login }), login);
router.get('/me', protect, getMe);

module.exports = router;
