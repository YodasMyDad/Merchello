# Tax Code Mapping Implementation Plan

## Research Summary

### Tax Code Systems (Global)

| Provider | Code Format | Default | Example Codes |
|----------|-------------|---------|---------------|
| **Avalara** | Alphanumeric | `P0000000` | `PB100000` (books), `PC040100` (clothing) |
| **TaxJar** | Numeric | None (fully taxable) | `81100` (books), `20010` (clothing), `31000` (digital) |

Both systems are **global** - you assign ONE code, the provider determines the rate per jurisdiction.

### Current Flow is Broken

```
CURRENT (broken):
Product.ProductRoot.TaxGroupId → TaxRate lookup → Store on LineItem.TaxRate
                                      ↓
                             TaxGroupId NOT captured on LineItem
                                      ↓
TaxableLineItem.TaxGroupId = null (hardcoded in InvoiceService.cs:2875)
TaxableLineItem.TaxCode = null (never populated)
                                      ↓
AvalaraTaxProvider falls back to "P0000000" for EVERYTHING (line 223)
```

**Root Cause:** `LineItem` model lacks `TaxGroupId` property. The `LineItemFactory.CreateFromProduct()` captures `TaxRate` but discards the `TaxGroupId`.

### How Shopify Does It

- Tax code stored **directly on Product** (provider-specific)
- Being deprecated - moving to sync products to Avalara, mapping done in Avalara's system
- We want something better: **provider-agnostic TaxGroups with provider-specific mappings**

---

## Solution Architecture

### Core Concept

**TaxGroups remain provider-agnostic.** Each tax provider has a configuration UI that maps TaxGroup → Provider Tax Code.

```
NEW FLOW:
Product.ProductRoot.TaxGroupId
         ↓
LineItemFactory.CreateFromProduct() captures TaxGroupId
         ↓
LineItem.TaxGroupId (new property)
         ↓
LineItemFactory.CreateForOrder() preserves TaxGroupId
         ↓
InvoiceService creates TaxableLineItem with TaxGroupId
         ↓
TaxableLineItem.TaxGroupId (already exists)
         ↓
Provider.CalculateOrderTaxAsync() looks up mapping in its config
         ↓
Provider uses correct tax code in API call
```

### Implementation Components

#### 1. Add TaxGroupId to LineItem Model

In `LineItem.cs`, add after `TaxRate`:
```csharp
/// <summary>
/// Tax group ID for this line item. Used by API tax providers to lookup provider-specific tax codes.
/// Captured from ProductRoot.TaxGroupId at basket creation time.
/// </summary>
public Guid? TaxGroupId { get; set; }
```

#### 2. Update LineItemFactory to Capture TaxGroupId

In `LineItemFactory.CreateFromProduct()`:
```csharp
public LineItem CreateFromProduct(Product product, int quantity)
{
    var taxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 0m;
    return new LineItem
    {
        Id = GuidExtensions.NewSequentialGuid,
        ProductId = product.Id,
        Name = product.Name,
        Sku = product.Sku,
        Quantity = quantity,
        Amount = product.Price,
        Cost = product.CostOfGoods,
        LineItemType = LineItemType.Product,
        IsTaxable = taxRate > 0,
        TaxRate = taxRate,
        TaxGroupId = product.ProductRoot.TaxGroupId  // <-- ADD THIS
    };
}
```

In `LineItemFactory.CreateForOrder()`:
```csharp
return new LineItem
{
    // ... existing properties ...
    TaxGroupId = basketLineItem.TaxGroupId  // <-- ADD THIS
};
```

In `LineItemFactory.CreateAddonForOrder()`:
```csharp
return new LineItem
{
    // ... existing properties ...
    TaxGroupId = addonItem.TaxGroupId  // <-- ADD THIS
};
```

#### 3. New ConfigurationFieldType: `TaxGroupMapping`

Add to `ConfigurationFieldType.cs` (in `Merchello.Core.Shipping.Providers` - shared by all providers):
```csharp
public enum ConfigurationFieldType
{
    // ... existing ...

    /// <summary>
    /// Tax group to provider code mapping grid.
    /// Renders a table of TaxGroups with text inputs for provider-specific codes.
    /// </summary>
    TaxGroupMapping
}
```

#### 4. Base Class Helper Method

