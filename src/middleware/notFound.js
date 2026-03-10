'use strict';

const { error } = require('../utils/apiResponse');

const notFound = (req, res) => {
  res
    .status(404)
    .json(error(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
