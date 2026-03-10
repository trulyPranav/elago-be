'use strict';

/** Wraps a successful single-item response. */
exports.success = (data, statusCode = 200) => ({
  success: true,
  statusCode,
  data,
});

/** Wraps a paginated list response. */
exports.paginated = (data, { page, limit, total }) => ({
  success: true,
  statusCode: 200,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  },
});

/** Wraps an error response. */
exports.error = (message, statusCode = 500, details) => ({
  success: false,
  statusCode,
  message,
  ...(details !== undefined ? { details } : {}),
});