Add to `TaxProviderBase.cs`:
```csharp
/// <summary>
/// Gets the provider-specific tax code for a TaxGroup from configuration.
/// </summary>
/// <param name="taxGroupId">The TaxGroup ID to look up</param>
/// <returns>The mapped tax code, or null if no mapping exists</returns>
protected string? GetTaxCodeForTaxGroup(Guid? taxGroupId)
{
    if (!taxGroupId.HasValue) return null;

    var mappingsJson = GetConfigValue("taxGroupMappings");
    if (string.IsNullOrWhiteSpace(mappingsJson)) return null;

    try
    {
        var mappings = JsonSerializer.Deserialize<Dictionary<string, string>>(mappingsJson);
        return mappings?.GetValueOrDefault(taxGroupId.Value.ToString());
    }
    catch
    {
        return null;
    }
}

/// <summary>
/// Gets the provider-specific shipping tax code from configuration.
/// </summary>
/// <returns>The configured shipping tax code, or null to use default</returns>
protected string? GetShippingTaxCode()
{
    return GetConfigValue("shippingTaxCode");
}
```

#### 5. Fix InvoiceService TaxableLineItem Creation

In `InvoiceService.cs` around line 2869:
```csharp
var taxableLineItems = allLineItems
    .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
    .Select(li => new TaxableLineItem
    {
        Sku = li.Sku ?? string.Empty,
        Name = li.Name ?? string.Empty,
        Amount = li.Amount,
        Quantity = li.Quantity,
        TaxGroupId = li.TaxGroupId,  // <-- FIX: Was hardcoded to null
        IsTaxable = li.IsTaxable
    })
    .ToList();
```

#### 6. Update AvalaraTaxProvider

Add mapping configuration field in `GetConfigurationFieldsAsync()`:
```csharp
new TaxProviderConfigurationField
{
    Key = "taxGroupMappings",
    Label = "Tax Group Mappings",
    Description = "Map your tax groups to Avalara tax codes. Find codes at taxcode.avatax.avalara.com",
    FieldType = ConfigurationFieldType.TaxGroupMapping,
    IsRequired = false
},
new TaxProviderConfigurationField
{
    Key = "shippingTaxCode",
    Label = "Shipping Tax Code",
    Description = "Avalara tax code for shipping/freight (default: FR020100)",
    FieldType = ConfigurationFieldType.Text,
    IsRequired = false,
    DefaultValue = "FR020100",
    Placeholder = "FR020100"
}
```

Update `CalculateOrderTaxAsync()` to use mappings:
```csharp
foreach (var item in request.LineItems)
{
    var taxCode = GetTaxCodeForTaxGroup(item.TaxGroupId) ?? DefaultTaxCode;

    transaction.lines.Add(new LineItemModel
    {
        number = lineNumber.ToString(),
        itemCode = item.Sku,
        description = item.Name,
        quantity = item.Quantity,
        amount = item.Amount * item.Quantity,
        taxCode = taxCode,  // <-- Now uses mapped code
        taxIncluded = false
    });
    lineNumber++;
}

// For shipping, use configured code or default
if (request.ShippingAmount > 0)
{
    var shippingCode = GetShippingTaxCode() ?? ShippingTaxCode;
    transaction.lines.Add(new LineItemModel
    {
        number = "SHIPPING",
        itemCode = "SHIPPING",
        description = "Shipping & Handling",
        quantity = 1,
        amount = request.ShippingAmount,
        taxCode = shippingCode,
        taxIncluded = false
    });
}
```

---

## Files to Modify

### Backend - Core Changes

| File | Change |
|------|--------|
| `src/Merchello.Core/Accounting/Models/LineItem.cs` | Add `TaxGroupId` property |
| `src/Merchello.Core/Accounting/Factories/LineItemFactory.cs` | Capture and preserve `TaxGroupId` in all factory methods |
| `src/Merchello.Core/Accounting/Mapping/LineItemMapping.cs` | Add EF mapping for `TaxGroupId` column |
| `src/Merchello.Core/Accounting/Services/InvoiceService.cs` | Pass `TaxGroupId` when creating `TaxableLineItem` (line ~2875) |
| `src/Merchello.Core/Shipping/Providers/ConfigurationFieldType.cs` | Add `TaxGroupMapping` enum value |
| `src/Merchello.Core/Tax/Providers/TaxProviderBase.cs` | Add `GetTaxCodeForTaxGroup()` and `GetShippingTaxCode()` helper methods |

