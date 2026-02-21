# Product Import / Export (Shopify-Compatible)

## Purpose
This document describes the Merchello product import/export subsystem that supports:

1. `ShopifyStrict` CSV compatibility for Shopify round-trips.
2. `MerchelloExtended` CSV for Merchello-specific round-trips (add-ons and extra metadata).

Use this as the source of truth when making changes so behavior stays consistent across API, worker jobs, mapping, UI, and tests.

## Scope and Locked Decisions
The current implementation is opinionated and intentionally constrained.

Included:
1. Import and export.
2. Handle-first matching with SKU fallback.
3. Replace-to-file-state variant structure updates.
4. Preflight validation before import.
5. Background processing with persisted run history and detailed issues.
6. One import allowed at a time.
7. Shopify Strict profile and Merchello Extended profile.

Explicitly not included in v1:
1. Product filter mapping.
2. Shopify collection mutation.
3. Warehouse assignment and stock quantity updates from CSV.
4. Variant extended data import into a variant extended-data model (no supported target model yet).

## Code Map (Where To Look First)
Backend core:
1. `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs`
2. `src/Merchello.Core/ProductSync/Services/ShopifyCsvImportValidator.cs`
3. `src/Merchello.Core/ProductSync/Services/ShopifyCsvMapper.cs`
4. `src/Merchello.Core/ProductSync/Services/ShopifyCsvSchema.cs`
5. `src/Merchello.Core/ProductSync/Services/ProductSyncWorkerJob.cs`
6. `src/Merchello.Core/ProductSync/Services/ProductSyncCleanupJob.cs`
7. `src/Merchello.Core/ProductSync/Services/ProductSyncArtifactService.cs`

API/controller:
1. `src/Merchello/Controllers/ProductSyncApiController.cs`
2. `src/Merchello/Controllers/MerchelloApiControllerBase.cs`

DI/settings/startup:
1. `src/Merchello/Startup.cs`
2. `src/Merchello.Core/ProductSync/ProductSyncSettings.cs`
3. `src/Merchello.Site/appsettings.json`

Persistence:
1. `src/Merchello.Core/Data/Context/MerchelloDbContext.cs`
2. `src/Merchello.Core/ProductSync/Mapping/ProductSyncRunDbMapping.cs`
3. `src/Merchello.Core/ProductSync/Mapping/ProductSyncIssueDbMapping.cs`
4. `src/Merchello.Core.Sqlite/Migrations/20260218094835_ProductSyncv1.cs`
5. `src/Merchello.Core.SqlServer/Migrations/20260218094839_ProductSyncv1.cs`

Backoffice frontend:
1. `src/Merchello/Client/src/product-import-export/manifest.ts`
2. `src/Merchello/Client/src/product-import-export/types/product-import-export.types.ts`
3. `src/Merchello/Client/src/product-import-export/components/product-import-export-page.element.ts`
4. `src/Merchello/Client/src/product-import-export/components/product-sync-runs-list.element.ts`
5. `src/Merchello/Client/src/api/merchello-api.ts`
6. `src/Merchello/Client/src/tree/services/tree-data-source.ts`
7. `src/Merchello/Client/src/tree/types/tree.types.ts`
8. `src/Merchello/Client/src/tree/manifest.ts`
9. `src/Merchello/Client/src/bundle.manifests.ts`

Tests:
1. `src/Merchello.Tests/Controllers/ProductSyncApiControllerTests.cs`
2. `src/Merchello.Tests/ProductSync/Services/ShopifyCsvImportValidatorTests.cs`
3. `src/Merchello.Tests/ProductSync/Services/ShopifyCsvMapperTests.cs`
4. `src/Merchello/Client/src/api/merchello-api.test.ts`
5. `src/Merchello/Client/src/product-import-export/components/product-import-export-page.element.test.ts`
6. `src/Merchello/Client/src/product-import-export/components/product-sync-runs-list.element.test.ts`
7. `src/Merchello/Client/src/tree/services/tree-data-source.test.ts`

## Runtime Architecture
Request flow:
1. UI calls API (`validate`, `start import`, `start export`, `runs`, `issues`, `download`).
2. API delegates to `IProductSyncService`.
3. Service validates/queues runs and stores artifacts.
4. `ProductSyncWorkerJob` claims queued runs and performs import/export work.
5. Run counters and granular issues persist to DB.
6. UI polls run history and can download export artifacts.

Background jobs:
1. `ProductSyncWorkerJob` starts after 2 minutes, then checks queue every `WorkerIntervalSeconds` (minimum 2 seconds).
2. `ProductSyncCleanupJob` starts after 10 minutes, then runs every 24 hours to clean artifacts/runs by retention settings.

## API Contract
Base route is `/umbraco/api/v1` via `MerchelloApiControllerBase`.

