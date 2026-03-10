'use strict';

const Property = require('../models/Property');
const { success } = require('../utils/apiResponse');

exports.getAnalytics = async (req, res, next) => {
  try {
    const baseMatch = { 'system.is_active': true };

    const [byType, byStatus, kpis, topBuilders, priceRange] = await Promise.all([
      // Count by property type
      Property.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Count by status
      Property.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // KPIs
      Property.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:                  null,
            total:                { $sum: 1 },
            highAppreciationCount:{ $sum: { $cond: ['$high_appreciation', 1, 0] } },
            readyCount:           { $sum: { $cond: [{ $eq: ['$status', 'Ready']      }, 1, 0] } },
            newLaunchCount:       { $sum: { $cond: [{ $eq: ['$status', 'New Launch'] }, 1, 0] } },
            avgPrice:             { $avg: '$pricing.price_from' },
            avgPricePerSqft:      { $avg: '$pricing.price_per_sqft' },
          },
        },
      ]),

      // Top builders by listing count
      Property.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$builder', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Overall price range across all active listings
      Property.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:      null,
            minPrice: { $min: '$pricing.price_from' },
            maxPrice: { $max: '$pricing.price_to' },
          },
        },
      ]),
    ]);

    const kpi = kpis[0] ?? {
      total: 0, highAppreciationCount: 0, readyCount: 0,
      newLaunchCount: 0, avgPrice: 0, avgPricePerSqft: 0,
    };

    return res.json(
      success({
        kpis: {
          total:           kpi.total,
          highAppreciation: kpi.highAppreciationCount,
          ready:           kpi.readyCount,
          newLaunch:       kpi.newLaunchCount,
          avgPrice:        Math.round(kpi.avgPrice        ?? 0),
          avgPricePerSqft: Math.round(kpi.avgPricePerSqft ?? 0),
        },
        byType:      byType.map((r)   => ({ type:    r._id, count: r.count })),
        byStatus:    byStatus.map((r) => ({ status:  r._id, count: r.count })),
        topBuilders: topBuilders.map((r) => ({ builder: r._id, count: r.count })),
        priceRange:  priceRange[0] ?? { minPrice: 0, maxPrice: 0 },
      })
    );
  } catch (err) {
    next(err);
  }
};