### Backend - Provider Updates

| File | Change |
|------|--------|
| `src/Merchello.Core/Tax/Providers/BuiltIn/AvalaraTaxProvider.cs` | Add mapping config fields, use `GetTaxCodeForTaxGroup()` in calculation |

### Frontend - UI Changes

| File | Change |
|------|--------|
| `src/Merchello/Client/src/tax/modals/tax-provider-config-modal.element.ts` | Add `TaxGroupMapping` case to `_renderField()`, fetch TaxGroups, handle mapping state |
| `src/Merchello/Client/src/tax/types/tax.types.ts` | Add `TaxGroupMappingItem` interface |

> **Note:** The mapping UI is rendered inline in the existing modal (following the established pattern for field types), not as a separate component.

### Database Migration

> **Note:** Migration will be created manually after implementation.

---

## Implementation Order

### Phase 1: Data Model
1. Add `TaxGroupId` property to `LineItem.cs`
2. Add EF mapping in `LineItemMapping.cs`

> **Note:** Migration will be created manually after implementation.

### Phase 2: Data Flow (Backend)
4. Update `LineItemFactory.CreateFromProduct()` to capture `TaxGroupId`
5. Update `LineItemFactory.CreateForOrder()` to preserve `TaxGroupId`
6. Update `LineItemFactory.CreateAddonForOrder()` to preserve `TaxGroupId`
7. Fix `InvoiceService` to pass `TaxGroupId` to `TaxableLineItem`

### Phase 3: Provider Infrastructure
8. Add `TaxGroupMapping` to `ConfigurationFieldType` enum
9. Add `GetTaxCodeForTaxGroup()` and `GetShippingTaxCode()` to `TaxProviderBase`

### Phase 4: Avalara Provider
10. Update `AvalaraTaxProvider.GetConfigurationFieldsAsync()` to include mapping fields
11. Update `AvalaraTaxProvider.CalculateOrderTaxAsync()` to use mapped codes

### Phase 5: Admin UI
12. Add `TaxGroupMappingItem` type to `tax.types.ts`
13. Update `tax-provider-config-modal.element.ts` to handle `TaxGroupMapping` field type (inline rendering)

### Phase 6: Tests
15. Unit tests for `GetTaxCodeForTaxGroup()`
16. Unit tests for `LineItemFactory` TaxGroupId handling
17. Unit tests for provider calculation with mapped codes
18. Integration test for full flow

---

## Migration Notes

> **Note:** Migration will be created manually after implementation. The migration should add a nullable `TaxGroupId` column (UNIQUEIDENTIFIER) to the `merchelloLineItems` table.

### Backward Compatibility

- `TaxGroupId` column is **nullable** - existing LineItems will have NULL
- Providers **must handle null gracefully** by falling back to default tax code
- No data backfill required - historical orders retain their original tax calculations
- New orders will capture TaxGroupId automatically

### Existing Provider Behavior

| Scenario | Behavior |
|----------|----------|
| Existing order with `TaxGroupId = null` | Provider uses `DefaultTaxCode` (e.g., "P0000000") |
| New order, TaxGroup not mapped | Provider uses `DefaultTaxCode` |
| New order, TaxGroup mapped | Provider uses mapped code |
| Malformed mapping JSON | Provider uses `DefaultTaxCode` (fail-safe) |

---

## Test Plan (Enterprise Level)

### Unit Tests

**TaxProviderBase Tests:**
```csharp
// TaxProviderBaseTests.cs
[Fact] GetTaxCodeForTaxGroup_WithValidMapping_ReturnsCode()
[Fact] GetTaxCodeForTaxGroup_WithNoMapping_ReturnsNull()
[Fact] GetTaxCodeForTaxGroup_WithNullTaxGroupId_ReturnsNull()
[Fact] GetTaxCodeForTaxGroup_WithEmptyConfig_ReturnsNull()
[Fact] GetTaxCodeForTaxGroup_WithMalformedJson_ReturnsNull()
[Fact] GetShippingTaxCode_WithConfig_ReturnsCode()
[Fact] GetShippingTaxCode_WithNoConfig_ReturnsNull()
```