Endpoints:
1. `POST /product-sync/imports/validate` (`multipart/form-data`)
2. `POST /product-sync/imports/start` (`multipart/form-data`)
3. `POST /product-sync/exports/start` (`application/json`)
4. `GET /product-sync/runs`
5. `GET /product-sync/runs/{id}`
6. `GET /product-sync/runs/{id}/issues`
7. `GET /product-sync/runs/{id}/download`

Import multipart fields:
1. `file` (required CSV file)
2. `profile` (`0` ShopifyStrict, `1` MerchelloExtended)
3. `maxIssues` (optional)
4. `continueOnImageFailure` (start import only)

Important response behavior:
1. Validation errors return `400` for malformed request/file issues.
2. Start import returns `409` when another import is already queued or running.
3. Download returns `404` unless run is completed export with artifact present.

## Run and Issue Persistence
Tables:
1. `merchelloProductSyncRuns`
2. `merchelloProductSyncIssues`

Run lifecycle:
1. `Queued`
2. `Running`
3. `Completed` or `Failed`

Tracked fields include direction/profile/status, file names/paths, options JSON, counters, timestamps, and error message.

Issue model captures severity/stage/code/message plus row/handle/sku/field context.

## Concurrency Rules
Import lock:
1. Start-import path blocks if any import run is `Queued` or `Running`.
2. Worker also refuses to start a new import if another import is already `Running`.

Practical effect:
1. Only one import can be active at a time.
2. Exports can still queue and run, but worker claims one queued run per cycle.

## CSV Profiles and Format
Profiles:
1. `ShopifyStrict` (`ProductSyncProfile.ShopifyStrict`)
2. `MerchelloExtended` (`ProductSyncProfile.MerchelloExtended`)

Encoding and CSV parser/writer behavior:
1. UTF-8 read/write.
2. Export emits UTF-8 BOM.
3. Parser supports quoted fields, commas, and multiline values.
4. Row numbers are 1-based and include the header row (data starts at row 2).

### ShopifyStrict: Allowed Import Columns
The validator allows Shopify columns from `ShopifyCsvSchema.StrictColumns` plus any header starting with `Metafield:`.

Current allowed Shopify column set:
1. `Handle`
2. `Title`
3. `Body (HTML)`
4. `Vendor`
5. `Product Category`
6. `Type`
7. `Tags`
8. `Published`
9. `Option1 Name`
10. `Option1 Value`
11. `Option2 Name`
12. `Option2 Value`
13. `Option3 Name`
14. `Option3 Value`
15. `Variant SKU`
16. `Variant Grams`
17. `Variant Inventory Tracker`
18. `Variant Inventory Qty`
19. `Variant Inventory Policy`
20. `Variant Fulfillment Service`
21. `Variant Price`
22. `Variant Compare At Price`
23. `Variant Requires Shipping`
24. `Variant Taxable`
25. `Variant Barcode`
26. `Image Src`
27. `Image Position`
28. `Image Alt Text`
29. `Gift Card`
30. `SEO Title`
31. `SEO Description`
32. `Google Shopping / Google Product Category`
33. `Google Shopping / Gender`
34. `Google Shopping / Age Group`
35. `Google Shopping / MPN`
36. `Google Shopping / Condition`
37. `Google Shopping / Custom Product`
38. `Google Shopping / Custom Label 0`
39. `Google Shopping / Custom Label 1`
40. `Google Shopping / Custom Label 2`
41. `Google Shopping / Custom Label 3`
42. `Google Shopping / Custom Label 4`
43. `Google Shopping / Variant Grouping`
44. `Google Shopping / Variant MPN`
45. `Google Shopping / Variant Gender`
46. `Google Shopping / Variant Age Group`
47. `Google Shopping / Variant Google Product Category`
48. `Google Shopping / Variant Condition`
49. `Google Shopping / Variant Custom Product`
50. `Variant Image`
51. `Variant Weight Unit`
52. `Variant Tax Code`
53. `Cost per item`
54. `Included / United States`
55. `Price / United States`
56. `Compare At Price / United States`
57. `Included / International`
58. `Price / International`
59. `Compare At Price / International`
60. `Status`
61. `Collection`

### MerchelloExtended: Extra Columns
In addition to strict columns:
1. `Merchello:AddonOptionsJson`
2. `Merchello:OptionTypeMapJson`
3. `Merchello:RootExtendedDataJson`
4. `Merchello:VariantExtendedDataJson`

