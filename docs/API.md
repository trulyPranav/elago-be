# Elago Backend — API Reference

Base URL (development): `http://localhost:5000`

All responses follow a consistent envelope:

```jsonc
// Success
{ "success": true, "statusCode": 200, "data": { ... } }

// Paginated list
{ "success": true, "statusCode": 200, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 6, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } }

// Error
{ "success": false, "statusCode": 404, "message": "Property not found" }
```

---

## Health

### `GET /health`

Returns server status. Use this to verify the API is reachable.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-03-07T10:00:00.000Z",
  "env": "development"
}
```

---

## Properties

### `GET /api/properties`

Returns a paginated, filterable list of active properties.

**Query parameters**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `page` | integer ≥ 1 | Page number (default `1`) | `?page=2` |
| `limit` | integer 1–100 | Results per page (default `20`) | `?limit=10` |
| `sortBy` | string | `price_asc` \| `price_desc` \| `newest` (default `newest`) | `?sortBy=price_asc` |
| `types` | string | Comma-separated property types | `?types=Flat,Villa` |
| `statuses` | string | Comma-separated statuses | `?statuses=Ready,New Launch` |
| `priceMin` | integer | Min `price_from` (₹) | `?priceMin=5000000` |
| `priceMax` | integer | Max `price_from` (₹) | `?priceMax=15000000` |
| `builder` | string | Comma-separated builder names | `?builder=Prestige Group,Sobha Developers` |
| `highAppreciation` | `true` | Only high-appreciation listings | `?highAppreciation=true` |
| `possessionYear` | integer | Match possession year | `?possessionYear=2026` |
| `city` | string | Case-insensitive city filter | `?city=Bengaluru` |
| `q` | string | Full-text search (name, builder, description) | `?q=whitefield` |

**Example request**
```
GET /api/properties?types=Flat&priceMin=6000000&priceMax=12000000&sortBy=price_asc&page=1&limit=10
```

**Response**
```jsonc
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "685abc123def456789012345",
      "name": "Sobha Dream Acres",
      "builder": "Sobha Developers",
      "address": "Panathur Road, Bengaluru, Karnataka 560103",
      "lat": 12.9352,
      "lng": 77.6966,
      "type": "Flat",
      "status": "Under Construction",
      "priceFrom": 6200000,
      "priceTo": 9000000,
      "pricePerSqft": 4960,
      "area": "1250 sqft",
      "bedrooms": "1-2 BHK",
      "possession": "Dec 2026",
      "phone": "9876543211",
      "email": "sales@sobha.com",
      "image": "https://...",
      "description": "...",
      "highlights": ["East Bengaluru", "Sobha Quality", "RERA Certified"],
      "amenities": ["Swimming Pool", "Gymnasium", "..."],
      "highAppreciation": false,
      "priceChartUrl": null,
      "builderDocLink": null,
      "rental": { "expectedRent": 28000, "vacancyRate": 0.07 }
    }
    // ...more items
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### `GET /api/properties/builders`

Returns a sorted list of all distinct builder names. Use this to populate the Filter Panel dropdown.