**LineItemFactory Tests:**
```csharp
// LineItemFactoryTests.cs
[Fact] CreateFromProduct_CapturesTaxGroupId()
[Fact] CreateFromProduct_WithNullTaxGroup_SetsNullTaxGroupId()
[Fact] CreateForOrder_PreservesTaxGroupId()
[Fact] CreateAddonForOrder_PreservesTaxGroupId()
```

**Avalara Provider Tests:**
```csharp
// AvalaraTaxProviderTests.cs
[Fact] CalculateOrderTaxAsync_WithMappedTaxCode_SendsCorrectCodeToAvalara()
[Fact] CalculateOrderTaxAsync_WithUnmappedTaxGroup_UsesDefaultCode()
[Fact] CalculateOrderTaxAsync_WithNullTaxGroupId_UsesDefaultCode()
[Fact] CalculateOrderTaxAsync_WithMultipleItems_EachUsesCorrectCode()
[Fact] CalculateOrderTaxAsync_WithConfiguredShippingCode_UsesConfiguredCode()
[Fact] GetConfigurationFieldsAsync_IncludesTaxGroupMappingField()
[Fact] GetConfigurationFieldsAsync_IncludesShippingTaxCodeField()
```

**InvoiceService Tests:**
```csharp
// InvoiceServiceTests.cs
[Fact] CreateTaxableLineItems_PassesTaxGroupIdFromLineItem()
[Fact] CreateOrderFromBasket_PreservesTaxGroupIdOnLineItems()
```

### Integration Tests

```csharp
// TaxCodeMappingIntegrationTests.cs
[Fact]
public async Task FullFlow_ProductWithTaxGroup_CorrectCodeSentToProvider()
{
    // 1. Create TaxGroup "Books"
    // 2. Configure Avalara with mapping: Books -> "PB100000"
    // 3. Create Product assigned to Books TaxGroup
    // 4. Add to basket via CheckoutService
    // 5. Create invoice
    // 6. Trigger tax calculation
    // 7. Assert Avalara API called with "PB100000" for that item
}

[Fact]
public async Task FullFlow_MultipleProductsWithDifferentTaxGroups_EachUsesCorrectCode()
{
    // 1. Create TaxGroups: "Books", "Electronics", "Clothing"
    // 2. Configure Avalara mappings
    // 3. Create products in each TaxGroup
    // 4. Add all to basket
    // 5. Create invoice
    // 6. Assert each line item sent with correct code
}

[Fact]
public async Task FullFlow_ExistingOrderWithNullTaxGroupId_UsesDefaultCode()
{
    // Simulate legacy order without TaxGroupId
    // Assert provider falls back gracefully
}
```

### Manual Verification Checklist

1. [ ] Create TaxGroups: "Books", "Clothing", "Digital", "Standard"
2. [ ] Navigate to Tax Providers → Configure Avalara
3. [ ] Verify Tax Group Mapping grid displays all TaxGroups
4. [ ] Enter mappings: Books → PB100000, Clothing → PC040100, Digital → D0000000
5. [ ] Save configuration
6. [ ] Create products in each TaxGroup
7. [ ] Add products to basket, proceed to checkout
8. [ ] Check Avalara sandbox dashboard to verify correct codes received
9. [ ] Verify shipping uses configured shipping tax code
10. [ ] Verify unmapped TaxGroup uses default code

---

## UI Implementation

### TypeScript Types

Add to `src/Merchello/Client/src/tax/types/tax.types.ts`:

```typescript
/**
 * Represents a tax group mapping for provider configuration.
 * Maps a Merchello TaxGroup to a provider-specific tax code.
 */
export interface TaxGroupMappingItem {
  taxGroupId: string;
  taxGroupName: string;
  providerTaxCode: string;
}
```

### Modal Implementation

Update `src/Merchello/Client/src/tax/modals/tax-provider-config-modal.element.ts`:

#### 1. Add State Properties

```typescript
import type { TaxGroupDto } from "../types/tax.types.js";

// Add to class properties
@state() private _taxGroups: TaxGroupDto[] = [];
private _mappings: Record<string, string> = {};
```

#### 2. Load TaxGroups in `_loadData()`

