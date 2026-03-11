# Checkout Modernization: Server-Driven with HTMX + Alpine.js

## Goal

Replace the client-side SPA checkout with a server-driven architecture where Razor owns state rendering and HTMX handles mutations, keeping Alpine.js only for genuinely client-side concerns (payment SDKs, express checkout, address autocomplete, real-time validation, abandoned checkout capture).

This eliminates ~5,420 lines of client-side state management JavaScript and converts the remaining ~3,800 lines (plus ~3,000 lines of payment adapters) to targeted TypeScript, while making the checkout more robust, testable, and maintainable.

## UI/UX Identity Preservation

**CRITICAL: The visual appearance, layout, and user experience of the checkout must remain pixel-identical.** This refactor changes the architecture (how state flows between server and client) but NOT the UI. Every CSS class, animation, loading skeleton, error message position, and interactive behavior must be preserved. The user should not be able to tell the checkout was rebuilt.

## Why Not Just Convert JS → TS?

The current checkout has drifted into a client-side SPA that happens to be served by Razor. The server calculates everything (per CLAUDE.md), but the client maintains a parallel shadow of that state:

- `checkout.store.js` (~1,029 lines) duplicates basket totals, shipping groups, payment state, address state, and currency state that the server already knows
- `single-page-checkout.js` (~2,216 lines) orchestrates step transitions, API calls, and client-side state patches that the server could handle with partial HTML swaps
- `api.js` (~470 lines) wraps 23 API endpoints that return JSON, which the client then manually patches into Alpine store state
- `formatters.js` provides currency formatting that Razor already does with `ICurrencyService`
- `order-summary.js` re-renders line items from store state that Razor already rendered on page load

Converting these to TypeScript adds type safety but preserves the architectural problem: two sources of truth (server state and client state) that must stay synchronized.

## Core Principle

**Every checkout interaction that submits data and gets back updated state should be a server round-trip returning HTML, not a JSON API call followed by client-side state patching.**

Address save, shipping selection, discount apply/remove — these all call the API already, then manually patch client-side state from the response. The server already knows the full checkout state after each mutation. Return updated HTML instead.

## End State

- Razor renders the full checkout UI with real data (not an empty shell + JSON blob)
- All sections visible simultaneously (preserving current single-page layout exactly)
- HTMX handles form submissions and **granular** partial HTML swaps targeting individual sections
- Alpine.js handles only: payment SDK integration, express checkout buttons, address autocomplete, real-time field validation, UI toggles, abandoned checkout capture, account sign-in/create flows
- Payment adapters remain unchanged (self-registering globals, dynamic script injection)
- Analytics scripts remain unchanged (classic IIFE scripts)
- All existing public URL paths preserved
- All existing API endpoints preserved (for programmatic/mobile use)
- Razor views keep the same layout structure and conditional loading patterns

## Scope: Single-Page Checkout Only

The codebase supports both single-page and multi-page checkout modes. `_Layout.cshtml` (lines 96-143) renders breadcrumb navigation when `!Model.IsSinglePageCheckout`, and `_OrderSummary.cshtml` has three rendering branches (readonly/confirmation, single-page/Alpine, multi-page/server-rendered). Currently `MerchelloCheckoutController` always routes to `SinglePage.cshtml`.

**This migration focuses exclusively on single-page checkout.** Multi-page layout support is preserved unchanged:
- `_Layout.cshtml` breadcrumb conditional rendering stays
- `_OrderSummary.cshtml` multi-page server-rendered branch (non-Alpine) stays
- Multi-page checkout would require its own set of HTMX partials if activated in the future

## Architecture Overview

```
Razor page renders full checkout HTML (server state, all sections visible)
    │
    ├── HTMX handles mutations via granular section swaps
    │   ├── Address save → swaps #shipping-section + OOB #order-summary
    │   ├── Shipping radio change → swaps #order-summary only
    │   ├── Shipping form submit → swaps #payment-section + OOB #order-summary
    │   ├── Discount apply/remove → swaps #order-summary + OOB #discount-form
    │   ├── Country change → swaps #region-select-{type} only
    │   ├── Email check → swaps #email-status only
    │   └── Upsell add → swaps #shipping-section + OOB #order-summary
    │
    ├── Alpine.js handles client-only concerns
    │   ├── Payment form interactivity (hosted fields, widgets, direct forms)
    │   ├── Express checkout button rendering and payment flow
    │   ├── Address autocomplete suggestions (keystroke-driven)
    │   ├── Real-time field validation UX (blur/input events)
    │   ├── UI toggles (same-as-billing, mobile collapse)
    │   ├── Account section (sign-in, create account, forgot password)
    │   └── Abandoned checkout capture (email/address on blur)
    │
    ├── Lightweight fetch() calls (not HTMX, not Alpine)
    │   ├── captureEmail() — on email blur, fire-and-forget for abandoned checkout
    │   ├── captureAddress() — on address blur, debounced, for abandoned checkout
    │   ├── Sign-in / sign-out / create account — require page reload on success
    │   ├── Password validation — real-time UX feedback
    │   ├── Terms content loading — modal display with client-side caching
    │   └── Address lookup — config, suggestions, resolve (3 endpoints)
    │
    ├── Payment adapters (unchanged)
    │   └── Self-registering globals loaded dynamically by payment.ts
    │
    ├── Error boundary (converted to TS)
    │   └── Global error/rejection handler + recovery banner + HTMX error hook
    │
    ├── Accessibility
    │   └── ARIA announcer for screen reader feedback on HTMX swaps
    │
    └── Analytics (unchanged)
        └── Classic scripts emitting tracking events via window.MerchelloCheckout
```

## What Gets Eliminated

These files exist because the current architecture manages checkout state in the browser. With server-driven rendering, they become unnecessary:

| Current File | Lines | Why It's Eliminated |
|---|---|---|
| `stores/checkout.store.js` | 1,029 | Server owns state; no client store needed |
| `services/api.js` | 470 | HTMX handles the request/response cycle; payment.ts keeps its own API calls |
| `components/single-page-checkout.js` | 2,216 | The mega-orchestrator; replaced by HTMX granular swaps + small Alpine components |
| `components/checkout-address-form.js` | 374 | Razor renders the form; HTMX submits it; Alpine handles only autocomplete + validation UX |
| `components/checkout-shipping.js` | 238 | Razor renders shipping options; HTMX submits selection |
| `components/checkout-payment.js` | 433 | Payment method list rendered by Razor `_PaymentMethods.cshtml` |
| `components/order-summary.js` | 396 | Razor renders the summary; HTMX swaps it on basket changes |
| `utils/formatters.js` | 83 | Server formats currency in Razor (it already knows the locale and exchange rate) |
| `utils/regions.js` | 95 | Server renders region dropdowns directly via `_RegionSelect.cshtml` partial |
| `utils/debounce.js` | 86 | Eliminated; tiny inline debounce kept in checkout.ts for captureAddress only |

**Total eliminated:** ~5,420 lines of client-side JavaScript.

## What Stays (As TypeScript)

These files handle genuinely client-side concerns that cannot be server-rendered:

| File | Current Source | Lines | Purpose | Output Format |
|---|---|---|---|---|
| `checkout.ts` | `index.js` | 104 | HTMX configuration, Alpine init, HTMX lifecycle (beforeSwap/afterSwap), abandoned checkout capture wiring, announcer wiring, terms modal loading, `window.MerchelloLogger` init | ESM module |
| `payment.ts` | `payment.js` | 908 | Adapter loading, `window.MerchelloPayment` helpers, payment flow orchestration | ESM (hybrid — must preserve `window.MerchelloPayment` global) |
| `components/payment-form.ts` | New (extracted from `checkout-payment.js` + `single-page-checkout.js`) | ~200 | Alpine component for hosted fields / direct form / widget rendering | ESM module |
| `components/express-checkout.ts` | `express-checkout.js` | 497 | Alpine component for express buttons (Apple Pay, Google Pay, PayPal) | ESM module |
| `components/address-autocomplete.ts` | New (extracted from `checkout-address-form.js` + `single-page-checkout.js`) | ~150 | Alpine component for address lookup suggestions (config, typeahead, resolve) | ESM module |
| `components/validation.ts` | `services/validation.js` | 187 | Real-time field validation (email, phone, address — UX only) | ESM module |
| `components/account-section.ts` | New (extracted from `single-page-checkout.js`) | ~150 | Alpine component for sign-in, create account, forgot password, digital product account requirement | ESM module |
| `services/logger.ts` | `services/logger.js` | 243 | Batched log transport to `/api/merchello/checkout/log` | ESM module |
| `utils/payment-errors.ts` | `utils/payment-errors.js` | 168 | Error classification, user messages, event dispatch | ESM module |
| `utils/security.ts` | `utils/security.js` | 67 | URL validation, safe redirects | ESM module |
| `utils/announcer.ts` | `utils/announcer.js` | 131 | ARIA live region announcements for screen readers on dynamic content changes | ESM module |
| `utils/error-boundary.ts` | `services/error-boundary.js` | 146 | Global error/rejection handler, recovery banner UI, first-party script detection, HTMX error hook | ESM module |
| `adapters/adapter-interface.ts` | `adapters/adapter-interface.js` | 179 | Adapter registration helpers, `registerAdapter()`, `getAdapter()`, unified registry management | ESM module |
| `adapters/*.ts` | `adapters/*.js` | ~3,000 | 9 payment provider adapters (unchanged behavior) | Classic IIFE |
| `analytics.ts` | `analytics.js` | 269 | Event emitter with GA4/Meta helpers | Classic IIFE |
| `single-page-analytics.ts` | `single-page-analytics.js` | ~200 | SPA step tracking with deduplication | Classic IIFE |
| `confirmation.ts` | `confirmation.js` | 73 | Back-button protection, sessionStorage cleanup | Classic IIFE |
| `post-purchase.ts` | `post-purchase.js` | 623 | Upsell rendering, saved-method charging | Classic IIFE |

**Total remaining:** ~18-20 TypeScript files, ~3,800 lines (excluding adapters). Adapters add ~3,000 lines.

## What Stays In Razor (Unchanged Behavior)

These inline scripts and patterns must remain exactly as they are:

| View | Pattern | Why It Stays |
|---|---|---|
| `_Layout.cshtml` | Import map for `alpinejs` + `@alpinejs/collapse` | Module resolution for checkout ESM files |
| `_Layout.cshtml` | Conditional `index.js` loading (not on Confirmation/PostPurchase) | Runtime contract |
| `_Layout.cshtml` | `window.merchelloCheckoutData` inline script | Analytics data from server-rendered basket model |
| `_Layout.cshtml` | `analytics.js` always loaded | Analytics event system |
| `_Layout.cshtml` | `settings.CustomScriptUrl` conditional loading | User-configured tracking |
| `_ExpressCheckout.cshtml` | `window.MerchelloExpressAdapters = {}` and `window.MerchelloExpressConfig` inline init | Must execute before adapter scripts; Razor guarantees ordering |
| `Confirmation.cshtml` | Inline purchase event with localStorage dedup | Per-invoice deduplication |
| `Return.cshtml` | Inline `paymentReturn()` Alpine component | Small, page-specific; not worth extracting |
| `ResetPassword.cshtml` | Inline Alpine component for password reset form | Self-contained page with own import map; not part of single-page checkout flow |
| `PostPurchase.cshtml` | Post-purchase upsell page with `post-purchase.js` | No Alpine; uses `data-*` attributes queried by `post-purchase.js`. HTMX script loads via `_Layout.cshtml` but is inert (no `hx-*` attributes on this page). `post-purchase.js` calls JSON API endpoints (`GET /post-purchase/{invoiceId}`, `POST .../preview`, `POST .../add`, `POST .../skip`) — these must remain intact. |
| `Cancel.cshtml` | Payment cancellation page (pure server-rendered HTML) | No Alpine or JS dependencies; no changes needed |
| `Privacy.cshtml` / `Terms.cshtml` | Static content pages (5 lines each) | No changes needed; do not delete during cleanup |
| `_ViewImports.cshtml` | Razor namespace imports | May need additional `@using` directives for new partial ViewModels |

## HTMX Integration Design

### Layout Preservation: Granular Section Swaps

The current checkout shows all sections simultaneously (email, addresses, shipping, payment) as a single scrollable page. This layout must be preserved exactly — no step-based tabs or accordion.

HTMX targets individual sections rather than swapping the entire checkout body. When one action needs to update multiple non-nested sections, HTMX out-of-band swaps (`hx-swap-oob="true"`) handle the additional targets.

| User Action | Primary HTMX Target | OOB Targets | Response |
|---|---|---|---|
| Country change | `#region-select-{type}` | — | Region `<option>` elements |
| Email check | `#email-status` | — | Sign-in prompt, create account option, or account status (includes digital product account requirement) |
| Address form submit | `#shipping-section` | `#order-summary` | Shipping options + updated totals |
| Shipping radio change | `#order-summary` | — | Updated totals |
| Shipping form submit | `#payment-section` | `#order-summary` | Payment methods (credit check applied server-side) + updated totals |
| Discount apply | `#order-summary` | `#discount-form` | Updated totals + cleared input |
| Discount remove | `#order-summary` | — | Updated totals |
| Upsell add-to-basket | `#shipping-section` | `#order-summary` | Updated shipping + totals |

### How HTMX Replaces the JSON API + Client State Cycle

**Current flow (address save):**
1. User fills address form (Alpine component manages state in `checkout.store`)
2. User clicks "Continue" → `single-page-checkout.js` calls `api.saveAddresses(storeData)`
3. Server validates, saves, recalculates shipping → returns JSON
4. `single-page-checkout.js` manually patches `checkout.store` with response data
5. Alpine reactivity re-renders shipping options and order summary

**New flow (address save):**
1. User fills address form (standard HTML form with Alpine for validation UX)
2. User clicks "Continue" → HTMX submits the form to `/checkout/partials/addresses`
3. Server validates, saves, recalculates shipping → returns `_ShippingOptions` HTML + OOB `_OrderSummary` HTML
4. HTMX swaps `#shipping-section` with shipping options; OOB swap updates `#order-summary`
5. Alpine reinitializes on the new DOM for payment/express/autocomplete components

### Out-of-Band Swap Pattern

When a single action updates multiple sections, the server response includes both the primary content and OOB fragments:

```html
<!-- Primary response: swapped into #shipping-section -->
<div id="shipping-section">
    <!-- Shipping groups with radio options rendered by _ShippingOptions.cshtml -->
</div>

<!-- OOB swap: also update order summary (not nested in primary target) -->
<div id="order-summary" hx-swap-oob="true">
    <!-- Updated totals rendered by _OrderSummary.cshtml -->
</div>
```

