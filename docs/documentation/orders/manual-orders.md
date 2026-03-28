# Manual / Backoffice Orders

Not every order comes through the website checkout. Sometimes you need to create orders manually -- phone orders, orders entered by sales staff, or adjustments for existing customers. Merchello supports manual order creation through the backoffice and API.

## How Manual Orders Differ

Manual orders differ from checkout orders in a few ways:

| Aspect | Checkout Order | Manual Order |
|--------|---------------|--------------|
| `BasketId` | Set (links to the checkout basket) | `null` |
| `Source.Type` | `"web"` | `"manual"` or `"ucp"` |
| Payment | Collected during checkout | Can be marked as paid later |
| Customer | Auto-created from billing email | Must specify customer |
| Stock | Reserved during checkout | Reserved at creation |

## Creating a Manual Order

Manual orders are created through `IInvoiceService`. The process:

1. **Build the invoice** -- specify customer, addresses, line items, and channel
2. **Create as draft** -- the invoice is created but not yet paid
3. **Mark as paid** -- when payment is received (or immediately if paid by phone)

### Source tracking

When creating a manual order, set the `Source` to track its origin:

```csharp
var invoice = new Invoice
{
    CustomerId = customerId,
    BillingAddress = billingAddress,
    ShippingAddress = shippingAddress,
    Channel = "Phone",
    Source = new InvoiceSource
    {
        Type = "manual",
        DisplayName = "Phone Order",
        SourceName = "Sales Team",
        SourceId = agentId
    }
};
```

Common source types for manual orders:

| Type | Use Case |
|------|----------|
| `"manual"` | Backoffice staff entry |
| `"ucp"` | UCP agent (AI commerce protocol) |
| `"api"` | Third-party API integration |
| `"pos"` | Point of sale terminal |

> **Tip:** Consistent source tracking lets you analyze where orders come from. Reports can break down revenue by channel -- online vs phone vs POS.

## Draft Invoices

A draft invoice is created but not yet finalized. This is useful when:

- You are building an order over a phone call and want to save progress
- You need manager approval before finalizing
- You are waiting for stock confirmation

Draft invoices don't trigger payment processing or stock reservation until finalized.

## Batch Mark-as-Paid

For B2B scenarios where customers pay on account, you can batch-mark multiple invoices as paid:

```http
POST /umbraco/api/v1/orders/batch-mark-paid
Content-Type: application/json

{
  "invoiceIds": ["guid-1", "guid-2", "guid-3"],
  "paymentMethod": "Bank Transfer",
  "reference": "BACS-20260315"
}
```

This is useful when processing bank transfers -- you receive one payment covering multiple invoices and need to mark them all as paid at once.

## Line Items for Manual Orders

When building manual orders, you create line items using the `InvoiceFactory` and `LineItemFactory`:

```csharp
// Product line items are created from actual products
var lineItem = lineItemFactory.CreateFromProduct(product, quantity);

// Custom line items for non-product charges
var customItem = new LineItem
{
    Name = "Installation Fee",
    LineItemType = LineItemType.Custom,
    Quantity = 1,
    Amount = 50.00m,
    IsTaxable = true,
    TaxGroupId = standardRateTaxGroupId
};
```

> **Warning:** Always set `TaxGroupId` on custom line items if they should be taxed. Without it, tax calculation will treat the item as non-taxable.

## Customer Account Terms

For customers with `HasAccountTerms = true`, manual orders automatically get a `DueDate` calculated from the customer's `PaymentTermsDays`. This integrates with the [Customer Statements](statements.md) system for tracking outstanding balances.

## Invoice Notes

Manual orders often need notes for internal reference:

```csharp
invoice.Notes.Add(new InvoiceNote
{
    Content = "Customer called to place order. Offered 10% loyalty discount.",
    CreatedBy = "admin@store.com",
    DateCreated = DateTime.UtcNow
});
```

Notes are visible in the backoffice and provide an audit trail of actions taken on the invoice.
