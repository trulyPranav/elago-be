'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests via JWT.
 * Expects header: Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Authorization header structure is "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Access token is missing',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured on the server.');
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Server security configuration error',
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Invalid or expired access token',
      });
    }

    // Attach decoded user info to the request object
    req.user = decoded;
    next();
  });
};

module.exports = { authenticateToken };
