# Merchello Architecture Audit

**Date:** 2026-01-28
**Scope:** `src/Merchello.Core/**`, `src/Merchello/Controllers/**`, `src/Merchello/Models/**`, `src/Merchello.Tests/**`, `src/Merchello.Site/**`
**Excluded:** `wwwroot/App_Plugins/**`, `Migrations/**`, `*.Designer.cs`, `bin/`, `obj/`, planned/unimplemented features

---

## Summary

- **Priority 1 (Bug Risk):** 3 findings
- **Priority 2 (Consistency):** 4 findings
- **Priority 3 (Maintenance):** 3 findings
- **Total:** 10 findings

**Overall assessment:** The codebase demonstrates excellent architectural discipline. The factory pattern is strictly enforced (zero direct entity instantiation), controllers are thin (no DbContext access), CrudResult is used consistently for failable operations, async/await with CancellationToken is applied throughout, and currency/tax handling is properly centralized with correct rounding. No TODOs, HACKs, async void, or NotImplementedException exist in production code.

---

## Priority 1 — Bug Risk / Data Integrity

### 1.1 Tax Calculation in MerchelloCheckoutController

- **Priority:** 1
- **Category:** 1.2 Calculation Duplication (Single Source of Truth)
- **Confidence:** Medium
- **Location:** `src/Merchello/Controllers/MerchelloCheckoutController.cs:217-225`
- **Impact:** Maintenance risk — duplicated tax logic could diverge from TaxCalculationService
- **Description:**
  The checkout confirmation page calculates a tax-inclusive subtotal directly in the controller:
  ```csharp
  var rawTaxInclusiveSubTotal = productItems.Sum(li =>
  {
      var amount = li.DisplayLineTotal;
      if (displayContext.DisplayPricesIncTax && li.IsTaxable && li.TaxRate > 0)
      {
          amount *= 1 + (li.TaxRate / 100m);
      }
      return currencyService.Round(amount, currency);
  });
  ```
  Per architecture rules, all tax calculations should be centralized in `TaxCalculationService` or use the existing `DisplayCurrencyExtensions`. This calculation applies `amount *= 1 + (taxRate / 100m)` which duplicates the tax-inclusive display formula.
- **Suggested fix:** Extract this into `DisplayCurrencyExtensions` or call an existing method from `TaxCalculationService` that computes tax-inclusive display subtotals. The controller should call a single method rather than inline the tax formula.

### 1.2 Refundable Amount Calculation in PaymentsApiController

- **Priority:** 1
- **Category:** 1.2 Calculation Duplication (Single Source of Truth)
- **Confidence:** Medium
- **Location:** `src/Merchello/Controllers/PaymentsApiController.cs:274-275`
- **Impact:** Bug risk — refundable amount logic duplicated between controller (line 274) and DTO mapping (line 348)
- **Description:**
  The controller calculates the refundable amount inline in two places:
  ```csharp
  // Line 274 (refund endpoint):
  var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
  amount = payment.Amount - existingRefunds;

  // Line 348 (DTO mapping):
  var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
  var refundableAmount = payment.PaymentType == PaymentType.Payment
      ? payment.Amount - existingRefunds
      : 0;
  ```
  This refundable amount calculation should be a single method on `PaymentService` or a computed property, ensuring the formula is defined once.
- **Suggested fix:** Add a `GetRefundableAmount()` method to `IPaymentService` or a helper on the `Payment` model. Both the refund endpoint and DTO mapping should call this single source.

### 1.3 Controller-Level Display Aggregations in OrdersApiController

