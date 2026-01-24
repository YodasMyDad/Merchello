# Frontend Logic Duplication Audit

## Summary

**Overall Assessment: COMPLIANT** - The Merchello frontend demonstrates strong adherence to the "backend = source of truth" principle. Only 7 minor findings were identified, all in the checkout JavaScript payment adapters and components. The TypeScript backoffice codebase (Lit elements, API client, types) has zero violations.

**Violations Found:** 0 High, 4 Medium, 3 Low
**Files Audited:** All `src/Merchello/Client/src/**/*.ts` and `src/Merchello/wwwroot/js/**/*.js`

---

## Methodology

Searched all frontend files for:
- `.toFixed()` usage (should use `formatCurrency`/`formatNumber`)
- Arithmetic on amounts (`* rate`, `/ rate`, `* 100`, `Math.round` on money)
- Hardcoded thresholds, rates, or business rules
- Enum-to-label mappings (should use DTO `statusLabel`/`statusCssClass`)
- Tax, discount, shipping, or stock calculations
- Currency conversion or rounding logic

---

## Findings

### Finding 1: `.toFixed()` for Apple Pay Amount

- **File:** `src/Merchello/wwwroot/js/checkout/adapters/braintree-express-adapter.js:280`
- **The duplicated logic:** Uses `.toFixed(config.decimalPlaces ?? 2)` to format the payment amount string for the Apple Pay SDK. The `?? 2` fallback hardcodes a decimal precision assumption that ignores per-currency rules (JPY=0, BHD=3).
- **Which backend service should handle this:** `ICurrencyService.Round()` determines decimal places per currency. Backend should provide a pre-formatted `amountString` field in the express config DTO, or always populate `decimalPlaces` so the fallback is never reached.
- **Risk level:** Medium - Could show incorrect amount precision for JPY (showing "1000.00" instead of "1000") or BHD orders.
- **Suggested fix:** Ensure `ExpressCheckoutConfigDto` always includes `decimalPlaces` from backend `ICurrencyService`, removing the need for the `?? 2` fallback.

---

### Finding 2: `.toFixed()` for Google Pay Amount

- **File:** `src/Merchello/wwwroot/js/checkout/adapters/braintree-express-adapter.js:401`
- **The duplicated logic:** Same pattern as Finding 1 - `.toFixed(config.decimalPlaces ?? 2)` for the Google Pay `totalPrice` field.
- **Which backend service should handle this:** `ICurrencyService.Round()` - backend should always provide `decimalPlaces`.
- **Risk level:** Medium - Same currency precision issue as Finding 1.
- **Suggested fix:** Same as Finding 1 - ensure backend always populates `decimalPlaces`.

---

### Finding 3: Minor Unit Conversion Fallback (Stripe)

- **File:** `src/Merchello/wwwroot/js/checkout/adapters/stripe-express-adapter.js:49`
- **The duplicated logic:** `Math.round(config.amount * 100)` converts a decimal amount to Stripe's minor units (cents). This duplicates `ICurrencyService.ToMinorUnits()` which handles per-currency conversion (JPY has no minor units, BHD uses 1000x not 100x).
- **Which backend service should handle this:** `ICurrencyService.ToMinorUnits()` - the backend already provides `sdkConfig.amount` in minor units (confirmed by comment on line 127-128: "API now returns amounts already converted"). This `* 100` is a fallback.
- **Risk level:** Medium - If the fallback is ever reached for JPY or BHD, amounts would be wrong (e.g., 1000 JPY would become 100000 instead of 1000).
- **Suggested fix:** Remove the `Math.round(config.amount * 100)` fallback entirely. If `sdkConfig.amount` is not provided, log an error rather than guessing the conversion factor.

---

### Finding 4: Hardcoded Amount Change Tolerance

