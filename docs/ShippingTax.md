# Shipping Tax Implementation Plan

## Problem

The ManualTaxProvider ignores `request.ShippingAmount` entirely - shipping is never taxed. The AvalaraTaxProvider handles this correctly by adding shipping as a taxable line item with tax code `FR020100`.

## Research Findings

### How Shopify Handles It
- **Global Toggle**: Settings > Taxes > "Charge tax on shipping rates" (on/off)
- **Jurisdiction Database**: Shopify maintains rules for each state/country
- **Proportional Calculation**: When enabled, uses weighted average of line item tax rates
- **State Overrides**: Per-region overrides for Always/Never/Default

### EU/UK Requirements
- Proportional shipping tax is **legally required** in EU/UK
- Shipping tax = weighted average of line item tax rates

## Approach

Full implementation with:
1. **Global Settings**: `IsShippingTaxable` + `ShippingTaxGroupId` (optional default)
2. **Regional Overrides**: Per country/state `ShippingTaxGroupId`
3. **Fallback**: Proportional/weighted average when no tax group specified
4. **Seed Data**: Pre-populate US state shipping tax rules on install

### Tax Address: Shipping (Destination-Based)
- For physical goods, tax is based on **shipping address** (where customer takes possession)
- For interstate/cross-border sales, ALL jurisdictions use destination-based
- Billing address only used as fallback for digital goods (not applicable here)

### Calculation Priority
```
1. Regional override for destination (country/state) → use that TaxGroup's rate
2. Else if global ShippingTaxGroupId set → use that TaxGroup's rate
3. Else if IsShippingTaxable = true → use proportional rate (weighted average)
4. Else → no shipping tax
```

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Accounting/Models/ShippingTaxOverride.cs` | Regional shipping tax override entity |
| `Accounting/Dtos/ShippingTaxOverrideDto.cs` | API DTO |
| `Accounting/Dtos/CreateShippingTaxOverrideDto.cs` | Create DTO |
| `Accounting/Dtos/UpdateShippingTaxOverrideDto.cs` | Update DTO |
| `Accounting/Mapping/ShippingTaxOverrideDbMapping.cs` | EF mapping |
| `Tax/Handlers/EnsureShippingTaxOverridesHandler.cs` | Seed US shipping tax overrides |
| `Controllers/ShippingTaxController.cs` | API endpoints for CRUD |
| `Backoffice/src/tax/components/shipping-tax-overrides.element.ts` | List view UI |
| `Backoffice/src/tax/modals/shipping-tax-override-modal.element.ts` | Create/edit modal |

### Modify Files
| File | Changes |
|------|---------|
| `Tax/Providers/BuiltIn/ManualTaxProvider.cs` | Add config fields + shipping tax calculation |
| `Accounting/Services/TaxService.cs` | Add shipping override CRUD + lookup |
| `Accounting/Services/Interfaces/ITaxService.cs` | Add shipping override methods |
| `Data/Context/MerchelloDbContext.cs` | Add `ShippingTaxOverrides` DbSet |
| `Composers/MerchelloComposer.cs` | Register `EnsureShippingTaxOverridesHandler` |
| `Tests/.../ManualTaxProviderTests.cs` | Add shipping tax tests |

## Implementation Steps

### Step 1: Create ShippingTaxOverride Entity

```csharp
// Accounting/Models/ShippingTaxOverride.cs
public class ShippingTaxOverride
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>ISO country code (e.g., "US", "GB")</summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>Optional state/province code (e.g., "CA" for California)</summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>Tax group to use for shipping in this region. Null = never tax shipping.</summary>
    public Guid? ShippingTaxGroupId { get; set; }

    public TaxGroup? ShippingTaxGroup { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
```

### Step 2: Add Configuration Fields to ManualTaxProvider

The ManualTaxProvider currently has no configuration. Add shipping tax settings as provider configuration:

```csharp
public override ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>(
    [
        new() {
            Key = "isShippingTaxable",
            Label = "Tax Shipping",
            FieldType = ConfigurationFieldType.Checkbox,
            DefaultValue = "false",
            Description = "Enable tax on shipping costs"
        },
        new() {
            Key = "shippingTaxGroupId",
            Label = "Shipping Tax Group",
            FieldType = ConfigurationFieldType.Select, // UI shows tax groups dropdown
            Description = "Tax group for shipping. Leave empty to use proportional rate (weighted average of line items)."
        }
    ]);
}
```

This keeps configuration within the provider system (no new store settings needed).

### Step 3: Add TaxService Methods

```csharp
// ITaxService.cs additions
#region Shipping Tax Overrides

