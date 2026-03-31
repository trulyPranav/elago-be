'use strict';

/**
 * Seed script — populates MongoDB with the 6 sample properties that
 * the frontend currently serves as static data.
 *
 * Usage:
 *   npm run seed              (reads .env from project root)
 *
 * SAFETY: will refuse to run in NODE_ENV=production.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Force IPv4 — fixes querySrv ECONNREFUSED on Windows
require('dns').setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const Property = require('../models/Property');

const SEED_PROPERTIES = [
  {
    name:         'Prestige Lakeside Habitat',
    builder:      'Prestige Group',
    propertyType: 'Flat',
    status:       'Ready',
    location: {
      address:     'Whitefield, Bengaluru, Karnataka 560066',
      area:        'Whitefield',
      city:        'Bengaluru',
      coordinates: { lat: 12.9716, lng: 77.7482 },
    },
    details: {
      amenities:       ['Swimming Pool', 'Gymnasium', 'Clubhouse', "Children's Play Area", 'Jogging Track', 'Security', 'Power Backup'],
      area_sqft:       1450,
      bedrooms:        [2, 3],
      description:     'Prestige Lakeside Habitat is a premium gated community offering luxury apartments with stunning views of Seegehalli Lake. Spread across 102 acres with world-class amenities.',
      possession_date: 'Ready',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
    },
    pricing:          { price_from: 8500000, price_per_sqft: 5862, price_to: 12500000 },
    rental:           { expected_rent: 35000, vacancy_rate: 0.05 },
    contact:          { phone: '9876543210', email: 'sales@prestige.in' },
    highlights:       ['Lake View', 'Gated Community', '102 Acres', 'RERA Approved'],
    high_appreciation: true,
    system:           { is_active: true },
  },
  {
    name:         'Sobha Dream Acres',
    builder:      'Sobha Developers',
    propertyType: 'Flat',
    status:       'Under Construction',
    location: {
      address:     'Panathur Road, Bengaluru, Karnataka 560103',
      area:        'Panathur',
      city:        'Bengaluru',
      coordinates: { lat: 12.9352, lng: 77.6966 },
    },
    details: {
      amenities:       ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Badminton Court', 'Tennis Court', 'Yoga Deck'],
      area_sqft:       1250,
      bedrooms:        [1, 2],
      description:     'Sobha Dream Acres is a landmark residential project in East Bengaluru, offering meticulously designed 1 & 2 BHK apartments at accessible price points.',
      possession_date: 'Dec 2026',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1580041065738-e72023775cdc?w=800'],
    },
    pricing:          { price_from: 6200000, price_per_sqft: 4960, price_to: 9000000 },
    rental:           { expected_rent: 28000, vacancy_rate: 0.07 },
    contact:          { phone: '9876543211', email: 'sales@sobha.com' },
    highlights:       ['East Bengaluru', 'Sobha Quality', 'RERA Certified'],
    high_appreciation: false,
    system:           { is_active: true },
  },
  {
    name:         'Embassy Springs',
    builder:      'Embassy Group',
    propertyType: 'Villa',
    status:       'New Launch',
    location: {
      address:     'Devanahalli, Bengaluru, Karnataka 562110',
      area:        'Devanahalli',
      city:        'Bengaluru',
      coordinates: { lat: 13.2497, lng: 77.7117 },
    },
    details: {
      amenities:       ['Private Pool', 'Clubhouse', 'Golf Course', 'Gymnasium', 'Spa', 'Kids Zone', 'Concierge'],
      area_sqft:       3200,
      bedrooms:        [3, 4],
      description:     'Embassy Springs is an ultra-luxury villa township near Kempegowda International Airport. An integrated township spread over 288 acres.',
      possession_date: 'Mar 2027',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'],
    },
    pricing:          { price_from: 22000000, price_per_sqft: 6875, price_to: 35000000 },
    rental:           { expected_rent: 75000, vacancy_rate: 0.1 },
    contact:          { phone: '9876543212', email: 'sales@embassygroup.in' },
    highlights:       ['Airport Proximity', '288 Acres Township', 'Golf Course', 'Luxury Villas'],
    high_appreciation: true,
    system:           { is_active: true },
  },
  {
    name:         'Brigade Meadows',
    builder:      'Brigade Group',
    propertyType: 'Flat',
    status:       'Ready',
    location: {
      address:     'Kanakapura Road, Bengaluru, Karnataka 560109',
      area:        'Kanakapura Road',
      city:        'Bengaluru',
      coordinates: { lat: 12.8563, lng: 77.5847 },
    },
    details: {
      amenities:       ['Swimming Pool', 'Gymnasium', 'Amphitheatre', 'Basketball Court', 'Jogging Track', 'Mini Theatre'],
      area_sqft:       1380,
      bedrooms:        [2, 3],
      description:     'Brigade Meadows is a 45-acre gated community on Kanakapura Road offering spacious 2 & 3 BHK apartments surrounded by lush greenery.',
      possession_date: 'Ready',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    },
    pricing:          { price_from: 7800000, price_per_sqft: 5652, price_to: 11500000 },
    rental:           { expected_rent: 32000, vacancy_rate: 0.06 },
    contact:          { phone: '9876543213', email: 'sales@brigadegroup.com' },
    highlights:       ['Forest View', '45 Acres', 'Green Living', 'RERA Approved'],
    high_appreciation: false,
    system:           { is_active: true },
  },
  {
    name:         'Adarsh Palm Retreat',
    builder:      'Adarsh Developers',
    propertyType: 'Villa',
    status:       'Resale',
    location: {
      address:     'Sarjapur Road, Bengaluru, Karnataka 560035',
      area:        'Sarjapur Road',
      city:        'Bengaluru',
      coordinates: { lat: 12.9016, lng: 77.6999 },
    },
    details: {
      amenities:       ['Swimming Pool', 'Gymnasium', 'Tennis Court', 'Clubhouse', 'Jogging Track', 'Kids Play Area'],
      area_sqft:       2800,
      bedrooms:        [3, 4],
      description:     'Adarsh Palm Retreat is a premium villa community in the heart of the IT corridor with independently designed villas and private gardens.',
      possession_date: 'Ready',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
    },
    pricing:          { price_from: 18000000, price_per_sqft: 6428, price_to: 25000000 },
    rental:           { expected_rent: 65000, vacancy_rate: 0.08 },
    contact:          { phone: '9876543214', email: 'sales@adarshdevelopers.com' },
    highlights:       ['IT Corridor', 'Private Gardens', 'Established Community'],
    high_appreciation: true,
    system:           { is_active: true },
  },
  {
    name:         'Mahindra Windchimes',
    builder:      'Mahindra Lifespace',
    propertyType: 'Flat',
    status:       'Under Construction',
    location: {
      address:     'Begur Road, Bengaluru, Karnataka 560068',
      area:        'Begur Road',
      city:        'Bengaluru',
      coordinates: { lat: 12.8836, lng: 77.5948 },
    },
    details: {
      amenities:       ['Swimming Pool', 'Gymnasium', 'Multipurpose Hall', 'Jogging Track', 'Landscaped Gardens', 'Power Backup'],
      area_sqft:       1180,
      bedrooms:        [2, 3],
      description:     'Mahindra Windchimes is a thoughtfully designed residential community offering 2 & 3 BHK apartments with modern amenities and quality Mahindra construction.',
      possession_date: 'Jun 2027',
    },
    media: {
      brochure_url: '',
      images:       ['https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800'],
    },
    pricing:          { price_from: 7200000, price_per_sqft: 6101, price_to: 10500000 },
    rental:           { expected_rent: 30000, vacancy_rate: 0.09 },
    contact:          { phone: '9876543215', email: 'sales@mahindralifespace.com' },
    highlights:       ['Mahindra Quality', 'South Bengaluru', 'RERA Certified'],
    high_appreciation: false,
    system:           { is_active: true },
  },
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Create a .env file from .env.example first.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('Seed script must not run in production. Exiting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, family: 4 });
    console.log('Connected to MongoDB Atlas');

    // Explicitly create all indexes before any writes so they are guaranteed
    // to exist — without this, Mongoose creates them in the background and
    // they may not finish before the script disconnects.
    await Property.createIndexes();
    console.log('Indexes ensured.');

    await Property.deleteMany({});
    console.log('Cleared existing properties.');

    const docs = await Property.insertMany(SEED_PROPERTIES);
    console.log(`\nSeeded ${docs.length} properties:`);
    docs.forEach((d) => console.log(`  • [${d._id}]  ${d.name}`));
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

seed();
