require('dotenv').config();

const missing = ['MONGO_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET must be at least 16 characters long.');
  process.exit(1);
}

const corsOrigin = process.env.CORS_ORIGIN || '*';

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  corsOrigin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 50,
  },
};
