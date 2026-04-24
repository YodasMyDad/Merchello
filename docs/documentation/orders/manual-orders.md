# Manual / Backoffice Orders

Not every order comes through the website checkout. Sometimes you need to create orders manually — phone orders, orders entered by sales staff, or adjustments for existing customers. Merchello supports manual order creation through the backoffice UI, backed by `IInvoiceService.CreateManualOrderAsync`.

## How Manual Orders Differ

| Aspect | Checkout order | Manual order |
|--------|----------------|--------------|
| `BasketId` | Set (links to the checkout basket) | `null` |
| `Source.Type` | `"web"` | `"draft"` (`Constants.InvoiceSources.Draft` — `"manual"` is a legacy alias) |
| Payment | Collected during checkout | Recorded later (mark as paid, batch mark as paid, or generate a payment link) |
| Channel | `"Online Store"` | `"Manual order"` (`Constants.InvoiceChannels.ManualOrder`) |
| Customer | Auto-created from billing email | Picked in the backoffice customer lookup |

## Creating a Manual Order

The backoffice "New order" flow posts [`CreateManualOrderDto`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Accounting/Dtos/CreateManualOrderDto.cs) to `POST /umbraco/api/v1/orders/manual` — handled by [`OrdersApiController`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/OrdersApiController.cs) which calls `invoiceService.CreateManualOrderAsync`:

```json
POST /umbraco/api/v1/orders/manual
{
  "billingAddress": { "name": "Jane Doe", "addressOne": "...", "townCity": "...", "countryCode": "GB", ... },
  "shippingAddress": null,
  "customItems": [
    {
      "name": "Consultancy — design review",
      "sku": "CONS-001",
      "quantity": 1,
      "amount": 450.00,
      "isTaxable": true,
      "taxGroupId": "..."
    }
  ]
}
```

The service:

1. Resolves / creates the customer from the billing address email.
2. Creates an invoice via `InvoiceFactory.CreateDraft()` with `Source.Type = "draft"` and `Channel = "Manual order"`.
3. Runs the full calculation pipeline (tax, shipping, totals) — the same pipeline as checkout edits.
4. Returns `CreateManualOrderResultDto` with the new invoice id and number.

The invoice is then edited using the normal [invoice editing](invoice-editing.md) flow to add products, apply discounts, and adjust shipping before recording payment.

### Source tracking

`Invoice.Source` is set automatically by the factory, but you can customise it when building invoices programmatically for integrations (API, UCP, POS). See [Orders Overview — Invoice Source Tracking](orders-overview.md#invoice-source-tracking-invariant) for the full property list.

```csharp
invoice.Source = new InvoiceSource
{
    Type        = Constants.InvoiceSources.Pos,
    DisplayName = "Point of Sale",
    SourceName  = "Terminal A",
    SourceId    = terminalId,
    SessionId   = posSessionId
};
```

Common source types for non-web orders:

| Type | Use case |
|------|----------|
| `Constants.InvoiceSources.Draft` | Admin-created orders (also aliased as `Manual`) |
| `Constants.InvoiceSources.Ucp` | UCP AI agents |
| `Constants.InvoiceSources.Api` | Third-party API integration |
| `Constants.InvoiceSources.Pos` | Point of sale terminal |

> **Tip:** Consistent source tracking powers revenue-by-channel reporting — online vs phone vs POS vs AI agent.

## Draft Workflow

Manual orders are created as drafts (unpaid). They progress through the same order lifecycle as web orders once payment is recorded:

1. **Create** — `POST /umbraco/api/v1/orders/manual` creates the draft invoice.
2. **Edit** — add products, apply discounts, set shipping via the [invoice edit API](invoice-editing.md).
3. **Collect payment** — options:
   - Mark as paid (manual payment, see [Payment System Overview](../payments/payment-system-overview.md))
   - [Generate a payment link](../payments/payment-links.md) and email it to the customer
   - Wait for the customer to pay a purchase order on account

## Batch Mark-as-Paid

For B2B scenarios where customers pay on account, you can mark multiple invoices as paid in one call. Handled by [`OrdersApiController.BatchMarkAsPaid`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/OrdersApiController.cs) → `IPaymentService.BatchMarkAsPaidAsync`:

```http
POST /umbraco/api/v1/orders/batch-mark-paid
Content-Type: application/json
```

```json
{
  "invoiceIds": ["<guid-1>", "<guid-2>", "<guid-3>"],
  "paymentMethod": "Bank Transfer",
  "reference": "BACS-20260315",
  "dateReceived": "2026-03-15T00:00:00Z"
}
```

The service creates one payment per invoice for that invoice's outstanding balance (`CalculatePaymentStatus` decides what's owed). Fields `invoiceIds` and `paymentMethod` are required; `reference` and `dateReceived` are optional.

## Line Items for Manual Orders

Once a draft is created, add products and custom items through the [invoice edit API](invoice-editing.md). Under the hood line items are created via [`InvoiceFactory`](https://github.com/YodasMyDad/Merchello/tree/main/src/Merchello.Core/Accounting/Factories) / [`LineItemFactory`](https://github.com/YodasMyDad/Merchello/tree/main/src/Merchello.Core/Accounting/Factories) — **never `new LineItem {}` directly in controllers** (see [CLAUDE.md Layering Rules](https://github.com/YodasMyDad/Merchello/blob/main/.claude/claude.md)).

> **Warning:** Custom line items must set `TaxGroupId` to be taxed correctly. Tax providers select rates by `TaxGroupId`; without it the item is treated as non-taxable.

## Customer Account Terms

For customers with `HasAccountTerms = true`, manual orders automatically get a `DueDate` calculated from `Customer.PaymentTermsDays`. This drives the [Customer Statements](statements.md) outstanding-balance view and the [invoice reminder](../payments/payment-links.md#invoice-reminders) background job.

## Invoice Notes

Manual orders frequently need internal notes. Use `IInvoiceService.AddNoteAsync` (don't mutate `invoice.Notes` directly):

```csharp
await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
{
    InvoiceId         = invoiceId,
    Text              = "Customer called to place order. Offered 10% loyalty discount.",
    VisibleToCustomer = false,
    AuthorName        = currentUser.Name
}, ct);
```

Notes appear in the order timeline in the backoffice.
