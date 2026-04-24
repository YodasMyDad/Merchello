# Invoice Editing

After an invoice is created, you may need to modify it — adding products, adjusting quantities, removing items, or applying discounts. [`IInvoiceEditService`](../../../src/Merchello.Core/Accounting/Services/Interfaces/IInvoiceEditService.cs) handles this with full recalculation of tax, shipping, and totals, reusing the same calculation pipeline as checkout.

> **Scope note:** Invoice editing recalculates totals and updates line items. It does **not** refund payments. If an edit lowers the total below what's been paid, reconcile via a [refund](../payments/refunds.md) — payment status is still calculated by `IPaymentService.CalculatePaymentStatus`.

## Available Operations

The `EditInvoiceDto` request supports the following operations in a single call:

| Operation | DTO | Description |
| --------- | --- | ----------- |
| Adjust quantities | `EditLineItemDto` | Change quantity on existing line items, with optional return-to-stock control |
| Remove line items | `RemoveLineItemDto` | Remove items with optional stock return (`ShouldReturnToStock`) |
| Add products | `AddProductToOrderDto` | Add product variants with add-on selections, warehouse, and shipping option |
| Add custom items | `AddCustomItemDto` | Add non-catalog items with name, SKU, price, cost, and tax group |
| Apply line-item discounts | `LineItemDiscountDto` | Fixed amount, percentage, or free -- attached to a line item edit |
| Apply order-level discounts | `LineItemDiscountDto` | Discounts not tied to specific line items |
| Apply discount codes | `OrderDiscountCodes` | Promotional codes evaluated through checkout discount rules |
| Override shipping costs | `OrderShippingUpdateDto` | Set a specific shipping cost per order |
| Remove tax | `ShouldRemoveTax` | Remove tax from all line items (VAT exemption) |

An `EditReason` can be provided for audit trail and timeline logging.

## EditInvoiceDto Contract

```csharp
public class EditInvoiceDto
{
    public List<EditLineItemDto> LineItems { get; set; } = [];
    public List<RemoveLineItemDto> RemovedLineItems { get; set; } = [];
    public List<Guid> RemovedOrderDiscounts { get; set; } = [];
    public List<AddCustomItemDto> CustomItems { get; set; } = [];
    public List<AddProductToOrderDto> ProductsToAdd { get; set; } = [];
    public List<LineItemDiscountDto> OrderDiscounts { get; set; } = [];
    public List<string> OrderDiscountCodes { get; set; } = [];
    public List<OrderShippingUpdateDto> OrderShippingUpdates { get; set; } = [];
    public string? EditReason { get; set; }
    public bool ShouldRemoveTax { get; set; }
}
```

### Key Sub-DTOs

**EditLineItemDto** -- Adjust an existing line item:

```csharp
public class EditLineItemDto
{
    public Guid Id { get; set; }
    public int? Quantity { get; set; }              // null = no change
    public bool ShouldReturnToStock { get; set; } = true; // false for damaged/faulty
    public LineItemDiscountDto? Discount { get; set; }
}
```

**AddProductToOrderDto** -- Add a product variant to an order:

```csharp
public class AddProductToOrderDto
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public Guid WarehouseId { get; set; }
    public Guid ShippingOptionId { get; set; }
    public string? SelectionKey { get; set; }  // "so:{guid}" or "dyn:{provider}:{serviceCode}"
    public List<OrderAddonDto> Addons { get; set; } = [];
}
```

**LineItemDiscountDto** -- Discount applied to a line item or at order level:

```csharp
public class LineItemDiscountDto
{
    public string? DisplayName { get; set; }
    public DiscountValueType Type { get; set; }  // FixedAmount, Percentage, or Free
    public decimal Value { get; set; }
    public string? Reason { get; set; }
    public bool IsVisibleToCustomer { get; set; }
}
```

## IInvoiceEditService Interface

The service exposes three main methods:

```csharp
public interface IInvoiceEditService
{
    // Load invoice with editing context (stock availability, editability check)
    Task<InvoiceForEditDto?> GetInvoiceForEditAsync(Guid invoiceId, CancellationToken ct);

    // Preview recalculated totals without persisting -- single source of truth for calculations
    Task<PreviewEditResultDto?> PreviewInvoiceEditAsync(
        Guid invoiceId, EditInvoiceDto request, CancellationToken ct);

    // Apply the edit and persist
    Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(
        EditInvoiceParameters parameters, CancellationToken ct);
}
```

Always call `PreviewInvoiceEditAsync` before `EditInvoiceAsync` in your integration. The preview returns a `PreviewEditResultDto` with fully recalculated `SubTotal`, `DiscountTotal`, `AdjustedSubTotal`, `ShippingTotal`, `Tax`, and `Total`, plus per-line-item breakdowns and any validation warnings.

## How Recalculation Works

When you edit an invoice, Merchello rebuilds a virtual basket from the modified line items and runs the full calculation pipeline:

1. **Order grouping** -- re-evaluates how items should be grouped (using the same strategy as checkout)
2. **Shipping recalculation** -- recalculates shipping costs based on new item weights and quantities
3. **Tax recalculation** -- runs through the active tax provider with the updated line items, preserving `TaxGroupId` from product roots
4. **Discount refresh** -- re-evaluates applicable discounts
5. **Total recalculation** -- updates subtotal, tax, discount, and total

This ensures consistency -- the same calculation logic used at checkout is used for edits.

### Service Dependencies

| Service | Role in editing |
| ------- | --------------- |
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
- **Decreasing quantity** -- releases the difference back to available stock (unless `ShouldReturnToStock = false` for damaged/faulty items)
- **Removing items** -- releases all reserved stock for those items (controlled by `ShouldReturnToStock`)

## Multi-Currency Considerations (Invariant)

Exchange rates are locked at invoice creation and **never refreshed** on edit. Edits recalculate using the invoice's captured `PricingExchangeRate`, `PricingExchangeRateSource`, and `PricingExchangeRateTimestampUtc` — not current market rates. This prevents discrepancies between the original and edited totals when rates have moved, and keeps the audit trail intact.

`PreviewEditResultDto` exposes both invoice-currency totals and store-currency equivalents (`CurrencyCode`, `CurrencySymbol`, `StoreCurrencyCode`, `StoreCurrencySymbol`, `PricingExchangeRate`, `TotalInStoreCurrency`) so the UI can show both views.

See [Multi-Currency Overview](../multi-currency/multi-currency-overview.md) for the full conversion model.

## Related

- [Orders Overview](orders-overview.md) — invoice/order structure
- [Payment System Overview](../payments/payment-system-overview.md) — payment status recalculation after edits
- [Refunds](../payments/refunds.md) — how to reverse charges when an edit reduces the total
- [Checkout Flow](../checkout/checkout-flow.md) — the calculation pipeline the edit service reuses