Task<ShippingTaxOverride?> GetShippingTaxOverrideAsync(
    string countryCode, string? stateCode, CancellationToken ct = default);
Task<ShippingTaxOverride?> GetShippingTaxOverrideByIdAsync(Guid id, CancellationToken ct = default);
Task<IEnumerable<ShippingTaxOverride>> GetAllShippingTaxOverridesAsync(CancellationToken ct = default);
Task<CrudResult<ShippingTaxOverride>> CreateShippingTaxOverrideAsync(
    CreateShippingTaxOverrideDto dto, CancellationToken ct = default);
Task<CrudResult<ShippingTaxOverride>> UpdateShippingTaxOverrideAsync(
    Guid id, UpdateShippingTaxOverrideDto dto, CancellationToken ct = default);
Task<CrudResult> DeleteShippingTaxOverrideAsync(Guid id, CancellationToken ct = default);

#endregion
```

### Step 3b: Add Notifications

**New Files:** `Notifications/ShippingTaxOverride*Notification.cs`

Following the existing notification pattern (see Architecture-Diagrams.md):

```csharp
// Notifications/ShippingTaxOverrideCreatingNotification.cs
public class ShippingTaxOverrideCreatingNotification(ShippingTaxOverride entity)
    : CancelableEntityNotification<ShippingTaxOverride>(entity);

public class ShippingTaxOverrideCreatedNotification(ShippingTaxOverride entity)
    : EntityNotification<ShippingTaxOverride>(entity);

// Notifications/ShippingTaxOverrideSavingNotification.cs
public class ShippingTaxOverrideSavingNotification(ShippingTaxOverride entity)
    : CancelableEntityNotification<ShippingTaxOverride>(entity);

public class ShippingTaxOverrideSavedNotification(ShippingTaxOverride entity)
    : EntityNotification<ShippingTaxOverride>(entity);

// Notifications/ShippingTaxOverrideDeletingNotification.cs
public class ShippingTaxOverrideDeletingNotification(ShippingTaxOverride entity)
    : CancelableEntityNotification<ShippingTaxOverride>(entity);

public class ShippingTaxOverrideDeletedNotification(ShippingTaxOverride entity)
    : EntityNotification<ShippingTaxOverride>(entity);