```typescript
private async _loadData(): Promise<void> {
  // ... existing field loading ...

  // If any field is TaxGroupMapping, fetch tax groups
  if (this._fields.some(f => f.fieldType === "TaxGroupMapping")) {
    const { data } = await MerchelloApi.getTaxGroups();
    this._taxGroups = data ?? [];

    // Parse existing mapping from config
    const mappingJson = this._values["taxGroupMappings"];
    if (mappingJson) {
      try {
        this._mappings = JSON.parse(mappingJson);
      } catch {
        this._mappings = {};
      }
    }
  }
}
```

#### 3. Add Case to `_renderField()` Switch

```typescript
private _renderField(field: TaxProviderFieldDto): unknown {
  switch (field.fieldType) {
    // ... existing cases ...

    case "TaxGroupMapping":
      return this._renderTaxGroupMappingField(field);

    default:
      return nothing;
  }
}
```

#### 4. Implement Mapping Field Renderer

```typescript
private _renderTaxGroupMappingField(field: TaxProviderFieldDto): unknown {
  if (this._taxGroups.length === 0) {
    return html`
      <div class="form-field">
        <label>${field.label}</label>
        <uui-box>
          <p class="empty-state">No tax groups configured. Create tax groups in Settings first.</p>
        </uui-box>
      </div>
    `;
  }

  return html`
    <div class="form-field">
      <label>${field.label}</label>
      ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
      <div class="table-container">
        <uui-table class="mapping-table">
          <uui-table-head>
            <uui-table-head-cell>Tax Group</uui-table-head-cell>
            <uui-table-head-cell>Tax Code</uui-table-head-cell>
          </uui-table-head>
          ${this._taxGroups.map(group => html`
            <uui-table-row>
              <uui-table-cell>${group.name}</uui-table-cell>
              <uui-table-cell>
                <uui-input
                  .value=${this._mappings[group.id] ?? ""}
                  @input=${(e: Event) => this._handleMappingChange(group.id, (e.target as HTMLInputElement).value)}
                  placeholder="${field.placeholder || 'P0000000'}"
                ></uui-input>
              </uui-table-cell>
            </uui-table-row>
          `)}
        </uui-table>
      </div>
    </div>
  `;
}

private _handleMappingChange(taxGroupId: string, code: string): void {
  if (code) {
    this._mappings[taxGroupId] = code;
  } else {
    delete this._mappings[taxGroupId];
  }
  this._values["taxGroupMappings"] = JSON.stringify(this._mappings);
}
```

#### 5. Add Required CSS

```css
.table-container {
  overflow-x: auto;
  background: var(--uui-color-surface);
  border: 1px solid var(--uui-color-border);
  border-radius: var(--uui-border-radius);
}

.mapping-table {
  width: 100%;
}

.mapping-table uui-input {
  width: 100%;
}

.empty-state {
  color: var(--uui-color-text-alt);
  font-style: italic;
  margin: 0;
}
```

### Visual Result

