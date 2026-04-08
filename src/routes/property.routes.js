'use strict';

const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/property.controller');
const upload = require('../middleware/csvUpload');

// ─── Reusable validation rule sets ───────────────────────────────────────────

const idRule = [param('id').isMongoId().withMessage('Invalid property ID')];

const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('priceMin').optional().isInt({ min: 0 }).withMessage('priceMin must be >= 0'),
  query('priceMax').optional().isInt({ min: 0 }).withMessage('priceMax must be >= 0'),
  query('sortBy').optional().isIn(['price_asc', 'price_desc', 'newest']).withMessage('invalid sortBy'),
];

const createRules = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('builder').trim().notEmpty().withMessage('builder is required'),
  body('propertyType')
    .isIn(['Flat', 'Villa', 'Commercial', 'Plot'])
    .withMessage('propertyType must be Flat | Villa | Commercial | Plot'),
  body('status')
    .isIn(['New Launch', 'Under Construction', 'Ready', 'Resale'])
    .withMessage('status must be New Launch | Under Construction | Ready | Resale'),
  body('location.address').trim().notEmpty().withMessage('location.address is required'),
  body('location.area').trim().notEmpty().withMessage('location.area is required'),
  body('location.city').trim().notEmpty().withMessage('location.city is required'),
  body('location.coordinates.lat')
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  body('location.coordinates.lng')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
  body('details.area_sqft')
    .isInt({ min: 1 }).withMessage('details.area_sqft must be a positive integer'),
  body('details.description').trim().notEmpty().withMessage('details.description is required'),
  body('details.possession_date').trim().notEmpty().withMessage('details.possession_date is required'),
  body('pricing.price_from')
    .isInt({ min: 0 }).withMessage('pricing.price_from must be a non-negative integer'),
  body('pricing.price_to')
    .isInt({ min: 0 }).withMessage('pricing.price_to must be a non-negative integer'),
];

const chartRules = [
  param('id').isMongoId().withMessage('Invalid property ID'),
  body('currentPropertyValue')
    .isFloat({ gt: 0 }).withMessage('currentPropertyValue must be > 0'),
  body('currentRentValue')
    .isFloat({ min: 0 }).withMessage('currentRentValue must be >= 0'),
  body('nearbyAmenities')
    .optional()
    .isArray()
    .withMessage('nearbyAmenities must be an array'),
  body('nearbyAmenities.*')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (value && typeof value === 'object') return true;
      throw new Error('Each nearby amenity must be a string or object');
    }),
  body('startYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('startYear must be between 2000 and 2100'),
  body('yearsToProject')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('yearsToProject must be between 5 and 50'),
  body('intervalYears')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('intervalYears must be between 1 and 10'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────
//
//  GET    /api/properties              → list (with filters & pagination)
//  GET    /api/properties/builders     → distinct builder list
//  GET    /api/properties/:id          → single property detail
//  POST   /api/properties              → create
//  PUT    /api/properties/:id          → full update
//  DELETE /api/properties/:id          → soft-delete (sets is_active = false)
//  POST   /api/properties/bulk-upload → bulk import from CSV
//  POST   /api/properties/:id/chart    → chart coordinates projection

router.get('/',          listRules, ctrl.getProperties);
router.get('/builders',             ctrl.getBuilders);     // must be before /:id
router.post('/bulk-upload', upload.single('file'), ctrl.bulkUploadProperties);
router.post('/:id/chart', chartRules, ctrl.generatePropertyChart);
router.get('/:id',       idRule,    ctrl.getPropertyById);
router.post('/',         createRules, ctrl.createProperty);
router.put('/:id',       [...idRule, ...createRules], ctrl.updateProperty);
router.delete('/:id',    idRule,    ctrl.deleteProperty);

module.exports = router;
