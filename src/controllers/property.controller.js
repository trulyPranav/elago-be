'use strict';

const { validationResult } = require('express-validator');
const Property = require('../models/Property');
const { success, paginated, error } = require('../utils/apiResponse');
const fs = require('fs');
const csvParser = require('csv-parser');
const { validateRow, transformRow } = require('../utils/csvValidator');
const { evaluateGrowthIndices } = require('../services/chartAi.service');

const extractYear = (value) => {
  if (!value) return null;
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const computeCompoundedValue = ({ baseAmount, index, periods }) => {
  return Math.round(baseAmount * Math.pow(1 + index, periods));
};

// ─── Filter builder ───────────────────────────────────────────────────────────

const buildFilter = (query) => {
  const filter = { 'system.is_active': true };

  if (query.types) {
    const types = Array.isArray(query.types) ? query.types : query.types.split(',');
    filter.propertyType = { $in: types };
  }

  if (query.statuses) {
    const statuses = Array.isArray(query.statuses) ? query.statuses : query.statuses.split(',');
    filter.status = { $in: statuses };
  }

  if (query.priceMin || query.priceMax) {
    filter['pricing.price_from'] = {};
    if (query.priceMin) filter['pricing.price_from'].$gte = Number(query.priceMin);
    if (query.priceMax) filter['pricing.price_from'].$lte = Number(query.priceMax);
  }

  if (query.builder) {
    const builders = Array.isArray(query.builder) ? query.builder : query.builder.split(',');
    filter.builder = { $in: builders };
  }

  if (query.highAppreciation === 'true') {
    filter.high_appreciation = true;
  }

  if (query.possessionYear) {
    // Match the year string anywhere in the possession_date field (e.g. "Dec 2026")
    filter['details.possession_date'] = {
      $regex:   String(query.possessionYear),
      $options: 'i',
    };
  }

  if (query.city) {
    filter['location.city'] = { $regex: query.city, $options: 'i' };
  }

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  return filter;
};

// ─── Lean-doc → frontend shape (used in list, no prototype methods) ───────────

const toFrontendShapeLean = (doc) => ({
  id:               doc._id.toString(),
  name:             doc.name,
  builder:          doc.builder,
  address:          doc.location.address,
  lat:              doc.location.coordinates.lat,
  lng:              doc.location.coordinates.lng,
  type:             doc.propertyType,
  status:           doc.status,
  priceFrom:        doc.pricing.price_from,
  priceTo:          doc.pricing.price_to,
  pricePerSqft:     doc.pricing.price_per_sqft,
  area:             `${doc.details.area_sqft} sqft`,
  bedrooms:         doc.details.bedrooms?.length > 0 ? (doc.details.bedrooms.length === 1 ? `${doc.details.bedrooms[0]} BHK` : `${Math.min(...doc.details.bedrooms)}-${Math.max(...doc.details.bedrooms)} BHK`) : undefined,
  possession:       doc.details.possession_date,
  phone:            doc.contact?.phone,
  email:            doc.contact?.email,
  image:            doc.media?.images?.[0] ?? '',
  description:      doc.details.description,
  highlights:       doc.highlights ?? [],
  amenities:        doc.details.amenities ?? [],
  highAppreciation: doc.high_appreciation ?? false,
  priceChartUrl:    doc.media?.brochure_url || undefined,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getProperties = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const sortField =
      req.query.sortBy === 'price_asc'  ? { 'pricing.price_from':  1 } :
      req.query.sortBy === 'price_desc' ? { 'pricing.price_from': -1 } :
                                          { createdAt: -1 };

    const filter = buildFilter(req.query);

    const [docs, total] = await Promise.all([
      Property.find(filter).sort(sortField).skip(skip).limit(limit).lean(),
      Property.countDocuments(filter),
    ]);

    return res.json(paginated(docs.map(toFrontendShapeLean), { page, limit, total }));
  } catch (err) {
    next(err);
  }
};

exports.getPropertyById = async (req, res, next) => {
  try {
    const doc = await Property.findOne({
      _id: req.params.id,
      'system.is_active': true,
    });

    if (!doc) return res.status(404).json(error('Property not found', 404));

    return res.json(success(doc.toFrontendShape()));
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json(error('Invalid property ID', 400));
    }
    next(err);
  }
};

exports.getBuilders = async (req, res, next) => {
  try {
    const builders = await Property.distinct('builder', { 'system.is_active': true });
    return res.json(success(builders.sort()));
  } catch (err) {
    next(err);
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json(error('Validation failed', 422, errors.array()));
    }

    const property = await Property.create(req.body);
    return res.status(201).json(success(property.toFrontendShape(), 201));
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(422).json(error('Validation failed', 422, err.message));
    }
    next(err);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json(error('Validation failed', 422, errors.array()));
    }

    const doc = await Property.findOneAndUpdate(
      { _id: req.params.id, 'system.is_active': true },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!doc) return res.status(404).json(error('Property not found', 404));
    return res.json(success(doc.toFrontendShape()));
  } catch (err) {
    if (err.name === 'CastError')       return res.status(400).json(error('Invalid property ID', 400));
    if (err.name === 'ValidationError') return res.status(422).json(error('Validation failed', 422, err.message));
    next(err);
  }
};