- **Priority:** 1
- **Category:** 1.2 Calculation Duplication (Single Source of Truth)
- **Confidence:** Low
- **Location:** `src/Merchello/Controllers/OrdersApiController.cs:520-523, 580-581, 589`
- **Impact:** Maintenance burden — aggregation logic spread across controller mapping methods
- **Description:**
  The controller performs LINQ aggregations for DTO population:
  ```csharp
  // Line 520-523: Item count
  var itemCount = orders.SelectMany(o => o.LineItems ?? [])
      .Where(li => li.LineItemType != LineItemType.Discount)
      .Sum(li => li.Quantity);

  // Line 580-581: Shipping cost
  var shippingCost = orders.Sum(o => o.ShippingCost);
  var shippingCostInStoreCurrency = orders.Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost);

  // Line 589: Discount total
  var discountTotal = discountLineItems.Sum(li => Math.Abs(li.Amount));
  ```
  These are display-only aggregations for DTO mapping (not business calculations), so the violation is borderline. However, the same `itemCount` pattern appears at lines 520 and 675, which is duplication within the same controller.
- **Suggested fix:** Consider extracting these into a private helper method within the controller, or adding computed properties on the Invoice/Order model (e.g., `invoice.GetItemCount()`). This is low priority since the aggregations are simple and display-only.

---

## Priority 2 — Correctness / Consistency

### 2.1 RORO Violation: IShippingQuoteService.GetQuotesForWarehouseAsync

- **Priority:** 2
- **Category:** 2.1 Service Pattern Violations
- **Confidence:** High
- **Location:** `src/Merchello.Core/Shipping/Services/Interfaces/IShippingQuoteService.cs:31-39`
- **Impact:** Maintainability — 8 parameters make the method signature hard to read and extend
- **Description:**
  The method accepts 7 individual parameters plus CancellationToken:
  ```csharp
  Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
      Guid warehouseId,
      Address warehouseAddress,
      IReadOnlyCollection<ShipmentPackage> packages,
      string destinationCountry,
      string? destinationState,
      string? destinationPostal,
      string currency,
      CancellationToken cancellationToken = default);
  ```
  Per the architecture, methods with 3+ parameters should use RORO parameter objects.
- **Suggested fix:** Create `GetWarehouseQuotesParameters`:
  ```csharp
  public record GetWarehouseQuotesParameters(
      Guid WarehouseId,
      Address WarehouseAddress,
      IReadOnlyCollection<ShipmentPackage> Packages,
      string DestinationCountry,
      string? DestinationState,
      string? DestinationPostal,
      string Currency);
  ```
  Place in `src/Merchello.Core/Shipping/Services/Parameters/`.

### 2.2 Controller DTOs Not in Merchello.Core

- **Priority:** 2
- **Category:** 3.1 File Organization Violations
- **Confidence:** Medium
- **Location:** `src/Merchello/Controllers/Dtos/` (7 files)
- **Impact:** Consistency — DTOs should live in `Merchello.Core/{Feature}/Dtos/` per convention
- **Description:**
  Seven DTO files are defined in the web project's controller directory instead of in `Merchello.Core`:
  - `BatchMarkAsPaidDto.cs`
  - `BatchMarkAsPaidResultDto.cs`
  - `CreatePaymentLinkDto.cs`
  - `PaymentLinkInfoDto.cs`
  - `PaymentLinkProviderDto.cs`
  - `OutstandingOrdersPageDto.cs`
  - `RegenerateRecoveryLinkResultDto.cs`

  Per the architecture, DTOs belong in feature-specific `Dtos/` folders within `Merchello.Core`.
- **Suggested fix:** Move these DTOs to their appropriate feature folders:
  - `BatchMarkAsPaid*Dto` → `Merchello.Core/Accounting/Dtos/`
  - `*PaymentLink*Dto` → `Merchello.Core/Payments/Dtos/`
  - `OutstandingOrdersPageDto` → `Merchello.Core/Accounting/Dtos/`
  - `RegenerateRecoveryLinkResultDto` → `Merchello.Core/Checkout/Dtos/`

### 2.3 Architecture-Diagrams.md Section 8.3 Significantly Incomplete

