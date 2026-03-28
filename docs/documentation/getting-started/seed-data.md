# Seed Data

Merchello includes a comprehensive seed data system that populates your store with realistic test data. This is invaluable for development, testing, and getting a feel for how the system works before you start building with real products.

## What is Seed Data?

Seed data is a set of sample products, warehouses, suppliers, customers, invoices, discounts, and more that gets installed into your Merchello store. It uses the same services your application code uses (no direct database access), so it also serves as a battle test of the entire order flow.

## How to Install

### Step 1: Enable in Configuration

In your `appsettings.json`, set `InstallSeedData` to `true`:

```json
{
  "Merchello": {
    "InstallSeedData": true
  }
}
```

### Step 2: Install from the Backoffice

1. Log into the Umbraco backoffice
2. Navigate to the **Merchello** section
3. Click on the **Merchello root node** in the tree
4. You will see an **Install Seed Data** panel
5. Click **Install**

The installation can take some time as it creates a large amount of interconnected data. The panel will disappear when it is complete.

> **Note:** Seed data will only install once. If products already exist in the database, the seeder skips execution entirely. This check happens via `productService.AnyProductsExistAsync()`.

## What Gets Created

The seeder runs through these steps in order, each building on the previous:

### 1. Tax Groups
A UK VAT 20% tax group is created, and the manual tax provider is activated. This ensures tax calculations work through the full provider system.

### 2. Product Types
Multiple product types are created to categorize the sample products (e.g., clothing, furniture, accessories).

### 3. Collections
Product collections are created for organizing products into browsable categories on the storefront.

### 4. Suppliers
Two suppliers are created -- a UK supplier and a US supplier. These represent vendor/supplier companies that own warehouses.

### 5. Warehouses
Multiple warehouses are created across UK, EU, and US regions, linked to the appropriate suppliers. Each warehouse gets shipping options configured for its service region.

### 6. Filters
Color and size filter groups are created with multiple filter values. These are used for the category page filtering UI (e.g., filter by "Red" or "Large").

### 7. Products
A comprehensive set of products with various configurations:
- Products with color and size variants (auto-generated variant matrix)
- Products with warehouse stock assignments and tracking
- Products assigned to collections and product types
- Products with filter assignments for faceted browsing
- Products with different pricing, cost of goods, and sale prices

The `ProductSeederExtensions` class handles the complexity of creating product roots with auto-generated variants, including:
- Creating the product root with a default variant
- Adding variant options (colors, sizes)
- Auto-generating all variant combinations
- Assigning stock levels across warehouses
- Linking variants to filter values

### 8. Customers
A set of customer records is created for testing customer-related features.

### 9. Account Customers
Some customers are configured as B2B account customers with payment terms and credit limits.

### 10. Customer Segments
A VIP customer segment is created containing the first 5 customers. This is a manual segment used for demonstrating segment-targeted discounts.

### 11. Discounts
Several discount types are created:
- **VIP Exclusive (15%)** -- an automatic percentage discount targeted at the VIP customer segment
- **Automatic discounts** -- e.g., 10% off specific product types (like T-Shirts)

### 12. Upsell Rules
Cross-sell, order bump, and post-purchase upsell rules are created to demonstrate the upsells engine.

### 13. Invoices
Sample invoices are created using the full checkout flow (via `CheckoutService`), exercising the complete order pipeline including tax calculation, shipping, and payment processing.

## How to Disable Seed Data

If you do not want seed data at all, set the config to `false`:

```json
{
  "Merchello": {
    "InstallSeedData": false
  }
}
```

With this setting, the Install Seed Data panel will not appear in the backoffice. Essential items like data types are always installed regardless of this setting.

> **Tip:** Even with `InstallSeedData` set to `true`, the seeder only runs when you explicitly click Install in the backoffice. It does not run automatically on startup.

## Important Notes

- **Development only** -- seed data is intended for development and testing. Do not install it on a production site.
- **Idempotent** -- if products already exist, the seeder will not run again, even if you reinstall. To re-seed, you would need to clear the product data first.
- **Uses real services** -- the seeder calls `ProductService`, `CheckoutService`, `InvoiceService`, etc. If you encounter errors during seeding, it likely indicates a configuration issue (missing tax provider, invalid shipping setup, etc.).
- **Fixed random seed** -- product data like stock levels uses `new Random(42)` for reproducibility, meaning every install gets the same sample data.

## Next Steps

- [Starter Site Walkthrough](./starter-site-walkthrough.md) -- explore the example store that renders this seed data
- [Products Overview](../products/products-overview.md) -- understand the product data model
- [Store Settings](../store-configuration/store-settings.md) -- configure your store identity