```

**TaxService Implementation Pattern:**
```csharp
public async Task<CrudResult<ShippingTaxOverride>> CreateShippingTaxOverrideAsync(
    CreateShippingTaxOverrideDto dto, CancellationToken ct = default)
{
    var result = new CrudResult<ShippingTaxOverride>();

    var entity = new ShippingTaxOverride
    {
        CountryCode = dto.CountryCode,
        StateOrProvinceCode = dto.StateOrProvinceCode,
        ShippingTaxGroupId = dto.ShippingTaxGroupId
    };

    // Publish cancelable notification
    var creatingNotification = new ShippingTaxOverrideCreatingNotification(entity);
    if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
    {
        result.AddErrorMessage("Creation was cancelled");
        return result;
    }

    using var scope = efCoreScopeProvider.CreateScope();
    await scope.ExecuteWithContextAsync<Task>(async db =>
    {
        db.ShippingTaxOverrides.Add(entity);
        await db.SaveChangesAsyncLogged(logger, result, ct);
        result.ResultObject = entity;
    });
    scope.Complete();

    if (result.Successful)
    {
        await notificationPublisher.PublishAsync(
            new ShippingTaxOverrideCreatedNotification(entity), ct);
    }

    return result;
}
```

### Step 4: Update ManualTaxProvider

```csharp
public class ManualTaxProvider(
    ITaxService taxService,
    ICurrencyService currencyService) : TaxProviderBase
{
    public override async Task<TaxCalculationResult> CalculateTaxAsync(
        TaxCalculationRequest request, CancellationToken cancellationToken = default)
    {
        // ... existing line item tax calculation ...

        // Calculate shipping tax
        decimal shippingTax = 0;
        if (request.ShippingAmount > 0)
        {
            shippingTax = await CalculateShippingTaxAsync(
                request, lineResults, cancellationToken);
        }

        return TaxCalculationResult.Successful(
            totalTax: lineResults.Sum(r => r.TaxAmount) + shippingTax,
            lineResults: lineResults,
            shippingTax: shippingTax
        );
    }

    private async Task<decimal> CalculateShippingTaxAsync(
        TaxCalculationRequest request,
        List<LineTaxResult> lineResults,
        CancellationToken ct)
    {
        var countryCode = request.ShippingAddress.CountryCode;
        var stateCode = request.ShippingAddress.CountyState?.RegionCode;

        // 1. Check for regional override
        var shippingOverride = await taxService.GetShippingTaxOverrideAsync(countryCode, stateCode, ct);
        if (shippingOverride != null)
        {
            if (shippingOverride.ShippingTaxGroupId == null)
                return 0; // Explicitly disabled for this region

            var rate = await taxService.GetApplicableRateAsync(
                shippingOverride.ShippingTaxGroupId.Value, countryCode, stateCode, ct);
            return request.ShippingAmount.PercentageAmount(rate, request.CurrencyCode, currencyService);
        }

        // 2. Check provider configuration
        var isShippingTaxable = GetConfigBool("isShippingTaxable", false);
        if (!isShippingTaxable)
            return 0;

        // 3. Use configured tax group or proportional
        var shippingTaxGroupIdStr = GetConfigValue("shippingTaxGroupId");
        if (Guid.TryParse(shippingTaxGroupIdStr, out var shippingTaxGroupId))
        {
            var rate = await taxService.GetApplicableRateAsync(
                shippingTaxGroupId, countryCode, stateCode, ct);
            return request.ShippingAmount.PercentageAmount(rate, request.CurrencyCode, currencyService);
        }

        // 4. Proportional calculation (EU/UK compliant)
        return CalculateProportionalShippingTax(request, lineResults);
    }

    private decimal CalculateProportionalShippingTax(
        TaxCalculationRequest request, List<LineTaxResult> lineResults)
    {
        var taxableAmount = request.LineItems
            .Where(li => li.IsTaxable && li.TaxGroupId.HasValue)
            .Sum(li => li.Amount * li.Quantity);

        var totalTax = lineResults.Sum(r => r.TaxAmount);

        if (taxableAmount <= 0 || totalTax <= 0)
            return 0;

        var effectiveRate = totalTax / taxableAmount;
        return (request.ShippingAmount * effectiveRate)
            .Round(request.CurrencyCode, currencyService);
    }
}
```

### Step 5: Add Tests

**Test cases:**
1. `CalculateTaxAsync_WithShippingAmount_AndGlobalSetting_CalculatesProportionalTax`
2. `CalculateTaxAsync_WithShippingAmount_AndShippingTaxGroup_UsesGroupRate`
3. `CalculateTaxAsync_WithRegionalOverride_UsesOverrideRate`
4. `CalculateTaxAsync_WithRegionalOverride_NullTaxGroup_NoShippingTax`
5. `CalculateTaxAsync_WithMixedRates_CalculatesCorrectProportionalRate`
6. `CalculateTaxAsync_ShippingDisabled_NoShippingTax`
7. `CalculateTaxAsync_TaxExemptOrder_NoShippingTax`
8. `CalculateTaxAsync_NoTaxableItems_NoShippingTax`

### Step 6: Database Migration

Run: `scripts/add-migration.ps1 AddShippingTaxOverrides`

### Step 7: Create Shipping Tax Override Handler

Create a new handler following the existing pattern (like `EnsureBuiltInPaymentProvidersHandler`):

**New File:** `Tax/Handlers/EnsureShippingTaxOverridesHandler.cs`

```csharp
/// <summary>
/// Ensures shipping tax overrides for US states are seeded on application startup.
/// </summary>
public class EnsureShippingTaxOverridesHandler(
    IServiceProvider serviceProvider,
    ILogger<EnsureShippingTaxOverridesHandler> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    // US states where shipping is NOT taxable (consensus from multiple 2025 sources)
    // Sources: Zamp, CereTax (2025)
    private static readonly string[] UsShippingExemptStates =
    [
        "AL", "AZ", "ID", "IA", "ME", "MA", "NV", "OK", "UT", "VA", "WY"
    ];

    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken ct)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var taxService = scope.ServiceProvider.GetRequiredService<ITaxService>();

            var existing = await taxService.GetAllShippingTaxOverridesAsync(ct);
            if (existing.Any())
            {
                logger.LogDebug("Shipping tax overrides already exist");
                return;
            }

            foreach (var state in UsShippingExemptStates)
            {
                await taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
                {
                    CountryCode = "US",
                    StateOrProvinceCode = state,
                    ShippingTaxGroupId = null  // No shipping tax
                }, ct);
            }

            logger.LogInformation("Seeded {Count} US shipping tax overrides", UsShippingExemptStates.Length);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed shipping tax overrides");
        }
    }
}
```

**Register in `MerchelloComposer.cs`:**
```csharp
// Add after existing handlers
builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, EnsureShippingTaxOverridesHandler>();
```

### Step 8: Backoffice UI

#### API Controller
**New File:** `Controllers/ShippingTaxController.cs`

```csharp
[ApiController]
[Route("api/merchello/shipping-tax-overrides")]
public class ShippingTaxController(ITaxService taxService) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<ShippingTaxOverrideDto>> GetAll(CancellationToken ct)
        => await taxService.GetAllShippingTaxOverridesAsync(ct);

    [HttpGet("{id:guid}")]
    public async Task<ShippingTaxOverrideDto?> Get(Guid id, CancellationToken ct)
        => await taxService.GetShippingTaxOverrideByIdAsync(id, ct);

    [HttpPost]
    public async Task<ShippingTaxOverrideDto> Create(CreateShippingTaxOverrideDto dto, CancellationToken ct)
        => await taxService.CreateShippingTaxOverrideAsync(dto, ct);

    [HttpPut("{id:guid}")]
    public async Task<ShippingTaxOverrideDto> Update(Guid id, UpdateShippingTaxOverrideDto dto, CancellationToken ct)
        => await taxService.UpdateShippingTaxOverrideAsync(id, dto, ct);

    [HttpDelete("{id:guid}")]
    public async Task Delete(Guid id, CancellationToken ct)
        => await taxService.DeleteShippingTaxOverrideAsync(id, ct);
}
```

#### API Client
**Update:** `Backoffice/src/api/merchello-api.ts`

```typescript
// Shipping Tax Overrides API
getShippingTaxOverrides: () => apiGet<ShippingTaxOverrideDto[]>('shipping-tax-overrides'),
getShippingTaxOverride: (id: string) => apiGet<ShippingTaxOverrideDto>(`shipping-tax-overrides/${id}`),
createShippingTaxOverride: (data: CreateShippingTaxOverrideDto) =>
  apiPost<ShippingTaxOverrideDto>('shipping-tax-overrides', data),
