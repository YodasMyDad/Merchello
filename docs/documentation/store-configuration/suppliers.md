# Suppliers

Suppliers (vendors) represent the companies that supply your products. Each supplier owns one or more [warehouses](./warehouses.md), and warehouses in turn define the stock and shipping origins used at checkout.

Suppliers matter most for multi-vendor stores. When vendor-based order grouping is enabled, baskets are automatically split so each supplier receives only their portion of a multi-vendor order -- each group can have its own shipping options and be fulfilled independently.

## When to Use Suppliers

- **Single-vendor stores** -- you can ignore suppliers entirely. Warehouses are all you need.
- **Multi-vendor marketplaces / drop-ship stores** -- assign each warehouse to a supplier and enable vendor order grouping so each supplier gets its own shipment and fulfilment workflow.

## Configuring Suppliers

Suppliers are managed in the Merchello backoffice. Each supplier has:

- A display name and contact details.
- An optional address (used for supplier-side paperwork).
- A collection of warehouses they own.
- Optional Supplier Direct fulfilment settings (CSV/FTP/email delivery for purchase orders).

See the DTO contracts in [SupplierDetailDto.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Warehouses/Dtos/SupplierDetailDto.cs) and related `CreateSupplierDto` / `UpdateSupplierDto` for the full set of fields.

## Vendor Order Grouping

To enable vendor-based grouping, set the strategy in `appsettings.json`:

```json
{
  "Merchello": {
    "OrderGroupingStrategy": "vendor-grouping"
  }
}
```

The vendor grouping strategy groups basket lines by the warehouse's `SupplierId`, producing one `OrderGroup` per supplier. Each group can have its own shipping options, fulfilment provider, and order lifecycle.

See [Order Grouping](../shipping/order-grouping.md) for the full contract (context inputs, group outputs, metadata requirements) and how to author a custom `IOrderGroupingStrategy`.

## Supplier Direct Fulfilment

Suppliers can also act as fulfilment providers -- purchase orders are delivered to the supplier (via email or FTP CSV), the supplier ships the items, and they report back tracking numbers.

The trigger policy is important: lower priority runs first, and Supplier Direct has two modes:

- **`OnPaid`** -- auto-submission from the payment-created flow.
- **`ExplicitRelease`** -- staff-triggered only via `POST /orders/{orderId}/fulfillment/release` (paid-gated, Supplier Direct only).

Dynamic or non-Supplier Direct providers are unaffected by this policy. See the fulfilment docs for full details.

## Next Steps

- [Warehouses](./warehouses.md) -- how warehouses attach to suppliers and drive shipping origins.
- [Order Grouping](../shipping/order-grouping.md) -- enabling vendor-based grouping and writing custom strategies.
