# Orders and Invoices Overview

Merchello uses a three-level hierarchy for commerce transactions: **Invoices** contain **Orders**, and Orders contain **Shipments**. The invoice is the financial contract; orders are fulfilment units; shipments are packages. Full domain model: [`Invoice.cs`](../../../src/Merchello.Core/Accounting/Models/Invoice.cs), [`OrderStatus.cs`](../../../src/Merchello.Core/Accounting/Models/OrderStatus.cs). See [Architecture Diagrams §2.4](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) for the full service catalog.

## The Hierarchy

```
Invoice (INV-0042)
├── Order 1 (ships from Warehouse A)
│   ├── Line Item: Blue T-Shirt x2
│   ├── Line Item: Red Cap x1
│   ├── Shipment 1 (Shipped, tracking: 1Z999...)
│   └── Shipment 2 (Preparing)
├── Order 2 (ships from Warehouse B)
│   ├── Line Item: Wireless Mouse x1
│   └── Shipment 1 (Delivered)
└── Payments
    └── Payment 1 (Stripe, 89.99, Successful)
```

### Why separate invoices and orders?

An **Invoice** represents the financial transaction -- what the customer is paying for. An **Order** represents a fulfillment unit -- what needs to be shipped from a specific warehouse. A single checkout can produce one invoice with multiple orders when products come from different warehouses.

## Invoices

An invoice is the top-level financial record. Key properties:

| Property | Description |
|----------|-------------|
| `Id` | Unique identifier |
| `InvoiceNumber` | Human-readable number (e.g., "INV-0001") |
| `CustomerId` | The customer who placed the order |
| `BasketId` | The basket this invoice was created from (null for manual orders) |
| `BillingAddress` | Customer's billing address |
| `ShippingAddress` | Customer's shipping address |
| `Channel` | Sales channel (e.g., "Online Store", "POS") |
| `PurchaseOrder` | Customer's PO number/reference |
| `SubTotal` | Product subtotal before discounts and tax |
| `Discount` | Total discount amount |
| `AdjustedSubTotal` | Subtotal after discounts |
| `Tax` | Total tax amount |
| `Total` | Final total the customer pays |
| `CurrencyCode` | Customer's currency (ISO 4217) |
| `DueDate` | Payment due date (for account customers) |
| `Source` | Where/how the invoice was created |

### Multi-currency fields (invariant)

Exchange rates are **locked at invoice creation** — never refetched on edit or payment. This is the store-of-record for audit and accounting. See [Multi-Currency Overview](../multi-currency/multi-currency-overview.md) for the full conversion model.

- `StoreCurrencyCode` — the store's base currency
- `PricingExchangeRate` — the locked rate (presentment → store; `amount * rate` for display, `amount / rate` for charging)
- `PricingExchangeRateSource` — where the rate came from (e.g., `"frankfurter"`)
- `PricingExchangeRateTimestampUtc` — when the rate was locked
- `SubTotalInStoreCurrency`, `DiscountInStoreCurrency`, `TaxInStoreCurrency`, `TotalInStoreCurrency` — store-currency equivalents for reporting

> **Warning:** Never charge customers based on display amounts. Charging flows always use the invoice's store-currency amounts divided by the locked `PricingExchangeRate`.

## Orders

Each order represents a fulfillment unit. Key properties:

| Property | Description |
|----------|-------------|
| `Id` | Unique identifier |
| `InvoiceId` | Parent invoice |
| `WarehouseId` | Warehouse fulfilling this order |
| `ShippingOptionId` | Selected shipping method (Guid.Empty for dynamic providers) |
| `ShippingProviderKey` | Provider key (e.g., "flat-rate", "fedex") |
| `ShippingServiceCode` | Carrier service code (e.g., "FEDEX_GROUND") |
| `ShippingServiceName` | Display name (e.g., "FedEx Ground") |
| `ShippingCost` | Shipping cost for this order |
| `QuotedShippingCost` | Rate quoted at checkout (for reconciliation) |
| `Status` | Current order status |

## Order Statuses

Orders move through a defined lifecycle:

| Status | Value | Description |
|--------|-------|-------------|
| `Pending` | 0 | Just created, awaiting processing |
| `AwaitingStock` | 10 | Stock reserved but not fully available (backorder) |
| `ReadyToFulfill` | 20 | Stock available, ready for warehouse picking |
| `Processing` | 30 | Being picked and packed |
| `PartiallyShipped` | 40 | Some items shipped |
| `Shipped` | 50 | All items shipped |
| `Completed` | 60 | Delivered to customer |
| `Cancelled` | 70 | Order cancelled |
| `OnHold` | 80 | Paused (payment issue, fraud check, etc.) |
| `FulfilmentFailed` | 90 | 3PL submission failed after max retries |