### Export Header Contract
Strict export writes this base header order:
1. `Handle`
2. `Title`
3. `Body (HTML)`
4. `Vendor`
5. `Product Category`
6. `Type`
7. `Tags`
8. `Published`
9. `Option1 Name`
10. `Option1 Value`
11. `Option2 Name`
12. `Option2 Value`
13. `Option3 Name`
14. `Option3 Value`
15. `Variant SKU`
16. `Variant Grams`
17. `Variant Inventory Tracker`
18. `Variant Inventory Qty`
19. `Variant Inventory Policy`
20. `Variant Fulfillment Service`
21. `Variant Price`
22. `Variant Compare At Price`
23. `Variant Requires Shipping`
24. `Variant Taxable`
25. `Variant Barcode`
26. `Image Src`
27. `Image Position`
28. `Image Alt Text`
29. `Gift Card`
30. `SEO Title`
31. `SEO Description`
32. `Google Shopping / Google Product Category`
33. `Google Shopping / MPN`
34. `Google Shopping / Condition`
35. `Variant Image`
36. `Variant Weight Unit`
37. `Variant Tax Code`
38. `Cost per item`
39. `Status`

Extended export appends:
1. `Merchello:AddonOptionsJson`
2. `Merchello:OptionTypeMapJson`
3. `Merchello:RootExtendedDataJson`
4. `Merchello:VariantExtendedDataJson`

`Metafield:*` headers are also appended automatically if present in export rows.

## Mapping Rules (Source of Truth)
Root-level mapping:
1. `Handle` <-> `ProductRoot.RootUrl`
2. `Title` <-> `ProductRoot.RootName`
3. `Body (HTML)` <-> TipTap JSON in `ProductRoot.Description` as `{"markup":"...","blocks":null}`
4. `Vendor` -> `ProductRoot.ShoppingFeedBrand` and `ProductRoot.ExtendedData["Shopify:Vendor"]`
5. `Type` -> `ProductType.Name` (auto-create if missing)
6. `Tags` -> `ProductRoot.ExtendedData["Shopify:Tags"]`
7. `Product Category` -> `ProductRoot.ExtendedData["Shopify:ProductCategory"]`
8. `Collection` -> metadata only `ProductRoot.ExtendedData["Shopify:Collection"]` (no collection mutation)
9. `Handle` also stored in `ProductRoot.ExtendedData["Shopify:Handle"]`

Variant-level mapping:
1. `Variant SKU` <-> `Product.Sku`
2. `Variant Price` <-> `Product.Price`
3. `Variant Compare At Price` -> `Product.PreviousPrice` and `Product.OnSale` when compare-at > price
4. `Variant Barcode` <-> `Product.Gtin`
5. `Cost per item` <-> `Product.CostOfGoods`
6. `Published` -> `AvailableForPurchase` and `CanPurchase`
7. `Status` is ignored on import, derived on export (`active` or `draft`)
8. `Variant Inventory Qty` ignored on import (warning)
9. `Variant Tax Code` resolves tax group by name
10. `Variant Image` imports image and applies to variant image list

Image mapping:
1. `Image Src` imports to Umbraco media and becomes root image list.
2. `Variant Image` imports to Umbraco media and becomes variant image list.
3. Export resolves stored media keys/relative paths back to absolute or original URLs.

## Variant Options and Add-ons
Variant options:
1. Built from `Option1..3 Name/Value`.
2. Saved via `IProductService.SaveProductOptions(...)`.
3. Variants resolved by generated `VariantOptionsKey` and then updated row-by-row using `IProductService.UpdateVariant(...)`.

Option type inference:
1. `color`/`colour` -> `colour` type + `colour` UI.
2. `size`, `material`, `pattern` have matching aliases.
3. Other names infer slug-like alias from option name.
4. `Merchello:OptionTypeMapJson` overrides inference in extended profile when valid.

Add-ons:
1. `ShopifyStrict`: existing add-ons are preserved (non-variant options copied from existing root).
2. `MerchelloExtended`: add-ons can be replaced from `Merchello:AddonOptionsJson`.

Known limitation:
1. `Merchello:VariantExtendedDataJson` is currently ignored with warning `variant_extended_data_ignored`.

## Import Pipeline Details
1. Validate endpoint parses CSV and runs `ShopifyCsvImportValidator` without DB changes.
2. Start import checks lock, re-validates, stores artifact, creates queued run.
3. Worker claims queued run, marks `Running`, and processes grouped rows by handle.
4. Matching order:
   - handle match (`RootUrl`)
   - SKU fallback (`Products.Sku`)
   - multiple SKU matches -> error `ambiguous_sku_match`
5. For each handle group:
   - resolve/create product type
   - resolve/create tax group with `No Tax` fallback (0%)
   - import root/variant images
   - create root if needed, otherwise update existing root
   - replace option structure and variant generation
   - update variants from row fields
   - apply root extended data metadata
6. Run is completed/failed with counters and all collected issues.

Replacement semantics:
1. Import drives variant structure from CSV options.
2. Existing variant structure is replaced by `SaveProductOptions`.
3. Variants are then updated to row values.

