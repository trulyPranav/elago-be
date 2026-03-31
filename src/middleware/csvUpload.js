'use strict';

const multer = require('multer');
const path = require('path');
const os = require('os');

/**
 * Multer middleware for CSV file uploads
 * Stores files temporarily in the OS temp directory
 */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'property-bulk-' + uniqueSuffix + '.csv');
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only CSV files
  if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
    return cb(new Error('Only CSV files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

module.exports = upload;
