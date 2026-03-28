# Product Import and Export (CSV)

Merchello supports importing and exporting products using CSV files. The format is compatible with Shopify's CSV export, so you can migrate products from Shopify or use familiar spreadsheet tooling.

## Profiles

There are two CSV profiles:

| Profile | Value | Description |
|---------|-------|-------------|
| `ShopifyStrict` | `0` | Standard Shopify CSV columns only. Use for Shopify migrations or interop. |
| `MerchelloExtended` | `1` | Shopify columns plus Merchello-specific columns for add-on options, option type maps, and extended data. Use for full Merchello round-trips. |

## How It Works

The import/export system uses a background job architecture:

1. You upload a CSV file (or request an export) via the API.
2. The service validates the file and queues a sync run.
3. A background worker (`ProductSyncWorkerJob`) picks up the queued run and processes it.
4. Progress, issues, and results are tracked in the database.
5. You poll the run status and download export artifacts when complete.

> **Note:** Only one import can run at a time. If you try to start an import while one is already running or queued, you get a `409 Conflict` response.

## Import Workflow

### Step 1: Validate

Before importing, validate the CSV to catch issues early:

**API:** `POST /umbraco/api/v1/product-sync/imports/validate`

```
Content-Type: multipart/form-data

file: (CSV file)
profile: ShopifyStrict (or MerchelloExtended)
maxIssues: 100 (optional, limits issue count in response)
```

**Response:**

```json
{
    "isValid": true,
    "rowCount": 150,
    "distinctHandleCount": 45,
    "warningCount": 2,
    "errorCount": 0,
    "issues": [
        {
            "severity": "Warning",
            "message": "Row 12: Variant Image URL is not accessible"
        }
    ]
}
```

The validator checks column headers, required fields, data types, and structural consistency.

### Step 2: Start Import

**API:** `POST /umbraco/api/v1/product-sync/imports/start`

```
Content-Type: multipart/form-data

file: (CSV file)
profile: ShopifyStrict
continueOnImageFailure: false (set to true to skip failed image downloads)
maxIssues: 500 (optional)
```

**Response:**

```json
{
    "id": "run-guid",
    "direction": "Import",
    "profile": "ShopifyStrict",
    "status": "Queued",
    "statusLabel": "Queued",
    "requestedByUserName": "admin",
    "inputFileName": "products.csv",
    "dateCreatedUtc": "2026-03-28T10:00:00Z"
}
```

### Step 3: Monitor Progress

Poll the run status:

**API:** `GET /umbraco/api/v1/product-sync/runs/{id}`

The run moves through statuses: `Queued` -> `Running` -> `Completed` (or `Failed`).

```json
{
    "id": "run-guid",
    "status": "Completed",
    "itemsProcessed": 45,
    "itemsSucceeded": 43,
    "itemsFailed": 2,
    "warningCount": 3,
    "errorCount": 2,
    "startedAtUtc": "2026-03-28T10:00:05Z",
    "completedAtUtc": "2026-03-28T10:02:30Z"
}
```

### Step 4: Review Issues

**API:** `GET /umbraco/api/v1/product-sync/runs/{id}/issues?severity=Error&page=1&pageSize=50`

Issues are categorised by severity (`Warning` or `Error`) and include row numbers and descriptive messages.

## Import Matching

Products are matched using a two-step strategy:

1. **Handle-first** -- the CSV `Handle` column is matched against existing product root slugs.
2. **SKU fallback** -- if no handle match is found, the `Variant SKU` is used to find existing variants.

When a match is found, the existing product is updated. When no match is found, a new product is created.

> **Warning:** Variant structure uses a **replace-to-file-state** approach. When updating an existing product, the variant structure is replaced to match the CSV. Variants not in the CSV file will be removed.

## CSV Columns

The Shopify Strict profile supports all standard Shopify CSV columns:

| Column | Description |
|--------|-------------|
| `Handle` | URL-friendly product identifier (required) |
| `Title` | Product name |
| `Body (HTML)` | Product description |
| `Vendor` | Vendor/brand name |
| `Type` | Product type |
| `Tags` | Comma-separated tags |
| `Published` | Whether the product is published |
| `Status` | Product status |
| `Option1 Name` / `Option1 Value` | First variant option (up to 3) |
| `Variant SKU` | SKU for the variant |
| `Variant Price` | Price |
| `Variant Compare At Price` | Original/compare-at price |
| `Variant Inventory Qty` | Stock quantity |
| `Variant Barcode` | Barcode/UPC |
| `Image Src` | Product image URL |
| `Variant Image` | Variant-specific image URL |
| `Cost per item` | Cost price |
| `Collection` | Collection assignment |

The MerchelloExtended profile adds:

| Column | Description |
|--------|-------------|
| `Merchello:AddonOptionsJson` | JSON for add-on (non-variant) options |
| `Merchello:OptionTypeMapJson` | JSON mapping option types |
| `Merchello:RootExtendedDataJson` | JSON for product root extended data |
| `Merchello:VariantExtendedDataJson` | JSON for variant extended data |

## Export

### Start an Export

**API:** `POST /umbraco/api/v1/product-sync/exports/start`

```json
{
    "profile": "ShopifyStrict"
}
```

### Download the Export

Once the export run completes, download the CSV:

**API:** `GET /umbraco/api/v1/product-sync/runs/{id}/download`

Returns the CSV file as a download.

## Listing Sync Runs

**API:** `GET /umbraco/api/v1/product-sync/runs?direction=Import&status=Completed&page=1&pageSize=50`

Returns a paginated list of all import/export runs with status, counters, and timestamps.

## Background Jobs

Two background jobs handle the sync pipeline:

- **ProductSyncWorkerJob** -- starts 2 minutes after application startup, then polls for queued runs at a configurable interval (minimum 2 seconds). Processes one run at a time.
- **ProductSyncCleanupJob** -- starts 10 minutes after startup, runs every 24 hours. Cleans up old run records and export artifacts based on retention settings.

## Current Limitations (v1)

The following are explicitly not supported in the initial version:

- Product filter mapping from CSV
- Shopify collection mutation (collections are mapped but not created)
- Warehouse assignment and stock quantity updates from CSV
- Variant extended data import (no supported target model yet)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/product-sync/imports/validate` | Validate a CSV file before import |
| `POST` | `/product-sync/imports/start` | Start an import |
| `POST` | `/product-sync/exports/start` | Start an export |
| `GET` | `/product-sync/runs` | List sync runs (paginated, filterable) |
| `GET` | `/product-sync/runs/{id}` | Get a specific run |
| `GET` | `/product-sync/runs/{id}/issues` | Get issues for a run (paginated) |
| `GET` | `/product-sync/runs/{id}/download` | Download export artifact |

All endpoints are under the Merchello backoffice API base route (`/umbraco/api/v1`).