## Export Pipeline Details
1. Start export creates queued run.
2. Worker loads product roots and variants, maps rows, writes CSV artifact.
3. Variant option export is capped at first 3 options for Shopify compatibility.
4. Products with more than 3 variant options emit warning `variant_options_truncated`.
5. Export artifact is persisted and downloadable when run reaches `Completed`.

Skip/partial rules:
1. Product roots with zero variants are skipped with warning `product_without_variants`.
2. Export run can still complete with warnings/errors per product.

## Missing Data and Error Handling
Validation blocks import start when any `Error` severity issue exists.

Important fallback behaviors:
1. Missing first-row `Title`: warning in validation; import falls back to existing root name or handle.
2. Missing/unknown `Type`: auto-create when provided but unknown; else fallback existing type; else fallback first type; else create `Default`.
3. Missing/unknown tax code: fallback to existing tax group or auto-create/use `No Tax` (0%) with warning.
4. Missing/invalid image URL:
   - `continueOnImageFailure = false`: image error fails that handle import.
   - `continueOnImageFailure = true`: warning, handle continues.
5. Missing option value for generated variant: row-level error and that row fails.
6. Option-name validation is handle-scoped:
   - rows can omit `Option1/2/3 Name` when the same handle defines that option name on another row.
   - legacy single-variant defaults (`Option1 Value` = `Default` or `Default Title`) are accepted without `Option1 Name`.
7. Unknown option value after regeneration: row-level error and that row fails.
8. `Collection`: warning and ignored for actual collection assignment.
9. `Status`: warning and ignored on import.
10. `Variant Inventory Qty`: warning and ignored.
11. Image-only continuation rows (`Image Src`/`Image Position` without variant data) are used for root images and skipped for variant resolution.

## Issue Codes (Current)
Validation-stage codes:
1. `unsupported_column`
2. `empty_file`
3. `missing_handle`
4. `missing_title`
5. `missing_option_name`
6. `invalid_decimal`
7. `invalid_published`
8. `invalid_image_url`
9. `collection_ignored`
10. `status_ignored`
11. `inventory_qty_ignored`
12. `invalid_json`

Import/export/system-stage codes (service):
1. `input_artifact_missing`
2. `ambiguous_sku_match`
3. `create_product_type_failed`
4. `no_product_type_available`
5. `create_no_tax_group_failed`
6. `tax_group_fallback_no_tax`
7. `variant_extended_data_ignored`
8. `create_product_root_failed`
9. `update_product_root_failed`
10. `save_options_failed`
11. `refresh_product_failed`
12. `update_variant_failed`
13. `invalid_addon_options_json`
14. `invalid_option_type_map`
15. `missing_option_value`
16. `unknown_option_value`
17. `variant_not_found`
18. `image_import_failed`
19. `handle_import_failed`
20. `product_without_variants`
21. `variant_options_truncated`
22. `export_product_failed`
23. `export_write_failed`
24. `unexpected_error`
25. `collection_ignored`
26. `invalid_image_url`

## Settings
`Merchello:ProductSync` settings:
1. `WorkerIntervalSeconds` (default `10`)
2. `RunRetentionDays` (default `90`)
3. `ArtifactRetentionDays` (default `30`)
4. `MaxCsvBytes` (default `15728640`, 15 MB)
5. `MaxValidationIssuesReturned` (default `1000`)
6. `ImageDownloadTimeoutSeconds` (default `30`)
7. `MaxImageRedirects` (default `5`)
8. `MaxImageBytes` (default `20971520`, 20 MB)
9. `ArtifactStoragePath` (default `App_Data/ProductSync`)

## Security and Operational Notes
1. CSV and image sizes are capped by settings.
2. Image URLs are validated via SSRF-safe checks (public HTTP/HTTPS only, no loopback/private ranges).
3. Image downloads use manual redirect handling with per-hop URL revalidation and redirect-loop/redirect-count protection.
4. Imported image payloads must be recognized image binary formats; unsupported/non-image payloads are rejected.
5. Artifact paths are constrained to base storage path with traversal protection.
6. Cleanup job removes old artifacts and old runs by retention policy.

## Backoffice UX Summary
Location:
1. Products tree child node: `Import & Export`.

Workspace behavior:
1. Import profile selector.
2. CSV picker.
3. `continueOnImageFailure` option.
4. Validate action with issue grid.
5. Start import disabled when validation has errors.
6. Export profile selector and start action.
7. Run history with direction/status filters, counters, issue drill-down, and export download.
8. Poll every 5 seconds while any run is `Running`.

## Shopify References
Planning references used for this feature (dated February 18, 2026):
1. https://help.shopify.com/en/manual/products/import-export/using-csv
2. https://help.shopify.com/en/manual/products/import-export/import-products
3. https://help.shopify.com/en/manual/products/import-export/export-products
4. https://help.shopify.com/en/manual/products/import-export/common-import-issues