### Implementation Note: `PartialViewWithOob` Helper

ASP.NET Core does not have a built-in method for returning primary HTML + OOB fragments. `CheckoutPartialsController` must implement a custom helper:

```csharp
/// <summary>
/// Renders a primary partial view plus one or more OOB fragments in a single HTML response.
/// </summary>
private async Task<IActionResult> PartialViewWithOob(
    string primaryView, object primaryModel,
    params (string viewName, string targetId, object model)[] oobFragments)
{
    var sb = new StringBuilder();
    sb.Append(await RenderPartialToStringAsync(primaryView, primaryModel));

    foreach (var (viewName, targetId, model) in oobFragments)
    {
        // Each OOB fragment is wrapped with hx-swap-oob attribute
        sb.Append($"<div id=\"{targetId}\" hx-swap-oob=\"true\">");
        sb.Append(await RenderPartialToStringAsync(viewName, model));
        sb.Append("</div>");
    }

    return Content(sb.ToString(), "text/html");
}

/// <summary>
/// Renders a Razor partial view to a string. Requires ICompositeViewEngine and ITempDataProvider
/// injected into the controller.
/// </summary>
private async Task<string> RenderPartialToStringAsync(string viewName, object model)
{
    ViewData.Model = model;
    using var sw = new StringWriter();
    var viewResult = _viewEngine.FindView(ControllerContext, viewName, false);
    var viewContext = new ViewContext(ControllerContext, viewResult.View, ViewData, TempData, sw, new HtmlHelperOptions());
    await viewResult.View.RenderAsync(viewContext);
    return sw.ToString();
}
```

The controller must inject `ICompositeViewEngine` and `ITempDataProvider` via constructor injection. The controller inherits from `Controller` (not `RenderController`) since it does not need Umbraco content routing.

**Session resolution:** The checkout session is identified by a basket cookie (same mechanism as `CheckoutApiController`). Inject `ICheckoutSessionService` to resolve the session from the cookie. No special authentication middleware is needed — the existing cookie-based session mechanism works for both JSON and HTML responses.

**Exception filter:** Apply `[ServiceFilter(typeof(CheckoutExceptionFilter))]` to match the existing pattern from `CheckoutApiController.cs:53` and `CheckoutPaymentsApiController.cs:17`. This ensures consistent error handling across all checkout endpoints.

**Rate limiting:** Inject `IRateLimiter` and apply rate limits matching the API controller equivalents:

| Endpoint | Rate Limit | Rationale |
|---|---|---|
| `POST check-email` | 10/min | Prevents email enumeration |
| `POST discount/apply` | 20/min | Prevents discount code brute-force |
| `POST addresses` | 10/min | Prevents spam submissions |
| `POST upsell/add` | 20/min | Prevents cart manipulation |

### HTMX Attributes on Existing Markup

The existing Razor partials get HTMX attributes added. No structural rewrite needed:

```html
<!-- Address form submission → swaps shipping section + OOB order summary -->
<form hx-post="/checkout/partials/addresses"
      hx-target="#shipping-section"
      hx-swap="innerHTML"
      hx-sync="this:queue first"
      hx-indicator="#checkout-spinner">
    <!-- Existing address form fields from _AddressForm.cshtml -->
    <button type="submit">Continue to shipping</button>
</form>

<!-- Shipping selection → swaps order summary on radio change -->
<div id="shipping-section">
    <form hx-post="/checkout/partials/shipping"
          hx-target="#payment-section"
          hx-swap="innerHTML"
          hx-sync="this:queue first"
          hx-indicator="#checkout-spinner">
        <!-- Shipping groups rendered by Razor -->
        <input type="radio" name="selections[{groupId}]" value="{selectionKey}"
               hx-post="/checkout/partials/shipping/select"
               hx-trigger="change"
               hx-target="#order-summary"
               hx-swap="innerHTML"
               hx-sync="closest form:replace"
               hx-indicator="#summary-spinner" />
        <button type="submit">Continue to payment</button>
    </form>
</div>

<!-- Discount apply → swaps order summary + OOB resets discount form -->
<div id="discount-form">
    <form hx-post="/checkout/partials/discount/apply"
          hx-target="#order-summary"
          hx-swap="innerHTML"
          hx-sync="this:queue first"
          hx-indicator="#discount-spinner">
        <input type="text" name="code" />
        <button type="submit">Apply</button>
    </form>
</div>

<!-- Discount remove -->
<button hx-delete="/checkout/partials/discount/{discountId}"
        hx-target="#order-summary"
        hx-swap="innerHTML">Remove</button>

<!-- Region dropdown reload on country change -->
<select name="countryCode"
        hx-get="/checkout/partials/regions/{addressType}"
        hx-target="#region-select-{addressType}"
        hx-swap="innerHTML"
        hx-include="[name='countryCode']"
        hx-trigger="change"
        hx-sync="this:replace">
</select>
```

### Race Condition Prevention via `hx-sync`

The current JS uses `_shippingRequestId` patterns to discard stale responses. HTMX replaces this with declarative `hx-sync` attributes:

| Element | `hx-sync` Strategy | Behavior |
|---|---|---|
| Shipping radios | `hx-sync="closest form:replace"` | Latest selection wins, abort previous request |
| Discount apply form | `hx-sync="this:queue first"` | Prevent double-apply |
| Address form submit | `hx-sync="this:queue first"` | Prevent double-submit |
| Shipping form submit | `hx-sync="this:queue first"` | Prevent double-submit |
| Country select | `hx-sync="this:replace"` | Latest country wins |
| Email check | `hx-sync="this:replace"` | Latest email wins |

### Payment Init Race Condition (Eliminated)

The current `single-page-checkout.js` uses `_paymentInitRequestId` (a counter incremented before each async payment init call) to discard stale responses when basket changes trigger concurrent payment form re-initialization. This pattern is eliminated by the HTMX architecture:

- When basket changes (shipping selection, discount apply), the server returns an OOB swap for `#payment-section` if payment amounts change
- The `htmx:beforeSwap` handler destroys the existing payment adapter (Stripe Elements, Braintree Hosted Fields iframes) before the DOM is replaced
- After HTMX swap settles, `Alpine.initTree` reinitializes the `paymentForm` component which reads fresh amounts from Razor-rendered `data-*` attributes
- No concurrent init calls are possible — the server controls when the payment section updates
- The debounced payment reinit pattern (300ms wait after basket changes) is replaced by: HTMX swap settles → `Alpine.initTree` → component `init()` reads new data

### Shipping Recalculation Latency

When the user changes a shipping radio button, the order summary update requires a server round-trip (50-200ms+). This is acceptable — most e-commerce checkouts (Shopify, Stripe Checkout) have this pattern.

UX requirements:
- `hx-indicator` shows a subtle semi-transparent overlay with spinner on `#order-summary` during the swap
- `hx-sync="closest form:replace"` on radios ensures rapid clicks abort stale requests
- The loading overlay must NOT be a full-page blocker — only the order summary section
- `HX-Trigger: basketUpdated` header on the response notifies express checkout buttons

### Custom Events Migration

All current custom events are either eliminated (replaced by HTMX mechanics) or migrated:

**Alpine dispatch events (eliminated with orchestrator):**

| Current Event | Dispatched By | Consumed By | HTMX Replacement |
|---|---|---|---|
| `shipping-selection-changed` | `checkout-shipping.js` | `single-page-checkout.js` | HTMX radio `hx-post` submits selection directly |
| `payment-method-changed` | `checkout-payment.js` | `single-page-checkout.js` | `paymentForm` Alpine component handles locally |
| `saved-payment-method-selected` | `checkout-payment.js` | `single-page-checkout.js` | `paymentForm` Alpine component handles locally |
| `discount-applied` / `discount-removed` | `order-summary.js` | `single-page-checkout.js` | HTMX form submission + OOB swap |
| `address-changed` / `address-field-changed` | `checkout-address-form.js` | `single-page-checkout.js` | HTMX form submission; abandoned capture re-wired in `htmx:afterSwap` |

**Window custom events:**

| Current Event | HTMX Migration |
|---|---|
| `merchello:basket-updated` | Replaced by `basketUpdated` HTMX event (from `HX-Trigger` response header). Payload shape preserved: `{ total, subtotal, shipping, tax, currency }` |
| `merchello:payment-reinit-needed` | **Eliminated.** Currently dispatched by `order-summary.js` after discount changes to re-initialize the payment form. With HTMX, the server returns an OOB `#payment-section` swap when basket amount changes affect payment. The `htmx:beforeSwap` handler destroys the adapter; `Alpine.initTree` reinitializes after swap. |
| `merchello:payment-error` | **Stays.** Dispatched by `payment-errors.ts`, consumed by payment components. No change needed. |
| `merchello:shipping-error` | **Eliminated.** Server returns validation errors in the partial response HTML. |

### HTMX + Alpine Lifecycle Management

```typescript
// checkout.ts — HTMX lifecycle

// Include antiforgery token in every HTMX request
document.body.addEventListener('htmx:configRequest', (evt) => {
    const token = document.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]');
    if (token) {
        evt.detail.headers['RequestVerificationToken'] = token.value;
    }
});

// Allow HTMX to swap on 422 (validation errors) — HTMX only swaps 2xx by default
// HTTP status behavior:
//   2xx: HTMX swaps normally (default)
//   422: HTMX swaps with validation errors (enabled below)
//   400: HTMX does NOT swap — error-boundary.ts shows recovery banner via htmx:responseError
//   500: HTMX does NOT swap — error-boundary.ts shows recovery banner via htmx:responseError
document.body.addEventListener('htmx:beforeSwap', (evt) => {
    if (evt.detail.xhr.status === 422) {
        evt.detail.shouldSwap = true;
        evt.detail.isError = false;
    }
});

// Clean up Alpine components and payment SDKs before DOM removal
document.body.addEventListener('htmx:beforeSwap', (evt) => {
    Alpine.destroyTree(evt.detail.target);

    // If payment form is active in the swap target, destroy the adapter
    // to prevent SDK leaks (Stripe Elements, Braintree Hosted Fields iframes)
    if (window.MerchelloPayment?.activeAdapter) {
        const target = evt.detail.target as HTMLElement;
        if (target.querySelector('[x-data="paymentForm"]')) {
            window.MerchelloPayment.activeAdapter.destroy();
        }
    }
});

// Re-initialize Alpine components after HTMX swap
document.body.addEventListener('htmx:afterSwap', (evt) => {
    Alpine.initTree(evt.detail.target);
    // Re-wire abandoned checkout capture listeners on new form fields
    wireAbandonedCheckoutCapture(evt.detail.target);
});

// Also handle OOB swaps (each OOB element fires its own event)
document.body.addEventListener('htmx:oobAfterSwap', (evt) => {
    Alpine.initTree(evt.detail.target);
});

// Announce section changes to screen readers
document.body.addEventListener('htmx:afterSettle', (evt) => {
    const target = evt.detail.target as HTMLElement;
    const announcement = target.dataset.announcement;
    if (announcement) {
        announce(announcement);
    }

    // Track step transitions for analytics
    const step = target.dataset.checkoutStep;
    if (step && window.MerchelloSinglePageAnalytics) {
        window.MerchelloSinglePageAnalytics.trackStep(step);
    }
});

// Announce errors to screen readers
document.body.addEventListener('htmx:responseError', () => {
    announceError('An error occurred. Please try again.');
});
```

### Alpine `x-cloak` and HTMX Swaps

When HTMX swaps in new content with `x-cloak` attributes, those elements are hidden until `Alpine.initTree` processes them. Since `Alpine.initTree` runs synchronously in the `htmx:afterSwap` handler (above), this is safe for most cases. However, for HTMX-swapped partials that contain Alpine components, prefer `x-show` with Alpine state instead of `x-cloak` to avoid any flash of hidden content. Elements that are purely Alpine-driven (payment form, express checkout) can safely use `x-cloak` since they are initialized immediately by `Alpine.initTree`.

### Abandoned Checkout Capture (Non-HTMX)

The abandoned checkout system depends on capturing email and address data on blur — **before** the user submits the form. These are lightweight fire-and-forget `fetch()` calls, not HTMX interactions (no HTML response needed).

```typescript
// checkout.ts — abandoned checkout capture

let _emailCaptured = '';
let _lastAddressHash = '';
let _captureAddressInFlight = false;
let _captureAddressPending = false;

function wireAbandonedCheckoutCapture(root: HTMLElement) {
    const emailInput = root.querySelector<HTMLInputElement>('input[name="email"]');
    emailInput?.addEventListener('blur', () => captureEmail(emailInput.value));

    const addressFields = root.querySelectorAll<HTMLInputElement>(
        '[data-address-capture]'
    );
    addressFields.forEach(field => {
        field.addEventListener('blur', () => debouncedCaptureAddress());
    });
}

async function captureEmail(email: string) {
    if (!email || _emailCaptured === email) return;
    try {
        await fetch('/api/merchello/checkout/capture-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        _emailCaptured = email;
    } catch { /* fire-and-forget */ }
}

async function captureAddress() {
    if (_captureAddressInFlight) {
        _captureAddressPending = true;
        return;
    }
    _captureAddressInFlight = true;
    _captureAddressPending = false;

    // Hash address data and skip if unchanged
    const addressData = collectAddressFormData();
    const hash = JSON.stringify(addressData);
    if (hash === _lastAddressHash) {
        _captureAddressInFlight = false;
        return;
    }

    try {
        await fetch('/api/merchello/checkout/capture-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: hash
        });
        _lastAddressHash = hash;
    } catch { /* fire-and-forget */ }
    finally {
        _captureAddressInFlight = false;
        if (_captureAddressPending) {
            _captureAddressPending = false;
            debouncedCaptureAddress();
        }
    }
}
```

Key behaviors preserved from current `single-page-checkout.js`:
- Email deduplication (`_emailCaptured` check)
- Address hash deduplication (`_lastAddressHash`)
- In-flight/pending coalescing (`_captureAddressInFlight`, `_captureAddressPending`)
- Re-wiring after HTMX swaps (form elements get replaced, so blur listeners must re-attach via `wireAbandonedCheckoutCapture` in `htmx:afterSwap`)

### Account / Sign-in / Authentication Flows

The current `single-page-checkout.js` contains substantial account management code (~100+ lines): email check, sign-in, password validation, forgot password, create account, sign-out, and digital product account requirement. These are handled differently in the new architecture:

**Flows that become HTMX partials:**
- **Email check** (`POST /checkout/partials/check-email`): Returns `#email-status` partial containing sign-in prompt, create account option, or "continue as guest" status. If the basket contains digital products, the server renders an "account required" banner in the partial — this logic moves from client to server.

**Flows that stay as JSON `fetch()` calls (in `components/account-section.ts`):**
- **Sign-in** (`POST /api/merchello/checkout/sign-in`): On success, performs full page reload (session changes, cookie updates, basket may merge with existing customer basket). Cannot be a partial swap.
- **Sign-out** (`POST /api/merchello/checkout/sign-out`): Same — full page reload needed after cookie change.
- **Create account** (`POST /api/merchello/checkout/create-account`): On success, reloads page with authenticated session.
- **Forgot password** (`POST /api/merchello/checkout/forgot-password`): Fire-and-forget with simple success/error state toggle in Alpine component.
- **Password validation** (`POST /api/merchello/checkout/validate-password`): Real-time validation feedback, stays as `fetch()`.

**Account creation during order submission (inline flow):**

The current `single-page-checkout.js` (lines 2109-2114) sends the password alongside address data during `submitOrder()` — creating an account as part of placing the order, not as a separate step. This is different from the standalone "Create Account" button flow.

After migration:
- `SaveAddressesFormModel.Password` (nullable string) is included in the HTMX address form submission
- The "Create an account" checkbox and password field are rendered by Razor in the contact section, controlled by a small Alpine `x-show` toggle (no store needed)
- When the password field is populated, the server creates the account during `SaveAddressesAsync()` or defers to order creation (matching current behavior)
- If the basket contains digital products and no customer account exists, Razor renders an "Account required" banner in `_EmailStatus.cshtml` and the password field becomes required

**Where this code lives:**
- `components/account-section.ts` Alpine component (~100-150 lines)
- Registers as `Alpine.data('accountSection', ...)`
- Manages sign-in form visibility, loading states, error display, forgot password dispatch
- Digital product account requirement banner rendered by Razor conditionally (no client-side check needed)

### Address Lookup / Autocomplete Detail

The `components/address-autocomplete.ts` Alpine component integrates with the address lookup provider system via three JSON API endpoints:

1. **Config** (`GET /api/merchello/checkout/address-lookup/config`): Returns `{ isEnabled, providerAlias, minQueryLength, supportedCountries }`. Fetched once on component init. Can also be rendered as `data-*` attributes by Razor to avoid the initial fetch.

2. **Suggestions** (`POST /api/merchello/checkout/address-lookup/suggestions`): Typeahead suggestions on keystroke with debounce (~300ms). Returns `{ suggestions: [{ id, text, description }] }`. The component renders a dropdown below the address field.

3. **Resolve** (`POST /api/merchello/checkout/address-lookup/resolve`): Resolves a selected suggestion into full address fields. Returns `{ address: { addressOne, addressTwo, townCity, countyState, postalCode, countryCode, regionCode } }`. The component fills the form fields.

All three stay as `fetch()` calls — no HTMX (no HTML response expected). Rate limiting is handled server-side. The component manages its own loading/error/empty states via Alpine reactive properties.

### Credit Check / Purchase Orders (Server-Side)

The current `single-page-checkout.js` calls `POST /api/merchello/checkout/credit-check` to determine purchase order eligibility. This affects which payment methods are visible.

With HTMX, the credit check moves server-side: when `CheckoutPartialsController.SaveShipping` renders the `_PaymentMethods.cshtml` partial, it runs the credit check and includes/excludes purchase order methods based on the result. The client-side credit check call is eliminated.

### Terms Modal / Terms Content

The current `single-page-checkout.js` has `loadTermsContent()` with a client-side cache (`_termsCache`). This stays as a lightweight `fetch()` call in `checkout.ts` (~20-30 lines):

- `GET /api/merchello/checkout/terms/{key}` returns HTML content for terms/privacy modals
- Content is fetched on first click and cached in a module-scope `Map<string, string>`
- An Alpine `x-show` toggle displays the modal overlay
- No HTMX needed — this is a read-only content fetch for modal display

### Express Checkout and Basket Updates

When a basket mutation occurs (discount applied, shipping changed), express checkout buttons need to re-render with updated amounts. HTMX handles this via response headers:

```csharp
// Server sets HX-Trigger header to notify express checkout
Response.Headers.Append("HX-Trigger", JsonSerializer.Serialize(new {
    basketUpdated = new {
        total = basket.DisplayTotal,
        subtotal = basket.DisplaySubTotal,
        currency = basket.CurrencyCode
    }
}));
```

```typescript
// express-checkout.ts listens for HTMX-triggered events
// MIGRATION NOTE: Listener changes from current code:
//   OLD: document.addEventListener('merchello:basket-updated', ...)
//   NEW: document.body.addEventListener('basketUpdated', ...)
// The detail payload shape must match: { total, subtotal, currency }
document.body.addEventListener('basketUpdated', (evt: CustomEvent) => {
    // Update express adapter configs with new amounts
    this.updateAmounts(evt.detail);
});
```

**Re-render simplification:** The current `express-checkout.js` has complex re-render debouncing (`_expressRequestId`, `_reRenderTimeout`, `_skipReRender`, `_pendingReRender`) because Alpine store reactivity triggers cascading updates. With HTMX, each basket mutation produces exactly one `basketUpdated` event after the server response. The re-render logic simplifies to a single event listener that updates adapter amounts. Keep `_expressRequestId` for stale adapter SDK callback handling only (PayPal buttons can fire callbacks from previous renders), but eliminate the debounce/skip/pending pattern.

### Accessibility: ARIA Announcer

`utils/announcer.ts` provides screen reader announcements for dynamic content changes. It creates an ARIA live region and announces messages like "Shipping options loaded", "Order summary updated", "Form has 3 errors".

This replaces the current `utils/announcer.js` which is used throughout `single-page-checkout.js`. HTMX does NOT announce swapped content to screen readers by default, so explicit announcements are required.

The announcer is wired into HTMX events:
- `htmx:afterSettle` — reads `data-announcement` attribute from swapped elements
- `htmx:responseError` — announces errors
- Validation results — "Form has N errors. Please correct and try again."

Razor partials include `data-announcement` attributes on their root elements:
```html
<div id="shipping-section" data-announcement="Shipping options loaded">
```

### Error Boundary (Converted to TypeScript)

`utils/error-boundary.ts` (~150 lines) provides critical global error recovery that `htmx:responseError` alone cannot handle:

- **Global `window.error` handler**: Catches uncaught JS errors (Alpine init failures, module loading errors)
- **`unhandledrejection` handler**: Catches unhandled promise rejections from payment SDKs or async operations
- **First-party script detection**: Distinguishes checkout JS errors from third-party SDK errors (Stripe, Braintree, PayPal)
- **Recovery banner UI**: Shows a user-facing banner with a refresh button for checkout-breaking errors
- **HTMX integration**: Additionally hooks into `htmx:responseError` for HTTP-level server errors
- **Logger integration**: Calls `window.MerchelloLogger.flush(true)` before recovery to ensure error context is captured

The `htmx:responseError` event only fires for failed HTMX HTTP requests. It does NOT handle:
- JS module loading failures (e.g., checkout.ts fails to import)
- Alpine component initialization errors
- Payment SDK errors that bubble up as uncaught exceptions

## Analytics Event Timing with HTMX

### Events and When They Fire

| Event | Trigger | Source |
|---|---|---|
| `checkout:begin` | DOMContentLoaded | `_Layout.cshtml` inline script (unchanged) |
| `checkout:add_contact_info` | Email confirmed valid | `account-section.ts` or HTMX `#email-status` swap via `data-checkout-step` |
| `checkout:add_shipping_info` | Shipping selection saved | `htmx:afterSettle` on `#payment-section` swap reads `data-checkout-step="shipping"` |
| `checkout:add_payment_info` | Payment method selected | `payment-form.ts` Alpine component (unchanged — fires from client-side interaction) |
| `checkout:purchase` | Confirmation page load | `Confirmation.cshtml` inline script with localStorage dedup (unchanged) |
| `checkout:error` | Any checkout error | `error-boundary.ts` and `htmx:responseError` handler |
| `checkout:post_purchase_view` | Post-purchase page loaded | `post-purchase.ts` (unchanged) |
| `checkout:post_purchase_error` | Post-purchase error | `post-purchase.ts` (unchanged) |

### Step Tracking via HTMX

The `htmx:afterSettle` handler reads `data-checkout-step` attributes from swapped elements and calls `window.MerchelloSinglePageAnalytics.trackStep(step)`. This replaces the direct calls in `single-page-checkout.js`.

Razor partials include step tracking attributes:
```html
<div id="shipping-section" data-checkout-step="shipping" data-announcement="Shipping options loaded">
<div id="payment-section" data-checkout-step="payment" data-announcement="Payment methods loaded">
```

The deduplication layer in `single-page-analytics.ts` prevents duplicate events (e.g., if shipping options are re-rendered multiple times).

## Server-Side Partial Endpoints

### New Controller: `CheckoutPartialsController`

This controller returns Razor partial views (HTML fragments) for HTMX consumption. It is separate from the existing `CheckoutApiController` (which continues to serve JSON for programmatic/mobile use).

Endpoints return targeted partials with OOB fragments appended when multiple sections need updating.

```csharp
[Route("checkout/partials")]
[ServiceFilter(typeof(CheckoutExceptionFilter))] // Match CheckoutApiController pattern
public class CheckoutPartialsController : Controller
{
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _sessionService;
    private readonly ICheckoutDiscountService _discountService;
    private readonly IRateLimiter _rateLimiter;

    // POST /checkout/partials/addresses
    // Primary target: #shipping-section | OOB: #order-summary
    [HttpPost("addresses")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveAddresses(SaveAddressesFormModel model, CancellationToken ct)
    {
        var result = await _checkoutService.SaveAddressesAsync(/* map model */, ct);
        if (!result.Success)
        {
            // Return validation errors inline (same form with error messages + submitted values)
            return PartialView("_ValidationErrors", BuildValidationViewModel(result, model));
        }

        var summaryVm = BuildSummaryViewModel(result);
        var shippingVm = BuildShippingViewModel(result);

        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));

        // Return shipping options as primary + order summary as OOB
        return PartialViewWithOob("_ShippingOptions", shippingVm,
            ("_OrderSummary", "order-summary", summaryVm));
    }

    // POST /checkout/partials/shipping/select
    // Primary target: #order-summary (shipping radio change only updates totals)
    [HttpPost("shipping/select")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SelectShipping(SelectShippingFormModel model, CancellationToken ct)
    {
        var result = await _checkoutService.SaveShippingAsync(/* map model */, ct);
        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));
        return PartialView("_OrderSummary", BuildSummaryViewModel(result));
    }

    // POST /checkout/partials/shipping
    // Primary target: #payment-section | OOB: #order-summary
    // NOTE: Credit check runs server-side here — purchase order methods included/excluded
    // based on customer credit status, eliminating the client-side credit check call
    [HttpPost("shipping")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveShipping(SelectShippingFormModel model, CancellationToken ct)
    {
        var result = await _checkoutService.SaveShippingAsync(/* map model */, ct);
        var summaryVm = BuildSummaryViewModel(result);
        var paymentVm = BuildPaymentViewModel(result); // includes credit check

        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));

        return PartialViewWithOob("_PaymentMethods", paymentVm,
            ("_OrderSummary", "order-summary", summaryVm));
    }

    // POST /checkout/partials/discount/apply
    // Primary target: #order-summary | OOB: #discount-form
    [HttpPost("discount/apply")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ApplyDiscount(ApplyDiscountFormModel model, CancellationToken ct)
    {
        var result = await _discountService.ApplyDiscountAsync(/* map model */, ct);
        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));

        return PartialViewWithOob("_OrderSummary", BuildSummaryViewModel(result),
            ("_DiscountForm", "discount-form", new DiscountFormViewModel()));
    }

    // DELETE /checkout/partials/discount/{discountId}
    // Primary target: #order-summary
    [HttpDelete("discount/{discountId:guid}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> RemoveDiscount(Guid discountId, CancellationToken ct)
    {
        var result = await _discountService.RemoveDiscountAsync(discountId, ct);
        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));
        return PartialView("_OrderSummary", BuildSummaryViewModel(result));
    }

    // GET /checkout/partials/regions/{addressType}?countryCode=GB
    // Primary target: #region-select-{addressType}
    [HttpGet("regions/{addressType}")]
    public async Task<IActionResult> GetRegions(string addressType, [FromQuery] string countryCode, CancellationToken ct)
    {
        var regions = await _checkoutService.GetRegionsAsync(countryCode, ct);
        return PartialView("_RegionSelect", new RegionSelectViewModel(addressType, regions));
    }

    // POST /checkout/partials/check-email
    // Primary target: #email-status
    // Includes digital product account requirement check
    [HttpPost("check-email")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CheckEmail(CheckEmailFormModel model, CancellationToken ct)
    {
        var result = await _checkoutService.CheckEmailAsync(model.Email, ct);
        return PartialView("_EmailStatus", result);
    }

    // POST /checkout/partials/upsell/add
    // Primary target: #shipping-section | OOB: #order-summary
    [HttpPost("upsell/add")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddUpsell(AddUpsellFormModel model, CancellationToken ct)
    {
        var result = await _checkoutService.AddUpsellToBasketAsync(/* map model */, ct);
        var summaryVm = BuildSummaryViewModel(result);
        var shippingVm = BuildShippingViewModel(result);

        Response.Headers.Append("HX-Trigger", BuildBasketUpdatedTrigger(result));

        return PartialViewWithOob("_ShippingOptions", shippingVm,
            ("_OrderSummary", "order-summary", summaryVm));
    }
}
```

### Partial Views Required

Partials that return HTML fragments for HTMX granular swaps:

| Partial | Swapped By | Contains |
|---|---|---|
| `_ShippingOptions.cshtml` (new, extracted) | Address save, upsell add | Shipping groups with radio options, upsell suggestions, delivery date descriptions (`estimatedDeliveryDate`, `deliveryDescription` from shipping options — rendered by Razor, not client-side) |
| `_OrderSummary.cshtml` (existing, **rewritten**) | Shipping radio change, discount apply/remove, OOB on address/shipping save | Line items, totals, applied discounts. **The single-page Alpine branch (lines 188-605) must be rewritten from Alpine store templates to server-rendered Razor.** See "OrderSummary Rewrite Scope" below for full Alpine state inventory. The readonly branch (confirmation) and multi-page branch remain unchanged. Use `ViewData["IsPartialSwap"]` to detect full-page vs OOB context. |
| `_RegionSelect.cshtml` (new) | Country change | Region `<option>` elements |
| `_EmailStatus.cshtml` (new) | Email check | Sign-in prompt, create account, digital product account requirement |
| `_PaymentMethods.cshtml` (new, extracted) | Shipping form submit | Payment method list + saved methods (credit check applied server-side) |
| `_DiscountForm.cshtml` (new, extracted) | OOB reset after discount apply | Discount code input + apply button (cleared) |
| `_MobileTotal.cshtml` (new) | OOB on all summary-changing responses | Mobile sticky bar total amount (formatted) |
| `_ValidationErrors.cshtml` (new) | Form submission with errors | Field-level error messages + submitted field values |

**`_CheckoutBody.cshtml` is NOT needed** — the full page is `SinglePage.cshtml` and individual sections are swapped in place via granular targeting. The top-level `x-data="singlePageCheckout"` mega-component is REMOVED; Alpine components are small and scoped to individual sections.

### OrderSummary Rewrite Scope

The `_OrderSummary.cshtml` single-page Alpine branch (lines 188-605) is the largest rewrite. The following Alpine state and methods must be replaced with server-rendered Razor equivalents:

**Alpine state variables eliminated (from `orderSummary` component and `$store.checkout`):**

| Variable | Replacement |
|---|---|
| `$store.checkout.basketLineItems` | Razor `@foreach` over `Model.LineItems` |
| `$store.checkout.appliedDiscounts` | Razor `@foreach` over `Model.AppliedDiscounts` |
| `discountCode` | Standard `<input name="code">` in `_DiscountForm.cshtml` |
| `applyingDiscount` | HTMX `hx-indicator` on the discount form |
| `discountError` / `discountSuccess` | Server returns error/success message in `_DiscountForm.cshtml` OOB swap |
| `removingDiscount` | HTMX `hx-indicator` on remove button |
| `expanded` | Local Alpine state `x-data="{ expanded: false }"` on summary root (survives OOB swaps if placed on the root `#order-summary` element and re-initialized by `Alpine.initTree`) |
| `formatCurrency()` | Razor `@Model.CurrencySymbol@amount.ToString("N2")` or `ICurrencyService.Round()` |
| `formatLineItemTotal()` | Razor calculates: `@(li.Amount * li.Quantity)` with display currency conversion |
| `formatAddonUnitPrice()` | Razor calculates from addon `Amount * exchangeRate` |
| `applyDiscount()` | HTMX form in `_DiscountForm.cshtml`: `hx-post="/checkout/partials/discount/apply"` |
| `removeDiscount()` | HTMX button: `hx-delete="/checkout/partials/discount/{id}"` |

**Mobile collapse toggle behavior:**
The `expanded` toggle controls show/hide of the order summary on mobile. Since the entire `#order-summary` div is an OOB swap target, the `x-data="{ expanded: false }"` is placed on the `#order-summary` root element itself. When HTMX swaps the content, `Alpine.initTree` re-initializes the toggle. The collapse state resets to `false` (collapsed) on each swap — this is acceptable UX because the user just performed an action and the summary updating is visual feedback. If persistence is needed, use `Alpine.$persist` with sessionStorage.

**Discount form extraction:**
The discount code input (lines 330-363) moves to `_DiscountForm.cshtml`. The current `x-model="discountCode"` becomes a standard `<input name="code">`. The `x-show="discountError"` error message becomes server-rendered in the OOB swap response. The HTMX form replaces the Alpine reactive binding entirely.

### CSS Self-Containment for Extracted Partials

**CRITICAL:** Each extracted partial must be self-contained in terms of CSS classes. When `CheckoutPartialsController` renders a partial via `RenderPartialToStringAsync`, it renders in isolation — the parent `SinglePage.cshtml` grid context is not present. Each partial's root element must include its own structural wrapper with all necessary CSS classes:

```html
<!-- ✓ Correct: partial includes own wrapper -->
<div id="shipping-section" class="checkout-section space-y-4" data-checkout-step="shipping" data-announcement="Shipping options loaded">
    <!-- Shipping content -->
</div>

<!-- ✗ Wrong: partial relies on parent grid cell classes -->
<div id="shipping-section">
    <!-- Missing checkout-section class that was on parent in SinglePage.cshtml -->
</div>
```

In `SinglePage.cshtml`, the `@await Html.PartialAsync("_ShippingOptions", Model.ShippingViewModel)` call renders the partial inside a grid cell. The grid cell wrapper stays in `SinglePage.cshtml`; the partial's own root element gets `id` and `class` attributes. When HTMX swaps the content, it replaces the inner element (matching by `id`), not the grid cell.

### SinglePage.cshtml Section Extraction

The current `SinglePage.cshtml` is ~1,070 lines. Here is the extraction plan:

**Stays inline in SinglePage.cshtml:**
- Lines 1-50: Variable setup, display calculations, basket processing
- Lines ~50-220: Grid layout, interstitial upsells, express checkout partial reference
- Lines ~220-400: Form wrapper, general error display
- Lines ~400-580: Contact/email section (gets `#email-status` target div), billing address form (gets `hx-*` attributes), same-as-billing toggle, shipping address form
- Lines ~1060-1070: Scripts section

**Extracted into new standalone partials:**
- **Lines ~584-736 → `_ShippingOptions.cshtml`**: Shipping method section including loading overlays, error states, multi-warehouse notices, shipping groups with radio options, inline upsell suggestions. Gets `id="shipping-section"` and `data-checkout-step="shipping"`.
- **Lines ~738-1059 → `_PaymentMethods.cshtml`**: Payment method list, saved payment methods, payment form container (hosted fields, widget, direct form), purchase order form, place order button, terms checkbox. Gets `id="payment-section"` and `data-checkout-step="payment"`.
- **Discount form from `_OrderSummary.cshtml` → `_DiscountForm.cshtml`**: The discount code input and apply button. Gets `id="discount-form"`.

### Antiforgery Token Handling

With granular swaps (not whole-body swaps), the antiforgery token input rendered once in `SinglePage.cshtml` stays in the DOM and is never swapped out. This simplifies token handling:

- `SinglePage.cshtml` renders `@Html.AntiForgeryToken()` once
- **CRITICAL:** Place the token at the top of the checkout grid, OUTSIDE all HTMX swap targets (`#shipping-section`, `#payment-section`, `#order-summary`, `#email-status`, `#discount-form`, `#region-select-*`). If the token is accidentally inside a swap target, all subsequent HTMX requests will fail antiforgery validation.
- `checkout.ts` reads the token from the DOM in `htmx:configRequest` handler
- No need to include fresh tokens in partial responses
- All partial endpoints use `[ValidateAntiForgeryToken]`
- For `[HttpDelete]` endpoints (discount remove), HTMX sends the token via the request header (set in `htmx:configRequest`), not form body

### Important: Existing API Endpoints Stay

`CheckoutApiController` and `CheckoutPaymentsApiController` continue to serve JSON. They are used by:

- Payment adapters (Stripe, Braintree, PayPal, WorldPay) for `process-payment`, `express-payment-intent`, `create-order`, `capture-order`
- Express checkout component for `express-config`, `express`
- Payment flow for `pay`, `process-saved-payment`, `process-direct-payment`
- Post-purchase for upsell endpoints
- Address autocomplete for `address-lookup/*`
- Logger for `log`
- Abandoned checkout capture for `capture-email`, `capture-address`
- Password reset for `validate-password`, `reset-password`, `forgot-password`
- Account section for `sign-in`, `sign-out`, `create-account`
- Terms content for `terms/{key}`
- Any future mobile/headless checkout

The partial endpoints are an addition, not a replacement.

### Existing JSON API Endpoint Reference (Consumer Mapping)

These endpoints must remain intact. Each is mapped to its TypeScript consumer after migration:

**CheckoutApiController (`/api/merchello/checkout`):**

| Endpoint | Consumer After Migration |
|---|---|
| `GET basket` | Not used by TS (Razor renders directly) |
| `POST initialize` | Not used by TS (server initializes on page load) |
| `GET shipping/countries`, `GET shipping/regions/{code}` | Not used by TS (Razor renders `<select>` options; HTMX partial for region reload) |
| `GET billing/countries`, `GET billing/regions/{code}` | Not used by TS (Razor renders `<select>` options) |
| `POST addresses` | Not used by TS (HTMX partial replaces this) |
| `GET shipping-groups` | Not used by TS (Razor renders in partial) |
| `POST shipping` | Not used by TS (HTMX partial replaces this) |
| `POST discount/apply`, `DELETE discount/{id}` | Not used by TS (HTMX partial replaces this) |
| `POST check-email` | Not used by TS (HTMX partial replaces this) |
| `POST credit-check` | Not used by TS (server-side in SaveShipping partial) |
| `GET address-lookup/config` | `address-autocomplete.ts` (or Razor `data-*` attributes) |
| `POST address-lookup/suggestions` | `address-autocomplete.ts` |
| `POST address-lookup/resolve` | `address-autocomplete.ts` |
| `POST sign-in`, `POST sign-out` | `account-section.ts` |
| `POST forgot-password` | `forgotPasswordModal` Alpine component |
| `POST validate-password` | `account-section.ts` |
| `POST validate-reset-token`, `POST reset-password` | `ResetPassword.cshtml` inline component |
| `POST capture-email` | `checkout.ts` (abandoned checkout) |
| `POST capture-address` | `checkout.ts` (abandoned checkout) |
| `GET recover/{token}`, `GET recover/{token}/validate` | Server-side (MerchelloCheckoutController) |
| `GET terms/{key}` | `termsModal` Alpine component |

**CheckoutPaymentsApiController (`/api/merchello/checkout`):**

| Endpoint | Consumer After Migration |
|---|---|
| `GET payment-methods` | Not used by TS (Razor renders in `_PaymentMethods.cshtml`) |
| `GET payment-options` | Not used by TS (Razor renders in `_PaymentMethods.cshtml`) |
| `POST pay` | `payment.ts` |
| `POST {invoiceId}/pay` | `payment.ts`, `post-purchase.ts` |
| `POST process-payment` | `payment.ts` (adapter callback) |
| `POST process-direct-payment` | `payment.ts` (direct card) |
| `POST process-saved-payment` | `payment.ts`, `post-purchase.ts` |
| `GET return` | `Return.cshtml` inline component |
| `GET cancel` | Server-side redirect |
| `GET express-methods` | `express-checkout.ts` |
| `GET express-config` | `express-checkout.ts` |
| `POST express` | `express-checkout.ts` |
| `POST express-payment-intent` | `express-checkout.ts` |
| `POST {providerAlias}/create-order` | Payment adapters (widget-based) |
| `POST {providerAlias}/capture-order` | Payment adapters (widget-based) |
| `POST worldpay/apple-pay-validate` | `worldpay-express-adapter.ts` |

**CheckoutLogApiController (`/api/merchello/checkout`):**

| Endpoint | Consumer After Migration |
|---|---|
| `POST log` | `logger.ts` |

**Post-Purchase endpoints (`/api/merchello/checkout`):**

| Endpoint | Consumer After Migration |
|---|---|
| `GET post-purchase/{invoiceId}` | `post-purchase.ts` |
| `POST post-purchase/{invoiceId}/preview` | `post-purchase.ts` |
| `POST post-purchase/{invoiceId}/add` | `post-purchase.ts` |
| `POST post-purchase/{invoiceId}/skip` | `post-purchase.ts` |

Endpoints marked "Not used by TS" are still available for programmatic/mobile/headless use — they are not deleted.

### Server-Side Basket Recovery (Already Implemented)

Recovery from abandoned checkout links is already handled server-side by `MerchelloCheckoutController.HandleRecoveryLinkAsync()` (lines 77-79, 543-583 of `src/Merchello/Controllers/MerchelloCheckoutController.cs`). It detects the `/checkout/recover/{token}` route, calls `AbandonedCheckoutService.RestoreBasketFromRecoveryAsync(token)`, and redirects to `/checkout/information` with the restored basket.

**No changes needed** to the recovery flow. The client-side `recoverBasket()` method in the current `api.js` and its usage in `single-page-checkout.js` are dead/redundant code that will be deleted as part of the elimination of those files.

The existing `recover/{token}` JSON API endpoint stays for programmatic use, but the checkout UI has never relied on it.

### Server-Side Google Auto-Discount

The `GoogleAutoDiscountMiddleware` (`src/Merchello/Middleware/GoogleAutoDiscountMiddleware.cs`) already exists and runs on every request. It:

1. Handles the `pv2` query parameter (validates JWT, sets encrypted cookie)
2. Restores from cookie on subsequent requests
3. Populates `HttpContext.Items["MerchelloGoogleAutoDiscount"]` with a `GoogleAutoDiscountActiveDto`

**The missing piece:** `MerchelloCheckoutController` (or `CheckoutPartialsController`) needs to read `HttpContext.Items["MerchelloGoogleAutoDiscount"]` during page render and call `ICheckoutDiscountService.ApplyGoogleAutoDiscountAsync()` (using `ApplyGoogleAutoDiscountParameters`) to apply the discount to the basket before rendering.

Once the controller applies the discount server-side, the client-side fetch in `checkout.store.js` (`loadGoogleAutoDiscount()` calling `/api/merchello/feeds/auto-discount/active`) is eliminated.

The `/api/merchello/feeds/auto-discount/active` endpoint stays for programmatic use.

## Payment Flow (Alpine-Only Zone)

Payment is the one area where server-driven rendering cannot work because third-party SDKs (Stripe.js, Braintree SDK, PayPal JS SDK) must render into the DOM and handle sensitive card data client-side.

The payment flow keeps `payment.ts` and the adapter pattern intact:

1. User reaches payment step (payment section visible, methods rendered by Razor)
2. `payment-form.ts` Alpine component initializes, reads payment method data from `data-*` attributes rendered by Razor
3. User selects a payment method → Alpine component calls `window.MerchelloPayment.initiatePayment()` (JSON API, not HTMX)
4. `payment.ts` loads the provider SDK and adapter, renders hosted fields/widget into the form container
5. User submits → adapter handles tokenization → calls `process-payment` JSON API
6. Server returns redirect URL or success → `payment.ts` handles redirect or confirmation navigation

This is the same flow as today. The only change is that the payment method list and saved methods are rendered by Razor in the partial, not by an Alpine component reading from a store.

### Payment Data Attributes

Instead of reading from `checkout.store`, payment components read from Razor-rendered data attributes:

