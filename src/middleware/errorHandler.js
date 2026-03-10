'use strict';

const { error } = require('../utils/apiResponse');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error] %s %s\n  Message : %s\n  Stack   :\n%s', req.method, req.originalUrl, err.message, err.stack);
  } else {
    console.error('[Error]', { method: req.method, url: req.originalUrl, message: err.message, status: err.statusCode ?? err.status ?? 500 });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return res.status(409).json(error(`Duplicate value for: ${field}`, 409));
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json(error('Validation failed', 422, messages));
  }

  // Mongoose cast (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json(error(`Invalid value for field: ${err.path}`, 400));
  }

  // JWT errors (ready for when auth is added)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(error('Authentication failed', 401));
  }

  // CORS error
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json(error(err.message, 403));
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = statusCode < 500 ? err.message : 'Internal server error';

  return res.status(statusCode).json(
    error(
      message,
      statusCode,
      process.env.NODE_ENV !== 'production' ? err.stack : undefined
    )
  );
};

module.exports = errorHandler;
