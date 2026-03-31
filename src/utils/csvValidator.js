'use strict';

/**
 * CSV Validator — parses and validates property CSV data
 * 
 * Expected CSV columns:
 *   name, builder, propertyType, status, location.address, location.area, location.city,
 *   location.coordinates.lat, location.coordinates.lng, details.area_sqft, details.bedrooms,
 *   details.description, details.possession_date, pricing.price_from, pricing.price_to,
 *   pricing.price_per_sqft, media.brochure_url, contact.phone, contact.email,
 *   amenities, highlights, high_appreciation, rental.expected_rent, rental.vacancy_rate
 *
 * bedrooms can be comma-separated values (e.g., "1,2,3") which will be converted to array
 * amenities and highlights can be pipe-separated (e.g., "Pool|Gym|Clubhouse")
 */

const parseBedroomString = (str) => {
  if (!str) return [];
  return str.split(',').map(s => {
    const num = parseInt(s.trim());
    return isNaN(num) ? null : num;
  }).filter(n => n !== null);
};

const parseArrayString = (str, delimiter = '|') => {
  if (!str) return [];
  return str.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);
};

const validateRow = (row, index) => {
  const errors = [];

  // Required fields
  if (!row.name || row.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'name is required' });
  }

  if (!row.builder || row.builder.trim().length === 0) {
    errors.push({ field: 'builder', message: 'builder is required' });
  }

  if (!row.propertyType || !['Flat', 'Villa', 'Commercial', 'Plot'].includes(row.propertyType)) {
    errors.push({ field: 'propertyType', message: 'propertyType must be Flat | Villa | Commercial | Plot' });
  }

  if (!row.status || !['New Launch', 'Under Construction', 'Ready', 'Resale'].includes(row.status)) {
    errors.push({ field: 'status', message: 'status must be New Launch | Under Construction | Ready | Resale' });
  }

  // Location
  if (!row['location.address'] || row['location.address'].trim().length === 0) {
    errors.push({ field: 'location.address', message: 'location.address is required' });
  }

  if (!row['location.area'] || row['location.area'].trim().length === 0) {
    errors.push({ field: 'location.area', message: 'location.area is required' });
  }

  if (!row['location.city'] || row['location.city'].trim().length === 0) {
    errors.push({ field: 'location.city', message: 'location.city is required' });
  }

  const lat = parseFloat(row['location.coordinates.lat']);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push({ field: 'location.coordinates.lat', message: 'latitude must be between -90 and 90' });
  }

  const lng = parseFloat(row['location.coordinates.lng']);
  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push({ field: 'location.coordinates.lng', message: 'longitude must be between -180 and 180' });
  }

  // Details
  const areaSqft = parseInt(row['details.area_sqft']);
  if (isNaN(areaSqft) || areaSqft < 1) {
    errors.push({ field: 'details.area_sqft', message: 'details.area_sqft must be a positive integer' });
  }

  if (!row['details.description'] || row['details.description'].trim().length === 0) {
    errors.push({ field: 'details.description', message: 'details.description is required' });
  }

  if (!row['details.possession_date'] || row['details.possession_date'].trim().length === 0) {
    errors.push({ field: 'details.possession_date', message: 'details.possession_date is required' });
  }

  // Pricing
  const priceFrom = parseInt(row['pricing.price_from']);
  if (isNaN(priceFrom) || priceFrom < 0) {
    errors.push({ field: 'pricing.price_from', message: 'pricing.price_from must be a non-negative integer' });
  }

  const priceTo = parseInt(row['pricing.price_to']);
  if (isNaN(priceTo) || priceTo < 0) {
    errors.push({ field: 'pricing.price_to', message: 'pricing.price_to must be a non-negative integer' });
  }

  // Optional but validated
  if (row['pricing.price_per_sqft']) {
    const pricePerSqft = parseFloat(row['pricing.price_per_sqft']);
    if (isNaN(pricePerSqft) || pricePerSqft < 0) {
      errors.push({ field: 'pricing.price_per_sqft', message: 'pricing.price_per_sqft must be non-negative' });
    }
  }

  if (row['rental.expected_rent']) {
    const rent = parseFloat(row['rental.expected_rent']);
    if (isNaN(rent) || rent < 0) {
      errors.push({ field: 'rental.expected_rent', message: 'rental.expected_rent must be non-negative' });
    }
  }

  if (row['rental.vacancy_rate']) {
    const rate = parseFloat(row['rental.vacancy_rate']);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      errors.push({ field: 'rental.vacancy_rate', message: 'rental.vacancy_rate must be between 0 and 1' });
    }
  }

  return errors;
};

/**
 * Transform CSV row to property document structure
 */
const transformRow = (row) => {
  const bedrooms = parseBedroomString(row['details.bedrooms']);
  const amenities = parseArrayString(row.amenities, '|');
  const highlights = parseArrayString(row.highlights, '|');

  return {
    name: row.name.trim(),
    builder: row.builder.trim(),
    propertyType: row.propertyType.trim(),
    status: row.status.trim(),
    location: {
      address: row['location.address'].trim(),
      area: row['location.area'].trim(),
      city: row['location.city'].trim() || 'Bengaluru',
      coordinates: {
        lat: parseFloat(row['location.coordinates.lat']),
        lng: parseFloat(row['location.coordinates.lng']),
      },
    },
    details: {
      amenities,
      area_sqft: parseInt(row['details.area_sqft']),
      bedrooms,
      description: row['details.description'].trim(),
      possession_date: row['details.possession_date'].trim(),
    },
    media: {
      brochure_url: row['media.brochure_url']?.trim() || '',
      images: [],
    },
    pricing: {
      price_from: parseInt(row['pricing.price_from']),
      price_to: parseInt(row['pricing.price_to']),
      price_per_sqft: row['pricing.price_per_sqft'] ? parseFloat(row['pricing.price_per_sqft']) : null,
    },
    rental: {
      expected_rent: row['rental.expected_rent'] ? parseFloat(row['rental.expected_rent']) : 0,
      vacancy_rate: row['rental.vacancy_rate'] ? parseFloat(row['rental.vacancy_rate']) : 0,
    },
    contact: {
      phone: row['contact.phone']?.trim() || '',
      email: row['contact.email']?.trim() || '',
    },
    highlights,
    high_appreciation: row.high_appreciation?.toLowerCase() === 'true' || row.high_appreciation === '1',
    system: { is_active: true },
  };
};

module.exports = {
  parseBedroomString,
  parseArrayString,
  validateRow,
  transformRow,
};
