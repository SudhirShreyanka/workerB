const crypto = require('crypto');
const { config } = require('../config');

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Authenticate incoming requests using Bearer token against API_SECRET.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      status: 'error',
      error: 'Unauthorized',
      message: 'Missing Authorization header. Expected "Bearer <token>".',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      status: 'error',
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected "Bearer <token>".',
    });
  }

  const token = parts[1];

  if (!config.apiSecret || !safeCompare(token, config.apiSecret)) {
    return res.status(401).json({
      status: 'error',
      error: 'Unauthorized',
      message: 'Invalid API secret token.',
    });
  }

  next();
}

module.exports = {
  authenticateToken,
};
