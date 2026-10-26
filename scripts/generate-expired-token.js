/**
 * Prints a JWT that is already expired (signed with your JWT_SECRET).
 * Paste it into the Postman environment variable `expiredToken` to run the expired-token test.
 *   npm run token:expired
 */
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

const issuedTwoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
const token = jwt.sign(
  { id: '000000000000000000000000', iat: issuedTwoHoursAgo },
  env.jwtSecret,
  { expiresIn: 60, algorithm: 'HS256' }
);

console.log(token);
