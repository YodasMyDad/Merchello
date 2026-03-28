# Suppliers and Vendor Management

Suppliers (also called vendors) represent the companies that supply your products. In Merchello, a supplier can own one or more warehouses and can be associated with fulfilment providers for automated order processing. Suppliers also play a role in order grouping -- orders can be split by vendor so each supplier receives only their portion of a multi-vendor order.

## The Supplier Model

```csharp
public class Supplier
{
    public Guid Id { get; set; }
    public string Name { get; set; }              // e.g., "Acme Wholesale"
    public string? Code { get; set; }             // Reference code, e.g., "ACME"
    public Address Address { get; set; }           // Business/contact address
    public string? ContactName { get; set; }       // Primary contact
    public string? ContactEmail { get; set; }      // Contact email
    public string? ContactPhone { get; set; }      // Contact phone
    public Guid? DefaultFulfilmentProviderConfigurationId { get; set; }
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

Key points:
- The supplier `Address` is their business/contact address, not a shipping origin. Shipping origins are set on individual [Warehouses](./warehouses.md).
- `ExtendedData` can store arbitrary metadata like payment terms, commission rates, or integration IDs.
- The `DefaultFulfilmentProviderConfigurationId` sets a default fulfilment provider for all warehouses owned by this supplier (individual warehouses can override this).

## Supplier-Warehouse Relationship

A supplier can own multiple warehouses. This is useful when a vendor has distribution centers in different regions:

```
Supplier: "UK Fashion Co"
  ├── Warehouse: "UK Main" (ships to GB, IE)
  └── Warehouse: "EU Distribution" (ships to DE, FR, NL, BE)

Supplier: "US Goods Inc"
  └── Warehouse: "US Central" (ships to US, CA)
```

When a warehouse has a `SupplierId`, it belongs to that supplier. The supplier's default fulfilment provider is used unless the warehouse has its own override via `FulfilmentProviderConfigurationId`.

## Vendor-Based Order Grouping

One of the most powerful uses of suppliers is order grouping. By default, Merchello groups orders by warehouse. But if you enable vendor grouping, orders are split by supplier instead.

### Enabling Vendor Grouping

In `appsettings.json`:

```json
{
  "Merchello": {
    "OrderGroupingStrategy": "vendor-grouping"
  }
}
```

### How It Works

When a customer places an order containing products from multiple suppliers, the order is split into separate groups -- one per vendor. Each group:

- Contains only the line items from that vendor's products
- Can have its own shipping selection
- Can be fulfilled independently

The vendor is identified from the product root's `ExtendedData` using the `VendorId` key. Products without a `VendorId` are grouped under a `"default"` vendor.

### Example

Customer orders:
- T-Shirt (from "UK Fashion Co")
- Coffee Mug (from "US Goods Inc")
- Phone Case (from "UK Fashion Co")

With vendor grouping enabled, this creates two order groups:

| Group | Vendor | Items |
|-------|--------|-------|
| Group 1 | UK Fashion Co | T-Shirt, Phone Case |
| Group 2 | US Goods Inc | Coffee Mug |

Each group gets its own shipping options based on the vendor's warehouse service regions.

### Requirements for Vendor Grouping

- The customer's shipping address must include a country code (required for region matching)
- Products should have a `VendorId` in their `ProductRoot.ExtendedData`
- Each group builds its own `ShippingLineItem` entries from the basket lines

## Fulfilment Providers

Suppliers can be linked to fulfilment providers for automated order processing:

- **Supplier Direct** -- CSV-based fulfilment via SFTP/FTP/email directly to the supplier
- **ShipBob** -- 3PL fulfilment with order submission, webhook status updates, and inventory sync
- **Custom providers** -- you can build your own fulfilment providers

The fulfilment provider hierarchy is:

1. Warehouse-level override (`Warehouse.FulfilmentProviderConfigurationId`)
2. Supplier default (`Supplier.DefaultFulfilmentProviderConfigurationId`)
3. No fulfilment provider (manual processing)

## Managing Suppliers

### Via the Backoffice

Suppliers are managed in the Merchello backoffice. You can:
- Create and edit supplier records
- Set contact information
- Configure the default fulfilment provider
- View associated warehouses

### Via Code

Inject `ISupplierService` to work with suppliers programmatically:

```csharp
public class MyService(ISupplierService supplierService)
{
    public async Task CreateSupplierAsync(CancellationToken ct)
    {
        var result = await supplierService.CreateSupplierAsync(
            new CreateSupplierParameters
            {
                Name = "New Supplier",
                Code = "NS",
                ContactEmail = "supplier@example.com"
            }, ct);

        if (result.Success)
        {
            var supplier = result.ResultObject;
            // Use the supplier...
        }
    }
}
```

## Seed Data Example

The seed data creates two suppliers to demonstrate the system:

- **UK Supplier** -- with warehouses in the UK and EU
- **US Supplier** -- with a US warehouse

This gives you a working multi-supplier, multi-warehouse setup to explore.

## Next Steps

- [Warehouses](./warehouses.md) -- warehouse configuration and service regions
- [Products Overview](../products/products-overview.md) -- how products connect to suppliers via warehouses
- [Configuration Reference](../getting-started/configuration-reference.md) -- order grouping strategy settings