updateShippingTaxOverride: (id: string, data: UpdateShippingTaxOverrideDto) =>
  apiPut<ShippingTaxOverrideDto>(`shipping-tax-overrides/${id}`, data),
deleteShippingTaxOverride: (id: string) => apiDelete(`shipping-tax-overrides/${id}`),
```

#### Frontend Components

**List Component:** `Backoffice/src/tax/components/shipping-tax-overrides.element.ts`
- Table showing: Country, State/Province, Tax Group (or "Never Tax"), Actions
- Add/Edit/Delete buttons

**Modal:** `Backoffice/src/tax/modals/shipping-tax-override-modal.element.ts`
- Country dropdown (required)
- State/Province dropdown (optional, populated based on country)
- Tax Group dropdown with "Never Tax Shipping" option (null value)

**Integration:**
- Add "Shipping Tax Overrides" tab/section to existing Tax configuration UI
- Follow existing patterns for modals and API integration

#### TypeScript Types
**Update:** `Backoffice/src/tax/types/tax.types.ts`

```typescript
export interface ShippingTaxOverrideDto {
  id: string;
  countryCode: string;
  countryName?: string;
  stateOrProvinceCode?: string;
  regionName?: string;
  shippingTaxGroupId?: string;
  shippingTaxGroup?: TaxGroupDto;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateShippingTaxOverrideDto {
  countryCode: string;
  stateOrProvinceCode?: string;
  shippingTaxGroupId?: string;
}

export interface UpdateShippingTaxOverrideDto {
  countryCode: string;
  stateOrProvinceCode?: string;
  shippingTaxGroupId?: string;
}
```

#### Modal Token
**New File:** `Backoffice/src/tax/modals/shipping-tax-override-modal.token.ts`

```typescript
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingTaxOverrideDto } from "../types/tax.types.js";

