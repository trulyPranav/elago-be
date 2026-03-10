'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CoordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90,  max: 90  },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    address:     { type: String, required: true, trim: true },
    area:        { type: String, required: true, trim: true },
    city:        { type: String, required: true, trim: true, default: 'Bengaluru' },
    coordinates: { type: CoordinatesSchema, required: true },
  },
  { _id: false }
);

const DetailsSchema = new Schema(
  {
    amenities:       { type: [String], default: [] },
    area_sqft:       { type: Number, required: true, min: 1 },
    bedrooms:        { type: Number, min: 0 },
    description:     { type: String, required: true, trim: true },
    possession_date: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const MediaSchema = new Schema(
  {
    brochure_url: { type: String, trim: true, default: '' },
    images:       { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const PricingSchema = new Schema(
  {
    price_from:     { type: Number, required: true, min: 0 },
    price_per_sqft: { type: Number, min: 0 },
    price_to:       { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const RentalSchema = new Schema(
  {
    expected_rent: { type: Number, min: 0, default: 0 },
    vacancy_rate:  { type: Number, min: 0, max: 1, default: 0 },
  },
  { _id: false }
);

const ContactSchema = new Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const SystemSchema = new Schema(
  {
    is_active: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Extended sub-schemas (frontend-specific) ─────────────────────────────────

const PriceChartRowSchema = new Schema(
  {
    floors:           { type: String },
    unitType:         { type: String },
    area:             { type: String },
    basePricePerSqft: { type: Number },
    totalPrice:       { type: Number },
  },
  { _id: false }
);

const FloorAvailabilitySchema = new Schema(
  {
    floor:        { type: Number },
    label:        { type: String },
    unitTypes:    { type: String },
    available:    { type: Number },
    total:        { type: Number },
    pricePerSqft: { type: Number },
    status:       { type: String, enum: ['available', 'limited', 'sold'] },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const PropertySchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    builder:      { type: String, required: true, trim: true },
    propertyType: {
      type: String,
      required: true,
      enum: ['Flat', 'Villa', 'Commercial', 'Plot'],
    },
    status: {
      type: String,
      required: true,
      enum: ['New Launch', 'Under Construction', 'Ready', 'Resale'],
    },

    // Core nested objects (from the provided JSON Schema)
    location: { type: LocationSchema, required: true },
    details:  { type: DetailsSchema,  required: true },
    media:    { type: MediaSchema,    default: () => ({}) },
    pricing:  { type: PricingSchema,  required: true },
    rental:   { type: RentalSchema,   default: () => ({}) },
    system:   { type: SystemSchema,   default: () => ({ is_active: true }) },

    // Extended fields for the frontend
    contact:            { type: ContactSchema, default: () => ({}) },
    highlights:         { type: [String], default: [] },
    high_appreciation:  { type: Boolean, default: false },
    builder_doc_link:   { type: String, trim: true },
    price_chart:        { type: [PriceChartRowSchema], default: [] },
    floor_availability: { type: [FloorAvailabilitySchema], default: [] },
  },
  {
    timestamps: true,  // adds createdAt / updatedAt
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
PropertySchema.index({ 'system.is_active': 1 });
PropertySchema.index({ propertyType: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ builder: 1 });
PropertySchema.index({ high_appreciation: 1 });
PropertySchema.index({ 'pricing.price_from': 1, 'pricing.price_to': 1 });
PropertySchema.index({ 'location.city': 1, 'location.area': 1 });
// Full-text search index
PropertySchema.index(
  { name: 'text', builder: 'text', 'details.description': 'text' },
  { weights: { name: 10, builder: 5, 'details.description': 1 } }
);

// ─── Instance method: maps doc → frontend Property shape ──────────────────────
PropertySchema.methods.toFrontendShape = function () {
  return {
    id:               this._id.toString(),
    name:             this.name,
    builder:          this.builder,
    address:          this.location.address,
    lat:              this.location.coordinates.lat,
    lng:              this.location.coordinates.lng,
    type:             this.propertyType,
    status:           this.status,
    priceFrom:        this.pricing.price_from,
    priceTo:          this.pricing.price_to,
    pricePerSqft:     this.pricing.price_per_sqft,
    area:             `${this.details.area_sqft} sqft`,
    bedrooms:         this.details.bedrooms != null
                        ? `${this.details.bedrooms} BHK`
                        : undefined,
    possession:       this.details.possession_date,
    phone:            this.contact?.phone,
    email:            this.contact?.email,
    image:            this.media?.images?.[0] ?? '',
    description:      this.details.description,
    highlights:       this.highlights ?? [],
    amenities:        this.details.amenities ?? [],
    highAppreciation: this.high_appreciation ?? false,
    priceChartUrl:    this.media?.brochure_url || undefined,
    builderDocLink:   this.builder_doc_link   || undefined,
    priceChart:       this.price_chart?.length        ? this.price_chart        : undefined,
    floorAvailability: this.floor_availability?.length ? this.floor_availability : undefined,
    rental: {
      expectedRent: this.rental?.expected_rent,
      vacancyRate:  this.rental?.vacancy_rate,
    },
  };
};

module.exports = mongoose.model('Property', PropertySchema);
