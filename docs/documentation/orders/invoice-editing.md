# Invoice Editing

After an invoice is created, you may need to modify it -- adding products, adjusting quantities, removing items, or applying discounts. Merchello's `InvoiceEditService` handles this with full recalculation of tax, shipping, and totals.

## When Can You Edit an Invoice?

Not all invoices can be edited. The service checks whether editing is allowed based on the order statuses. Generally, you can edit invoices where orders haven't been fully shipped yet. If all items are shipped or delivered, editing is blocked to prevent inconsistencies.

## Getting an Invoice for Editing

Before editing, load the invoice with all the context needed for the edit UI:

```csharp
var editDto = await invoiceEditService.GetInvoiceForEditAsync(invoiceId, cancellationToken);
```

This returns an `InvoiceForEditDto` containing:
- Whether the invoice can be edited (and why not, if it can't)
- All orders with their line items
- Shipping option names for display
- Stock availability for each product line item (is stock tracked? how much is available?)
- Currency information

## What You Can Edit

### Adding line items

You can add new products to an existing order. The service:
1. Looks up the product and validates stock availability
2. Creates the line item with correct pricing
3. Recalculates tax using the active tax provider
4. Recalculates order totals

### Removing line items

Remove line items from an order. If removing a line item leaves an order empty, the order itself may be removed.

### Adjusting quantities

Change the quantity of existing line items. The service validates that sufficient stock is available for tracked inventory items.

### Previewing edits

Before committing changes, you can preview what the invoice will look like after edits. This shows the recalculated totals, tax, and shipping costs without actually saving anything.

> **Tip:** Always use the preview endpoint first in your UI. It lets the admin review the financial impact of changes before committing them.

### Applying discounts

You can apply discounts to existing invoices through the edit flow. The discount engine evaluates eligibility and calculates the discount amount, which is added as a discount line item.

## How Recalculation Works

When you edit an invoice, Merchello rebuilds a virtual basket from the modified line items and runs the full calculation pipeline:

1. **Order grouping** -- re-evaluates how items should be grouped (using the same strategy as checkout)
2. **Shipping recalculation** -- recalculates shipping costs based on new item weights and quantities
3. **Tax recalculation** -- runs through the active tax provider with the updated line items
4. **Discount refresh** -- re-evaluates applicable discounts
5. **Total recalculation** -- updates subtotal, tax, discount, and total

This ensures consistency -- the same calculation logic used at checkout is used for edits.

## Key Dependencies

The `InvoiceEditService` coordinates several services:

| Service | Role in editing |
|---------|----------------|
| `IShippingService` | Recalculate shipping costs |
| `IInventoryService` | Check stock availability |
| `ITaxProviderManager` | Recalculate tax |
| `IOrderGroupingStrategyResolver` | Re-group items if needed |
| `IDiscountEngine` | Re-evaluate discounts |
| `ITaxOrchestrationService` | Coordinate external tax provider calls |
| `ILineItemService` | Manage line item operations |

## Stock Tracking During Edits

When editing involves quantity changes:

- **Increasing quantity** -- the service checks `GetAvailableStockAsync()` to ensure enough stock exists
- **Decreasing quantity** -- releases the difference back to available stock
- **Removing items** -- releases all reserved stock for those items

The edit UI includes stock information (`IsTracked`, `Available`) so admins can see stock levels while making changes.

## Multi-Currency Considerations

For invoices in a non-store currency, edits recalculate using the locked exchange rate from the original invoice. The `PricingExchangeRate` captured at invoice creation is preserved -- edits don't use current market rates.

> **Warning:** Invoice editing uses the same exchange rate that was locked at creation time. This prevents discrepancies between the original and edited totals when exchange rates have moved.