Status transitions happen automatically based on shipment activity (see [Shipments](../shipping/shipments.md)), but can also be manually triggered.

## Line Items

Line items represent individual products or charges on an order:

| Property | Description |
|----------|-------------|
| `Sku` | Product SKU |
| `Name` | Product name |
| `ProductId` | Link to the product (null for custom/manual items) |
| `LineItemType` | `Product`, `Custom`, `Addon`, `Discount`, `Shipping`, `Tax` |
| `Quantity` | Number of units |
| `Amount` | Unit price |
| `Cost` | Cost of goods (for margin calculations) |
| `IsTaxable` | Whether this item is subject to tax |
| `TaxRate` | Applied tax rate percentage |
| `TaxGroupId` | Tax group for provider tax code mapping |
| `DependantLineItemSku` | Links add-ons to parent products |
| `OriginalAmount` | Original price before manual adjustment |
| `ExtendedData` | Additional data (variant options, product metadata) |

## Invoice Source Tracking (Invariant)

The [`Invoice.Source`](../../../src/Merchello.Core/Accounting/Models/InvoiceSource.cs) property tracks where and how an invoice was created — essential for analytics and auditing. **Preserve these semantics in every invoice-creating flow.** See [Architecture Diagrams §2.4](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) for the full source-type catalog.

| Property | Description |
|----------|-------------|
| `Type` | Well-known values from [`Constants.InvoiceSources`](../../../src/Merchello.Core/Constants.cs): `"web"`, `"ucp"`, `"api"`, `"pos"`, `"draft"` (alias `"manual"`), `"mobile"`, `"import"`, `"other"` |
| `DisplayName` | Human-readable name (e.g., "Online Store", "Point of Sale") |
| `SourceId` | Unique identifier for the source instance (agent ID, API key ID, terminal ID) |
| `SourceName` | Label for the source instance |
| `ProtocolVersion` | Protocol version if applicable (e.g. UCP date string) |
| `ProfileUri` | External agent profile URL |
| `SessionId` | Session/transaction ID from the source system (basket ID, UCP session ID, POS txn) |
| `Metadata` | Additional source-specific data (`Dictionary<string, object>`) |
| `RecordedAtUtc` | When the source was captured |

Query invoices by source:

```csharp
await invoiceService.QueryInvoices(new InvoiceQueryParameters { SourceType = Constants.InvoiceSources.Ucp });
```

> **Tip:** Use `Constants.InvoiceSources` rather than hard-coded strings. `Constants.InvoiceSources.Manual` is a legacy alias for `Draft` — prefer `Draft` in new code.

## Querying Orders

Use [`IInvoiceService.QueryInvoices`](../../../src/Merchello.Core/Accounting/Services/Interfaces/IInvoiceService.cs) for paged, filterable queries:

```csharp
var result = await invoiceService.QueryInvoices(new InvoiceQueryParameters
{
    CurrentPage         = 1,
    AmountPerPage       = 25,
    CustomerId          = customerId,
    SourceType          = Constants.InvoiceSources.Web,
    PaymentStatusFilter = InvoicePaymentStatusFilter.Unpaid,
    Search              = "INV-0042"
});
```

Supported filters: `CustomerId`, `Channel`, `SourceType`, `DateFrom`/`DateTo`, `Search` (invoice number, billing/shipping name, postcode, email), `PaymentStatusFilter`, `FulfillmentStatusFilter`, `CancellationStatusFilter`, `IncludeDeleted`.

For customer statements and outstanding balances, see [Customer Statements](statements.md).

## Invoice Cancellation

Invoices are cancelled through `IInvoiceService.CancelInvoiceAsync` — **don't mutate `IsCancelled` directly**, the service also handles stock release, order state transitions, and audit notes. Individual orders within an invoice can be cancelled via `CancelOrderAsync`. Cancellation is a soft operation — the invoice remains for audit.

Fields populated by cancellation: `IsCancelled`, `DateCancelled`, `CancellationReason`, `CancelledBy`.

## Soft Deletion

Use `IInvoiceService.SoftDeleteInvoicesAsync` to bulk-soft-delete invoices. Soft-deleted invoices set `IsDeleted = true` and `DateDeleted`, and are excluded from queries unless `InvoiceQueryParameters.IncludeDeleted = true`.

## Next Steps

- [Invoice Editing](invoice-editing.md) — modifying invoices after creation
- [Manual Orders](manual-orders.md) — creating orders from the backoffice
- [Customer Statements](statements.md) — account balance tracking
- [Payment System Overview](../payments/payment-system-overview.md) — how payments attach to invoices
- [Refunds](../payments/refunds.md) — reversing charges and keeping invoice totals accurate
- [Shipments](../shipping/shipments.md) — fulfilling orders