```html
<!-- Rendered by _PaymentMethods.cshtml -->
<div x-data="paymentForm"
     data-methods='@Html.Raw(JsonSerializer.Serialize(Model.PaymentMethods))'
     data-saved-methods='@Html.Raw(JsonSerializer.Serialize(Model.SavedMethods))'
     data-can-vault="@Model.CanSavePaymentMethods"
     data-invoice-id="@Model.InvoiceId"
     data-return-url="/checkout/return"
     data-cancel-url="/checkout/cancel">
```

### Payment Data Flow Changes

- **`payment.js`'s `getVaultSettings()`** currently reads from `Alpine.store('checkout')`. After migration, `paymentForm.ts` Alpine component passes vault settings directly to `MerchelloPayment.initiatePayment()` as parameters, or reads from `data-*` attributes on the `[x-data="paymentForm"]` element.
- **Tokenization and payment submission are unchanged.** The adapter receives form data (card number, expiry) from its rendered form, tokenizes via the provider SDK, and calls the JSON API endpoint. This flow does not touch the Alpine store.
- **Saved payment method selection:** Methods are rendered by Razor as radio buttons in `_PaymentMethods.cshtml`. Selection is Alpine component local state (`x-model`), not a global store. The `paymentForm.ts` component manages `selectedSavedMethod` locally.
- **`window.MerchelloPayment` API surface stays unchanged.** All adapters call `MerchelloPayment.initiatePayment()`, `MerchelloPayment.renderPaymentForm()`, etc. These methods receive parameters from the caller (`paymentForm.ts` component), not from the store.

### Express Checkout

Express checkout (`express-checkout.ts`) continues to:
- Read `window.MerchelloExpressConfig` (set by `_ExpressCheckout.cshtml` inline script)
- Call `GET /api/merchello/checkout/express-config` for method configuration
- Load express adapter scripts dynamically
- Render buttons into `#express-buttons-container`
- Process express payment via `POST /api/merchello/checkout/express`

The only change: basket amount updates come via HTMX `basketUpdated` event (HX-Trigger header) instead of the `merchello:basket-updated` custom event dispatched by `order-summary.js`.

## Form Validation UX

### Client-Side Validation (Alpine)

`components/validation.ts` is an Alpine `x-data` factory that provides immediate field-level validation feedback:

- Validates on `blur` events (not every keystroke)
- Shows red error text below fields via Alpine reactive `errors` object
- Clears errors on `input` events (user starts correcting)
- Runs full form validation before HTMX submission
- Announces validation results to screen readers via `announcer.ts`

Rules match the current implementation:
- Required fields: name, addressOne, townCity, countryCode, postalCode (+ phone if configured)
- Email: RFC 5322 regex
- Phone: length >= 7, allow +, -, spaces, parens, digits
- Postal code: minimum length check

### Server-Side Validation (Partial Responses)

When HTMX submits a form and the server finds validation errors:
- The partial response includes the form with submitted values pre-populated (fields NOT cleared)
- Error messages rendered with the same CSS classes as client-side validation
- UX is identical whether validation is client or server

### After HTMX Swaps

When HTMX replaces a section containing form fields, `Alpine.initTree()` reinitializes the validation component. If the server returned validation errors pre-rendered in HTML, they are visible immediately without re-running client validation.

## Same-as-Billing Toggle

Pure Alpine interaction, no HTMX round-trip:
- `x-show="!sameAsBilling"` on shipping address fields
- Hidden field `name="sameAsBilling"` included in form data for HTMX submissions
- Server reads the flag and uses billing address for shipping if true
- ~10 lines of Alpine code

## Marketing Opt-In (acceptsMarketing)

The checkout has a "Keep me updated with news and exclusive offers" checkbox (`SinglePage.cshtml` lines 540-549) currently bound to `x-model="form.acceptsMarketing"` in the `singlePageCheckout` Alpine store.

After migration:
- The checkbox stays in the contact/email section of `SinglePage.cshtml` (OUTSIDE all HTMX swap targets — it is never replaced by a partial swap)
- Rendered as a standard HTML checkbox: `<input type="checkbox" name="acceptsMarketing" value="true" />`
- Included in HTMX address form submission as a form field (HTMX sends all `<input>` within the `<form>` automatically)
- `SaveAddressesFormModel.AcceptsMarketing` (bool) receives the value
- Server persists to `CheckoutSession.AcceptsMarketing` via `ICheckoutService.SaveAddressesAsync()`
- Value flows through to `ICustomerService.GetOrCreateByEmailAsync()` at order creation (ratchet-up: only false→true)

No Alpine binding needed — this is a standard HTML checkbox.

## Mobile Sticky Action Bar

`SinglePage.cshtml` lines 885-905 render a mobile-only sticky bottom bar with the order total and a "Complete Order" button. This bar is **OUTSIDE all HTMX swap targets** (it sits at the page level, after the grid layout).

Current implementation:
- Total reads from Alpine store: `x-text="formattedTotal"` with server-rendered fallback
- Button calls `submitOrder()` from the `singlePageCheckout` component
- Button has `:disabled="!canSubmit || isSubmitting"` and loading spinner

After migration:
- **Total display**: Add `id="mobile-total"` to the total `<span>`. Include as an OOB swap target on every response that changes the basket total (address save, shipping select, shipping submit, discount apply/remove, upsell add). The `CheckoutPartialsController` helper methods should include `("_MobileTotal", "mobile-total", summaryVm)` as an additional OOB fragment.
- **Submit button**: The button triggers the `paymentForm` Alpine component's submit method. Replace `@@click="submitOrder"` with `@@click="$dispatch('submit-payment')"` and have `paymentForm.ts` listen for this event. Alternatively, use a form `submit` event on the payment form and have this button submit it via `document.getElementById('payment-form').requestSubmit()`.
- **Disabled/loading state**: Read from the `paymentForm` Alpine component scope. Since the mobile bar is outside the `paymentForm` component's `x-data`, use Alpine `$store` for minimal shared state (just `isSubmitting` and `canSubmit`), or use `x-data` with `Alpine.store('paymentState')`.

New partial required:
- `_MobileTotal.cshtml` — renders just the formatted total span content. Included as OOB target.

## Modals (Terms Side-Pane & Forgot Password)

`SinglePage.cshtml` contains two modals that currently live inside the `x-data="singlePageCheckout"` scope. After removing this mega-component, each modal needs its own Alpine component scope.

### Terms Side-Pane Modal (Lines 907-956)

A slide-in panel showing Terms or Privacy content, loaded via `fetch()`.

**Alpine state required:** `showTermsModal`, `termsModalTitle`, `termsContent`, `termsLoading`
**Methods:** `openTermsModal(key, title)`, `closeTermsModal()`

**After migration:** Managed by a small inline Alpine component or by `checkout.ts` module scope. Since the modal is outside all HTMX swap targets, it is never replaced by partial swaps and can use a simple `x-data` scope:

```html
<div x-data="termsModal" x-cloak>
    <!-- Existing modal markup unchanged -->
</div>
```

Register `termsModal` in `checkout.ts`:
```typescript
Alpine.data('termsModal', () => ({
    showTermsModal: false,
    termsModalTitle: '',
    termsContent: '',
    termsLoading: false,
    _cache: new Map<string, string>(),

    openTermsModal(key: string, title: string) {
        this.termsModalTitle = title;
        this.showTermsModal = true;
        if (this._cache.has(key)) {
            this.termsContent = this._cache.get(key)!;
            return;
        }
        this.termsLoading = true;
        fetch(`/api/merchello/checkout/terms/${key}`)
            .then(r => r.text())
            .then(html => { this.termsContent = html; this._cache.set(key, html); })
            .catch(() => { this.termsContent = '<p>Failed to load content.</p>'; })
            .finally(() => { this.termsLoading = false; });
    },
    closeTermsModal() { this.showTermsModal = false; }
}));
```

The footer Terms/Privacy links (in `_Layout.cshtml`) call `openTermsModal('terms', 'Terms & Conditions')` etc. These links need `x-on:click` handlers that dispatch a custom event, or the `termsModal` component scope must wrap the footer area. Simplest: place the modal markup just before `</body>` inside a standalone `x-data="termsModal"`, and have footer links use `$dispatch('open-terms', { key, title })` with `@open-terms.window` listener on the modal.

### Forgot Password Modal (Lines 958-1061)

A centered modal for password reset email sending.

**Alpine state required:** `showForgotPasswordModal`, `forgotPasswordLoading`, `forgotPasswordSuccess`, `forgotPasswordError`
**Methods:** `sendForgotPasswordEmail()`, `closeForgotPasswordModal()`

**After migration:** Managed by `accountSection` Alpine component. The modal markup must be inside the `x-data="accountSection"` scope in `SinglePage.cshtml`. Since the account section (email check, sign-in) is in the contact area of the checkout form, and the modal is at the bottom of the page, the `x-data="accountSection"` scope must wrap both:

Option A: Move the forgot password modal markup into the contact/email section (inside `accountSection` scope).
Option B: Use `$dispatch('open-forgot-password')` with `@open-forgot-password.window` listener pattern (same as terms modal).

**Recommended:** Option B — keeps the modal at the bottom of the page (avoids z-index/overflow issues) and decouples it from the account section layout. Register a small `forgotPasswordModal` Alpine component in `checkout.ts` or `account-section.ts`:

```typescript
Alpine.data('forgotPasswordModal', () => ({
    show: false,
    loading: false,
    success: false,
    error: '',
    email: '',

    async send() {
        this.loading = true;
        this.error = '';
        try {
            await fetch('/api/merchello/checkout/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.email })
            });
            this.success = true;
        } catch { this.error = 'Unable to send reset email. Please try again.'; }
        finally { this.loading = false; }
    },
    close() { this.show = false; this.success = false; this.error = ''; }
}));
```

The `accountSection` component dispatches `$dispatch('open-forgot-password', { email })` and the modal listens via `@open-forgot-password.window="email = $event.detail.email; show = true"`.

## Upsell Integration

The current checkout has two types of upsells, both managed in `checkout.store.js` with complex state (`upsellSuggestions`, `upsellsLoading`, `upsellsError`, `interstitialSeen`, `interstitialDismissed`, `inlineUpsellsCollapsed`, `addedUpsellProductIds`, `upsellAddingToCart`). After migration:

### Interstitial Upsells (Shown Before Checkout Form)

Interstitial upsells appear above the checkout form and must be dismissed before proceeding. They are NOT inside any HTMX swap target.

- Rendered by Razor in the initial page load from `CheckoutViewModel.UpsellSuggestions` (**NOTE:** This property must be added to `CheckoutViewModel` — it does not exist today. Populate from `IUpsellEngine.GetSuggestionsAsync()` in `MerchelloCheckoutController.Index()`. Use the existing `UpsellSuggestionDto` type.)
- A small Alpine component (`upsellInterstitial`) manages show/dismiss state via `sessionStorage` keyed by basket ID
- Preserves `merchello:checkout:upsells:interstitial-seen:{basketId}` sessionStorage key contract
- "Add to cart" from interstitial uses `fetch()` to JSON API (NOT HTMX) because it needs to update the basket and then reload the entire checkout (all sections change when items are added)
- `addedUpsellProductIds`: Server tracks this — products already in basket are excluded from suggestions in the server response
- `upsellAddingToCart`: Component-local loading state in the Alpine component

### Inline Upsells (Inside Shipping Section)

- Server renders inline upsell suggestions in the `_ShippingOptions.cshtml` partial (data from `CheckoutSession.UpsellImpressions`)
- "Add" button: `hx-post="/checkout/partials/upsell/add"` → server adds item, recalculates, returns updated `#shipping-section` + OOB `#order-summary`
- Already-added products excluded server-side (no client-side tracking needed)
- Removed auto-add tracking: server checks `CheckoutSession.RemovedAutoAddUpsells` to prevent re-addition

### Upsell Analytics

The `checkout:upsell_add` event currently fires from `single-page-checkout.js`. After migration, the server includes a `data-upsell-added` attribute on the response element when an upsell was just added. The `htmx:afterSettle` handler in `checkout.ts` detects this attribute and fires the analytics event via `window.MerchelloCheckout.emit()`.

## CSS Loading States

Add HTMX indicator styles to `checkout.css`:

```css
/* HTMX loading indicators */
.htmx-indicator { display: none; }
.htmx-request .htmx-indicator { display: block; }
.htmx-request.htmx-indicator { display: block; }

/* Order summary loading overlay */
#order-summary { position: relative; }
#order-summary .htmx-indicator {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}
```

Loading states needed:
- Order summary: semi-transparent overlay + spinner during shipping/discount changes
- Region dropdown: inline spinner during country change
- Form submit buttons: disabled + spinner during submission

## Stable URL Paths (Preserved)

All existing paths remain valid:

- `/App_Plugins/Merchello/js/checkout/index.js` (entry point, now loads HTMX config + Alpine components)
- `/App_Plugins/Merchello/js/checkout/payment.js` (unchanged adapter orchestration)
- `/App_Plugins/Merchello/js/checkout/analytics.js` (unchanged classic script)
- `/App_Plugins/Merchello/js/checkout/single-page-analytics.js` (unchanged classic script)
- `/App_Plugins/Merchello/js/checkout/confirmation.js` (unchanged classic script)
- `/App_Plugins/Merchello/js/checkout/post-purchase.js` (unchanged classic script)
- `/App_Plugins/Merchello/js/checkout/adapters/*.js` (unchanged adapter scripts)
- `/App_Plugins/Merchello/css/checkout.css` (unchanged Tailwind output)

Paths that are removed (no longer emitted because the functionality moves to Razor + HTMX):

- `/App_Plugins/Merchello/js/checkout/stores/checkout.store.js`
- `/App_Plugins/Merchello/js/checkout/services/api.js`
- `/App_Plugins/Merchello/js/checkout/components/single-page-checkout.js`
- `/App_Plugins/Merchello/js/checkout/components/checkout-address-form.js`
- `/App_Plugins/Merchello/js/checkout/components/checkout-shipping.js`
- `/App_Plugins/Merchello/js/checkout/components/checkout-payment.js`
- `/App_Plugins/Merchello/js/checkout/components/order-summary.js`
- `/App_Plugins/Merchello/js/checkout/utils/formatters.js`
- `/App_Plugins/Merchello/js/checkout/utils/regions.js`
- `/App_Plugins/Merchello/js/checkout/utils/debounce.js`

These paths are only consumed by `index.js` module imports, not by external references. Removing them is safe once `index.js` no longer imports them.

## Window Globals (Preserved)