- **File:** `src/Merchello/wwwroot/js/checkout/components/express-checkout.js:154`
- **The duplicated logic:** `Math.abs(newAmount - oldAmount) > 0.01` uses a hardcoded tolerance to detect whether the basket amount changed enough to warrant re-rendering express checkout buttons.
- **Which backend service should handle this:** Not a direct backend service concern, but the threshold should be currency-aware. `ICurrencyService` knows that JPY has 0 decimal places (threshold should be > 1), while USD uses 2 (threshold 0.01 is correct).
- **Risk level:** Low - Worst case: unnecessary re-renders (for JPY sub-yen changes that can't exist) or missed re-renders (unlikely in practice).
- **Suggested fix:** Use `config.decimalPlaces` from the express config to derive the threshold: `Math.pow(10, -(config.decimalPlaces ?? 2))`.

---

### Finding 5: Hardcoded Postal Code Minimum Length

- **File:** `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js:289`
- **The duplicated logic:** `addr.postalCode.length >= 3` gates whether shipping calculation can be triggered. This hardcodes a minimum postal code length that varies by country (e.g., Iceland uses 3 digits, Ireland uses 7 characters).
- **Which backend service should handle this:** This is a UX-only gate to prevent premature API calls. The backend `CheckoutValidator` performs the actual postal code validation.
- **Risk level:** Low - Could trigger unnecessary API calls for short-code countries or prevent shipping calculation for valid 2-character codes (though none currently exist).
- **Suggested fix:** Accept this as UX-only validation. The value 3 is a reasonable minimum across all countries. No backend delegation needed - the backend validates fully on submission.

---

### Finding 6: Duplicate Postal Code Minimum (Same Rule, Different File)

- **File:** `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js:175-177`
- **The duplicated logic:** Same `postalCode.length >= 3` check duplicated in the single-page checkout component.
- **Which backend service should handle this:** Same as Finding 5 - UX-only gate.
- **Risk level:** Low - Same as Finding 5, plus the maintenance risk of having the same magic number in two locations.
- **Suggested fix:** Extract to a shared constant or utility function (e.g., `const MIN_POSTAL_CODE_LENGTH = 3`) to at least centralize the magic number.

---

### Finding 7: Hardcoded Decimal Places Default

- **File:** `src/Merchello/wwwroot/js/checkout/adapters/braintree-express-adapter.js:280,401`
- **The duplicated logic:** The `?? 2` fallback in both Apple Pay and Google Pay amount formatting assumes 2 decimal places when `config.decimalPlaces` is not provided.
- **Which backend service should handle this:** `ICurrencyService` maintains per-currency decimal place mappings. The `ExpressCheckoutConfigDto` should always include this value.
- **Risk level:** Medium - For JPY orders, amounts would be formatted as "1000.00" instead of "1000"; for BHD, "1.000" would be truncated to "1.00".
- **Suggested fix:** Ensure `ExpressCheckoutConfigDto.DecimalPlaces` is always populated by the backend `CheckoutPaymentsApiController` using `ICurrencyService`. This is the same fix as Findings 1 and 2.

---

## Areas Verified as Compliant

### TypeScript Backoffice (Zero Violations)

- **Tax calculations** - Uses `MerchelloApi.previewCustomItemTax()` (add-custom-item-modal.element.ts)
- **Discount calculations** - Uses `MerchelloApi.previewDiscount()` (add-discount-modal.element.ts)
- **Invoice edit totals** - Uses `MerchelloApi.previewInvoiceEdit()` (edit-order-modal.element.ts)
- **Add-on pricing** - Uses `MerchelloApi.previewAddonPrice()` (product-picker-modal.element.ts)
- **Stock status** - Consumes `StockStatus` enum from backend DTO (variant-helpers.ts)
- **Payment status** - Uses `balanceStatusLabel`/`balanceStatusCssClass` from DTO (order-detail.element.ts)
- **Credit utilization** - Uses `creditWarningLevel` from `OutstandingBalanceDto` (create-order-modal.element.ts)
- **Overdue detection** - Uses `isOverdue` boolean from DTO (mark-as-paid-modal.element.ts)
- **Currency formatting** - All uses `formatCurrency()`/`formatNumber()` from shared utils
- **Analytics aggregates** - Uses `periodTotal`/`percentChange` from backend (analytics.types.ts)
- **Shipping options** - Loads via `MerchelloApi.getShippingOptionsForWarehouse()`, no local grouping

### JavaScript Checkout (Mostly Compliant)

- **Basket totals** - Receives `displayTotal`/`displayTax`/`displayShipping` from backend API
- **Tax display** - Uses `taxInclusiveDisplaySubTotal` and `taxIncludedMessage` from backend
- **Currency formatting** - Uses `formatCurrencyLocale()` utility throughout
- **Shipping costs** - Extracted from backend-calculated `shippingOptions[].cost`, not computed
- **Discount application** - Delegates to `/api/merchello/checkout/discount/apply`
- **Order totals** - Never assembled from components; always received whole from backend

---

## Recommendations

1. **Ensure `ExpressCheckoutConfigDto` always populates `DecimalPlaces`** from `ICurrencyService` - this resolves Findings 1, 2, and 7 without any frontend changes needed.

2. **Remove the `Math.round(config.amount * 100)` fallback** in the Stripe adapter (Finding 3) - replace with an error log since the backend should always provide `sdkConfig.amount` in minor units.

3. **Extract postal code minimum** to a shared constant (Finding 6) - minor maintenance improvement, not a business logic issue.

4. **No over-engineering needed** - The codebase is well-structured. These findings are edge cases in payment adapter SDK integration, not systemic architecture issues.