```
┌─────────────────────────────────────────────────────────────────┐
│ Tax Group Mappings                                               │
│ Map your tax groups to Avalara tax codes.                        │
│ Find codes at: taxcode.avatax.avalara.com                        │
├─────────────────────────────────────────────────────────────────┤
│ Tax Group              │ Tax Code                                │
│ ───────────────────────┼─────────────────────────────────────── │
│ Standard Rate          │ [P0000000_______]                       │
│ Books                  │ [PB100000_______]                       │
│ Clothing               │ [PC040100_______]                       │
│ Digital Goods          │ [D0000000_______]                       │
│ Food & Beverage        │ [PF050001_______]                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Format

Mappings are stored as a JSON string in the provider configuration:

```json
{
  "taxGroupMappings": "{\"guid-1\":\"PB100000\",\"guid-2\":\"PC040100\"}",
  "shippingTaxCode": "FR020100"
}
```

The backend `GetTaxCodeForTaxGroup()` method deserializes this JSON to look up the provider-specific code.

### UI Pattern Rationale

This implementation follows Merchello's established patterns (see [Umbraco-Backoffice-Dev.md](./Umbraco-Backoffice-Dev.md)):

| Pattern | Application |
|---------|-------------|
| **Inline field rendering** | `TaxGroupMapping` handled in `_renderField()` switch, same as Text/Select/Checkbox |
| **UUI table component** | Uses `uui-table` with proper container styling, not raw HTML tables |
| **JSON string storage** | All config values stored as `Record<string, string>` - complex data serialized as JSON |
| **Lazy loading** | TaxGroups only fetched when modal contains `TaxGroupMapping` field |
| **Empty state handling** | Clear message when no TaxGroups exist |
| **Event-driven updates** | `@input` handlers update state, no form submission until Save |

---

## Seamless Integration (Zero Checkout Changes)

This implementation requires **no changes to checkout flow**. Tax codes work automatically OOTB:

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECKOUT FLOW (unchanged)                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Customer adds product to basket                                          │
│     └─→ CheckoutService.AddToBasketAsync()                                  │
│         └─→ LineItemFactory.CreateFromProduct()                             │
│             └─→ TaxGroupId captured automatically ✓                         │
│                                                                              │
│  2. Basket preview (fast, no API calls)                                      │
│     └─→ CheckoutService.CalculateBasketAsync()                              │
│         └─→ Uses DefaultTaxRate for preview (performance)                   │
│         └─→ TaxGroupId preserved on LineItems ✓                             │
│                                                                              │
│  3. Customer completes checkout                                              │
│     └─→ InvoiceService.CreateOrderFromBasketAsync()                         │
│         └─→ LineItemFactory.CreateForOrder()                                │
│             └─→ TaxGroupId preserved ✓                                      │
│         └─→ Creates TaxableLineItem with TaxGroupId ✓                       │
│         └─→ Calls activeProvider.CalculateOrderTaxAsync()                   │
│             └─→ Provider looks up mapping internally                        │
│             └─→ Provider uses correct tax code or falls back to default ✓  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Single Source of Truth

| Concern | Owner | Location |
|---------|-------|----------|
| TaxGroupId capture | `LineItemFactory` | At product add time |
| TaxGroupId preservation | `LineItemFactory` | At order creation |
| TaxGroupId → TaxCode mapping | Provider config | Admin UI (one-time setup) |
| Tax code resolution | `TaxProviderBase.GetTaxCodeForTaxGroup()` | At calculation time |
| Fallback behavior | Provider | Uses `DefaultTaxCode` constant |

### What Checkout Code Sees

**Before this fix:** Checkout works, but Avalara receives wrong codes.

**After this fix:** Checkout works identically, but Avalara receives correct codes.

```csharp
// CheckoutService - NO CHANGES NEEDED
await checkoutService.AddToBasketAsync(basket, productId, quantity, ct);
await checkoutService.CalculateBasketAsync(params, ct);

// InvoiceService - NO CHANGES TO CALLER
var result = await invoiceService.CreateOrderFromBasketAsync(basket, session, ct);

// Internally, the fix happens automatically:
// 1. LineItem now has TaxGroupId (captured by factory)
// 2. TaxableLineItem now has TaxGroupId (passed by InvoiceService)
// 3. Provider resolves tax code (via GetTaxCodeForTaxGroup)
```

### Fallback Chain (Graceful Degradation)

```
TaxGroupId present + Mapping exists     → Use mapped code (e.g., "PB100000")
TaxGroupId present + No mapping         → Use DefaultTaxCode (e.g., "P0000000")
TaxGroupId null (legacy order)          → Use DefaultTaxCode
Malformed mapping JSON                  → Use DefaultTaxCode
Provider not configured                 → Return error (existing behavior)
```

**Result:** Tax calculation never fails due to missing mappings. Worst case = default code used.

---

## Architecture Alignment

This implementation follows Merchello architecture principles:

| Principle | How It's Applied |
|-----------|------------------|
| **Services own business logic** | Tax code resolution happens in provider, not controller |
| **Factories for object creation** | `LineItemFactory` captures TaxGroupId consistently |
| **Single source of truth** | Mapping stored once in provider config, looked up at calculation time |
| **Provider-agnostic design** | TaxGroups remain generic; each provider maps to its own codes |
| **Extensible** | Other providers (TaxJar, etc.) can use same `TaxGroupMapping` field type |
| **Graceful degradation** | Null/missing mappings fall back to default codes |

---

## Future Considerations

### Not In Scope (Future Enhancements)

1. **Per-region shipping tax codes** - Currently one shipping code per provider. Could extend to region-specific mappings.
2. **Tax code validation** - Could validate codes against provider API during configuration.
3. **Bulk import/export** - CSV import of tax code mappings for large catalogs.
4. **Tax code search** - Embedded search for Avalara tax codes in the UI.