| Global | Status | Notes |
|---|---|---|
| `window.Alpine` | Kept | Still needed for payment, express, autocomplete, validation, account components |
| `window.MerchelloPayment` | Kept | Payment adapter orchestration unchanged |
| `window.MerchelloPaymentAdapters` | Kept | Adapter registry unchanged |
| `window.MerchelloExpressAdapters` | Kept | Express adapter registry unchanged; still initialized by `_ExpressCheckout.cshtml` inline script |
| `window.MerchelloExpressConfig` | Kept | Still initialized by `_ExpressCheckout.cshtml` inline script |
| `window.MerchelloCheckout` | Kept | Analytics event emitter unchanged |
| `window.MerchelloSinglePageAnalytics` | Kept | SPA analytics unchanged |
| `window.MerchelloLogger` | Kept | Logger unchanged |
| `window.merchelloCheckoutData` | Kept | Still set by `_Layout.cshtml` inline script |

## Alpine Component Registration Changes

### Current Alpine Registration Map (Reference)

The current `index.js` registers these Alpine components via `init*()` factory functions. Each function returns an Alpine `data()` factory. This table maps the init function to the exact Alpine component name it registers (the first argument to `Alpine.data()`):

| Init Function | Alpine `data()` Name | Source File | Status After Migration |
|---|---|---|---|
| `initSinglePageCheckout()` | `singlePageCheckout` | `single-page-checkout.js` | **REMOVED** |
| `initCheckoutAddressForm()` | `checkoutAddressForm` | `checkout-address-form.js` | **REMOVED** |
| `initCheckoutShipping()` | `checkoutShipping` | `checkout-shipping.js` | **REMOVED** |
| `initCheckoutPayment()` | `checkoutPayment` | `checkout-payment.js` | **REMOVED** |
| `initOrderSummary()` | `orderSummary` | `order-summary.js` | **REMOVED** |
| `initExpressCheckout()` | `expressCheckout` | `express-checkout.js` | **KEPT** (converted to TS) |
| `initCheckoutStore()` | Alpine store `'checkout'` | `checkout.store.js` | **REMOVED** (not a component, a store) |

### Removed Registrations (Functionality Moves to Razor + HTMX)

| Component | Currently Registered In | Why Removed |
|---|---|---|
| `singlePageCheckout` | `index.js` via `initSinglePageCheckout()` | Mega-orchestrator eliminated; HTMX handles flow |
| `checkoutAddressForm` | `index.js` via `initCheckoutAddressForm()` | Razor renders form, HTMX submits |
| `checkoutShipping` | `index.js` via `initCheckoutShipping()` | Razor renders shipping options, HTMX submits selection |
| `checkoutPayment` | `index.js` via `initCheckoutPayment()` | Razor renders payment method list in `_PaymentMethods.cshtml` |
| `orderSummary` | `index.js` via `initOrderSummary()` | Razor renders summary, HTMX swaps on changes |

### Kept Registrations

| Component | File | Notes |
|---|---|---|
| `expressCheckout` | `components/express-checkout.ts` | Express payment buttons (Apple Pay, Google Pay, PayPal) |

### New Registrations (in `checkout.ts`)

| Component | File | Purpose |
|---|---|---|
| `paymentForm` | `components/payment-form.ts` | Payment SDK integration (hosted fields, widget, direct form) |
| `addressAutocomplete` | `components/address-autocomplete.ts` | Address lookup typeahead (config, suggestions, resolve) |
| `validation` | `components/validation.ts` | Real-time field validation UX (blur/input events) |
| `accountSection` | `components/account-section.ts` | Sign-in, create account, forgot password dispatch, digital product requirement |
| `termsModal` | Inline in `checkout.ts` (~30 lines) | Terms/Privacy side-pane modal with fetch + client-side cache |
| `forgotPasswordModal` | Inline in `checkout.ts` or `account-section.ts` (~25 lines) | Password reset email sending modal |
| `upsellInterstitial` | Inline in `checkout.ts` (~20 lines) | Interstitial upsell show/dismiss via sessionStorage |

## SessionStorage Key Contracts (Preserved)

- `merchello:checkout:upsells:interstitial-seen:{basketId}` — used by post-purchase; stays in `post-purchase.ts`
- `merchello_checkout_*` prefix — cleaned up by `confirmation.ts`

## C# Payment Provider Adapter URL Constants (Unchanged)

All 10 adapter URL constants remain valid because adapter files are still emitted to the same paths:

| Provider | Constant | Value |
|---|---|---|
| Braintree | `BraintreePaymentAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/braintree-payment-adapter.js` |
| Braintree | `BraintreeLocalPaymentAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/braintree-local-payment-adapter.js` |
| Braintree | `BraintreeExpressAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/braintree-express-adapter.js` |
| PayPal | `PayPalPaymentAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/paypal-unified-adapter.js` |
| PayPal | `PayPalExpressAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/paypal-unified-adapter.js` |
| Stripe | `StripePaymentAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/stripe-payment-adapter.js` |
| Stripe | `StripeCardElementsAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/stripe-card-elements-adapter.js` |
| Stripe | (express) | `/App_Plugins/Merchello/js/checkout/adapters/stripe-express-adapter.js` |
| WorldPay | `WorldPayPaymentAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/worldpay-payment-adapter.js` |
| WorldPay | `WorldPayExpressAdapterUrl` | `/App_Plugins/Merchello/js/checkout/adapters/worldpay-express-adapter.js` |

## Backoffice Compatibility (Unchanged)

The backoffice payment provider test modal (`test-provider-modal.element.ts`) continues to:
- Load adapter scripts via `_loadScript()` (lines 379-405)
- Read `window.MerchelloPaymentAdapters` (line 409) and `window.MerchelloExpressAdapters` (line 670)
- Work without Alpine, import maps, or checkout-specific globals

No changes needed because adapters are still emitted as self-contained classic scripts.

## Build Pipeline

### Current State

Today `build:checkout` is CSS-only:
```bash
npx tailwindcss -c ../Styles/tailwind.config.js -i ../Styles/checkout.css -o ../wwwroot/App_Plugins/Merchello/css/checkout.css --minify
```

There is NO JavaScript build step. Checkout JS files live in `Client/public/js/checkout/` and are copied to `wwwroot/App_Plugins/Merchello/js/checkout/` by Vite's `publicDir` mechanism during `build:backoffice`.

### New Build Pipeline

After migration, checkout JS is built by esbuild from TypeScript source in `Client/src/checkout/`. The `Client/public/js/checkout/` directory is deleted entirely.

### HTMX Dependency

**Vendored script (recommended for robustness)**
```html
<!-- _Layout.cshtml — HTMX loaded as plain script BEFORE modules -->
<script src="/App_Plugins/Merchello/js/vendor/htmx.min.js"></script>

<!-- Import map stays for Alpine (HTMX is NOT in the import map — it's not an ESM module) -->
<script type="importmap">
{
    "imports": {
        "alpinejs": "https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/module.esm.js",
        "@alpinejs/collapse": "https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.14.9/dist/module.esm.js"
    }
}
</script>

<!-- Merchello Checkout Module — checkout.ts compiled output -->
<script type="module" src="/App_Plugins/Merchello/js/checkout/index.js"></script>
```

HTMX (~14KB gzipped) loaded as a plain script. Must load BEFORE the module script since `checkout.ts` attaches HTMX event listeners at module evaluation time.

**Conditional loading:** The HTMX script tag, import map, and `index.js` module script should all be inside the same `@if` conditional block that currently gates `index.js` (not loaded on Confirmation/PostPurchase pages). Loading HTMX on those pages is technically harmless (no `hx-*` attributes), but unnecessary. If simplicity is preferred, loading HTMX unconditionally is fine — it adds no overhead without `hx-*` attributes in the DOM.

### Checkout JS Build

Dedicated esbuild script (`scripts/build-checkout.mjs`):

- **ESM outputs** for module graph: `checkout.ts` (→ `index.js`), `payment.ts` (→ `payment.js`), and their imports (`components/*.ts`, `services/logger.ts`, `utils/*.ts`). Config: `bundle: true`, `splitting: false`, `format: "esm"`, `external: ['alpinejs', '@alpinejs/collapse']` (resolved via import map at runtime).
- **Classic IIFE outputs** for analytics, confirmation, post-purchase, single-page-analytics. Config: `bundle: true`, `format: "iife"`.
- **Classic IIFE outputs** for all adapters (9 provider adapters + adapter-interface). Config: `bundle: true`, `format: "iife"`. **Note:** `globalName` is NOT needed in the esbuild config because adapters manually assign to `window.MerchelloPaymentAdapters[key]` and `window.MerchelloExpressAdapters[key]` — these explicit property assignments survive IIFE wrapping.
- Stable filenames, no hashing: `entryNames: '[name]'`
- Output directly to `wwwroot/App_Plugins/Merchello/js/checkout/` with `outbase` set to preserve `adapters/` subdirectory structure.
- `build:checkout` remains the single public command

### Package.json Scripts

```json
{
  "build:checkout:css": "tailwindcss -c ../Styles/tailwind.config.js -i ../Styles/checkout.css -o ../wwwroot/App_Plugins/Merchello/css/checkout.css --minify",
  "build:checkout:js": "node scripts/build-checkout.mjs",
  "build:checkout": "npm run build:checkout:css && npm run build:checkout:js",
  "watch": "tsc && concurrently \"vite build --watch\" \"node scripts/build-checkout.mjs --watch\""
}
```

Note: Add `concurrently` as a devDependency for parallel watch mode.

**Watch mode implementation in `build-checkout.mjs`:** The `--watch` flag is a custom argument parsed by the script. Use esbuild's `context.watch()` API for incremental rebuilds:

```javascript
// In build-checkout.mjs
const isWatch = process.argv.includes('--watch');

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching checkout files...');
} else {
    await esbuild.build(buildOptions);
}
```

