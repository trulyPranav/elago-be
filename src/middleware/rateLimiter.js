'use strict';

const rateLimit = require('express-rate-limit');

exports.rateLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            200,             // max requests per window per IP
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success:    false,
    statusCode: 429,
    message:    'Too many requests — please try again later.',
  },
});