export interface ShippingTaxOverrideModalData {
  override?: ShippingTaxOverrideDto;
}

export interface ShippingTaxOverrideModalValue {
  isSaved: boolean;
  override?: ShippingTaxOverrideDto;
}

export const MERCHELLO_SHIPPING_TAX_OVERRIDE_MODAL = new UmbModalToken<
  ShippingTaxOverrideModalData,
  ShippingTaxOverrideModalValue
>("Merchello.ShippingTaxOverride.Modal", {
  modal: { type: "sidebar", size: "medium" }
});
```

#### Modal Element
**New File:** `Backoffice/src/tax/modals/shipping-tax-override-modal.element.ts`

Following Umbraco-Backoffice-Dev.md patterns (`UmbModalBaseElement`, country/region dropdowns):

```typescript
import { html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { ShippingTaxOverrideModalData, ShippingTaxOverrideModalValue } from "./shipping-tax-override-modal.token.js";
import type { TaxGroupDto } from "../types/tax.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-shipping-tax-override-modal")
export class MerchelloShippingTaxOverrideModalElement extends UmbModalBaseElement<
  ShippingTaxOverrideModalData,
  ShippingTaxOverrideModalValue
> {
  @state() private _countryCode: string = "";
  @state() private _stateOrProvinceCode: string = "";
  @state() private _shippingTaxGroupId: string = "";
  @state() private _countries: Array<{ code: string; name: string }> = [];
  @state() private _regions: Array<{ code: string; name: string }> = [];
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _isLoadingCountries: boolean = false;
  @state() private _isLoadingRegions: boolean = false;
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  #notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;

  private get _isEditMode(): boolean {
    return !!this.data?.override;
  }

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
      this.#notificationContext = ctx;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadCountries();
    this._loadTaxGroups();

    if (this.data?.override) {
      this._countryCode = this.data.override.countryCode;
      this._stateOrProvinceCode = this.data.override.stateOrProvinceCode || "";
      this._shippingTaxGroupId = this.data.override.shippingTaxGroupId || "";
      if (this._countryCode) {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCountries(): Promise<void> {
    this._isLoadingCountries = true;
    const { data } = await MerchelloApi.getLocalityCountries();
    if (data) {
      this._countries = data.map((c) => ({ code: c.code, name: c.name }));
    }
    this._isLoadingCountries = false;
  }

  private async _loadRegions(countryCode: string): Promise<void> {
    this._isLoadingRegions = true;
    const { data } = await MerchelloApi.getLocalityRegions(countryCode);
    this._regions = data?.map((r) => ({ code: r.code, name: r.name })) ?? [];
    this._isLoadingRegions = false;
  }

  private async _loadTaxGroups(): Promise<void> {
    const { data } = await MerchelloApi.getTaxGroups();
    this._taxGroups = data ?? [];
  }

  private _handleCountryChange(e: Event): void {
    this._countryCode = (e.target as HTMLSelectElement).value;
    this._stateOrProvinceCode = "";
    this._regions = [];
    if (this._countryCode) {
      this._loadRegions(this._countryCode);
    }
  }

  private async _handleSave(): Promise<void> {
    this._errors = {};
    if (!this._countryCode) {
      this._errors.countryCode = "Country is required";
      return;
    }

    this._isSaving = true;
    const dto = {
      countryCode: this._countryCode,
      stateOrProvinceCode: this._stateOrProvinceCode || undefined,
      shippingTaxGroupId: this._shippingTaxGroupId || undefined,
    };

    const { data, error } = this._isEditMode
      ? await MerchelloApi.updateShippingTaxOverride(this.data!.override!.id, dto)
      : await MerchelloApi.createShippingTaxOverride(dto);

    this._isSaving = false;
    if (error) {
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: error.message } });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: this._isEditMode ? "Updated" : "Created" }
    });
    this.modalContext?.submit({ isSaved: true, override: data });
  }

  override render() {
    return html`
      <umb-body-layout headline=${this._isEditMode ? "Edit Override" : "Add Override"}>
        <div class="form-content">
          <umb-property-layout label="Country" mandatory>
            <uui-select
              slot="editor"
              .options=${this._getCountryOptions()}
              @change=${this._handleCountryChange}
              ?disabled=${this._isEditMode}
            ></uui-select>
          </umb-property-layout>

          ${this._regions.length > 0
            ? html`<umb-property-layout label="State/Province">
                <uui-select
                  slot="editor"
                  .options=${this._getRegionOptions()}
                  @change=${(e: Event) => { this._stateOrProvinceCode = (e.target as HTMLSelectElement).value; }}
                  ?disabled=${this._isEditMode}
                ></uui-select>
              </umb-property-layout>`
            : ""}

          <umb-property-layout label="Tax Group" description="Leave empty to never tax shipping in this region">
            <uui-select
              slot="editor"
              .options=${this._getTaxGroupOptions()}
              @change=${(e: Event) => { this._shippingTaxGroupId = (e.target as HTMLSelectElement).value; }}
            ></uui-select>
          </umb-property-layout>
        </div>

        <div slot="actions">
          <uui-button @click=${() => this.modalContext?.reject()} label="Cancel">Cancel</uui-button>
          <uui-button look="primary" color="positive" @click=${this._handleSave} ?disabled=${this._isSaving}>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._countryCode },
      ...this._countries.map((c) => ({ name: c.name, value: c.code, selected: c.code === this._countryCode })),
    ];
  }

  private _getRegionOptions() {
    return [
      { name: "All regions", value: "", selected: !this._stateOrProvinceCode },
      ...this._regions.map((r) => ({ name: r.name, value: r.code, selected: r.code === this._stateOrProvinceCode })),
    ];
  }

  private _getTaxGroupOptions() {
    return [
      { name: "Never Tax Shipping", value: "", selected: !this._shippingTaxGroupId },
      ...this._taxGroups.map((tg) => ({
        name: `${tg.name} (${tg.taxPercentage}%)`,
        value: tg.id,
        selected: tg.id === this._shippingTaxGroupId,
      })),
    ];
  }
}

export default MerchelloShippingTaxOverrideModalElement;
declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-tax-override-modal": MerchelloShippingTaxOverrideModalElement;
  }
}
```

#### Manifest Registration
**Update:** `Backoffice/src/tax/manifest.ts`

Add to the manifests array:
```typescript
{
  type: "modal",
  alias: "Merchello.ShippingTaxOverride.Modal",
  name: "Merchello Shipping Tax Override Modal",
  js: () => import("./modals/shipping-tax-override-modal.element.js"),
}
```

## US State Shipping Tax Rules

> **Note**: US shipping tax rules are complex and change frequently. The states below represent a consensus from multiple authoritative 2025 sources. Users should verify with their tax advisor and can add/modify overrides via the backoffice UI.

| Category | States | Action |
|----------|--------|--------|
| Shipping NOT taxable (consensus) | AL, AZ, ID, IA, ME, MA, NV, OK, UT, VA, WY | Seed with `ShippingTaxGroupId = null` |
| No sales tax | AK, DE, MT, NH, OR | No override needed |
| All other states | Varies by state | No override (uses global proportional) - users can add overrides via UI |

**Logic:**
- If state has override with `ShippingTaxGroupId = null` → shipping is never taxed
- If state has override with `ShippingTaxGroupId = <guid>` → use that tax group's rate
- If no override → use global settings (proportional or configured tax group)

## Verification

1. Run all ManualTaxProvider tests - existing tests should pass
2. Run new shipping tax tests
3. Manual testing in backoffice:
   - Navigate to Providers > Tax > Manual Tax Rates > Configure
   - Enable "Tax Shipping" checkbox
   - Create order with shipping → verify proportional tax calculated
   - Set "Shipping Tax Group" → verify uses that specific rate
   - Add regional override (US-CA) → verify override takes precedence
   - Add regional override with null TaxGroupId → verify no shipping tax for that region

## Documentation Update

Update `docs/TaxProviders-DevGuide.md` to document:
- ManualTaxProvider now supports shipping tax
- Configuration options (checkbox + optional tax group)
- Regional overrides for shipping tax
- Proportional calculation algorithm

## External Shipping Providers (FedEx, UPS, etc.)

External carriers typically return **transportation charges only** - they do not include sales tax or VAT in their API responses. This is the industry standard for B2B shipping APIs.

Our shipping tax system works correctly with these providers:

1. Carrier returns shipping rate (e.g., $12.50 for FedEx Ground)
2. ManualTaxProvider calculates shipping tax based on destination jurisdiction
3. Tax is added to the order total

**No special configuration needed** - the default behavior (`RatesIncludeTax = false`) is correct for FedEx, UPS, DHL, and most other carriers.

### Tax-Inclusive Providers (Rare)

If you have a shipping provider that returns rates with VAT already included (uncommon for B2B APIs), the provider should set `RatesIncludeTax = true` in its `ShippingProviderMetadata`. This prevents double-taxation by telling the system to skip shipping tax calculation for orders using that provider.

See [ShippingProviders-DevGuide.md](./ShippingProviders-DevGuide.md#tax-handling-for-shipping-rates) for implementation details.

### How It Works Internally

When calculating shipping tax:
1. System checks each order's shipping provider for `RatesIncludeTax` flag
2. If provider has `RatesIncludeTax = true`, that order's shipping cost is excluded from tax calculation
3. Tax is calculated only on shipping from tax-exclusive providers
4. This allows mixed scenarios (e.g., FedEx + a VAT-inclusive local carrier on the same invoice)

## Sources

### Shipping Tax Guides (2025)
- [Zamp Shipping Taxability (2025)](https://zamp.com/resources/shipping-taxability/) - Primary source for US state rules
- [CereTax State-by-State Guide](https://www.ceretax.com/blog/sales-tax-on-shipping-state-by-state-guide) - Secondary verification
- [Shopify Shipping Tax](https://help.shopify.com/en/manual/taxes/shipping-tax) - Proportional calculation reference
- [TaxJar Shipping Tax](https://www.taxjar.com/sales-tax/sales-tax-and-shipping) - Additional context

### Billing vs Shipping Address
- [TaxJar: Billing vs Shipping Address](https://www.taxjar.com/blog/calculations/use-billing-address-shipping-address-calculating-sales-tax)
- [Stripe: Billing or Shipping Address](https://stripe.com/resources/more/should-you-charge-us-sales-tax-based-on-the-billing-or-shipping-address)
- [Avalara: Is Sales Tax Based on Shipping Address](https://www.avalara.com/blog/en/north-america/2023/06/is-sales-tax-based-on-shipping-address.html)

> **Note**: Tax rules change frequently. The 11 seeded US states represent a consensus from multiple 2025 sources. Always verify current rules with your state's Department of Revenue or a tax advisor.

## Post-Sprint: Update Architecture-Diagrams.md

After implementation, update `docs/Architecture-Diagrams.md` with the following:

### 1. Update Tax Section (line ~65)

Add shipping tax override methods to ITaxService:

```markdown
### Tax
- `ITaxService`: `.GetTaxGroups()`, `.GetApplicableRateAsync()`, `.GetShippingTaxOverrideAsync()`, `.CreateShippingTaxOverrideAsync()`, `.UpdateShippingTaxOverrideAsync()`, `.DeleteShippingTaxOverrideAsync()`
```

### 2. Update Events List (after line ~214)

Add to the events list under existing entries:

```markdown
- ShippingTaxOverride: Creating/Created, Saving/Saved, Deleting/Deleted
```

### 3. Update Notification Reference Table (after TaxGroup rows, ~line 301)

Add new rows to the notification table:

```markdown
| **ShippingTaxOverride** | `ShippingTaxOverrideCreatingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideCreatedNotification` | `TaxService` | No |
| | `ShippingTaxOverrideSavingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideSavedNotification` | `TaxService` | No |
| | `ShippingTaxOverrideDeletingNotification` | `TaxService` | Yes |
| | `ShippingTaxOverrideDeletedNotification` | `TaxService` | No |
```

### 4. Update Implementation Status (after line ~234)

Add to the "Working" notifications list:

```markdown
- ShippingTaxOverride: All 6 notifications (`ITaxService`)
```