### TypeScript Configuration (`tsconfig.checkout.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": [],
    "baseUrl": ".",
    "paths": { "@checkout/*": ["src/checkout/*"] }
  },
  "include": ["src/checkout/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`noEmit: true` because esbuild handles transpilation and bundling. `tsc` is used only for type-checking. Add a type-check script: `"typecheck:checkout": "tsc --project tsconfig.checkout.json"`.

### Vite Separation and Build Order

**Strategy:** Keep `emptyOutDir: true` in `vite.config.ts`. The `build` script order guarantees correctness:

```
build:backoffice (Vite wipes dir, copies publicDir) → build:checkout (esbuild writes JS, Tailwind writes CSS)
```

Since `build:backoffice` runs first and wipes the output dir, then copies `publicDir` contents (which during Phases 1-6 still includes old checkout JS from `Client/public/js/checkout/`), the esbuild output from `build:checkout:js` runs after and writes the final files.

After Phase 7 (when `Client/public/js/checkout/` is deleted), Vite no longer copies checkout JS. esbuild output comes after and populates the directory.

**IMPORTANT:** Running `build:backoffice` alone will delete checkout JS output. Always run `build:checkout` after, or use the combined `build` script. The `build` script in `package.json` must be:

```json
"build": "npm run test:run && npm run build:backoffice && npm run build:checkout"
```

### Tailwind Content Globs

Update `src/Merchello/Styles/tailwind.config.js` to scan **source** files (not output):

```js
content: [
  "../App_Plugins/Merchello/Views/Checkout/**/*.cshtml",
  "../Client/src/checkout/**/*.{ts,js}"   // NEW: scan TS source
]
```

Remove: `"../wwwroot/App_Plugins/Merchello/js/checkout/**/*.js"` (output JS).

**Why source, not output:** Tailwind must scan files that exist BEFORE the build runs. The old glob scanned output JS which only existed after Vite copied it. The new glob scans TS source which always exists. This also ensures `build:checkout:css` can run before `build:checkout:js` without missing classes.

## Source Layout

```text
src/Merchello/Client/src/checkout/
  adapters/                          # Payment adapters (9 provider files + 1 interface, TS conversion)
    adapter-interface.ts             # Adapter registration helpers, registry management
    braintree-payment-adapter.ts
    braintree-local-payment-adapter.ts
    braintree-express-adapter.ts
    paypal-unified-adapter.ts
    stripe-payment-adapter.ts
    stripe-card-elements-adapter.ts
    stripe-express-adapter.ts
    worldpay-payment-adapter.ts
    worldpay-express-adapter.ts
  components/
    payment-form.ts                  # Alpine: hosted fields, widget, direct form
    express-checkout.ts              # Alpine: express buttons
    address-autocomplete.ts          # Alpine: address lookup suggestions (config, typeahead, resolve)
    validation.ts                    # Alpine: real-time field validation
    account-section.ts               # Alpine: sign-in, create account, forgot password
  services/
    logger.ts                        # Batched log transport
  types/
    checkout.types.ts                # Domain types, initial data shapes
    api.types.ts                     # Request/response DTOs
    payment-adapter.types.ts         # Adapter contracts
    analytics.types.ts               # Analytics data shapes
  utils/
    payment-errors.ts                # Error classification and user messages
    security.ts                      # HMAC, token validation
    announcer.ts                     # ARIA live region for screen reader announcements
    error-boundary.ts                # Global error/rejection handler, recovery banner, HTMX error hook
  checkout.ts                        # Entry: HTMX config, Alpine init, lifecycle, abandoned capture, terms modal
  payment.ts                         # Payment orchestration (window.MerchelloPayment)
  analytics.ts                       # Event emitter (window.MerchelloCheckout)
  single-page-analytics.ts           # SPA step tracking
  confirmation.ts                    # Back-button protection, storage cleanup
  post-purchase.ts                   # Upsell rendering, saved-method charging
  checkout-globals.d.ts              # Window interface augmentation (includes HTMX event types)
```

### `checkout-globals.d.ts` Required Declarations

The globals declaration file must declare:

```typescript
// HTMX global (loaded as plain script, not ESM)
interface HtmxApi {
    process(elt: Element): void;
    trigger(elt: Element, name: string, detail?: any): void;
    // Add other methods as needed
}
declare const htmx: HtmxApi;

// HTMX event types
interface HtmxConfigRequestEvent extends CustomEvent {
    detail: { headers: Record<string, string>; parameters: Record<string, string> };
}
interface HtmxBeforeSwapEvent extends CustomEvent {
    detail: { xhr: XMLHttpRequest; target: HTMLElement; shouldSwap: boolean; isError: boolean };
}
interface HtmxAfterSwapEvent extends CustomEvent {
    detail: { target: HTMLElement; xhr: XMLHttpRequest };
}
interface HtmxAfterSettleEvent extends CustomEvent {
    detail: { target: HTMLElement };
}

// Existing window globals
interface Window {
    Alpine: typeof import('alpinejs').default;
    MerchelloPayment: MerchelloPaymentApi;
    MerchelloPaymentAdapters: Record<string, PaymentAdapter>;
    MerchelloExpressAdapters: Record<string, ExpressAdapter>;
    MerchelloExpressConfig: ExpressConfig;
    MerchelloCheckout: AnalyticsEmitter;
    MerchelloSinglePageAnalytics: SinglePageAnalytics;
    MerchelloLogger: CheckoutLogger;
    merchelloCheckoutData: AnalyticsCheckoutData;
}
```

**Note:** HTMX is accessed via the global `htmx` object (added to `window` by the HTMX script tag), not via an ES module `import` statement. The `checkout.ts` entry point uses `document.body.addEventListener('htmx:*', ...)` for HTMX events, not `htmx.*` methods directly.

## Complete File Deletion Manifest

### Files Deleted (Not Converted) — ~5,420 Lines

These files are eliminated entirely because their functionality moves to Razor + HTMX:

| File | Lines | Replacement |
|---|---|---|
| `stores/checkout.store.js` | 1,029 | Razor renders state; no client store needed |
| `services/api.js` | 470 | HTMX request/response cycle + fetch() in payment/account components |
| `components/single-page-checkout.js` | 2,216 | HTMX granular swaps + small Alpine components |
| `components/checkout-address-form.js` | 374 | Razor renders form; HTMX submits; Alpine for autocomplete/validation |
| `components/checkout-shipping.js` | 238 | Razor renders options; HTMX submits selection |
| `components/checkout-payment.js` | 433 | Razor renders method list in `_PaymentMethods.cshtml` |
| `components/order-summary.js` | 396 | Razor renders summary; HTMX swaps on changes |
| `utils/formatters.js` | 83 | Server formats currency in Razor |
| `utils/regions.js` | 95 | Server renders region dropdowns via `_RegionSelect.cshtml` |
| `utils/debounce.js` | 86 | Tiny inline debounce in checkout.ts for captureAddress |

### Files Converted (Old JS Deleted, New TS Created)

| Old File | New File |
|---|---|
| `index.js` | `checkout.ts` |
| `payment.js` | `payment.ts` |
| `components/express-checkout.js` | `components/express-checkout.ts` |
| `services/validation.js` | `components/validation.ts` |
| `services/logger.js` | `services/logger.ts` |
| `services/error-boundary.js` | `utils/error-boundary.ts` |
| `utils/payment-errors.js` | `utils/payment-errors.ts` |
| `utils/security.js` | `utils/security.ts` |
| `utils/announcer.js` | `utils/announcer.ts` |
| `analytics.js` | `analytics.ts` |
| `single-page-analytics.js` | `single-page-analytics.ts` |
| `confirmation.js` | `confirmation.ts` |
| `post-purchase.js` | `post-purchase.ts` |
| `adapters/adapter-interface.js` | `adapters/adapter-interface.ts` |
| `adapters/stripe-payment-adapter.js` | `adapters/stripe-payment-adapter.ts` |
| `adapters/stripe-card-elements-adapter.js` | `adapters/stripe-card-elements-adapter.ts` |
| `adapters/stripe-express-adapter.js` | `adapters/stripe-express-adapter.ts` |
| `adapters/braintree-payment-adapter.js` | `adapters/braintree-payment-adapter.ts` |
| `adapters/braintree-local-payment-adapter.js` | `adapters/braintree-local-payment-adapter.ts` |
| `adapters/braintree-express-adapter.js` | `adapters/braintree-express-adapter.ts` |
| `adapters/paypal-unified-adapter.js` | `adapters/paypal-unified-adapter.ts` |
| `adapters/worldpay-payment-adapter.js` | `adapters/worldpay-payment-adapter.ts` |
| `adapters/worldpay-express-adapter.js` | `adapters/worldpay-express-adapter.ts` |

### New Files (No Old Equivalent)

| File | Purpose |
|---|---|
| `components/payment-form.ts` | Alpine component extracted from `checkout-payment.js` payment form rendering |
| `components/address-autocomplete.ts` | Alpine component extracted from `checkout-address-form.js` autocomplete logic |
| `components/account-section.ts` | Alpine component extracted from `single-page-checkout.js` account/sign-in flows |
| `types/checkout.types.ts` | Domain types matching C# DTOs |
| `types/api.types.ts` | Request/response DTO types |
| `types/payment-adapter.types.ts` | Adapter contract types |
| `types/analytics.types.ts` | Analytics data shape types |
| `checkout-globals.d.ts` | Window interface augmentation |

### Test Files

| File | Action |
|---|---|
| `src/Merchello/Client/src/checkout/order-summary.js` | Delete (pure utility functions `calculateDiscountDelta()` and `getEffectiveDiscount()` for client-side discount display — no longer needed since server renders discount amounts in `_OrderSummary.cshtml`) |
| `src/Merchello/Client/src/checkout/order-summary.test.js` | Delete (tests eliminated component; replace with C# partial tests) |
| `src/Merchello/Client/src/checkout/braintree-local-payment-adapter.test.js` | Keep and update imports for TS conversion |

### Directory Removed

After migration, the entire `src/Merchello/Client/public/js/checkout/` directory is deleted. The `Client/public/` directory retains:
- `js/vendor/htmx.min.js` (new)
- `img/*` (existing static assets)

## Migration Phases

### Phase Ordering & Atomic Deployment

All phases must be developed on a feature branch and deployed atomically. Between Phase 3 (HTMX attributes on markup) and Phase 4 (HTMX lifecycle handlers in `checkout.ts`), the checkout would be broken if deployed separately — the old `single-page-checkout.js` orchestrator conflicts with HTMX attributes on the same elements. Development should proceed phase-by-phase for clear PR reviews, but deployment is a single release.

### Phase 1: Build Foundation + HTMX Setup

**Files to modify:**
- `src/Merchello/Client/package.json` — add esbuild, htmx.org dev dependencies
- `src/Merchello/Client/tsconfig.checkout.json` (new) — checkout-specific TS config
- `src/Merchello/Client/scripts/build-checkout.mjs` (new) — dedicated build script
- `src/Merchello/Client/vite.config.ts` — stop clearing checkout output
- `src/Merchello/Styles/tailwind.config.js` — scan new source tree

**Tasks:**
1. Add esbuild as dev dependency
2. Add checkout-specific TS config
3. Create dedicated checkout build script (ESM + classic IIFE + adapter outputs)
4. Update `package.json` scripts: `build:checkout:js` (NEW), `build:checkout:css` (rename existing), `build:checkout` (runs both)
5. Ensure Vite no longer clears checkout JS output (`emptyOutDir` handling)
6. Update Tailwind content globs: add `Client/src/checkout/**/*.{ts,js}`, remove `wwwroot/.../js/checkout/**/*.js`
7. Vendor HTMX: download `htmx.min.js` to `Client/public/js/vendor/htmx.min.js`
8. Add HTMX indicator CSS to `checkout.css`
9. Verify both build commands can run in either order without deleting each other's artifacts

### Phase 2: Types + Global Contracts

**New files:**
- `src/Merchello/Client/src/checkout/types/checkout.types.ts`
- `src/Merchello/Client/src/checkout/types/api.types.ts`
- `src/Merchello/Client/src/checkout/types/payment-adapter.types.ts`
- `src/Merchello/Client/src/checkout/types/analytics.types.ts`
- `src/Merchello/Client/src/checkout/checkout-globals.d.ts`

**Tasks:**
1. Define TypeScript interfaces for all checkout domain types matching C# DTOs (60+ types across Checkout, Accounting, Locality namespaces)
2. Define payment adapter and express adapter contracts
3. Define analytics data shapes (`AnalyticsCheckoutData`, event payloads including `checkout:post_purchase_view` and `checkout:post_purchase_error`)
4. Declare all window globals in `checkout-globals.d.ts` (including HTMX event types)
5. Define HTMX event types for basket updates and step transitions

### Phase 3: CheckoutPartialsController + Razor Partials

**New files:**
- `src/Merchello/Controllers/CheckoutPartialsController.cs`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_RegionSelect.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_EmailStatus.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_ShippingOptions.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_PaymentMethods.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_DiscountForm.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_MobileTotal.cshtml`
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_ValidationErrors.cshtml`

**Files to modify:**
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/SinglePage.cshtml` — extract sections into partials, add HTMX attributes, remove `x-data="singlePageCheckout"` mega-component, add section `id` attributes
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_Layout.cshtml` — add HTMX vendor script tag BEFORE import map
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_OrderSummary.cshtml` — support HTMX partial return (standalone context), extract discount form
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_AddressForm.cshtml` — add HTMX attributes, `data-address-capture` for abandoned checkout
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_ExpressCheckout.cshtml` — update to listen for `basketUpdated` HTMX event
- `src/Merchello/Controllers/MerchelloCheckoutController.cs` — add Google auto-discount application during page render (read `HttpContext.Items["MerchelloGoogleAutoDiscount"]`, call `ApplyGoogleAutoDiscountAsync`)

**Tasks:**
1. Create `CheckoutPartialsController` with `[ServiceFilter(typeof(CheckoutExceptionFilter))]`, `IRateLimiter`, and granular endpoints (address save, shipping select, shipping submit, discount apply/remove, region load, email check, upsell add)
2. Extract `_ShippingOptions.cshtml` from SinglePage.cshtml lines ~584-736 (include delivery date descriptions, self-contained CSS wrapper)
3. Extract `_PaymentMethods.cshtml` from SinglePage.cshtml lines ~738-1059 (include credit check in the build method, self-contained CSS wrapper)
4. Extract `_DiscountForm.cshtml` from `_OrderSummary.cshtml` (convert `x-model="discountCode"` to standard `<input name="code">`)
5. Create `_MobileTotal.cshtml` partial for OOB mobile sticky bar total updates
6. Add `hx-*` attributes to address forms with granular `hx-target` for each section
7. Add `hx-sync` attributes for race condition prevention on all interactive elements
8. Add `hx-indicator` attributes for loading state display
9. Add `data-announcement` and `data-checkout-step` attributes for accessibility and analytics
10. Rewrite `_OrderSummary.cshtml` single-page Alpine branch (lines 188-605) to server-rendered Razor (see "OrderSummary Rewrite Scope" section for full Alpine state inventory)
11. Ensure `_OrderSummary.cshtml` works in both full-page and OOB partial-swap contexts (local `x-data="{ expanded: false }"` for mobile collapse)
12. Add `HX-Trigger: basketUpdated` headers (with amounts) on shipping/discount endpoints
13. Apply Google auto-discount server-side during page render via `MerchelloCheckoutController`
14. Add `UpsellSuggestions` property to `CheckoutViewModel`, populate from `IUpsellEngine.GetSuggestionsAsync()` in `MerchelloCheckoutController.Index()`
15. Render upsell suggestions in `_ShippingOptions.cshtml` partial
16. Ensure validation error partials include submitted field values (no clearing)
17. Ensure `_EmailStatus.cshtml` includes digital product account requirement check
18. Move terms side-pane modal and forgot password modal markup to standalone `x-data` scopes (see "Modals" section)
19. Ensure `acceptsMarketing` checkbox is outside all HTMX swap targets with standard HTML form field
20. Ensure mobile sticky action bar total has `id="mobile-total"` for OOB swaps and submit button triggers `paymentForm` component
21. Add rate limiting to `check-email` (10/min), `discount/apply` (20/min), `addresses` (10/min), `upsell/add` (20/min)

**Form model types:** The endpoints reference form model types (`SaveAddressesFormModel`, `SelectShippingFormModel`, `ApplyDiscountFormModel`, `CheckEmailFormModel`, `AddUpsellFormModel`). These are **new classes** — they do not exist today. They differ from existing JSON request DTOs because HTMX sends `application/x-www-form-urlencoded`, not JSON. Each form model maps to existing service parameter types. Place in `src/Merchello/Checkout/Dtos/` (or a `Checkout/Models/` folder) with clear naming. Example:

```csharp
public class SaveAddressesFormModel
{
    // Contact
    public string Email { get; set; }
    public bool AcceptsMarketing { get; set; }
    public string? Password { get; set; } // Nullable — populated only when user opts to create account during checkout

    // Billing
    public string BillingName { get; set; }
    public string BillingCompany { get; set; }
    public string BillingAddressOne { get; set; }
    public string BillingAddressTwo { get; set; }
    public string BillingTownCity { get; set; }
    public string BillingCountyState { get; set; }
    public string BillingPostalCode { get; set; }
    public string BillingCountryCode { get; set; }
    public string BillingRegionCode { get; set; }
    public string BillingPhone { get; set; }

    // Shipping
    public bool SameAsBilling { get; set; }
    public string ShippingName { get; set; }
    public string ShippingCompany { get; set; }
    public string ShippingAddressOne { get; set; }
    // ... same pattern as billing
}

public class SelectShippingFormModel
{
    // Dictionary-like: selections[{groupId}] = selectionKey
    public Dictionary<string, string> Selections { get; set; }
}

public class ApplyDiscountFormModel
{
    public string Code { get; set; }
}

public class CheckEmailFormModel
{
    public string Email { get; set; }
}

public class AddUpsellFormModel
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}
```

**Important:** The existing `CheckoutApiController` JSON endpoints stay untouched. The partials controller is additional.

### Phase 4: Convert Entry Point + Payment + Express + Utilities

**Files to create:**
- `src/Merchello/Client/src/checkout/checkout.ts` — replaces `index.js`
- `src/Merchello/Client/src/checkout/payment.ts` — converts `payment.js`
- `src/Merchello/Client/src/checkout/components/payment-form.ts` — new Alpine component
- `src/Merchello/Client/src/checkout/components/express-checkout.ts` — converts `express-checkout.js`
- `src/Merchello/Client/src/checkout/components/address-autocomplete.ts` — new (extracted from address form)
- `src/Merchello/Client/src/checkout/components/validation.ts` — converts `services/validation.js`
- `src/Merchello/Client/src/checkout/components/account-section.ts` — new (extracted from single-page-checkout.js)
- `src/Merchello/Client/src/checkout/services/logger.ts` — converts `services/logger.js`
- `src/Merchello/Client/src/checkout/utils/payment-errors.ts` — converts `utils/payment-errors.js`
- `src/Merchello/Client/src/checkout/utils/security.ts` — converts `utils/security.js`
- `src/Merchello/Client/src/checkout/utils/announcer.ts` — converts `utils/announcer.js`
- `src/Merchello/Client/src/checkout/utils/error-boundary.ts` — converts `services/error-boundary.js`

**Tasks:**
1. Convert `payment.js` → `payment.ts` preserving `window.MerchelloPayment` global assignment
2. Convert `express-checkout.js` → `express-checkout.ts`, update basket update listener from `document.addEventListener('merchello:basket-updated', ...)` to `document.body.addEventListener('basketUpdated', ...)`
3. Create `payment-form.ts` Alpine component that reads payment data from `data-*` attributes instead of Alpine store
4. Extract address autocomplete from `checkout-address-form.js` into `address-autocomplete.ts` (config, suggestions, resolve endpoints)
5. Convert validation to Alpine `x-data` factory with blur/input event handling
6. Create `account-section.ts` Alpine component with sign-in, create account, forgot password, digital product requirement (fetch-based, not HTMX)
7. Convert logger and payment-errors to TypeScript
8. Convert announcer to TypeScript, wire to HTMX events
9. Convert error-boundary to TypeScript, add `htmx:responseError` hook alongside global handlers
10. Create `checkout.ts` entry point: HTMX lifecycle (`beforeSwap`/`afterSwap`/`oobAfterSwap`), Alpine init, component registration (paymentForm, expressCheckout, addressAutocomplete, validation, accountSection, termsModal, forgotPasswordModal, upsellInterstitial), abandoned checkout capture wiring, announcer integration
11. Remove `#checkout-initial-data` JSON blob from `SinglePage.cshtml` (no longer needed — Razor renders state directly). The blob currently contains the following data, each of which moves to a server-rendered source:

| Data in JSON Blob | New Source |
|---|---|
| Basket totals (total, subtotal, tax, shipping, discount) | Razor renders in `_OrderSummary.cshtml` |
| Basket line items | Razor renders in `_OrderSummary.cshtml` |
| Currency (code, symbol, decimalPlaces, exchangeRate) | Razor renders as `data-*` on checkout root or in partials |
| Billing/shipping countries | Razor renders `<select>` options directly in `_AddressForm.cshtml` |
| Address lookup config | `data-*` attributes on address form or fetch on init |
| Shipping groups | Razor renders in `_ShippingOptions.cshtml` |
| Payment methods | Razor renders in `_PaymentMethods.cshtml` via `data-*` attributes |
| Display settings (displayPricesIncTax, etc.) | Razor conditional rendering |
| Session data (sameAsBilling, email) | Razor renders form values and hidden inputs |
| Applied discounts | Razor renders in `_OrderSummary.cshtml` |
| Google auto discount | Server applies during page render (Phase 3, via middleware) |
| Express config | Stays as `window.MerchelloExpressConfig` (unchanged) |
12. Create logger instance and assign to `window.MerchelloLogger` in `checkout.ts` (migrating from `index.js` which currently creates and assigns it)

**`payment.js` hybrid pattern:** esbuild must preserve the `window.MerchelloPayment` global assignment in ESM output.

### Phase 5: Convert Adapters to TypeScript

All 10 adapter files (9 provider adapters + 1 adapter-interface) converted to TypeScript, emitted as classic IIFE scripts to the same paths:

0. `adapter-interface.ts` (ESM module — imported by payment.ts, not IIFE)
1. `paypal-unified-adapter.ts`
2. `stripe-payment-adapter.ts`, `stripe-card-elements-adapter.ts`, `stripe-express-adapter.ts`
3. `braintree-payment-adapter.ts`, `braintree-local-payment-adapter.ts`, `braintree-express-adapter.ts`
4. `worldpay-payment-adapter.ts`, `worldpay-express-adapter.ts`

Rules: keep filenames, keep registration keys, keep backoffice compatibility.

### Phase 6: Convert Classic Scripts

Convert analytics, single-page-analytics, confirmation, post-purchase to TypeScript:

- Split reusable logic into `.core.ts` modules for testability
- Keep thin entry files that auto-run and emit classic IIFE output
- Remove `confirmation.js` CommonJS `module.exports` fallback

### Phase 7: Remove Legacy JS

1. Remove `src/Merchello/Client/public/js/checkout/*` entirely (all files listed in "Complete File Deletion Manifest")
2. Keep `Client/public/img/*` and other static assets
3. Keep `Client/public/js/vendor/htmx.min.js` (added in Phase 1)
4. Verify Vite `publicDir` no longer supplies checkout JS
5. Delete test helper `src/Merchello/Client/src/checkout/order-summary.js`
6. Delete obsolete test `src/Merchello/Client/src/checkout/order-summary.test.js`

### Phase 8: Tests

**Existing tests to update:**
- `src/Merchello/Client/src/checkout/braintree-local-payment-adapter.test.js` — update imports for TS conversion

**New TypeScript tests:**
- Validation helpers (email, phone, address, field, form)
- Payment error classification and user messages
- Payment adapter registration and lookup (adapter-interface.ts)
- Express checkout basket update handling (HTMX `basketUpdated` event source)
- Analytics event emitter (MerchelloCheckout) including post-purchase events
- Single-page analytics deduplication
- Confirmation bootstrap (back-button, storage cleanup)
- Post-purchase idempotency key generation
- Abandoned checkout capture re-wiring after DOM swap
- Announcer integration with HTMX events
- Error boundary global handler + HTMX error hook
- Account section sign-in/create flows
- Backoffice compatibility shim tests

**C# integration tests (new, high value):**

Test infrastructure: Use `xUnit` + `Shouldly` (per CLAUDE.md conventions). Use ASP.NET Core `WebApplicationFactory<T>` to create a test host with the full Merchello pipeline. Create a `CheckoutTestFixture` base class that:
1. Seeds a test basket with items via `ICheckoutService`
2. Sets a basket cookie on the test HTTP client
3. Provides helpers for antiforgery token extraction from HTML responses
4. Provides assertion helpers for HTML content (use AngleSharp for parsing partial HTML responses)

Test cases:
- `CheckoutPartialsController` returns valid HTML partials for each mutation
- OOB fragments included correctly in multi-target responses (verify `hx-swap-oob="true"` attributes)
- Partial responses include correct `HX-Trigger` headers with basket amounts
- Antiforgery token validation works (reject requests without token)
- Error responses return 422 with form pre-populated with submitted values
- Google auto-discount applied server-side on page load (via `HttpContext.Items`)
- Credit check applied server-side in SaveShipping endpoint
- `_EmailStatus` partial includes digital product account requirement
- Rate limiting enforced on partial endpoints
- Route contract tests for all checkout endpoints (method + path)

### Phase 9: Documentation

Update:
- `docs/Architecture-Diagrams.md` — update checkout frontend asset pipeline section
- `docs/Checkout.md` — reflect new HTMX architecture
- `docs/PaymentProviders-DevGuide.md` — adapter conversion notes
- `AGENTS.md` — update checkout asset pipeline section:
  - Source of truth changes from `Client/public/js/checkout/*` to `Client/src/checkout/*.ts`
  - Build step now includes JS: `npm run build:checkout`
  - HTMX vendored at `Client/public/js/vendor/htmx.min.js`
- `.claude/CLAUDE.md` — update checkout asset pipeline section to match AGENTS.md changes
- Delete `docs/checkout-update.md` (rejected TypeScript-only migration approach)

## Decision: `Return.cshtml` Inline Component

Leave inline. It's ~30 lines of page-specific retry/redirect logic. Extracting it adds a file, a build target, and a Razor change for zero benefit.

## Decision: `ResetPassword.cshtml` Inline Component

Leave inline. It's a self-contained page with its own Alpine component and import map (Alpine 3.x without collapse plugin). It uses `CheckoutApiController` JSON endpoints for password validation and reset. It is NOT part of the single-page checkout flow and requires no changes for the HTMX migration.

## Recommendation

Proceed with server-driven checkout using HTMX + targeted Alpine.js with granular section swaps. This approach:

- Eliminates ~5,420 lines of client-side state management code
- Makes the server the single source of truth for rendering (not just calculation)
- Preserves the current all-sections-visible checkout layout exactly
- Keeps payment SDK integration, express checkout, and analytics exactly as they are
- Preserves abandoned checkout email/address capture via lightweight fetch calls
- Preserves account sign-in/create/forgot flows via lightweight fetch calls
- Maintains accessibility via ARIA announcer wired to HTMX swap events
- Prevents race conditions via declarative `hx-sync` strategies
- Preserves all public URLs, window globals, adapter contracts, and API endpoints
- Shifts testing emphasis to C# integration tests (more reliable than JS DOM tests)
- Results in a faster, more accessible, more maintainable checkout

## Verification

### Build verification

1. `npm run test:run`
2. `npm run build:backoffice` then `npm run build:checkout` — no file conflicts
3. `npm run build:checkout` then `npm run build:backoffice` — no file conflicts
4. Tailwind output includes classes from checkout TS source and Razor views
5. Route contract tests pass for all checkout endpoints
6. Watch mode (`npm run watch`) runs Vite and esbuild in parallel without conflicts
7. `tsc --project tsconfig.checkout.json` produces no errors

### Runtime verification

1. HTMX loads and initializes on checkout pages
2. Alpine components initialize after HTMX partial swaps (`htmx:afterSwap` + `Alpine.initTree`)
3. Alpine components destroyed before HTMX swaps (`htmx:beforeSwap` + `Alpine.destroyTree`)
4. OOB swaps trigger `Alpine.initTree` via `htmx:oobAfterSwap`
5. Address form submits via HTMX, swaps `#shipping-section` + OOB `#order-summary`
6. Shipping radio change swaps `#order-summary` only with loading overlay
7. Shipping form submit swaps `#payment-section` + OOB `#order-summary`
8. Discount apply/remove via HTMX swaps `#order-summary` + OOB `#discount-form`, triggers `basketUpdated`
9. Country change swaps only `#region-select-{type}` with inline spinner
10. Rapid shipping radio clicks don't produce stale totals (`hx-sync:replace`)
11. Payment form renders correctly (hosted fields, widget, direct form, redirect)
12. Payment SDK destroyed before HTMX swap replaces payment section
13. Express checkout buttons render and re-render on `basketUpdated` HTMX event
14. `window.MerchelloPayment` available and functional
15. All payment adapter flows work (Stripe, Braintree, PayPal, WorldPay)
16. Analytics events fire at correct step transitions (see Analytics Event Timing section)
17. Confirmation page purchase event with localStorage dedup
18. Post-purchase upsell flow with saved payment method
19. Post-purchase analytics events fire (`checkout:post_purchase_view`, `checkout:post_purchase_error`)
20. Payment return polling and redirect
21. Address autocomplete suggestions and resolution (config, typeahead, resolve)
22. Backoffice payment provider test modal still loads and runs adapters
23. `_Layout.cshtml` conditional module loading preserved (Confirmation/PostPurchase excluded)
24. `_ExpressCheckout.cshtml` global initialization executes before adapter scripts
25. `window.merchelloCheckoutData` set before analytics scripts execute
26. Custom analytics script (`settings.CustomScriptUrl`) loads when configured
27. SessionStorage key contracts preserved (upsell interstitial, checkout cleanup)
28. Error boundary catches JS module failures and shows recovery banner

### Preserved behavior verification

1. All sections visible simultaneously (no step-based tabs or accordion)
2. Same-as-billing toggle works without server round-trip
3. Form validation on blur with immediate red error text
4. Form validation errors clear on input
5. Screen reader announces section transitions and errors via ARIA live region
6. Email capture fires on blur for abandoned checkout tracking (with deduplication)
7. Address capture fires on blur with hash deduplication and in-flight coalescing
8. Capture listeners re-wire after HTMX swaps replace form elements
9. Recovery URL `/checkout/recover/{token}` restores basket server-side and redirects (already implemented)
10. Google auto-discount applied server-side on page load (via middleware cookie + controller)
11. Upsell interstitial renders in shipping section after calculation
12. Form fields retain submitted values when server returns validation errors
13. Account sign-in, create, forgot password flows work via fetch()
14. Digital product account requirement rendered server-side in `_EmailStatus.cshtml`
15. Credit check applied server-side in payment method rendering
16. Terms/privacy modal loads content via fetch() with client-side caching
17. Password reset page works independently (no changes needed)
18. Cancel page (`Cancel.cshtml`) still works after migration
19. Multi-page checkout layout preserved (`_Layout.cshtml` breadcrumbs, `_OrderSummary.cshtml` server-rendered branch)
20. `_AddressForm.cshtml` compact mode (`IsSinglePageCheckout`) works in partial context
21. HTMX 422 responses swap correctly for validation errors (no silent failure)
22. Antiforgery token survives all partial swaps (placed outside swap targets)
23. `x-cloak` does not cause content flash after HTMX swaps (use `x-show` where needed)
24. Marketing opt-in checkbox (`acceptsMarketing`) persists through checkout and appears on order
25. Mobile sticky action bar total updates on basket changes via OOB swap
26. Mobile sticky action bar "Complete Order" button triggers payment form submission
27. Terms side-pane modal opens and loads content via fetch() with caching
28. Forgot password modal opens from account section, sends reset email
29. Account creation during checkout (password field in address form) works
30. Rate limiting enforced on partial endpoints (check-email, discount/apply, addresses)
31. Extracted partials render correctly in both full-page and HTMX swap contexts (CSS self-contained)
32. Delivery date descriptions render in shipping options partial

### Checkout flow verification

1. Page loads with full server-rendered checkout (no flash of empty content)
2. Address save → shipping options appear in `#shipping-section`
3. Country change → region dropdown updates in `#region-select-{type}`
4. Shipping radio change → order summary updates in `#order-summary` with loading overlay
5. Shipping form submit → payment methods appear in `#payment-section`
6. Discount apply/remove → order summary updates, express buttons re-render
7. Upsell add → shipping section + order summary update
8. Payment method selection → hosted fields or widget renders
9. Payment submission → redirect or confirmation
10. Email check → sign-in prompt or continue as guest (with digital product check)
11. Same-as-billing toggle works
12. Recovery link restores abandoned checkout (server-side, already implemented)
13. Password reset flow works
14. All adapter-specific payment endpoints work
15. Back-button protection on confirmation page
16. Post-purchase saved-method charging with idempotency
18. Mobile sticky bar total updates when order summary changes
19. Terms modal opens from footer links and displays content
20. Forgot password modal sends reset email and shows success/error states
21. Account creation via password field in address form creates customer on order
22. Marketing opt-in checkbox value flows through to customer record
17. Address autocomplete typeahead and resolution
18. Account creation and sign-in with page reload
