# Property CSV Bulk Upload

Bulk import properties into the database from a CSV file. This endpoint validates all data before importing and provides detailed feedback on any errors or duplicates.

## Endpoint

```
POST /api/properties/bulk-upload
```

## Request

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required): A CSV file containing property data

## CSV Format

### Header Row

The CSV file must have a header row with the following columns (order doesn't matter):

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | ✓ | Property name |
| `builder` | string | ✓ | Builder/Developer name |
| `propertyType` | string | ✓ | One of: `Flat`, `Villa`, `Commercial`, `Plot` |
| `status` | string | ✓ | One of: `New Launch`, `Under Construction`, `Ready`, `Resale` |
| `location.address` | string | ✓ | Full address |
| `location.area` | string | ✓ | Area/Locality name |
| `location.city` | string | ✓ | City name (default: Bengaluru) |
| `location.coordinates.lat` | float | ✓ | Latitude (-90 to 90) |
| `location.coordinates.lng` | float | ✓ | Longitude (-180 to 180) |
| `details.area_sqft` | integer | ✓ | Area in square feet (minimum 1) |
| `details.bedrooms` | string | - | Comma-separated bedroom options (e.g., `1,2,3` for 1-3 BHK) |
| `details.description` | string | ✓ | Property description |
| `details.possession_date` | string | ✓ | Possession date (e.g., "Ready", "Dec 2026") |
| `pricing.price_from` | integer | ✓ | Starting price |
| `pricing.price_to` | integer | ✓ | Maximum price |
| `pricing.price_per_sqft` | float | - | Price per square foot |
| `media.brochure_url` | string | - | URL to PDF brochure |
| `contact.phone` | string | - | Contact phone number |
| `contact.email` | string | - | Contact email address |
| `amenities` | string | - | Pipe-separated amenities (e.g., `Pool\|Gym\|Clubhouse`) |
| `highlights` | string | - | Pipe-separated highlights (e.g., `RERA Approved\|Gated\|Green Space`) |
| `high_appreciation` | string | - | `true`, `false`, or `1`, `0` |
| `rental.expected_rent` | float | - | Expected monthly rent |
| `rental.vacancy_rate` | float | - | Vacancy rate (0 to 1) |

### Data Format Examples

**Bedrooms (comma-separated):**
```
2,3          → 2-3 BHK property
1,2,3        → 1-3 BHK property
2            → Single 2 BHK option
```

**Amenities & Highlights (pipe-separated):**
```
Swimming Pool|Gymnasium|Clubhouse|Tennis Court
```

**Boolean values:**
```
true, false, 1, 0
```

## Validation Rules

- **All required fields** must be present and non-empty
- **Latitude**: -90 to 90
- **Longitude**: -180 to 180
- **Area**: Minimum 1 sqft
- **Bedroom count**: Each value must be a positive integer
- **Vacancy rate**: 0 to 1 (e.g., 0.05 = 5%)
- **Prices**: Non-negative integers

## Response

### Success (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Successfully imported 3 properties",
    "imported": 3,
    "skipped": 1,
    "skippedDuplicates": [
      {
        "rowNumber": 5,
        "name": "Prestige Towers",
        "builder": "Prestige Group",
        "reason": "Duplicate in batch"
      }
    ],
    "properties": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Prestige Palm Heights"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "DLF Moonlight"
      },
      {
        "id": "507f1f77bcf86cd799439013",
        "name": "Embassy Springs"
      }
    ]
  }
}
```

### Validation Error (422 Unprocessable Entity)

If any row fails validation, the entire upload is rejected:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "CSV validation failed: 2 row(s) have errors",
  "error": {
    "validationErrors": [
      {
        "rowNumber": 3,
        "errors": [
          {
            "field": "pricing.price_from",
            "message": "pricing.price_from must be a non-negative integer"
          },
          {
            "field": "location.coordinates.lat",
            "message": "latitude must be between -90 and 90"
          }
        ],
        "data": {
          "name": "Sample Property",
          "builder": "Sample Builder",
          ...
        }
      },
      {
        "rowNumber": 5,
        "errors": [
          {
            "field": "propertyType",
            "message": "propertyType must be Flat | Villa | Commercial | Plot"
          }
        ],
        "data": { ... }
      }
    ]
  }
}
```

### Other Errors

| Status | Message | Cause |
|--------|---------|-------|
| `400` | No file uploaded | File parameter missing |
| `400` | CSV file is empty | No data rows in CSV |
| `400` | Only CSV files are allowed | Wrong file format |
| `409` | Duplicate property entries detected | Database constraint violation |

## Usage Example

### Using cURL

```bash
curl -X POST http://localhost:5000/api/properties/bulk-upload \
  -F "file=@properties.csv"
```

### Using JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/properties/bulk-upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(`Imported: ${result.data.imported}, Skipped: ${result.data.skipped}`);
```

### Using Axios

```javascript
const formData = new FormData();
formData.append('file', file);

const response = await axios.post('/api/properties/bulk-upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

console.log(response.data.data);
```

## Sample CSV

See [BULK_UPLOAD_SAMPLE.csv](./BULK_UPLOAD_SAMPLE.csv) for a complete example.

## Duplicate Handling

- **Within batch**: Duplicates are detected by matching `name + builder` combination. Only the first occurrence is imported; subsequent duplicates are skipped and returned in the response.
- **With database**: If a property with the same `name` and `builder` already exists in the database, the upload will fail with a 409 Conflict error.

## File Limits

- **Maximum file size**: 50 MB
- **File format**: CSV only (.csv extension or text/csv MIME type)

## Notes

- All rows are validated before any data is inserted (all-or-nothing approach for validation)
- Temporary files are automatically cleaned up after processing
- `bedrooms` field must not be empty if specified; use comma-separated values like `2,3`
- Array fields (`amenities`, `highlights`) use pipe (`|`) as separator
- Empty cells are treated as empty strings; use appropriate defaults
