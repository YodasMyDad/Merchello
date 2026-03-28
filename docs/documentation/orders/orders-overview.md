# Orders and Invoices Overview

Merchello uses a three-level hierarchy for commerce transactions: **Invoices** contain **Orders**, and Orders contain **Shipments**. Understanding this structure is key to working with Merchello's order management system.

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

### Multi-currency fields

For stores using multiple currencies, invoices also store:
- `StoreCurrencyCode` -- the store's base currency
- `PricingExchangeRate` -- the locked exchange rate (presentment -> store)
- `PricingExchangeRateSource` -- where the rate came from (e.g., "frankfurter")
- `PricingExchangeRateTimestampUtc` -- when the rate was locked
- `*InStoreCurrency` variants of SubTotal, Tax, Discount, and Total for reporting

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

## Invoice Source Tracking

The `InvoiceSource` property tracks where and how an invoice was created -- important for analytics and auditing:

| Property | Description |
|----------|-------------|
| `Type` | Source type: `"web"`, `"ucp"`, `"api"`, `"pos"`, `"mobile"`, `"manual"` |
| `DisplayName` | Human-readable name (e.g., "Online Store", "Point of Sale") |
| `SourceId` | Unique identifier for the source (agent ID, API key ID, terminal ID) |
| `SourceName` | Label for the source instance |
| `ProtocolVersion` | Protocol version if applicable |
| `ProfileUri` | External agent profile URL |
| `SessionId` | Session/transaction ID from the source system |
| `Metadata` | Additional source-specific data |

> **Tip:** Always preserve `Invoice.Source` semantics. This data powers analytics dashboards and audit trails, helping you understand where your orders come from.

## Querying Orders

Use `IInvoiceService` for querying:

```csharp
// Paged query with filters
var result = await invoiceService.QueryAsync(new InvoiceQueryParameters
{
    PageNumber = 1,
    PageSize = 25,
    OrderStatus = OrderStatus.ReadyToFulfill,
    CustomerId = customerId
});
```

## Invoice Cancellation

Invoices can be cancelled (soft operation):

```csharp
invoice.IsCancelled = true;
invoice.DateCancelled = DateTime.UtcNow;
invoice.CancellationReason = "Customer requested cancellation";
invoice.CancelledBy = "admin@store.com";
```

Cancellation does not delete the invoice -- it remains for audit purposes.

## Soft Deletion

Invoices can also be soft-deleted:

```csharp
invoice.IsDeleted = true;
invoice.DateDeleted = DateTime.UtcNow;
```

Soft-deleted invoices are excluded from queries but remain in the database.

## Next Steps

- [Invoice Editing](invoice-editing.md) -- modifying invoices after creation
- [Manual Orders](manual-orders.md) -- creating orders from the backoffice
- [Customer Statements](statements.md) -- account balance tracking
- [Shipments](../shipping/shipments.md) -- fulfilling orders