- **Priority:** 2
- **Category:** 2.3 Notification System Completeness
- **Confidence:** High
- **Location:** `docs/Architecture-Diagrams.md` lines 1192-1246
- **Impact:** Documentation debt — new developers may not discover notification hooks for entire domains
- **Description:**
  Section 8.3 lists notification events by domain but is missing approximately 50+ events across 10+ domains that ARE properly implemented and published in code:

  | Missing Domain | Approximate Count | Example Events |
  |---------------|-------------------|----------------|
  | Checkout extensions | 6+ | AddressesChanging/Changed, ShippingSelectionChanging/Changed, StockValidationFailed |
  | Fulfilment | 5 | FulfilmentSubmitting/Submitted, SubmissionFailed, InventoryUpdated, ProductSynced |
  | Protocols/UCP | 8+ | AgentAuthenticating/Authenticated, ProtocolSession lifecycle, ProtocolWebhook |
  | Exchange Rates | 2 | ExchangeRatesRefreshed, ExchangeRateFetchFailed |
  | ShippingTaxOverrides | 6 | Full CRUD Creating/Created/Saving/Saved/Deleting/Deleted |
  | CustomerSegments | 6 | Full CRUD |
  | Suppliers | 6 | Full CRUD |
  | ShippingOptions | 6 | Full CRUD |
  | Warehouses | 6 | Full CRUD |
  | TaxGroups | 6 | Full CRUD |

  All of these notifications are properly implemented with correct Before/After patterns and handler priorities. The gap is documentation only.
- **Suggested fix:** Update Section 8.3 to include all domains. Group under existing categories and add new subsections for Fulfilment, Protocols, and Exchange Rates.

### 2.4 Minor RORO Violations in Tax Services

- **Priority:** 2
- **Category:** 2.1 Service Pattern Violations
- **Confidence:** Low
- **Location:** `src/Merchello.Core/Accounting/Services/Interfaces/ITaxService.cs`, `src/Merchello.Core/Tax/Services/Interfaces/ITaxCalculationService.cs`
- **Impact:** Minor — these are simple calculation/admin methods where parameter objects would add boilerplate
- **Description:**
  Several methods exceed 3 parameters without using parameter objects:
  - `ITaxService.CreateTaxGroupRate(taxGroupId, countryCode, stateOrProvinceCode, taxPercentage, ct)` — 5 params
  - `ITaxCalculationService.CalculateTaxableAmount(lineTotal, lineItemDiscount, orderDiscountTotal, totalTaxableAmount, currencyCode)` — 5 params
  - `ITaxCalculationService.CalculateProportionalShippingTax(shippingAmount, lineItemTax, taxableSubtotal, currencyCode)` — 4 params
  - `ITaxCalculationService.PreviewTax(price, quantity, taxRate, currencyCode)` — 4 params

  These are pure synchronous calculation methods (no `Task<>`) or simple admin CRUD operations where all parameters are tightly related primitive values. Creating parameter objects would add unnecessary boilerplate.
- **Suggested fix:** No action needed. These are acceptable trade-offs documented here for completeness. The RORO guideline applies most strongly to async service methods with complex or extensible parameter sets.

---

## Priority 3 — Maintenance / Cleanliness

### 3.1 Missing Test Coverage for 8 Services

- **Priority:** 3
- **Category:** 3.5 Testing Gaps
- **Confidence:** High
- **Location:** `src/Merchello.Tests/`
- **Impact:** Maintenance burden — untested services are harder to refactor safely
- **Description:**
  The following services have no corresponding test files:

  | Service | Location | Risk Level |
  |---------|----------|------------|
  | `DigitalProductService` | `DigitalProducts/Services/` | High — HMAC, downloads, idempotency |
  | `CheckoutDiscountService` | `Checkout/Services/` | High — checkout flow |
  | `SupplierService` | `Suppliers/Services/` | Low — simple CRUD |
  | `ProductCollectionService` | `Products/Services/` | Medium |
  | `ProductFilterService` | `Products/Services/` | Medium |
  | `EmailConfigurationService` | `Email/Services/` | Low — config CRUD |
  | `CountryCurrencyMappingService` | `Storefront/Services/` | Low — static mapping |
  | `StorefrontContextService` | `Storefront/Services/` | Medium — cookie/context management |

  All critical path services (CheckoutService, InvoiceService, PaymentService, DiscountEngine, InventoryService, TaxCalculationService, ShippingService) have comprehensive tests.