// Soft-delete: sets system.is_active = false
exports.deleteProperty = async (req, res, next) => {
  try {
    const doc = await Property.findOneAndUpdate(
      { _id: req.params.id, 'system.is_active': true },
      { $set: { 'system.is_active': false } },
      { new: true }
    );

    if (!doc) return res.status(404).json(error('Property not found', 404));
    return res.json(success({ message: 'Property deactivated successfully' }));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json(error('Invalid property ID', 400));
    next(err);
  }
};

// ─── Bulk Upload from CSV ─────────────────────────────────────────────────────

exports.bulkUploadProperties = async (req, res, next) => {
  try {
    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json(error('No file uploaded', 400));
    }

    const filePath = req.file.path;
    const rows = [];
    const validationErrors = [];
    let rowIndex = 0;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          rowIndex++;
          const errors = validateRow(row, rowIndex);
          
          if (errors.length > 0) {
            validationErrors.push({
              rowNumber: rowIndex,
              errors,
              data: row,
            });
          } else {
            rows.push({ rowNumber: rowIndex, data: row });
          }
        })
        .on('error', reject)
        .on('end', resolve);
    });

    // If there are validation errors, reject the entire upload
    if (validationErrors.length > 0) {
      fs.unlinkSync(filePath); // Clean up temp file
      return res.status(422).json(error(
        `CSV validation failed: ${validationErrors.length} row(s) have errors`,
        422,
        { validationErrors }
      ));
    }

    if (rows.length === 0) {
      fs.unlinkSync(filePath); // Clean up temp file
      return res.status(400).json(error('CSV file is empty', 400));
    }

    // Transform rows to property documents
    const properties = rows.map(r => transformRow(r.data));

    // Check for duplicates within the batch (by name + builder combination)
    const seen = new Set();
    const uniqueProperties = [];
    const skippedDuplicates = [];

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const key = `${prop.name}|${prop.builder}`;

      if (seen.has(key)) {
        skippedDuplicates.push({
          rowNumber: rows[i].rowNumber,
          name: prop.name,
          builder: prop.builder,
          reason: 'Duplicate in batch',
        });
      } else {
        seen.add(key);
        uniqueProperties.push(prop);
      }
    }

    // Insert unique properties
    const result = await Property.insertMany(uniqueProperties, { ordered: false });

    // Clean up temp file
    fs.unlinkSync(filePath);

    return res.json(success({
      message: `Successfully imported ${result.length} properties`,
      imported: result.length,
      skipped: skippedDuplicates.length,
      skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
      properties: result.map(p => ({ id: p._id, name: p.name })),
    }));
  } catch (err) {
    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    if (err.code === 11000) {
      // Duplicate key error
      return res.status(409).json(error('Duplicate property entries detected', 409));
    }

    next(err);
  }
};

// ─── Chart Projection ─────────────────────────────────────────────────────────

exports.generatePropertyChart = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json(error('Validation failed', 422, errors.array()));
    }

    const { id } = req.params;
    const {
      currentPropertyValue,
      currentRentValue,
      nearbyAmenities = [],
      startYear,
      yearsToProject = 25,
      intervalYears = 5,
    } = req.body;

    const property = await Property.findOne({ _id: id, 'system.is_active': true }).lean();
    if (!property) {
      return res.status(404).json(error('Property not found', 404));
    }

    const nowYear = new Date().getFullYear();
    const chartStartYear = Number(startYear) || nowYear;

    const possessionYear = extractYear(property.details?.possession_date);
    const rentStartYear = possessionYear && possessionYear > chartStartYear
      ? possessionYear
      : chartStartYear;

    const { propertyIndex, rentIndex, factors } = evaluateGrowthIndices({
      coordinates: property.location?.coordinates,
      builder: property.builder,
      nearbyAmenities,
    });

    const timeline = [];
    const steps = Math.floor(yearsToProject / intervalYears);

    for (let i = 0; i <= steps; i++) {
      const year = chartStartYear + i * intervalYears;
      const propertyValue = computeCompoundedValue({
        baseAmount: Number(currentPropertyValue),
        index: propertyIndex,
        periods: i,
      });

      let rentalValue = 0;
      if (year >= rentStartYear) {
        const rentPeriods = Math.floor((year - rentStartYear) / intervalYears);
        rentalValue = computeCompoundedValue({
          baseAmount: Number(currentRentValue),
          index: rentIndex,
          periods: rentPeriods,
        });
      }

      timeline.push({
        x: year,
        propertyValueINR: propertyValue,
        rentValueINR: rentalValue,
        totalINR: propertyValue + rentalValue,
      });
    }

    return res.json(success({
      propertyId: property._id,
      propertyName: property.name,
      locationCoordinates: property.location?.coordinates,
      possessionDate: property.details?.possession_date,
      chartMeta: {
        chartStartYear,
        rentStartYear,
        intervalYears,
        yearsToProject,
        propertyIndex,
        rentIndex,
      },
      aiEvaluation: {
        provider: 'heuristic-ai-v1',
        factors,
      },
      coordinates: timeline,
    }));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json(error('Invalid property ID', 400));
    next(err);
  }
};