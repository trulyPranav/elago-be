'use strict';

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// Validation rules for login
const loginRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

/**
 * POST /api/auth/login
 * Validates credentials against hardcoded env variables and issues a JWT token.
 */
router.post('/login', loginRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  const targetEmail = process.env.LOGIN_EMAIL || 'admin@elago.com';
  const targetPassword = process.env.LOGIN_PASSWORD || 'securepassword123';
  const secret = process.env.JWT_SECRET || 'super_secret_session_token_key_123!';

  if (email.toLowerCase() === targetEmail.toLowerCase() && password === targetPassword) {
    const userPayload = {
      email: targetEmail,
      name: 'Default Admin',
      role: 'Admin',
      avatar: 'A',
    };

    // Sign the token (e.g. valid for 24 hours)
    const token = jwt.sign(userPayload, secret, { expiresIn: '24h' });

    return res.json({
      success: true,
      statusCode: 200,
      data: {
        token,
        user: userPayload,
      },
      message: 'Logged in successfully',
    });
  }

  return res.status(401).json({
    success: false,
    statusCode: 401,
    message: 'Invalid email or password',
  });
});

/**
 * GET /api/auth/me
 * Retrieves current user metadata by verifying JWT token.
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    statusCode: 200,
    data: {
      user: {
        email: req.user.email,
        name: req.user.name || 'Default Admin',
        role: req.user.role || 'Admin',
        avatar: req.user.avatar || 'A',
      },
    },
  });
});

module.exports = router;