- **Suggested fix:** Prioritize test creation for `DigitalProductService` (security-critical) and `CheckoutDiscountService` (checkout flow). The remaining services are lower priority.

### 3.2 Architecture Documentation Gaps

- **Priority:** 3
- **Category:** 3.4 Incomplete Implementations
- **Confidence:** High
- **Location:** `docs/Architecture-Diagrams.md`
- **Impact:** Documentation debt
- **Description:**
  Beyond the notification gaps documented in finding 2.3, the Architecture-Diagrams.md is otherwise well-maintained. Cross-reference verification found:
  - All 22 documented factories exist with correct methods
  - All services in Sections 2.1-2.12 exist with documented methods
  - All API endpoints in Section 13 exist in controllers
  - All handler priorities match documentation exactly
  - `IProductService.PreviewAddonPriceAsync()` is confirmed at line 134 of the interface (not missing as initially suspected)
- **Suggested fix:** Update Section 8.3 notifications as described in finding 2.3. No other documentation updates required.

### 3.3 Empty Catch Blocks

- **Priority:** 3
- **Category:** 2.5 Error Handling Consistency
- **Confidence:** Low
- **Location:** Multiple files (3 instances)
- **Impact:** Minimal — all are justified edge-case handling
- **Description:**
  Three empty or minimal catch blocks exist in production code:

  1. `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs:673`
     ```csharp
     catch (System.Text.Json.JsonException) { /* fall through */ }
     ```
     Context: JSON parsing during shipping service code resolution. Fallback to alternative resolution.

  2. `src/Merchello.Core/Shared/Services/CurrencyService.cs:174`
     ```csharp
     catch { return null; }
     ```
     Context: `RegionInfo` constructor throws for some culture names. Null return triggers fallback.

  3. `src/Merchello/Controllers/DownloadsController.cs:86-88`
     ```csharp
     catch { filePath = umbracoFile; }
     ```
     Context: Parsing JSON-formatted `umbracoFile` string. Falls back to treating as direct path.

  All three are intentional with documented reasoning. They handle known edge cases where the exception is expected and a safe fallback exists.
- **Suggested fix:** No action needed. All are acceptable patterns. Optionally add `// Expected: <reason>` comments to the CurrencyService and DownloadsController catch blocks for clarity.

---

## Cross-Reference Verification

### Services (Sections 2.1-2.12 vs Code)

| Service | Section | Status | Notes |
|---------|---------|--------|-------|
| IProductService | 2.1 | PASS | All methods including `PreviewAddonPriceAsync` verified |
| IProductCollectionService | 2.1 | PASS | |
| IProductTypeService | 2.1 | PASS | |
| IProductFilterService | 2.1 | PASS | |
| IInventoryService | 2.2 | PASS | All 8 documented methods present |
| IWarehouseService | 2.2 | PASS | |
| ICheckoutService | 2.3 | PASS | |
| ICheckoutDiscountService | 2.3 | PASS | All 6 documented methods present |
| IAbandonedCheckoutService | 2.3 | PASS | All 6 documented methods present |
| IInvoiceService | 2.4 | PASS | |
| IInvoiceEditService | 2.4 | PASS | |
| ILineItemService | 2.4 | PASS | |
| IShippingService | 2.5 | PASS | All 7 documented methods present |
| IShippingQuoteService | 2.5 | PASS | |
| IWarehouseProviderConfigService | 2.5 | PASS | |
| IShipmentService | 2.5 | PASS | All 6 documented methods present |
| IPaymentService | 2.6 | PASS | All 6 documented methods present |
| ITaxService | 2.7 | PASS | |
| ICustomerService | 2.8 | PASS | |
| ICustomerSegmentService | 2.8 | PASS | |
| IDiscountService | 2.9 | PASS | |
| IReportingService | 2.10 | PASS | All 5 documented methods present |
| IStatementService | 2.11 | PASS | All 4 documented methods present |
| IDigitalProductService | 2.12 | PASS | All 7 documented methods present |

