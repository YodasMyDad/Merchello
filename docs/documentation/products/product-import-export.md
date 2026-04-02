# Product Import and Export

Merchello supports bulk product import and export through CSV files in the backoffice. The CSV format is compatible with Shopify, making it straightforward to migrate from a Shopify store or use familiar spreadsheet tools like Excel and Google Sheets.

## Import and Export in the Backoffice

Go to the **Product Import/Export** section in the Umbraco backoffice to import or export products. The workflow is:

1. **Import:** Upload a CSV, validate it, then start the import. It runs in the background.
2. **Export:** Choose a profile and click export. Once complete, download the CSV from the run history.

Only one import runs at a time. A run history section shows progress and any issues.

## Import Profiles

There are two CSV profiles:

| Profile | When to use |
|---------|-------------|
| **Shopify Strict** | Migrating from Shopify, or working with standard Shopify-format CSV files. Uses only standard Shopify columns. |
| **Merchello Extended** | Full Merchello round-trips. Includes everything in Shopify Strict plus additional columns for add-on options, option type mappings, and extended data. |

If you are coming from Shopify, use **Shopify Strict**. If you are exporting from Merchello and re-importing later (for example, bulk editing in a spreadsheet), use **Merchello Extended** to preserve all Merchello-specific data.

## CSV Format

### How products are structured

Each row represents a single **variant**. Products with multiple variants use multiple rows sharing the same `Handle` value. The first row for each handle carries product-level information (title, description, images). Subsequent rows only need variant-specific columns filled in.

**Example: A t-shirt with two sizes**

| Handle | Title | Option1 Name | Option1 Value | Variant SKU | Variant Price |
|--------|-------|---------------|---------------|-------------|---------------|
| classic-tee | Classic T-Shirt | Size | Small | TEE-SM | 19.99 |
| classic-tee | | Size | Large | TEE-LG | 19.99 |

**Example: A simple product with no variants**

| Handle | Title | Variant SKU | Variant Price |
|--------|-------|-------------|---------------|
| leather-wallet | Leather Wallet | WALLET-01 | 49.99 |

### Column reference

#### Required columns

| Column | Description |
|--------|-------------|
| `Handle` | A URL-friendly identifier for the product (e.g. `classic-tee`). All variant rows for the same product must share the same handle. |

#### Product columns

These are set on the first row for each handle.

| Column | Description |
|--------|-------------|
| `Title` | The product name. |
| `Body (HTML)` | Product description. Supports HTML. |
| `Vendor` | The vendor or brand name. |
| `Type` | Product type or category label. |
| `Tags` | Comma-separated tags (e.g. `summer, cotton, sale`). |
| `Published` | Whether the product is visible on the storefront. Use `TRUE` or `FALSE`. |
| `Image Src` | A public URL to the main product image. Merchello downloads this and adds it to the Umbraco media library. |
| `Image Position` | Numeric position for ordering multiple images. |
| `Image Alt Text` | Alt text for the product image. |
| `Collection` | Collection name. Mapped during import but collections are not created automatically. |

#### Variant columns

These are set per row (per variant).

| Column | Description |
|--------|-------------|
| `Option1 Name` / `Option1 Value` | First variant option, e.g. Name: `Size`, Value: `Large`. Up to 3 options supported. |
| `Option2 Name` / `Option2 Value` | Second variant option. |
| `Option3 Name` / `Option3 Value` | Third variant option. |
| `Variant SKU` | The SKU for this variant. |
| `Variant Price` | The selling price. |
| `Variant Compare At Price` | The original or "compare at" price (used for showing discounts). |
| `Cost per item` | Your cost price for this variant. |
| `Variant Inventory Qty` | Stock quantity. Note: this is recorded but not assigned to specific warehouses during import. |
| `Variant Barcode` | Barcode or UPC. |
| `Variant Image` | A public URL to a variant-specific image. |
| `Variant Grams` | Weight in grams. |
| `Variant Weight Unit` | Weight unit (`g`, `kg`, `lb`, `oz`). |
| `Variant Tax Code` | Tax code for this variant. |
| `Variant Requires Shipping` | Whether the variant needs shipping (`TRUE` / `FALSE`). |
| `Variant Taxable` | Whether the variant is taxable (`TRUE` / `FALSE`). |

#### Merchello Extended columns

These additional columns are only available with the **Merchello Extended** profile.

| Column | Description |
|--------|-------------|
| `Merchello:AddonOptionsJson` | JSON defining add-on (non-variant) options for the product. |
| `Merchello:OptionTypeMapJson` | JSON mapping option names to Merchello option type aliases. |
| `Merchello:RootExtendedDataJson` | JSON containing product root extended data (custom metadata). |
| `Merchello:VariantExtendedDataJson` | JSON containing variant extended data. Currently read-only during export; not applied during import. |

#### Metafield columns

Both profiles support custom metadata columns using the `Metafield:` prefix. For example, `Metafield:custom.care_instructions` would store care instructions as product metadata.

## How Product Matching Works

When importing, Merchello checks whether products already exist before creating new ones:

1. **Handle match**: The CSV `Handle` is matched against existing product slugs.
2. **SKU fallback**: If no handle match is found, the `Variant SKU` is checked against existing variants.

- If a match is found, the existing product is **updated** with the CSV data.
- If no match is found, a **new product** is created.

> **Important**: When updating an existing product, the variant structure is **replaced to match the CSV file**. Any variants that exist in Merchello but are not in the CSV will be removed. Make sure your CSV contains all variants you want to keep.

## How Images Are Handled

When your CSV includes image URLs (`Image Src` or `Variant Image` columns), Merchello downloads each image and stores it in the Umbraco media library.

- Images are only downloaded from public HTTP/HTTPS URLs.
- If the same image URL appears multiple times, it is only downloaded once.
- Images are organised by product handle in the media library.

If an image fails to download, the result depends on the **Continue on image failure** setting in the import dialog:

- **Off** (default): The product is flagged as failed.
- **On**: The product is created without the image. You can add images manually later.

## Shopify Migration

If you are migrating from Shopify, the process is:

1. Export your products from Shopify as CSV (Shopify admin > Products > Export).
2. In the Merchello backoffice, go to Product Import/Export.
3. Select the **Shopify Strict** profile.
4. Upload, validate, and import.

The Shopify CSV format maps directly to Merchello's product structure. Handle, title, options, variants, pricing, images, and tags all carry across.

## Current Limitations

- **Product filter mapping**: Filters are not created or assigned from CSV data.
- **Collection creation**: Collection names in the CSV are mapped to existing collections but new collections are not created automatically.
- **Warehouse assignment**: Inventory quantities are recorded but not assigned to specific warehouses.
- **Variant extended data import**: The `Merchello:VariantExtendedDataJson` column is included in exports but not applied during import.
