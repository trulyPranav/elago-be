'use strict';

/**
 * Lightweight AI-like scorer for chart index calculation.
 * Replace this implementation with a real AI model/service when available.
 */

const BUILDER_REPUTATION_SCORE = {
  'Prestige Group': 0.09,
  'Sobha Developers': 0.085,
  'Embassy Group': 0.088,
  'Brigade Group': 0.082,
  'Adarsh Developers': 0.078,
  'Mahindra Lifespace': 0.08,
};

const AMENITY_WEIGHTS = {
  metro: 0.02,
  airport: 0.015,
  it_park: 0.015,
  school: 0.01,
  hospital: 0.01,
  mall: 0.008,
  highway: 0.008,
  railway: 0.01,
  lake: 0.006,
  tech_park: 0.015,
};

const AMENITY_ALIASES = {
  subway_station: 'metro',
  transit_station: 'metro',
  train_station: 'railway',
  bus_station: 'railway',
  shopping_mall: 'mall',
  university: 'school',
  primary_school: 'school',
  secondary_school: 'school',
  hospital_or_health_care: 'hospital',
  route: 'highway',
  tech_hub: 'tech_park',
  it_hub: 'it_park',
};

const normalizeAmenityToken = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return AMENITY_ALIASES[normalized] || normalized;
};

const collectAmenityTokens = (nearbyAmenities) => {
  if (!Array.isArray(nearbyAmenities) || nearbyAmenities.length === 0) return [];

  const tokens = [];

  for (const item of nearbyAmenities) {
    if (Array.isArray(item?.types)) {
      for (const type of item.types) tokens.push(normalizeAmenityToken(type));
      continue;
    }

    if (typeof item === 'object' && item !== null) {
      if (typeof item.type === 'string') tokens.push(normalizeAmenityToken(item.type));
      if (typeof item.name === 'string') tokens.push(normalizeAmenityToken(item.name));
      continue;
    }

    tokens.push(normalizeAmenityToken(item));
  }

  return tokens.filter(Boolean);
};

const getLocationPotentialScore = (coordinates) => {
  if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
    return 0;
  }

  // Heuristic for Bengaluru region (tunable):
  // East / North-East growth corridors get slight premium.
  const { lat, lng } = coordinates;
  let score = 0;

  if (lat >= 12.9 && lat <= 13.2) score += 0.01;
  if (lng >= 77.65 && lng <= 77.8) score += 0.01;

  return score;
};

const getAmenityScore = (nearbyAmenities) => {
  if (!Array.isArray(nearbyAmenities) || nearbyAmenities.length === 0) return 0;

  const uniqueTokens = new Set(collectAmenityTokens(nearbyAmenities));
  let score = 0;

  for (const token of uniqueTokens) {
    score += AMENITY_WEIGHTS[token] || 0;
  }

  // Cap amenity boost to avoid unrealistic projections.
  return Math.min(score, 0.05);
};

const evaluateGrowthIndices = ({ coordinates, builder, nearbyAmenities = [] }) => {
  const basePropertyIndex = 0.08;
  const baseRentIndex = 0.06;

  const builderBoost = BUILDER_REPUTATION_SCORE[builder] ? BUILDER_REPUTATION_SCORE[builder] - 0.07 : 0;
  const locationBoost = getLocationPotentialScore(coordinates);
  const amenityBoost = getAmenityScore(nearbyAmenities);

  const propertyIndex = Math.min(
    0.2,
    Math.max(0.04, basePropertyIndex + builderBoost + locationBoost + amenityBoost)
  );

  // Rent index usually trails capital appreciation.
  const rentIndex = Math.min(
    0.15,
    Math.max(0.03, baseRentIndex + builderBoost * 0.5 + amenityBoost * 0.6)
  );

  return {
    propertyIndex,
    rentIndex,
    factors: {
      builder,
      coordinates,
      nearbyAmenities,
      builderBoost,
      locationBoost,
      amenityBoost,
    },
  };
};

module.exports = {
  evaluateGrowthIndices,
};