### Factories (Section 10 vs Code)

All 22 documented factories exist with their documented methods. No undocumented factories found.

### API Endpoints (Section 13 vs Controllers)

All documented endpoints in Sections 13.1-13.5 exist in controllers. No undocumented public endpoints found.

### Handler Priorities (Section 8.2 vs Code)

| Priority | Handler | Documented | Actual | Status |
|----------|---------|-----------|--------|--------|
| 1000 | Default | Yes | Yes | PASS |
| 1500 | DigitalProductPaymentHandler | Yes | Yes | PASS |
| 1800 | FulfilmentOrderSubmissionHandler | Yes | Yes | PASS |
| 1800 | FulfilmentCancellationHandler | Yes | Yes | PASS |
| 2000 | InvoiceTimelineHandler | Yes | Yes | PASS |
| 2100 | EmailNotificationHandler | Yes | Yes | PASS |
| 2200 | WebhookNotificationHandler | Yes | Yes | PASS |
| 3000 | UcpOrderWebhookHandler | Yes | Yes | PASS |

### Quick-Find Pattern Results

| Pattern | Expected | Found | Status |
|---------|----------|-------|--------|
| `new Invoice{` in production code | 0 | 0 | PASS |
| `new Order{` in production code | 0 | 0 | PASS |
| `new Payment{` in production code | 0 | 0 | PASS |
| `new LineItem{` in production code | 0 | 0 | PASS |
| `_dbContext` in controllers | 0 | 0 | PASS |
| `MerchelloDbContext` in controllers | 0 | 0 | PASS |
| `async void` | 0 | 0 | PASS |
| `.Result` (sync-over-async in services) | 0 | 0 (only Umbraco API points) | PASS |
| `.Wait()` | 0 | 0 | PASS |
| `NotImplementedException` in production | 0 | 0 (only test mock) | PASS |
| `// TODO` | 0 | 0 | PASS |
| `// HACK` | 0 | 0 | PASS |
| `// FIXME` | 0 | 0 | PASS |
| `[Obsolete]` | 0 | 0 | PASS |

### Security Verification

| Check | Status | Evidence |
|-------|--------|----------|
| HMAC constant-time comparison | PASS | `CryptographicOperations.FixedTimeEquals()` in DigitalProductService |
| Download rate limiting | PASS | `[EnableRateLimiting("downloads")]` on DownloadsController |
| Webhook rate limiting | PASS | 60 req/min per provider+IP in WebhookSecurityService |
| Webhook signature validation | PASS | PaymentWebhookController validates before processing |
| Webhook idempotency | PASS | `TryMarkAsProcessingAsync()` + `Payment.WebhookEventId` |
| Authorization on admin endpoints | PASS | `MerchelloApiControllerBase` enforces `[Authorize]` |
| Path traversal protection | PASS | DownloadsController validates path within wwwroot |
| Digital product guest checkout blocked | PASS | DigitalProductService checks `CustomerId != Guid.Empty` |
| Download link idempotency | PASS | Checks existing links before creating |
| Password reset email enumeration | PASS | Always returns success |
| Stock concurrency protection | PASS | RowVersion + retry with exponential backoff (3 attempts) |
| Stock formula | PASS | `(Stock - ReservedStock >= qty)` consistently applied |
| Currency rounding | PASS | `currencyService.Round()` after every arithmetic operation |
| TaxGroupId lifecycle preservation | PASS | Preserved ProductRoot → Basket → Order in LineItemFactory |

### Code Organization Verification

| Check | Status |
|-------|--------|
| One type per file | PASS |
| DTO naming conventions | PASS |
| Parameter objects in `Services/Parameters/` | PASS |
| Interfaces in `Services/Interfaces/` | PASS |
| All tests use Shouldly (no xUnit Assert) | PASS |
| No `[Obsolete]` or backwards-compat shims | PASS |
