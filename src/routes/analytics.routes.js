'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');

// GET /api/analytics
router.get('/', ctrl.getAnalytics);

module.exports = router;