**Response**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    "Adarsh Developers",
    "Brigade Group",
    "Embassy Group",
    "Mahindra Lifespace",
    "Prestige Group",
    "Sobha Developers"
  ]
}
```

---

### `GET /api/properties/:id`

Returns full detail for a single property, including `priceChart`, `floorAvailability`, and rental data.

**Path parameter**

| Parameter | Type | Description |
|---|---|---|
| `id` | MongoDB ObjectId string (24 hex chars) | Property `_id` |

**Example request**
```
GET /api/properties/685abc123def456789012345
```

**Response**
```jsonc
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "685abc123def456789012345",
    "name": "Prestige Lakeside Habitat",
    "builder": "Prestige Group",
    "address": "Whitefield, Bengaluru, Karnataka 560066",
    "lat": 12.9716,
    "lng": 77.7482,
    "type": "Flat",
    "status": "Ready",
    "priceFrom": 8500000,
    "priceTo": 12500000,
    "pricePerSqft": 5862,
    "area": "1450 sqft",
    "bedrooms": "2-3 BHK",
    "possession": "Ready",
    "phone": "9876543210",
    "email": "sales@prestige.in",
    "image": "https://...",
    "description": "...",
    "highlights": ["Lake View", "Gated Community", "102 Acres", "RERA Approved"],
    "amenities": ["Swimming Pool", "Gymnasium", "Clubhouse", "..."],
    "highAppreciation": true,
    "priceChartUrl": "https://...",
    "builderDocLink": "https://...",
    "priceChart": [
      { "floors": "1-5",  "unitType": "2 BHK", "area": "1100 sqft", "basePricePerSqft": 5800, "totalPrice": 6380000 },
      { "floors": "6-10", "unitType": "3 BHK", "area": "1450 sqft", "basePricePerSqft": 5900, "totalPrice": 8555000 }
    ],
    "floorAvailability": [
      { "floor": 1, "label": "Ground Floor", "unitTypes": "2 BHK", "available": 2, "total": 4, "pricePerSqft": 5700, "status": "limited" },
      { "floor": 2, "label": "1st Floor",    "unitTypes": "3 BHK", "available": 0, "total": 2, "pricePerSqft": 5900, "status": "sold" }
    ],
    "rental": { "expectedRent": 35000, "vacancyRate": 0.05 }
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400` | `id` is not a valid 24-char hex ObjectId |
| `404` | Property not found or is inactive |

---

### `POST /api/properties`

Creates a new property listing.

**Request body (JSON)**

```jsonc
{
  "name": "Sample Tower",
  "builder": "Sample Developers",
  "propertyType": "Flat",            // "Flat" | "Villa" | "Commercial" | "Plot"
  "status": "New Launch",            // "New Launch" | "Under Construction" | "Ready" | "Resale"
  "location": {
    "address": "MG Road, Bengaluru",
    "area": "MG Road",
    "city": "Bengaluru",
    "coordinates": { "lat": 12.9756, "lng": 77.6066 }
  },
  "details": {
    "amenities": ["Swimming Pool", "Gym"],
    "area_sqft": 1200,
    "bedrooms": [2, 3],
    "description": "A premium project...",
    "possession_date": "Jun 2027"
  },
  "media": {
    "brochure_url": "https://example.com/brochure.pdf",
    "images": ["https://example.com/image1.jpg"]
  },
  "pricing": {
    "price_from": 7000000,
    "price_per_sqft": 5833,
    "price_to": 9500000
  },
  "rental": {
    "expected_rent": 30000,
    "vacancy_rate": 0.06
  },
  "contact": {
    "phone": "9999999999",
    "email": "sales@sample.com"
  },
  "highlights": ["Metro Nearby", "RERA Approved"],
  "high_appreciation": false
}
```

**Required fields:** `name`, `builder`, `propertyType`, `status`, `location.address`, `location.area`, `location.city`, `location.coordinates.lat`, `location.coordinates.lng`, `details.area_sqft`, `details.description`, `details.possession_date`, `pricing.price_from`, `pricing.price_to`

**Response:** `201 Created` with the created property in frontend shape.

**Error responses**

| Status | Condition |
|---|---|
| `422` | Validation failed — `details` array has per-field messages |

---

### `PUT /api/properties/:id`

Fully replaces a property. Accepts the same body as `POST`. All required fields must be present.

**Response:** `200 OK` with the updated property in frontend shape.

---

### `DELETE /api/properties/:id`

Soft-deletes a property (`system.is_active` → `false`). The property will no longer appear in any list or detail queries. The document is preserved in the database.

**Response**
```json
{
  "success": true,
  "statusCode": 200,
  "data": { "message": "Property deactivated successfully" }
}
```

---

## Analytics

### `GET /api/analytics`

Returns aggregated statistics for the analytics dashboard. No parameters required.

**Response**
```jsonc
{
  "success": true,
  "statusCode": 200,
  "data": {
    "kpis": {
      "total": 6,
      "highAppreciation": 3,
      "ready": 2,
      "newLaunch": 1,
      "avgPrice": 11616666,
      "avgPricePerSqft": 5979
    },
    "byType": [
      { "type": "Flat",  "count": 4 },
      { "type": "Villa", "count": 2 }
    ],
    "byStatus": [
      { "status": "Ready",               "count": 2 },
      { "status": "Under Construction",  "count": 2 },
      { "status": "New Launch",          "count": 1 },
      { "status": "Resale",              "count": 1 }
    ],
    "topBuilders": [
      { "builder": "Prestige Group",   "count": 1 },
      { "builder": "Sobha Developers", "count": 1 }
    ],
    "priceRange": {
      "minPrice": 6200000,
      "maxPrice": 35000000
    }
  }
}
```

---

## Frontend Integration

### Replace static data with API calls

The frontend currently imports `PROPERTIES` from `app/components/data.ts`. Replace that with API calls.

#### Install a fetch utility (if not already present)

```bash
cd elago
npm install swr   # or use the built-in fetch / axios
```

#### Create `app/lib/api.ts`

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: Pagination;
};

export type Pagination = {
  page: number; limit: number; total: number;
  totalPages: number; hasNextPage: boolean; hasPrevPage: boolean;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `API error ${res.status}`);
  }
  const body: ApiResponse<T> = await res.json();
  return body.data;
}

export const api = {
  getProperties: (params?: URLSearchParams) =>
    apiFetch<Property[]>(`/api/properties${params ? `?${params}` : ''}`),

  getProperty: (id: string) =>
    apiFetch<Property>(`/api/properties/${id}`),

  getBuilders: () =>
    apiFetch<string[]>('/api/properties/builders'),

  getAnalytics: () =>
    apiFetch<AnalyticsData>('/api/analytics'),
};
```

#### Add to `elago/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (e.g. invalid ObjectId) |
| `404` | Resource not found |
| `409` | Duplicate key conflict |
| `422` | Validation failed — check `details` array in response body |
| `429` | Rate limit exceeded (200 req / 15 min per IP) |
| `500` | Internal server error |

---

## CORS

The backend accepts requests from origins listed in `ALLOWED_ORIGINS` in `.env`.  
For local development the default is `http://localhost:3000`. For production, set it to your deployed frontend URL:

```env
ALLOWED_ORIGINS=https://elago.vercel.app
```
