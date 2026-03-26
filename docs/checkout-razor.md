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
    // IMPORTANT: Create a fresh ViewDataDictionary per call to avoid shared state issues
    // when rendering multiple OOB fragments in sequence.
    var viewData = new ViewDataDictionary(
        new Microsoft.AspNetCore.Mvc.ModelBinding.EmptyModelMetadataProvider(),
        new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary())
    {
        Model = model
    };
    using var sw = new StringWriter();
    var viewResult = _viewEngine.FindView(ControllerContext, viewName, false);
    var viewContext = new ViewContext(ControllerContext, viewResult.View, viewData, TempData, sw, new HtmlHelperOptions());
    await viewResult.View.RenderAsync(viewContext);
    return sw.ToString();
}
```

The controller must inject `ICompositeViewEngine` and `ITempDataProvider` via constructor injection. The controller inherits from `Controller` (not `RenderController`) since it does not need Umbraco content routing.

**Session resolution:** The checkout session is identified by a basket cookie (same mechanism as `CheckoutApiController`). Inject `ICheckoutSessionService` to resolve the session from the cookie. No special authentication middleware is needed — the existing cookie-based session mechanism works for both JSON and HTML responses.

#### Session and Basket Resolution Pattern

Every `CheckoutPartialsController` endpoint must resolve the current basket and session before doing business logic. Use this pattern (mirrors `CheckoutApiController`):

```csharp
private async Task<(Basket? basket, CheckoutSession? session)> ResolveSessionAsync(CancellationToken ct)
{
    var basket = await _checkoutService.GetBasket(new GetBasketParameters(), ct);
    if (basket is null || basket.LineItems.Count == 0)
        return (null, null);

    var session = await _sessionService.GetSessionAsync(basket.Id, ct);
    return (basket, session);
}
```

Then in each endpoint:
```csharp
[HttpPost("addresses")]
[ValidateAntiForgeryToken]
public async Task<IActionResult> SaveAddresses(SaveAddressesFormModel model, CancellationToken ct)
{
    var (basket, session) = await ResolveSessionAsync(ct);
    if (basket is null)
    {
        Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
        return PartialView("_ValidationErrors", new ValidationErrorsViewModel
        {
            Errors = new() { ["basket"] = "Your basket is empty." },
            FormType = "addresses"
        });
    }
    // ... business logic
}
```

**How the basket cookie works:** `ICheckoutService.GetBasket()` reads the basket from the HTTP cookie automatically — the cookie name and resolution are internal to the service. The controller does not need to read or write cookies directly. The same mechanism works for both JSON and HTML responses.

**EFCoreScope constraint (CRITICAL):** Never use `Task.WhenAll` to parallelize service calls in this controller. `ICheckoutService`, `ICheckoutDiscountService`, and `ICheckoutPaymentsOrchestrationService` all use `IEFCoreScopeProvider` internally. Parallel calls corrupt scope ordering and cause `InvalidOperationException: The Ambient Scope`. All service calls must be sequential (await each one before the next).

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

**Slow shipping fallback message:** The current checkout shows a "Taking longer than expected..." message after 8 seconds of shipping loading. With HTMX, implement this with a CSS animation delay on a hidden element inside the `hx-indicator`:

```css
.shipping-slow-message { display: none; }
.htmx-request .shipping-slow-message {
    animation: show-slow-message 0s 8s forwards;
}
@keyframes show-slow-message {
    to { display: block; }
}
```

Place the slow message element inside the shipping section's `hx-indicator` container. It appears only if the request takes longer than 8 seconds.

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
    private readonly ICheckoutViewModelBuilder _viewModelBuilder;
    private readonly ICheckoutPaymentsOrchestrationService _paymentsService;
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

#### File Location and Registration

**File path:** `src/Merchello/Controllers/CheckoutPartialsController.cs`
**Namespace:** `Merchello.Controllers` (matches all other checkout controllers in that directory)
**Base class:** `Controller` (not `ControllerBase` — needs `View()`, `PartialView()`, `TempData`; not `RenderController` — no Umbraco content routing)

**DI Registration:** No explicit registration needed. ASP.NET Core's `AddControllersWithViews()` (registered by Umbraco startup) auto-discovers all `Controller`-derived classes in the assembly.

**`CheckoutPartialsExceptionFilter` registration** (required — see Gap 1 section):
```csharp
// In Startup.cs, alongside existing CheckoutExceptionFilter registration
builder.Services.AddScoped<Filters.CheckoutPartialsExceptionFilter>();
```

**Constructor injections** (all already registered in `Startup.cs`):
- `ICheckoutService` — checkout business logic, basket resolution
- `ICheckoutSessionService` — session state
- `ICheckoutDiscountService` — discount apply/remove
- `ICheckoutPaymentsOrchestrationService` — payment options (for `SaveShipping`)
- `IRateLimiter` — rate limiting on sensitive endpoints
- `ICheckoutViewModelBuilder` — NEW (see Gap 5)
- `ICompositeViewEngine` — for `RenderPartialToStringAsync`
- `ITempDataProvider` — for `RenderPartialToStringAsync`
- `ILogger<CheckoutPartialsController>` — structured logging

#### ICheckoutViewModelBuilder Registration

**Interface:** `src/Merchello/Services/Interfaces/ICheckoutViewModelBuilder.cs`
**Implementation:** `src/Merchello/Services/CheckoutViewModelBuilder.cs`
**Namespace:** `Merchello.Services` (web project, not `Merchello.Core`)

Both files are in `src/Merchello/` (the web project). `CheckoutViewModelBuilder` depends on `IStorefrontContextService.GetDisplayContextAsync()`, `ICurrencyService`, and `ICheckoutDtoMapper` — web-layer concerns. Placing the interface in the web project is correct here because both `CheckoutPartialsController` and `MerchelloCheckoutController` are web-project consumers.

**DI registration in `Startup.cs`** (add alongside `ICheckoutDtoMapper` registration):
```csharp
builder.Services.AddScoped<ICheckoutViewModelBuilder, CheckoutViewModelBuilder>();
```

**`CheckoutViewModelBuilder` constructor injections:**
- `IStorefrontContextService` — display currency context, exchange rate, tax-inclusive flag
- `ICurrencyService` — `Round()` for proper currency rounding
- `ICheckoutDtoMapper` — reuse existing basket → DTO mapping logic (avoids duplication)
- `ICheckoutPaymentsOrchestrationService` — `GetPaymentOptionsAsync()` for saved methods
- `IUpsellEngine` — for inline upsell suggestions in shipping partial (optional/nullable)

**Call sequence within builder methods** (must be sequential — no `Task.WhenAll` per MEMORY.md EFCoreScope constraint):
```csharp
var displayContext = await _storefrontContext.GetDisplayContextAsync(ct);
var shippingGroups = await _dtoMapper.MapShippingGroupToDtoAsync(orderGroupResult, displayContext, ct);
// ... then build ViewModel from mapped data
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

### Partial ViewModel Definitions

Each partial requires a strongly-typed ViewModel with pre-calculated display amounts. Place all in `src/Merchello/Models/Checkout/`.

**`ICheckoutViewModelBuilder` service (new):** Encapsulates ViewModel construction with display context. Injected into both `MerchelloCheckoutController` and `CheckoutPartialsController`. Injects `IStorefrontContextService` (for `GetDisplayContextAsync()` — exchange rate, display currency, tax-inclusive flag), `ICurrencyService` (for rounding), and `ICheckoutDtoMapper` (for reusing basket/shipping group mapping logic). This extracts the shared calculation pattern from `MerchelloCheckoutController.RenderSinglePageCheckoutAsync()` (lines 394-488) so partials controller does not duplicate it.

Place in `src/Merchello/Services/Interfaces/ICheckoutViewModelBuilder.cs` (interface) and `src/Merchello/Services/CheckoutViewModelBuilder.cs` (implementation).

```csharp
// src/Merchello/Models/Checkout/ShippingOptionsViewModel.cs
public class ShippingOptionsViewModel
{
    // Display-ready groups — ICheckoutViewModelBuilder maps ShippingGroupDto → ShippingGroupViewModel,
    // applying display currency conversion to all option costs
    public IReadOnlyList<ShippingGroupViewModel> ShippingGroups { get; init; } = [];
    public Dictionary<string, string> SelectedShippingOptions { get; init; } = new();
    public IReadOnlyList<UpsellSuggestionDto> UpsellSuggestions { get; init; } = [];
    public IReadOnlyList<string> ItemAvailabilityErrors { get; init; } = [];
    public bool AllItemsShippable { get; init; } = true;
    public bool HasMultipleGroups { get; init; }

    // Display currency (pre-calculated)
    public string CurrencySymbol { get; init; } = "";
    public decimal ExchangeRate { get; init; } = 1m;
    public int CurrencyDecimalPlaces { get; init; } = 2;
    public bool DisplayPricesIncTax { get; init; }
}

// src/Merchello/Models/Checkout/ShippingGroupViewModel.cs
public class ShippingGroupViewModel
{
    public Guid GroupId { get; init; }
    public string GroupName { get; init; } = "";
    public IReadOnlyList<ShippingOptionViewModel> Options { get; init; } = [];
}

// src/Merchello/Models/Checkout/ShippingOptionViewModel.cs
public class ShippingOptionViewModel
{
    // Stable selection key: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic
    public string SelectionKey { get; init; } = "";
    public string Name { get; init; } = "";
    // Display cost already converted to display currency (amount * exchangeRate, rounded)
    public decimal DisplayCost { get; init; }
    // Pre-formatted string (e.g., "£4.99" or "Free")
    public string FormattedDisplayCost { get; init; } = "";
    public bool IsSelected { get; init; }
    public string? DeliveryDescription { get; init; }
    public string? EstimatedDeliveryDate { get; init; }
}

// src/Merchello/Models/Checkout/OrderSummaryViewModel.cs
public class OrderSummaryViewModel
{
    // Line items with pre-calculated display amounts
    public IReadOnlyList<OrderSummaryLineItemViewModel> LineItems { get; init; } = [];
    public IReadOnlyList<OrderSummaryDiscountViewModel> AppliedDiscounts { get; init; } = [];

    // Pre-calculated display totals (already multiplied by exchange rate and rounded)
    public decimal DisplaySubTotal { get; init; }
    public decimal DisplayDiscount { get; init; }
    public decimal DisplayShipping { get; init; }
    public decimal DisplayTax { get; init; }
    public decimal DisplayTotal { get; init; }

    // Pre-formatted display strings (e.g., "£12.99") — used directly in Razor templates
    public string FormattedSubTotal { get; init; } = "";
    public string FormattedShipping { get; init; } = "";
    public string FormattedTax { get; init; } = "";
    public string FormattedDiscount { get; init; } = "";
    public string FormattedTotal { get; init; } = "";

    // Tax-inclusive variants
    public bool DisplayPricesIncTax { get; init; }
    public decimal TaxInclusiveDisplaySubTotal { get; init; }
    public decimal TaxInclusiveDisplayDiscount { get; init; }
    public string FormattedTaxInclusiveDisplaySubTotal { get; init; } = "";
    public string TaxIncludedMessage { get; init; } = "";

    // Currency formatting
    public string CurrencySymbol { get; init; } = "";
    public int CurrencyDecimalPlaces { get; init; } = 2;

    // Config
    public bool ShowDiscountCode { get; init; }
    public bool IsPartialSwap { get; init; } // True when rendered as OOB swap (skip mobile collapse button)

    // Nested sub-model for _DiscountForm partial inclusion inside _OrderSummary
    public DiscountFormViewModel DiscountFormViewModel { get; init; } = new();
}

public class OrderSummaryLineItemViewModel
{
    public Guid LineItemId { get; init; }
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string? ImageUrl { get; init; }
    public int Quantity { get; init; }
    public decimal DisplayUnitPrice { get; init; }    // Pre-calculated: amount * exchangeRate, rounded
    public decimal DisplayLineTotal { get; init; }    // Pre-calculated: displayUnitPrice * quantity
    public string FormattedUnitPrice { get; init; } = "";  // e.g., "£10.00"
    public string FormattedLineTotal { get; init; } = "";  // e.g., "£20.00"
    public IReadOnlyList<string> SelectedOptions { get; init; } = [];
    public IReadOnlyList<OrderSummaryAddonViewModel> Addons { get; init; } = [];
}

public class OrderSummaryAddonViewModel
{
    public string Name { get; init; } = "";
    public decimal DisplayUnitPrice { get; init; }
    public string FormattedUnitPrice { get; init; } = "";
}

public class OrderSummaryDiscountViewModel
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public string? Code { get; init; }
    public decimal DisplayAmount { get; init; }
    public string FormattedAmount { get; init; } = "";
    public bool IsAutomatic { get; init; }
}

// src/Merchello/Models/Checkout/PaymentMethodsViewModel.cs
public class PaymentMethodsViewModel
{
    // Named 'Methods' (not 'PaymentMethods') — Gap 23 template uses Model.Methods throughout
    public IReadOnlyList<PaymentMethodDto> Methods { get; init; } = [];
    public IReadOnlyList<SavedPaymentMethodDto> SavedMethods { get; init; } = [];
    // Named 'CanVault' (not 'CanSavePaymentMethods') — Gap 23 template uses data-can-vault="@Model.CanVault"
    public bool CanVault { get; init; }
    public Guid? InvoiceId { get; init; }
    public string ReturnUrl { get; init; } = "/checkout/return";
    public string CancelUrl { get; init; } = "/checkout/cancel";
    public bool CreditLimitExceeded { get; init; }
    public OrderTermsDto? OrderTerms { get; init; } // Terms checkbox config (moved INTO payment section)
    // When true, a second express checkout container is shown inside the payment section
    // (configurable via CheckoutSettings.ShowExpressInPaymentSection — defaults to false)
    public bool ShowExpressAbovePayment { get; init; }
    // Express providers for the optional in-payment express section
    public IReadOnlyList<ExpressPaymentMethodDto> ExpressProviders { get; init; } = [];
    // Non-null when terms acceptance is required before order placement
    public string? TermsUrl { get; init; }
}

// src/Merchello/Models/Checkout/EmailStatusViewModel.cs
public class EmailStatusViewModel
{
    public string Email { get; init; } = "";
    public bool HasExistingAccount { get; init; }
    public bool IsLoggedIn { get; init; }
    public bool HasDigitalProducts { get; init; }
    public bool RequiresAccount { get; init; } // HasDigitalProducts && !IsLoggedIn
}

// src/Merchello/Models/Checkout/DiscountFormViewModel.cs
public class DiscountFormViewModel
{
    public bool ShowDiscountCode { get; init; }
    public string? ErrorMessage { get; init; }
    public string? SuccessMessage { get; init; }
    // Populated from ApplyDiscountFormModel.Code when returning 422 validation error,
    // so the input field retains the submitted value without JavaScript
    public string? SubmittedCode { get; init; }
}

// src/Merchello/Models/Checkout/MobileTotalViewModel.cs
public class MobileTotalViewModel
{
    public string FormattedTotal { get; init; } = "";
    public string CurrencySymbol { get; init; } = "";
}

// src/Merchello/Models/Checkout/ValidationErrorsViewModel.cs
public class ValidationErrorsViewModel
{
    public Dictionary<string, string> Errors { get; init; } = new();
    public object? SubmittedModel { get; init; } // Original form data for re-population
    public string FormType { get; init; } = ""; // "addresses", "shipping", "discount"
}
```

**`ICheckoutViewModelBuilder` interface:**

```csharp
public interface ICheckoutViewModelBuilder
{
    Task<OrderSummaryViewModel> BuildOrderSummaryAsync(Basket basket, CancellationToken ct);
    Task<ShippingOptionsViewModel> BuildShippingOptionsAsync(OrderGroupingResult result, CancellationToken ct);
    Task<PaymentMethodsViewModel> BuildPaymentMethodsAsync(CheckoutSession session, bool runCreditCheck, CancellationToken ct);
    Task<EmailStatusViewModel> BuildEmailStatusAsync(string email, Basket basket, CancellationToken ct);
    Task<MobileTotalViewModel> BuildMobileTotalAsync(Basket basket, CancellationToken ct);
    DiscountFormViewModel BuildDiscountForm(bool showDiscountCode, string? error = null, string? success = null, string? submittedCode = null);
    Task<AddressLookupConfigViewModel> BuildAddressLookupConfigAsync(CancellationToken ct);
}
```

The builder injects `ICheckoutPaymentsOrchestrationService.GetPaymentOptionsAsync()` for saved payment methods and runs credit check server-side when building the payment methods ViewModel.

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

### SinglePage.cshtml: Root-Level Alpine Cleanup

The current `SinglePage.cshtml` has `x-data="singlePageCheckout"` on the root checkout container. This is what activates the mega-orchestrator. Removing it is Phase 4's primary task — everything that was in the mega-component's scope becomes either:
- A scoped `x-data` on a smaller element
- A standard HTML form field (no Alpine needed)
- An HTMX attribute (no Alpine needed)
- Deleted (server now handles it)

**Remove from `SinglePage.cshtml`:**
- `x-data="singlePageCheckout"` from the root checkout container
- All `@@click`, `x-model`, `x-show`, `x-text`, `x-bind` attributes that reference the `singlePageCheckout` component scope
- The `#checkout-initial-data` script element (Phase 4)
- All `$store.checkout.*` read expressions — replaced by Razor-rendered static values

**Replace with scoped Alpine elements:**

```html
<!-- Contact section: accountSection manages sign-in, create account, forgot password -->
<section x-data="accountSection">
    <!-- Email field with hx-post="/checkout/partials/check-email" -->
    <div id="email-status"><!-- server-rendered _EmailStatus.cshtml on page load --></div>
    <!-- Marketing opt-in: standard checkbox, no Alpine needed -->
    <input type="checkbox" name="acceptsMarketing" value="true"
           @(Model.Session?.AcceptsMarketing == true ? "checked" : "") />
</section>

<!-- Address form: validation + autocomplete scoped to their own elements -->
<form hx-post="/checkout/partials/addresses"
      hx-target="#shipping-section" hx-swap="innerHTML"
      hx-sync="this:queue first" hx-indicator="#checkout-spinner">
    @Html.AntiForgeryToken() <!-- NOT HERE — must be outside all swap targets -->

    <div x-data="validation">
        <div x-data="addressAutocomplete" data-prefix="Billing">
            @await Html.PartialAsync("Checkout/_AddressForm", billingVm)
        </div>
    </div>

    <!-- Same-as-billing: tiny local Alpine scope (~10 lines) -->
    <div x-data="{ sameAsBilling: @(Model.Session?.SameAsBilling == true ? "true" : "false") }">
        <input type="hidden" name="SameAsBilling" :value="sameAsBilling" />
        <label>
            <input type="checkbox" x-model="sameAsBilling" />
            Same as billing address
        </label>
        <div x-show="!sameAsBilling" x-data="validation">
            <div x-data="addressAutocomplete" data-prefix="Shipping">
                @await Html.PartialAsync("Checkout/_AddressForm", shippingVm)
            </div>
        </div>
    </div>
    <button type="submit">Continue to shipping</button>
</form>

<!-- Shipping section: no Alpine; radios are HTMX triggers; inline upsells are HTMX forms -->
<div id="shipping-section">
    @await Html.PartialAsync("Checkout/_ShippingOptions", Model.ShippingViewModel)
</div>

<!-- Payment section: paymentForm Alpine component, initialized by Alpine.initTree after HTMX swap -->
<div id="payment-section">
    <!-- Empty or "Complete shipping to see payment options" on initial load -->
    <!-- Populated by POST /checkout/partials/shipping HTMX response -->
</div>

<!-- Mobile sticky bar: reads $store.paymentState (minimal shared store) -->
<div class="fixed bottom-0 inset-x-0 lg:hidden bg-white border-t shadow-lg p-4 z-50">
    <div class="flex items-center justify-between">
        <span id="mobile-total">@Model.FormattedDisplayTotal</span>
        <button :disabled="$store.paymentState.isSubmitting || !$store.paymentState.canSubmit"
                @@click="document.getElementById('payment-form')?.requestSubmit()">
            Place Order
        </button>
    </div>
</div>

<!-- Modals: standalone scopes, never inside HTMX swap targets -->
<div x-data="termsModal" x-cloak><!-- terms side-pane --></div>
<div x-data="forgotPasswordModal" x-cloak><!-- forgot password --></div>
```

**Key constraint:** The `paymentForm` Alpine component lives inside `_PaymentMethods.cshtml` (HTMX swap target `#payment-section`). It is initialized by `Alpine.initTree` after each HTMX swap. The `$store.paymentState` bridge (defined in `checkout.ts`) allows the mobile sticky bar — which is outside the swap target — to read `isSubmitting` and `canSubmit` from the payment form component.

### Antiforgery Token Handling

With granular swaps (not whole-body swaps), the antiforgery token input rendered once in `SinglePage.cshtml` stays in the DOM and is never swapped out. This simplifies token handling:

- `SinglePage.cshtml` renders `@Html.AntiForgeryToken()` once
- **CRITICAL:** Place the token at the top of the checkout grid, OUTSIDE all HTMX swap targets (`#shipping-section`, `#payment-section`, `#order-summary`, `#email-status`, `#discount-form`, `#region-select-*`). If the token is accidentally inside a swap target, all subsequent HTMX requests will fail antiforgery validation.
- `checkout.ts` reads the token from the DOM in `htmx:configRequest` handler
- No need to include fresh tokens in partial responses
- All partial endpoints use `[ValidateAntiForgeryToken]`
- For `[HttpDelete]` endpoints (discount remove), HTMX sends the token via the request header (set in `htmx:configRequest`), not form body

#### Antiforgery Services (Already Available)

ASP.NET Core antiforgery services are registered automatically by Umbraco's startup (which calls `AddMvc()` internally). No explicit `services.AddAntiforgery()` call is needed in `Startup.cs`. The `@Html.AntiForgeryToken()` Razor helper will work in `SinglePage.cshtml` without any new registration.

#### Token Placement in SinglePage.cshtml

Place the token as the **first element inside the checkout grid** — before all HTMX swap targets:

```html
<!-- OUTSIDE all swap targets: #shipping-section, #payment-section, #order-summary, etc. -->
@Html.AntiForgeryToken()

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Left column: forms -->
    <!-- Right column: order summary -->
</div>
```

If placed inside a swap target, HTMX will delete the token when it swaps that section, causing all subsequent requests to fail antiforgery validation.

#### ValidateAntiForgeryToken on Partial Endpoints

All `POST`, `PUT`, `PATCH`, and `DELETE` endpoints on `CheckoutPartialsController` require `[ValidateAntiForgeryToken]`. `GET` endpoints (region load) do NOT require it — read-only.

HTMX sends the token as request header `RequestVerificationToken` via the `htmx:configRequest` handler in `checkout.ts`. ASP.NET Core's `[ValidateAntiForgeryToken]` checks both the form field AND the `RequestVerificationToken` header — this works without any special configuration.

**Note:** The existing `CheckoutApiController` does NOT use `[ValidateAntiForgeryToken]` (it uses cookie-based basket authentication instead). This is correct for JSON API endpoints consumed by payment SDKs. The new partial endpoints DO use it because they process state-changing HTML form submissions from the browser.

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

### Potential Route Name Confusion

The HTMX partial endpoint names in this document and the actual existing `CheckoutApiController` route names differ. An implementer MUST NOT modify existing JSON API routes — the partials controller introduces new routes at a completely separate prefix.

| Concern | JSON API Route (DO NOT CHANGE) | HTMX Partial Route (NEW) |
|---|---|---|
| Apply discount | `POST /api/merchello/checkout/discount/apply` | `POST /checkout/partials/discount/apply` |
| Remove discount | `DELETE /api/merchello/checkout/discount/{id:guid}` | `DELETE /checkout/partials/discount/{id:guid}` |
| Check email | `POST /api/merchello/checkout/check-email` | `POST /checkout/partials/check-email` |
| Save shipping (confirm) | `POST /api/merchello/checkout/shipping` | `POST /checkout/partials/shipping` |
| Save shipping (radio-only) | _(not a separate JSON endpoint)_ | `POST /checkout/partials/shipping/select` |
| Save addresses | `POST /api/merchello/checkout/addresses` | `POST /checkout/partials/addresses` |
| Region dropdown | `GET /api/merchello/checkout/regions/{code}` | `GET /checkout/partials/regions/{addressType}` |
| Upsell add | _(not a checkout JSON endpoint)_ | `POST /checkout/partials/upsell/add` |

**The JSON API routes at `/api/merchello/checkout/*` are preserved exactly as-is.** They continue to serve JSON for payment adapters, mobile clients, and programmatic use. The HTMX partials at `/checkout/partials/*` are additions, not replacements.

**Note:** The document references `POST /api/merchello/checkout/credit-check` in the "Credit Check" section. This endpoint does not exist in `CheckoutApiController` as a separate route — the credit check is already done inline in `GetPaymentMethodsAsync()` within `CheckoutPaymentsOrchestrationService`. The HTMX migration moves this server-side (into `SaveShipping` partial rendering). No new or changed endpoint needed.

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

### CheckoutViewModel Addition: UpsellSuggestions

`CheckoutViewModel` (`src/Merchello/Models/CheckoutViewModel.cs`) is missing the `UpsellSuggestions` property needed for the interstitial upsell display. Add:

```csharp
// Add to CheckoutViewModel.cs
using Merchello.Core.Upsells.Dtos; // Add this using at top of file

/// <summary>
/// Upsell suggestions for interstitial display (above the checkout form).
/// Populated from IUpsellEngine.GetSuggestionsAsync() during initial page render.
/// Products already in basket are excluded by the engine.
/// Empty if upsell module is disabled or basket has no line items.
/// </summary>
public IReadOnlyList<UpsellSuggestionDto> UpsellSuggestions { get; init; } = [];
```

**Population in `MerchelloCheckoutController`:**

Inject into controller constructor (both nullable — preserves backward compatibility):
```csharp
IUpsellEngine? upsellEngine = null,
IUpsellContextBuilder? upsellContextBuilder = null
```

Population logic in `RenderSinglePageCheckoutAsync()` (sequential, not parallel — EFCoreScope constraint):
```csharp
IReadOnlyList<UpsellSuggestionDto> upsellSuggestions = [];
if (upsellEngine != null && upsellContextBuilder != null && basket?.LineItems.Count > 0)
{
    var lineItems = await upsellContextBuilder.BuildLineItemsAsync(basket.LineItems, ct);
    var suggestions = await upsellEngine.GetSuggestionsAsync(new UpsellContext { LineItems = lineItems }, ct);
    upsellSuggestions = suggestions
        .Select(s => new UpsellSuggestionDto { /* map from UpsellSuggestion model */ })
        .ToList();
}
```

Pass to ViewModel constructor: `UpsellSuggestions = upsellSuggestions`.

The `upsellInterstitial` Alpine component in `checkout.ts` reads from this ViewModel data (rendered into `data-*` attributes or a small inline JSON script on the interstitial container), not from an API call.

### Initial Page Load State

#### What Is #checkout-initial-data?

`#checkout-initial-data` is a `<script type="application/json" id="checkout-initial-data">` element rendered by `SinglePage.cshtml`. It contains a JSON blob that `single-page-checkout.js` reads on startup:
```js
const data = JSON.parse(document.getElementById('checkout-initial-data').textContent);
Alpine.store('checkout', initCheckoutStore(data));
```

This blob is the bootstrap mechanism for the Alpine store. After migration, Razor renders the full checkout HTML directly from `CheckoutViewModel` — no bootstrap blob is needed.

**Current blob contents and their replacements:**

| JSON Property | Current Use | Replacement |
|---|---|---|
| `basket.lineItems` | Alpine store → rendered by `order-summary.js` | Razor `@foreach` in `_OrderSummary.cshtml` |
| `basket.subtotal`, `total`, `tax`, `shipping`, `discount` | Displayed by `order-summary.js` | Pre-calculated in `OrderSummaryViewModel`, rendered by Razor |
| `basket.currencyCode`, `currencySymbol`, `exchangeRate`, `decimalPlaces` | Currency formatting in `formatters.js` | ViewModel properties rendered as `data-*` attributes |
| `basket.appliedDiscounts` | Discount remove buttons | Razor `@foreach` in `_OrderSummary.cshtml` |
| `billingCountries`, `shippingCountries` | `<select>` options rendered by Alpine | Razor `<option>` elements in `_AddressForm.cshtml` |
| `addressLookup` config | `address-autocomplete.ts` init | Render as `data-*` on autocomplete container (avoids fetch) |
| `shippingGroups` | Shipping radio buttons rendered by Alpine | Razor in `_ShippingOptions.cshtml` |
| `paymentMethods` | Payment list rendered by `checkout-payment.js` | Razor `data-*` on `paymentForm` root in `_PaymentMethods.cshtml` |
| `displayPricesIncTax` | Tax-inclusive price display | Razor conditional in each partial |
| `session.sameAsBilling`, `session.email` | Form pre-population | Razor `value`/`checked` attributes |
| `googleAutoDiscount` | Client-side discount application | Server applies during render via `GoogleAutoDiscountMiddleware` |

**When to remove:** Phase 4. Removing in Phase 3 breaks `single-page-checkout.js` (still running). The blob stays through Phase 3.

**What stays:** `window.merchelloCheckoutData` (set in `_Layout.cshtml`) and `window.MerchelloExpressConfig` (set in `_ExpressCheckout.cshtml`) are independent and NOT removed.

`MerchelloCheckoutController.RenderSinglePageCheckoutAsync()` already pre-calculates checkout state on initial page load. This behavior is preserved:

- **Shipping options:** Pre-rendered on page load if addresses exist in session (controller calls `InitializeCheckoutAsync` with `AutoSelectShipping = true`). The `_ShippingOptions.cshtml` partial renders with shipping groups.
- **Payment methods:** NOT pre-rendered on initial load. Payment section appears empty (or with a "Complete shipping to see payment options" message). Payment methods render only after the HTMX shipping form submit (`POST /checkout/partials/shipping` → swaps `#payment-section`).
- **Order summary:** Pre-rendered with line items, subtotals, and shipping amounts (if already calculated). Updated via OOB swaps on subsequent mutations.
- **Address forms:** Pre-populated from `CheckoutSession` data (server renders `value` attributes on form inputs).
- **`#checkout-initial-data` JSON blob:** Removed entirely (Phase 4, task 11). All data it contained is now server-rendered in Razor partials or as `data-*` attributes. `window.merchelloCheckoutData` (set in `_Layout.cshtml`) and `window.MerchelloExpressConfig` (set in `_ExpressCheckout.cshtml`) are independent and stay.

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

## Multi-Currency Display Checklist

**CRITICAL:** All display amounts must be pre-calculated server-side in ViewModels. Razor partials must NEVER multiply by exchange rate — that calculation belongs in `ICheckoutViewModelBuilder`.

| Display Concern | Where Calculated | How Rendered |
|---|---|---|
| Line item unit price | `OrderSummaryViewModel.LineItems[].DisplayUnitPrice` = `amount * exchangeRate`, rounded via `ICurrencyService.Round()` | Razor: `@item.FormattedUnitPrice` |
| Line item total | `OrderSummaryViewModel.LineItems[].DisplayLineTotal` = `DisplayUnitPrice * Quantity` | Razor: `@item.FormattedLineTotal` |
| Addon prices | `OrderSummaryLineItemViewModel.Addons[].DisplayUnitPrice` pre-calculated in ViewModel | Razor: `@addon.FormattedUnitPrice` |
| Summary totals | `OrderSummaryViewModel.DisplaySubTotal`, `DisplayShipping`, `DisplayTax`, `DisplayTotal` all pre-calculated | Razor: `@Model.CurrencySymbol@Model.DisplayTotal.ToString($"N{Model.CurrencyDecimalPlaces}")` |
| Tax-inclusive subtotal | `OrderSummaryViewModel.TaxInclusiveDisplaySubTotal` pre-calculated | Razor: conditional on `Model.DisplayPricesIncTax` |
| Tax included message | `OrderSummaryViewModel.TaxIncludedMessage` pre-formatted (e.g., "Including £10.17 in taxes") | Razor: `@Model.TaxIncludedMessage` |
| Express checkout amounts | `HX-Trigger: basketUpdated` header includes `{ total, subtotal, currency }` using display amounts | JS: `express-checkout.ts` listens for `basketUpdated` event |
| Mobile sticky bar total | `MobileTotalViewModel.FormattedTotal` pre-formatted | OOB swap: `_MobileTotal.cshtml` renders `@Model.FormattedTotal` |
| Shipping option costs | `ShippingOptionsViewModel.ShippingGroups[].Options[].DisplayCost` pre-calculated | Razor: `@option.FormattedDisplayCost` |

**Invariants preserved:**
- Basket amounts stored in store currency — never modified by display currency changes
- Display uses multiply: `amount * exchangeRate`
- Checkout/payment (invoice creation) uses divide: `amount / exchangeRate`
- Exchange rate locked at invoice creation (`PricingExchangeRate`, source, timestamp)
- Currency symbol and decimal places come from display currency config, not store currency

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

### Mobile Responsive Specification

The checkout uses Tailwind responsive breakpoints. The primary breakpoint is `lg:` (1024px) — above this, the checkout renders as a two-column layout; below it, everything collapses to a single column.

**Grid layout:**
```html
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Left column: forms (addresses, shipping, payment) -->
    <div> ... </div>
    <!-- Right column: order summary -->
    <div class="hidden lg:block"> ... </div>
</div>
```

**Mobile-only vs desktop-only elements:**

| Pattern | Meaning | Used for |
|---|---|---|
| `lg:hidden` | Visible on mobile, hidden on desktop | Mobile sticky bar, mobile order summary toggle |
| `hidden lg:block` | Hidden on mobile, visible on desktop | Desktop order summary sidebar |
| `sm:grid-cols-3` | Three-column grid from 640px+ | City / State / Postal code row in address form |

**Order summary collapse on mobile:**
On mobile, the order summary is not in the sidebar. Instead, a collapsible summary toggle appears above the form sections:

```html
<div class="lg:hidden" x-data="{ expanded: false }">
    <button @@click="expanded = !expanded" class="flex items-center justify-between w-full py-3 border-b">
        <span class="flex items-center gap-2">
            <svg x-show="!expanded"><!-- chevron right --></svg>
            <svg x-show="expanded"><!-- chevron down --></svg>
            <span>Show order summary</span>
        </span>
        <span id="mobile-summary-total">@Model.FormattedTotal</span>
    </button>
    <div x-show="expanded" x-collapse id="mobile-order-summary">
        @await Html.PartialAsync("Checkout/_OrderSummary", summaryVm)
    </div>
</div>
```

When HTMX swaps update the order summary, include `mobile-order-summary` as an additional OOB target alongside `order-summary` so both desktop and mobile views stay in sync:

```html
<div id="mobile-order-summary" hx-swap-oob="innerHTML">
    <!-- same summary partial content -->
</div>
```

**Address form responsive grid:**

The city, county/state, and postal code fields sit in a single row on wider screens:

```html
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div><!-- Town/City --></div>
    <div><!-- County/State --></div>
    <div><!-- Postal Code --></div>
</div>
```

On screens below `sm:` (640px), these stack vertically.

**Express checkout buttons on mobile:**

Express checkout buttons (Apple Pay, Google Pay, PayPal) stack vertically on mobile and sit in a horizontal row on desktop:

```html
<div id="express-checkout-buttons" class="flex flex-col sm:flex-row gap-3">
    <!-- Express payment buttons rendered by adapters -->
</div>
```

**Mobile sticky action bar:**
The sticky bar uses `lg:hidden` so it only appears on mobile. It is fixed to the bottom of the viewport:
```html
<div class="fixed bottom-0 inset-x-0 lg:hidden bg-white border-t shadow-lg p-4 z-50">
    <div class="flex items-center justify-between">
        <div>
            <span class="text-sm text-gray-500">Total</span>
            <span id="mobile-total" class="text-lg font-semibold">@Model.FormattedTotal</span>
        </div>
        <button
            @@click="document.getElementById('payment-form')?.requestSubmit()"
            :disabled="$store.paymentState.isSubmitting || !$store.paymentState.canSubmit"
            class="btn btn-primary px-8">
            <span x-show="!$store.paymentState.isSubmitting">Place Order</span>
            <span x-show="$store.paymentState.isSubmitting" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4"><!-- spinner --></svg>
                Processing...
            </span>
        </button>
    </div>
</div>
```

**Mobile UX requirements:**
1. All touch targets must be at least 44×44px (Apple HIG minimum)
2. Form inputs should use appropriate `inputmode` attributes (`numeric` for postal code in some regions, `email` for email, `tel` for phone)
3. The sticky bar must have sufficient `padding-bottom` on the `<body>` or last section to prevent content being hidden behind it
4. Shipping option radio buttons should have generous tap targets (full-width clickable row, not just the radio circle)
5. Discount code input and "Apply" button should be on the same row with the button not wrapping below the input
6. Loading states (HTMX `hx-indicator`) should be clearly visible on small screens — use inline spinners not full-page overlays

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

**File to edit:** `src/Merchello/Styles/checkout.css` (Tailwind source — NOT the compiled output in `wwwroot/`)

**Current state:** The file already has `[x-cloak] { display: none !important; }` and Alpine visibility overrides. It does **not** currently have any HTMX indicator classes (`htmx-indicator`, `htmx-request`). The following rules must be added before the existing Alpine section.

**Note on the shipping slow-message CSS** (shown in the "Shipping Recalculation Latency" section): those rules also belong in `checkout.css` and depend on the `.htmx-request` class established by the indicator rules below.

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

Also add to `checkout.css` the slow-shipping fallback message and section fade-in transitions:

```css
/* Slow shipping fallback message — shows after 8 seconds of waiting */
.shipping-slow-message { display: none; }
.htmx-request .shipping-slow-message {
    animation: show-after-delay 0s 8s forwards;
}
@keyframes show-after-delay {
    to { display: block; }
}

/* Disable submit button during HTMX request */
.htmx-request button[type="submit"],
.htmx-request input[type="submit"] {
    opacity: 0.6;
    pointer-events: none;
    cursor: not-allowed;
}

/* Shipping/payment section loading overlay */
#shipping-section.htmx-request,
#payment-section.htmx-request {
    opacity: 0.7;
    pointer-events: none;
}

/* Section fade-in after HTMX swap — smooth content reveal */
#shipping-section, #payment-section {
    animation: section-fade-in 200ms ease-in;
}
@keyframes section-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

**Note:** The `section-fade-in` animation fires on every page load AND after each HTMX swap (because HTMX swaps recreate the DOM node, restarting CSS animations automatically). No JavaScript needed.

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

### Alpine Store and Component Scope Details

After removing the `singlePageCheckout` mega-component and the `checkout` Alpine store, a minimal `Alpine.store('paymentState')` is the **only** Alpine store needed. All other state is either server-rendered or component-local.

**`Alpine.store('paymentState')` — defined in `checkout.ts`:**

```typescript
Alpine.store('paymentState', {
    isSubmitting: false,
    canSubmit: false,
    acceptedTerms: false
});
```

- **Updated by:** `paymentForm.ts` Alpine component sets `isSubmitting`, `canSubmit` based on payment method selection and form validity
- **Read by:** Desktop "Place Order" button AND mobile sticky bar button via `$store.paymentState.isSubmitting` / `$store.paymentState.canSubmit`
- **`acceptedTerms`:** Updated via `@change` handler on the terms checkbox. The terms checkbox lives INSIDE `_PaymentMethods.cshtml` so it is within the `paymentForm` Alpine scope and survives HTMX payment section swaps.

**Simplified `submitOrder` flow in `paymentForm.ts`:**

```typescript
async submitOrder() {
    // 1. Check terms acceptance (if required)
    if (this.orderTerms?.requireTermsAcceptance && !this.$store.paymentState.acceptedTerms) {
        this.showError('Please accept the terms and conditions');
        return;
    }

    // 2. Set submitting state
    this.$store.paymentState.isSubmitting = true;

    try {
        if (this.isUsingSavedMethod) {
            // 3a. Saved payment method flow
            const result = await fetch('/api/merchello/checkout/process-saved-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    savedMethodId: this.selectedSavedMethod.id,
                    invoiceId: this.invoiceId
                })
            });
            // Handle redirect or success
        } else {
            // 3b. Standard payment flow (adapter-based)
            await window.MerchelloPayment.initiatePayment(
                this.selectedMethod.providerAlias,
                this.selectedMethod.methodAlias,
                this.returnUrl,
                this.cancelUrl
            );
        }
    } catch (error) {
        this.$store.paymentState.isSubmitting = false;
        this.showError(error.message);
    }
}
```

**Key simplification:** No address/shipping validation in `submitOrder`. Addresses and shipping are already saved via prior HTMX form submissions. The payment step only validates: payment method selected, terms accepted (if required), then initiates payment.

**`accountSection` Alpine component scope:** Wraps the contact/email section in `SinglePage.cshtml`. Handles:
- Email check → dispatches HTMX request for `#email-status` swap (can also be done via `hx-post` on the email input directly)
- Sign-in form visibility, loading, error states
- Create account checkbox + password field visibility
- Password validation (real-time via fetch)
- Forgot password dispatch (`$dispatch('open-forgot-password', { email })`)
- Digital product account requirement (rendered server-side in `_EmailStatus.cshtml`, but `accountSection` manages the sign-in UX response)

The `x-data="accountSection"` scope does NOT wrap the entire checkout form — only the contact/email area. The address forms below use `x-data="validation"` and `x-data="addressAutocomplete"` as separate scoped components.

**Component scope layout in `SinglePage.cshtml`:**

```html
<!-- Contact section -->
<div x-data="accountSection">
    <input name="Email" ... hx-post="/checkout/partials/check-email" hx-target="#email-status" />
    <div id="email-status"><!-- HTMX swaps EmailStatus partial here --></div>
    <!-- Sign-in form, create account checkbox, password field -->
</div>

<!-- Address form (wraps billing + shipping) -->
<form hx-post="/checkout/partials/addresses" hx-target="#shipping-section" ...>
    <input name="Email" type="hidden" /> <!-- Hidden copy for HTMX submission -->
    <div x-data="validation">
        <div x-data="addressAutocomplete" data-prefix="billing">
            <!-- Billing address fields with name="BillingName" etc. -->
        </div>
    </div>
    <!-- Same-as-billing toggle (pure Alpine x-show) -->
    <div x-data="validation">
        <div x-data="addressAutocomplete" data-prefix="shipping">
            <!-- Shipping address fields with name="ShippingName" etc. -->
        </div>
    </div>
    <button type="submit">Continue to shipping</button>
</form>

<!-- Shipping section (HTMX swap target) -->
<div id="shipping-section">
    @await Html.PartialAsync("_ShippingOptions", Model.ShippingOptionsViewModel)
</div>

<!-- Payment section (HTMX swap target) -->
<div id="payment-section">
    <div x-data="paymentForm" ...>
        <!-- Payment methods, terms checkbox, place order button -->
    </div>
</div>

<!-- Order summary sidebar -->
<div id="order-summary">
    @await Html.PartialAsync("_OrderSummary", Model.OrderSummaryViewModel)
</div>

<!-- Mobile sticky bar (outside all swap targets) -->
<div class="lg:hidden fixed bottom-0 ...">
    <span id="mobile-total">@Model.FormattedDisplayTotal</span>
    <button :disabled="$store.paymentState.isSubmitting || !$store.paymentState.canSubmit"
            @click="document.getElementById('payment-form')?.requestSubmit()">
        Complete Order
    </button>
</div>

<!-- Modals (outside all swap targets) -->
<div x-data="termsModal"><!-- ... --></div>
<div x-data="forgotPasswordModal"><!-- ... --></div>
```

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

**Vendored script (recommended for robustness) — pin to htmx 2.0.4**

Download from `https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js` and save to `Client/public/js/vendor/htmx.min.js`.

**IMPORTANT:** Place the HTMX script tag inside the existing `@if (Model.Step != CheckoutStep.Confirmation && Model.Step != CheckoutStep.PostPurchase)` conditional block in `_Layout.cshtml`, BEFORE the import map. HTMX is not needed on Confirmation or PostPurchase pages (no `hx-*` attributes).

```html
<!-- _Layout.cshtml — inside the conditional block, BEFORE import map -->
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

#### CheckoutExceptionFilter Path Guard (Action Required)

`CheckoutExceptionFilter` (`src/Merchello/Filters/CheckoutExceptionFilter.cs`) contains a path guard that silently ignores exceptions from `CheckoutPartialsController`:

```csharp
// Line ~21 in CheckoutExceptionFilter.cs — only matches /api/merchello/checkout
if (path is null || !path.StartsWith("/api/merchello/checkout", StringComparison.OrdinalIgnoreCase))
    return;
```

`CheckoutPartialsController` serves `/checkout/partials/*` — a different prefix that does NOT match. Two consequences:
1. The filter returns early; unhandled exceptions bubble to the framework default (no structured logging).
2. The filter's JSON error body (`{ success, errorMessage, errorCode }`) is wrong for HTMX consumers that expect HTML.

**Do NOT apply `[ServiceFilter(typeof(CheckoutExceptionFilter))]` to `CheckoutPartialsController`.**

Instead, create a separate HTML-aware exception filter:

```csharp
// src/Merchello/Filters/CheckoutPartialsExceptionFilter.cs
public class CheckoutPartialsExceptionFilter(
    ILogger<CheckoutPartialsExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var path = context.HttpContext.Request.Path.Value;
        if (path is null || !path.StartsWith("/checkout/partials", StringComparison.OrdinalIgnoreCase))
            return;

        logger.LogError(context.Exception,
            "Unhandled checkout partial exception on {Method} {Path}",
            context.HttpContext.Request.Method, path);

        // Return HTML — HTMX can swap it; error-boundary.ts catches the 500
        context.Result = new ContentResult
        {
            StatusCode = StatusCodes.Status500InternalServerError,
            ContentType = "text/html",
            Content = "<div class=\"checkout-error\">An unexpected error occurred. Please refresh and try again.</div>"
        };
        context.ExceptionHandled = true;
    }
}
```

Register in `Startup.cs` alongside `CheckoutExceptionFilter`:
```csharp
builder.Services.AddScoped<Filters.CheckoutPartialsExceptionFilter>();
```

Apply to `CheckoutPartialsController`:
```csharp
[ServiceFilter(typeof(CheckoutPartialsExceptionFilter))]
public class CheckoutPartialsController : Controller { ... }
```

### Why esbuild, Not tsc or Vite

Two alternatives were considered and rejected:

**Option A — `tsc` compilation with Vite `publicDir` copy:**
Rejected. `tsc` compiles TypeScript → JavaScript but does NOT bundle. Each `.ts` file emits one `.js` file with bare `import` specifiers (e.g., `import { announce } from './utils/announcer.js'`). Payment adapters must be self-contained IIFE scripts that run without an import map — `tsc` cannot produce `format: "iife"` output. Additionally, `tsc` with `module: ES2022` leaves `import` statements in place, requiring a bundler to resolve them.

**Option B — Add checkout files as Vite entry points:**
Rejected. Vite produces hashed filenames by default (e.g., `index-abc123.js`). Disabling hashing for checkout entries breaks Vite's cache-busting for backoffice bundles. Vite's `emptyOutDir: true` also wipes the output directory on each build, creating ordering conflicts between checkout and backoffice output. Mixing stable-URL checkout output with hashed backoffice output in one Vite config is fragile.

**Chosen approach — dedicated esbuild script (`build:checkout:js`):**
esbuild produces: ESM bundles for `checkout.ts` and `payment.ts` (resolving all local imports into a single file), and IIFE bundles for adapters and classic scripts. Output uses `entryNames: '[name]'` (no hashing). Filenames are stable. Runs after Vite as a separate build step:

```json
// package.json
"build:checkout:js": "node scripts/build-checkout.mjs",
"build": "npm run build:backoffice && npm run build:checkout:js && npm run build:checkout:css"
```

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

#### Vite Config: No Change Needed

**Do NOT change `emptyOutDir` in `vite.config.ts`.** The existing `emptyOutDir: true` is correct and must stay.

Why this works without changes:

- `emptyOutDir: true` causes Vite to clear `outDir` at the start of `build:backoffice`
- Vite then copies `Client/public/` into `outDir` via `publicDir`
- During Phases 1–6, `Client/public/js/checkout/` still exists, so Vite copies old checkout JS
- After Phase 7 (legacy JS deleted), `Client/public/js/checkout/` no longer exists — Vite copies nothing into `js/checkout/`
- The esbuild step (`build:checkout:js`), running after Vite, writes the compiled TypeScript output into `js/checkout/`

**Do NOT set `emptyOutDir: false`** — that would allow stale backoffice bundles to accumulate across builds. The build order (`build:backoffice` then `build:checkout`) is what ensures correctness, not the `emptyOutDir` setting.

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

### Safe Deployment Boundary

The Phase ordering below is for PR review clarity. For deployment, some phases MUST ship atomically. Deploying them independently breaks the checkout:

| Break Point | What Breaks |
|---|---|
| Phase 1–2 only deployed | Safe — build infrastructure only, no runtime changes |
| Phase 3 (controller + partials) deployed without Phase 4 | Safe — new endpoints exist but `SinglePage.cshtml` still uses `singlePageCheckout` Alpine orchestrator. HTMX partials are unreachable. Checkout works exactly as before. |
| Phase 3 HTMX attributes added to views, Phase 4 NOT deployed | **BREAKS.** HTMX `hx-*` attributes on forms conflict with the still-running `singlePageCheckout` Alpine orchestrator. Both try to handle form submit — race condition + double submission. |
| Phase 4 (`checkout.ts` replaces `index.js`) without Phase 3 | **BREAKS.** `checkout.ts` has no Alpine orchestrator; forms have no submit handlers; HTMX partials don't exist yet. |
| Phase 5–6 (TS adapter/script conversion) without Phase 4 | Safe individually — adapters and classic scripts are self-contained. |
| Phase 7 (file deletion) before Phase 5–6 prove stable | **RISKY.** Delete source JS only after esbuild output is verified in production. |

**Recommended PR grouping:**
- **PR 1:** Phases 1–2 (build + types) — mergeable independently
- **PR 2:** Phase 3 (partials controller + views) + Phase 4 (checkout.ts entry point + remove Alpine orchestrator) — **must ship together in a single release**
- **PR 3:** Phases 5–6 (adapter + classic script TS conversion) — safe after PR 2 stabilizes
- **PR 4:** Phase 7 (legacy JS deletion) — after PR 3 proves stable in production
- **PR 5:** Phase 8 (tests) — can accompany any prior PR or ship independently

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
- `src/Merchello/Models/Checkout/ShippingOptionsViewModel.cs`
- `src/Merchello/Models/Checkout/ShippingGroupViewModel.cs`
- `src/Merchello/Models/Checkout/ShippingOptionViewModel.cs`
- `src/Merchello/Models/Checkout/OrderSummaryViewModel.cs`
- `src/Merchello/Models/Checkout/OrderSummaryLineItemViewModel.cs`
- `src/Merchello/Models/Checkout/OrderSummaryAddonViewModel.cs`
- `src/Merchello/Models/Checkout/OrderSummaryDiscountViewModel.cs`
- `src/Merchello/Models/Checkout/PaymentMethodsViewModel.cs`
- `src/Merchello/Models/Checkout/EmailStatusViewModel.cs`
- `src/Merchello/Models/Checkout/DiscountFormViewModel.cs`
- `src/Merchello/Models/Checkout/MobileTotalViewModel.cs`
- `src/Merchello/Models/Checkout/ValidationErrorsViewModel.cs`
- `src/Merchello/Models/Checkout/RegionSelectViewModel.cs`
- `src/Merchello/Models/Checkout/AddressFormViewModel.cs`
- `src/Merchello/Models/Checkout/AddressLookupConfigViewModel.cs`
- `src/Merchello/Services/Interfaces/ICheckoutViewModelBuilder.cs`
- `src/Merchello/Services/CheckoutViewModelBuilder.cs`
- `src/Merchello/Client/scripts/build-checkout.mjs`

**Files to modify:**
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/SinglePage.cshtml` — extract sections into partials, add HTMX attributes, remove `x-data="singlePageCheckout"` mega-component, add section `id` attributes
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_Layout.cshtml` — add HTMX vendor script tag BEFORE import map
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_OrderSummary.cshtml` — support HTMX partial return (standalone context), extract discount form
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_AddressForm.cshtml` — add HTMX attributes, `data-address-capture` for abandoned checkout
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_ExpressCheckout.cshtml` — update to listen for `basketUpdated` HTMX event
- `src/Merchello/Controllers/MerchelloCheckoutController.cs` — add Google auto-discount application during page render (read `HttpContext.Items["MerchelloGoogleAutoDiscount"]`, call `ApplyGoogleAutoDiscountAsync`)

**Tasks:**

1. Create `CheckoutPartialsController` with `[ServiceFilter(typeof(CheckoutPartialsExceptionFilter))]`, `IRateLimiter`, and granular endpoints (address save, shipping select, shipping submit, discount apply/remove, region load, email check, upsell add). **Do NOT apply `[ServiceFilter(typeof(CheckoutExceptionFilter))]`** — that filter is for JSON API endpoints and returns JSON error bodies; the partials filter returns HTML error fragments.
1a. Create `src/Merchello/Filters/CheckoutPartialsExceptionFilter.cs` — catches unhandled exceptions in `CheckoutPartialsController` and returns a 500 HTML fragment (uses `_ValidationErrors` partial) so HTMX can swap in a user-facing error rather than leaving the section blank. Implementation in "CheckoutExceptionFilter Path Guard" section.
1b. Register: `builder.Services.AddScoped<Filters.CheckoutPartialsExceptionFilter>();` in `Startup.cs`.
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
22. Create `ICheckoutViewModelBuilder` service (interface in `src/Merchello/Services/Interfaces/`, implementation in `src/Merchello/Services/`) — encapsulates display context resolution, currency conversion, and ViewModel construction for all partials (see "Partial ViewModel Definitions" section)
23. Create 15 ViewModel classes in `src/Merchello/Models/Checkout/` — one file per class (CLAUDE.md convention): `ShippingOptionsViewModel`, `ShippingGroupViewModel`, `ShippingOptionViewModel`, `OrderSummaryViewModel`, `OrderSummaryLineItemViewModel`, `OrderSummaryAddonViewModel`, `OrderSummaryDiscountViewModel`, `PaymentMethodsViewModel`, `EmailStatusViewModel`, `DiscountFormViewModel`, `MobileTotalViewModel`, `ValidationErrorsViewModel`, `RegionSelectViewModel`, `AddressFormViewModel`, `AddressLookupConfigViewModel`. Full property specifications for each are in "Partial ViewModel Definitions" and Gap 30.
24. Migrate `_AddressForm.cshtml` field names from Alpine `x-model` to HTML `name` attributes matching `SaveAddressesFormModel` properties (see "Address Form Field Name Migration" section for complete mapping table)
25. Render `allItemsShippable` and `itemAvailabilityErrors` server-side in `_ShippingOptions.cshtml` from shipping calculation result
26. Move order terms checkbox into `_PaymentMethods.cshtml` partial (inside `paymentForm` Alpine scope) so it survives HTMX payment section swaps and is accessible to `$store.paymentState.acceptedTerms`

**Form model types:** The endpoints reference form model types (`SaveAddressesFormModel`, `SelectShippingFormModel`, `ApplyDiscountFormModel`, `CheckEmailFormModel`, `AddUpsellFormModel`). These are **new classes** — they do not exist today. They differ from existing JSON request DTOs because HTMX sends `application/x-www-form-urlencoded`, not JSON. Each form model maps to existing service parameter types.

#### Complete Form Model Definitions

Place all form model files in `src/Merchello/Checkout/FormModels/`. One type per file (CLAUDE.md convention). These are NOT DTOs — no `Dto` suffix, not in `Dtos/` folder. Namespace: `Merchello.Checkout.FormModels`.

```csharp
// src/Merchello/Checkout/FormModels/SaveAddressesFormModel.cs
// Canonical address field names match AddressDto.cs — do NOT use address1/city/state synonyms.
public class SaveAddressesFormModel
{
    // Contact
    [Required, EmailAddress]
    public string Email { get; set; } = "";
    public bool AcceptsMarketing { get; set; }
    public string? Password { get; set; } // Null = guest; populated = create account during order

    // Billing — canonical: AddressOne, TownCity, CountyState, RegionCode
    [Required] public string BillingName { get; set; } = "";
    public string? BillingCompany { get; set; }
    [Required] public string BillingAddressOne { get; set; } = "";  // NOT address1/line1/street
    public string? BillingAddressTwo { get; set; }
    [Required] public string BillingTownCity { get; set; } = "";    // NOT city/locality
    public string? BillingCountyState { get; set; }                 // NOT state/county/province
    [Required] public string BillingPostalCode { get; set; } = "";
    [Required] public string BillingCountryCode { get; set; } = "";
    public string? BillingRegionCode { get; set; }                  // NOT stateCode/provinceCode
    public string? BillingPhone { get; set; }

    // Shipping toggle
    public bool SameAsBilling { get; set; }

    // Shipping (nullable — required only when SameAsBilling = false)
    public string? ShippingName { get; set; }
    public string? ShippingCompany { get; set; }
    public string? ShippingAddressOne { get; set; }
    public string? ShippingAddressTwo { get; set; }
    public string? ShippingTownCity { get; set; }
    public string? ShippingCountyState { get; set; }
    public string? ShippingPostalCode { get; set; }
    public string? ShippingCountryCode { get; set; }
    public string? ShippingRegionCode { get; set; }
    public string? ShippingPhone { get; set; }
}

// src/Merchello/Checkout/FormModels/SelectShippingFormModel.cs
// Dictionary binding: <input name="Selections[{groupId}]" value="{selectionKey}">
// ASP.NET Core binds URL-encoded bracket notation to Dictionary<string, string>.
public class SelectShippingFormModel
{
    public Dictionary<string, string> Selections { get; set; } = new();
}

// src/Merchello/Checkout/FormModels/ApplyDiscountFormModel.cs
public class ApplyDiscountFormModel
{
    [Required] public string Code { get; set; } = "";
}

// src/Merchello/Checkout/FormModels/CheckEmailFormModel.cs
public class CheckEmailFormModel
{
    [Required, EmailAddress] public string Email { get; set; } = "";
}

// src/Merchello/Checkout/FormModels/AddUpsellFormModel.cs
public class AddUpsellFormModel
{
    [Required] public Guid ProductId { get; set; }
    [Range(1, 100)] public int Quantity { get; set; } = 1;
}
```

**Important:** The existing `CheckoutApiController` JSON endpoints stay untouched. The partials controller is additional.

### Address Form Field Name Migration

The current `_AddressForm.cshtml` uses Alpine `x-model` bindings (e.g., `x-model="form.billing.name"`) with NO HTML `name` attributes. After migration, every input needs a `name` attribute matching `SaveAddressesFormModel` properties so HTMX form submission serializes correctly.

**Complete field name mapping:**

| Current Alpine Binding | New `name` Attribute | New `value` Attribute |
|---|---|---|
| `x-model="form.email"` | `Email` | `@Model.Session?.Email` |
| `x-model="form.acceptsMarketing"` | `AcceptsMarketing` | `checked="@Model.Session?.AcceptsMarketing"` |
| `x-model="form.password"` | `Password` | (empty — never pre-populated) |
| `x-model="form.sameAsBilling"` | `SameAsBilling` | `@Model.Session?.SameAsBilling` |
| `x-model="form.billing.name"` | `BillingName` | `@Model.Session?.BillingName` |
| `x-model="form.billing.company"` | `BillingCompany` | `@Model.Session?.BillingCompany` |
| `x-model="form.billing.addressOne"` | `BillingAddressOne` | `@Model.Session?.BillingAddressOne` |
| `x-model="form.billing.addressTwo"` | `BillingAddressTwo` | `@Model.Session?.BillingAddressTwo` |
| `x-model="form.billing.townCity"` | `BillingTownCity` | `@Model.Session?.BillingTownCity` |
| `x-model="form.billing.countyState"` | `BillingCountyState` | `@Model.Session?.BillingCountyState` |
| `x-model="form.billing.postalCode"` | `BillingPostalCode` | `@Model.Session?.BillingPostalCode` |
| `x-model="form.billing.countryCode"` | `BillingCountryCode` | `@Model.Session?.BillingCountryCode` |
| `x-model="form.billing.regionCode"` | `BillingRegionCode` | `@Model.Session?.BillingRegionCode` |
| `x-model="form.billing.phone"` | `BillingPhone` | `@Model.Session?.BillingPhone` |
| `x-model="form.shipping.name"` | `ShippingName` | `@Model.Session?.ShippingName` |
| `x-model="form.shipping.company"` | `ShippingCompany` | `@Model.Session?.ShippingCompany` |
| `x-model="form.shipping.addressOne"` | `ShippingAddressOne` | `@Model.Session?.ShippingAddressOne` |
| `x-model="form.shipping.addressTwo"` | `ShippingAddressTwo` | `@Model.Session?.ShippingAddressTwo` |
| `x-model="form.shipping.townCity"` | `ShippingTownCity` | `@Model.Session?.ShippingTownCity` |
| `x-model="form.shipping.countyState"` | `ShippingCountyState` | `@Model.Session?.ShippingCountyState` |
| `x-model="form.shipping.postalCode"` | `ShippingPostalCode` | `@Model.Session?.ShippingPostalCode` |
| `x-model="form.shipping.countryCode"` | `ShippingCountryCode` | `@Model.Session?.ShippingCountryCode` |
| `x-model="form.shipping.regionCode"` | `ShippingRegionCode` | `@Model.Session?.ShippingRegionCode` |
| `x-model="form.shipping.phone"` | `ShippingPhone` | `@Model.Session?.ShippingPhone` |

**`_AddressForm.cshtml` Prefix parameter:** The existing `Prefix` parameter (`billing` or `shipping`) now generates name attributes by concatenating the prefix with the field name in PascalCase. Example: `Prefix="Billing"` generates `name="BillingName"`, `name="BillingAddressOne"`, etc.

**Alpine attribute changes in `_AddressForm.cshtml`:**

| Attribute | Action | Notes |
|---|---|---|
| `x-model="form.{prefix}.{field}"` | **REMOVE** | Replaced by `name` + `value` attributes |
| `x-on:blur="validateField('{prefix}.{field}')"` | **REPLACE** with `x-data="validation"` scope | Validation component handles blur events |
| `x-show="errors['{prefix}.{field}']"` | **REPLACE** with validation component `x-show` | Error display from validation Alpine component |
| `x-text="errors['{prefix}.{field}']"` | **REPLACE** with validation component `x-text` | Error text from validation Alpine component |
| `x-model="addressLookup.{prefix}.query"` | **KEEP** (inside `x-data="addressAutocomplete"` scope) | Autocomplete component manages its own state |
| Alpine country/region `x-for` templates | **REMOVE** | Razor renders `<option>` elements directly; HTMX swaps on country change |
| — | **ADD** `data-address-capture` | On each address input for abandoned checkout re-wiring |

**Form wrapper:** The existing `<form>` wrapper at `SinglePage.cshtml` (currently line ~397) stays intact and wraps email + billing address + shipping address + password + acceptsMarketing. No `hx-include` directives are needed — HTMX automatically serializes all inputs within the `<form>`.

**Shipping radio serialization:** Radio buttons in `_ShippingOptions.cshtml` use PascalCase property name for ASP.NET model binding:

```html
<input type="radio"
       name="Selections[@group.GroupId]"
       value="@option.SelectionKey"
       hx-post="/checkout/partials/shipping/select"
       hx-trigger="change"
       hx-target="#order-summary"
       hx-swap="innerHTML"
       hx-sync="closest form:replace"
       hx-indicator="#summary-spinner" />
```

This serializes as `Selections%5B{guid}%5D={selectionKey}` which ASP.NET Core binds to `Dictionary<string, string> Selections` on `SelectShippingFormModel`.

#### _AddressForm.cshtml ViewModel Declaration

The current `_AddressForm.cshtml` uses `ViewData["Prefix"]` and Alpine `x-model` bindings. After migration it receives a typed ViewModel:

```razor
@model Merchello.Models.Checkout.AddressFormViewModel
```

Add this class to `src/Merchello/Models/Checkout/AddressFormViewModel.cs`:
```csharp
public class AddressFormViewModel
{
    public string Prefix { get; init; } = "Billing"; // "Billing" or "Shipping"
    public IReadOnlyList<CountryDto> Countries { get; init; } = [];
    public IReadOnlyList<RegionDto> Regions { get; init; } = []; // Pre-loaded for selected country
    public bool IsRequired { get; init; } = true; // False for shipping when SameAsBilling
    // Pre-populated values from CheckoutSession
    public string? PrefilledName { get; init; }
    public string? PrefilledAddressOne { get; init; }
    public string? PrefilledAddressTwo { get; init; }
    public string? PrefilledTownCity { get; init; }
    public string? PrefilledCountyState { get; init; }
    public string? PrefilledPostalCode { get; init; }
    public string? PrefilledCountryCode { get; init; }
    public string? PrefilledRegionCode { get; init; }
    public string? PrefilledPhone { get; init; }
    /// <summary>
    /// Compact = single-page checkout style (condensed labels). Always true for HTMX checkout.
    /// Only set false if rendering address form in a full-page multi-step layout.
    /// </summary>
    public bool IsCompact { get; init; } = true;
}
```

Form field `name` attributes use the prefix: `name="@($"{Model.Prefix}Name")"` → generates `BillingName` or `ShippingName`. This matches `SaveAddressesFormModel` property names exactly.

#### Abandoned Checkout `data-address-capture` Attribute

Every address input included in the abandoned checkout capture payload needs `data-address-capture` so `wireAbandonedCheckoutCapture()` in `checkout.ts` can reattach blur listeners after HTMX swaps replace form DOM:

```html
<input type="text"
       name="@($"{Model.Prefix}AddressOne")"
       value="@Model.PrefilledAddressOne"
       data-address-capture
       autocomplete="address-line1" />
```

Apply `data-address-capture` to: Name, AddressOne, AddressTwo, TownCity, PostalCode, CountryCode, RegionCode, Phone — all fields included in the `captureAddress()` payload.

The email input (in the contact section of `SinglePage.cshtml`, outside `_AddressForm.cshtml`) also needs a blur listener via `wireAbandonedCheckoutCapture()` — add `data-email-capture` attribute (distinct from `data-address-capture`) for clarity.

### _ViewImports.cshtml Additions

**File:** `src/Merchello/App_Plugins/Merchello/Views/Checkout/_ViewImports.cshtml`

**Current content:**
```razor
@using Merchello.Models
@using Merchello.Core.Checkout.Models
@using Merchello.Core.Accounting.Extensions
@using Merchello.Core.Accounting.Models
```

**Add the following `@using` directives:**
```razor
@using Merchello.Models.Checkout           // All 7 new partial ViewModels
@using Merchello.Core.Upsells.Dtos         // UpsellSuggestionDto
@using Merchello.Core.Checkout.Dtos        // ShippingGroupDto, PaymentMethodDto
@using Merchello.Core.Payments.Dtos        // SavedPaymentMethodDto
@using Merchello.Checkout.FormModels       // Form models for ValidationErrorsViewModel
```

Without `@using Merchello.Models.Checkout`, each partial's `@model` directive would require the fully qualified type name (e.g., `@model Merchello.Models.Checkout.OrderSummaryViewModel` instead of just `@model OrderSummaryViewModel`).

**Note:** No new `@addTagHelper` directives are needed. HTMX attributes (`hx-post`, `hx-target`, etc.) are standard HTML attributes processed by the browser — they do not require Tag Helper registration.

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
13. Define `Alpine.store('paymentState', { isSubmitting: false, canSubmit: false, acceptedTerms: false })` in `checkout.ts` — the only Alpine store after migration (see "Alpine Store and Component Scope Details" section)
14. Implement simplified `submitOrder` in `paymentForm.ts`: validate terms → initiate payment or process saved method. NO address/shipping validation (already handled by prior HTMX submissions)
15. Wire terms checkbox `@change` handler to `$store.paymentState.acceptedTerms` in `_PaymentMethods.cshtml` / `paymentForm.ts`
16. Wire mobile sticky bar button to read `$store.paymentState.isSubmitting` / `$store.paymentState.canSubmit` and dispatch submit to payment form

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

**Absolute source paths to delete** (from project root, after esbuild output is verified):

```
src/Merchello/Client/public/js/checkout/stores/checkout.store.js
src/Merchello/Client/public/js/checkout/services/api.js
src/Merchello/Client/public/js/checkout/services/error-boundary.js
src/Merchello/Client/public/js/checkout/services/logger.js
src/Merchello/Client/public/js/checkout/services/validation.js
src/Merchello/Client/public/js/checkout/components/single-page-checkout.js
src/Merchello/Client/public/js/checkout/components/checkout-address-form.js
src/Merchello/Client/public/js/checkout/components/checkout-shipping.js
src/Merchello/Client/public/js/checkout/components/checkout-payment.js
src/Merchello/Client/public/js/checkout/components/order-summary.js
src/Merchello/Client/public/js/checkout/utils/formatters.js
src/Merchello/Client/public/js/checkout/utils/regions.js
src/Merchello/Client/public/js/checkout/utils/debounce.js
src/Merchello/Client/public/js/checkout/utils/announcer.js
src/Merchello/Client/public/js/checkout/utils/payment-errors.js
src/Merchello/Client/public/js/checkout/utils/security.js
src/Merchello/Client/public/js/checkout/index.js
src/Merchello/Client/public/js/checkout/payment.js
src/Merchello/Client/public/js/checkout/analytics.js
src/Merchello/Client/public/js/checkout/single-page-analytics.js
src/Merchello/Client/public/js/checkout/confirmation.js
src/Merchello/Client/public/js/checkout/post-purchase.js
src/Merchello/Client/public/js/checkout/adapters/ (entire directory — all .js adapter files)
```

**Pre-deletion verification:** Run `npm run build:checkout:js` and confirm all 22+ JS files exist in `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/` from esbuild output before deleting source files.

**Note on adapter deletion:** The 9 adapter `.js` files in `adapters/` are replaced by `.ts` files in `src/Merchello/Client/src/checkout/adapters/`. The IIFE adapters are still compiled by esbuild — they just come from TypeScript source now.

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

### Browser Cache / Stale Tab Safety

**Scenario:** A user has a checkout tab open when the deployment goes live. They have the OLD `index.js` loaded in memory.

**What happens:**

- The old `singlePageCheckout` Alpine component will call `/api/merchello/checkout/*` JSON endpoints — these are **preserved** (see "Existing JSON API Endpoints Stay" section). The user completes checkout normally with the old flow.
- A user opening the checkout fresh after deployment gets the new `index.js` (HTMX-based) and hits `/checkout/partials/*` which now exists.
- No special handling required. The JSON API preservation makes this a zero-downtime migration.

**Dangerous intermediate state:** If Phase 3 (HTMX attributes on views) deploys WITHOUT Phase 4 (new `index.js`), the views will have `hx-post` attributes but the browser will still load the old `index.js`. The old Alpine component ignores HTMX attributes, so mutations fall back to the old Alpine/API flow — degraded but not broken.

**Recommendation:** Deploy Phase 3 and Phase 4 atomically as a single PR (already documented under "PR 2" in "Phase Ordering & Atomic Deployment"). Never deploy Phase 3 in isolation to production.

**Cache busting:** The checkout assets are served at stable paths (no content hash). After deployment, browsers may serve the old `index.js` from cache until TTL expires or user hard-refreshes. If your CDN or reverse proxy caches these files, ensure you purge `/App_Plugins/Merchello/js/checkout/*` as part of the deployment pipeline.

---

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
17. Mobile sticky bar total updates when order summary changes
18. Terms modal opens from footer links and displays content
19. Forgot password modal sends reset email and shows success/error states
20. Account creation via password field in address form creates customer on order
21. Marketing opt-in checkbox value flows through to customer record
22. Address autocomplete typeahead and resolution
23. Account creation and sign-in with page reload

---

## Implementation Reference Addendum

This section fills gaps identified during codebase audit. Every subsection addresses a specific ambiguity that would block end-to-end implementation.

---

### Gap 1: Session Restoration on Page Refresh

When a user refreshes mid-checkout after already saving addresses and selecting shipping, the HTMX-only approach leaves `#payment-section` empty. Fix: detect session state at initial full-page render.

In `MerchelloCheckoutController.RenderSinglePageCheckoutAsync()`, after loading the basket and session, build the payment section if session already has shipping selections:

```csharp
PaymentMethodsViewModel? paymentMethodsViewModel = null;
if (session?.SelectedShippingOptions?.Count > 0)
{
    paymentMethodsViewModel = await _viewModelBuilder.BuildPaymentMethodsAsync(session, isPartialSwap: false, ct);
}
viewModel.PaymentMethodsViewModel = paymentMethodsViewModel;
```

Add `PaymentMethodsViewModel` property to `CheckoutViewModel`:
```csharp
public PaymentMethodsViewModel? PaymentMethodsViewModel { get; set; }
```

In `SinglePage.cshtml`, replace the static empty `#payment-section` with:
```razor
<div id="payment-section">
    @if (Model.PaymentMethodsViewModel != null)
    {
        @await Html.PartialAsync("_PaymentMethods", Model.PaymentMethodsViewModel)
    }
    else
    {
        <div class="checkout-payment-placeholder">
            <p>Complete shipping selection to see payment options.</p>
        </div>
    }
</div>
```

This restores checkout state after page refresh without an HTMX round-trip.

---

### Gap 2: Complete `checkout.ts` Reference Implementation

Full entry-point file. All HTMX event handlers must be wired in this order:

```typescript
// checkout.ts
import Alpine from 'alpinejs';
import { paymentForm } from './components/payment-form.js';
import { expressCheckout } from './components/express-checkout.js';
import { addressAutocomplete } from './components/address-autocomplete.js';
import { validation } from './components/validation.js';
import { accountSection } from './components/account-section.js';
import { termsModal } from './components/terms-modal.js';
import { forgotPasswordModal } from './components/forgot-password-modal.js';
import { upsellInterstitial } from './components/upsell-interstitial.js';
import { MerchelloLogger } from './utils/logger.js';
import { debounce } from './utils/debounce.js';

// Module-scope state for abandoned checkout capture
let _emailCaptured = false;
let _lastAddressHash = '';
let _captureAddressInFlight = false;
let _captureAddressPending = false;

// Logger
window.MerchelloLogger = new MerchelloLogger({ prefix: '[Checkout]' });

// Alpine store — minimal; only what payment adapters need at runtime
Alpine.store('paymentState', {
    canSubmit: false,
    isSubmitting: false,
    acceptedTerms: false,
    selectedMethod: null as string | null,
});

// Alpine component registrations (order matters — paymentForm first)
Alpine.data('paymentForm', paymentForm);
Alpine.data('expressCheckout', expressCheckout);
Alpine.data('addressAutocomplete', addressAutocomplete);
Alpine.data('validation', validation);
Alpine.data('accountSection', accountSection);
Alpine.data('termsModal', termsModal);
Alpine.data('forgotPasswordModal', forgotPasswordModal);
Alpine.data('upsellInterstitial', upsellInterstitial);

// HTMX lifecycle hooks
document.body.addEventListener('htmx:configRequest', (evt: Event) => {
    const e = evt as CustomEvent;
    // Inject antiforgery token into all HTMX requests
    const token = document.querySelector<HTMLInputElement>('[name="__RequestVerificationToken"]')?.value;
    if (token) e.detail.headers['RequestVerificationToken'] = token;
});

document.body.addEventListener('htmx:beforeSwap', (evt: Event) => {
    const e = evt as CustomEvent;
    // Allow 422 (validation errors) to swap into target — HTMX ignores 4xx by default
    if (e.detail.xhr.status === 422) {
        e.detail.shouldSwap = true;
        e.detail.isError = false;
    }
    // Destroy Alpine tree before swap to prevent memory leaks
    const target = e.detail.target as HTMLElement;
    if (target && target._x_dataStack) {
        Alpine.destroyTree(target);
    }
});

document.body.addEventListener('htmx:afterSwap', (evt: Event) => {
    const e = evt as CustomEvent;
    const target = e.detail.target as HTMLElement;
    // Re-initialize Alpine on swapped content
    Alpine.initTree(target);
    // Re-wire abandoned checkout capture on new form inputs
    wireAbandonedCheckoutCapture(target);
});

document.body.addEventListener('htmx:oobAfterSwap', (evt: Event) => {
    const e = evt as CustomEvent;
    const target = e.detail.target as HTMLElement;
    Alpine.initTree(target);
    wireAbandonedCheckoutCapture(target);
});

document.body.addEventListener('htmx:afterSettle', (evt: Event) => {
    const e = evt as CustomEvent;
    const target = e.detail.target as HTMLElement;
    // Accessibility: announce new content to screen readers
    const announcement = target.dataset.announcement;
    if (announcement) {
        const announcer = document.getElementById('checkout-announcer');
        if (announcer) announcer.textContent = announcement;
    }
    // Analytics: track step completion
    if (target.dataset.checkoutStep) {
        window.MerchelloLogger.trackCheckoutStep(target.dataset.checkoutStep);
    }
    // Mobile scroll: bring new section into view
    if (window.innerWidth < 1024 && target.id && target.scrollIntoView) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
});

document.body.addEventListener('htmx:responseError', (evt: Event) => {
    const e = evt as CustomEvent;
    const status = e.detail.xhr.status;
    if (status >= 500) {
        const announcer = document.getElementById('checkout-announcer');
        if (announcer) announcer.textContent = 'An error occurred. Please try again.';
        window.MerchelloLogger.error('HTMX server error', { status });
    }
});

// Keyboard-aware sticky bar (mobile — visual viewport shrinks when keyboard opens)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const bar = document.querySelector<HTMLElement>('.checkout-sticky-bar');
        if (bar) {
            const offset = window.innerHeight - (window.visualViewport?.height ?? window.innerHeight);
            bar.style.bottom = `${offset}px`;
        }
    });
}

Alpine.start();

// Initial wire-up on page load
wireAbandonedCheckoutCapture(document.body);

// --- Abandoned Checkout Capture ---

function wireAbandonedCheckoutCapture(root: HTMLElement): void {
    const emailInput = root.querySelector<HTMLInputElement>('#checkout-email') ??
                       document.getElementById('checkout-email') as HTMLInputElement | null;
    if (emailInput && !emailInput.dataset.abandonedWired) {
        emailInput.dataset.abandonedWired = '1';
        emailInput.addEventListener('blur', () => captureEmail(emailInput.value));
    }

    root.querySelectorAll<HTMLInputElement>('[data-address-capture]').forEach(el => {
        if (!el.dataset.abandonedWired) {
            el.dataset.abandonedWired = '1';
            el.addEventListener('input', debounce(captureAddress, 1500));
        }
    });
}

async function captureEmail(email: string): Promise<void> {
    if (!email || _emailCaptured) return;
    _emailCaptured = true;
    try {
        await fetch('/api/merchello/checkout/capture-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
    } catch { /* non-critical */ }
}

const captureAddress = debounce(async () => {
    if (_captureAddressInFlight) { _captureAddressPending = true; return; }
    const data = collectAddressFormData();
    const hash = JSON.stringify(data);
    if (hash === _lastAddressHash) return;
    _lastAddressHash = hash;
    _captureAddressInFlight = true;
    try {
        await fetch('/api/merchello/checkout/capture-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch { /* non-critical */ } finally {
        _captureAddressInFlight = false;
        if (_captureAddressPending) {
            _captureAddressPending = false;
            captureAddress();
        }
    }
}, 1500);

function collectAddressFormData(): Record<string, string> {
    const data: Record<string, string> = {};
    document.querySelectorAll<HTMLInputElement>('[data-address-capture]').forEach(el => {
        if (el.name) data[el.name] = el.value;
    });
    return data;
}
```

---

### Gap 3: Complete `payment-form.ts` Alpine Component

```typescript
// components/payment-form.ts
import type { AlpineComponent } from 'alpinejs';

interface PaymentMethod {
    providerAlias: string;
    displayName: string;
    iconUrl?: string;
}

interface SavedPaymentMethod {
    id: string;
    displayLabel: string;
    providerAlias: string;
}

export function paymentForm(): AlpineComponent<any> {
    return {
        methods: [] as PaymentMethod[],
        savedMethods: [] as SavedPaymentMethod[],
        selectedMethod: null as PaymentMethod | null,
        selectedSavedMethod: null as SavedPaymentMethod | null,
        isUsingSavedMethod: false,
        error: '',
        invoiceId: '',
        canVault: false,
        returnUrl: '',
        cancelUrl: '',
        orderTerms: false,

        init() {
            // Read config from data-* attributes (set by Razor _PaymentMethods.cshtml)
            const el = this.$el as HTMLElement;
            this.methods = JSON.parse(el.dataset.methods ?? '[]');
            this.savedMethods = JSON.parse(el.dataset.savedMethods ?? '[]');
            this.canVault = el.dataset.canVault === 'true';
            this.invoiceId = el.dataset.invoiceId ?? '';
            this.returnUrl = el.dataset.returnUrl ?? '';
            this.cancelUrl = el.dataset.cancelUrl ?? '';

            // Restore previously selected method from sessionStorage
            const remembered = sessionStorage.getItem('checkout:selected-payment');
            if (remembered) {
                const method = this.methods.find((m: PaymentMethod) => m.providerAlias === remembered);
                if (method) {
                    this.selectMethod(method);
                    // Auto-mount payment SDK for pre-selected method
                    if (window.MerchelloPayment) {
                        window.MerchelloPayment.initiatePayment(method.providerAlias, {
                            invoiceId: this.invoiceId,
                            returnUrl: this.returnUrl,
                            cancelUrl: this.cancelUrl,
                            canVault: this.canVault,
                        });
                    }
                }
            }

            this.$watch('selectedMethod', () => {
                this.$store.paymentState.canSubmit = !!this.selectedMethod || !!this.selectedSavedMethod;
                this.$store.paymentState.selectedMethod = this.selectedMethod?.providerAlias ?? null;
            });
            this.$watch('selectedSavedMethod', () => {
                this.$store.paymentState.canSubmit = !!this.selectedMethod || !!this.selectedSavedMethod;
            });
        },

        selectMethod(method: PaymentMethod) {
            this.isUsingSavedMethod = false;
            this.selectedSavedMethod = null;
            this.selectedMethod = method;
            this.error = '';
            sessionStorage.setItem('checkout:selected-payment', method.providerAlias);
            this.$store.paymentState.canSubmit = true;

            if (window.MerchelloPayment) {
                window.MerchelloPayment.initiatePayment(method.providerAlias, {
                    invoiceId: this.invoiceId,
                    returnUrl: this.returnUrl,
                    cancelUrl: this.cancelUrl,
                    canVault: this.canVault,
                });
            }
        },

        selectSavedMethod(saved: SavedPaymentMethod) {
            this.isUsingSavedMethod = true;
            this.selectedSavedMethod = saved;
            this.selectedMethod = null;
            this.error = '';
            this.$store.paymentState.canSubmit = true;
        },

        showError(msg: string) {
            this.error = msg;
            this.$store.paymentState.isSubmitting = false;
        },

        async submitOrder() {
            if (!this.$store.paymentState.acceptedTerms) {
                this.showError('Please accept the terms and conditions to continue.');
                return;
            }
            this.$store.paymentState.isSubmitting = true;
            this.error = '';

            try {
                if (this.isUsingSavedMethod && this.selectedSavedMethod) {
                    const res = await fetch('/api/merchello/checkout/pay-with-saved-method', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            savedPaymentMethodId: this.selectedSavedMethod.id,
                            invoiceId: this.invoiceId,
                            returnUrl: this.returnUrl,
                        }),
                    });
                    if (res.ok) {
                        const result = await res.json();
                        window.location.href = result.redirectUrl ?? this.returnUrl;
                    } else {
                        const err = await res.json();
                        this.showError(err.errorMessage ?? 'Payment failed. Please try again.');
                    }
                } else if (this.selectedMethod && window.MerchelloPayment) {
                    await window.MerchelloPayment.submitPayment(this.selectedMethod.providerAlias);
                } else {
                    this.showError('Please select a payment method.');
                }
            } catch (e) {
                this.showError('An unexpected error occurred. Please try again.');
                window.MerchelloLogger?.error('Payment submit failed', e);
            }
        },
    };
}
```

---

### Gap 4: Complete `build-checkout.mjs` Script

The `build:checkout:js` npm script runs `node scripts/build-checkout.mjs`. Full implementation:

```javascript
// scripts/build-checkout.mjs
// Located at: src/Merchello/Client/scripts/build-checkout.mjs

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../wwwroot/App_Plugins/Merchello/js/checkout');
const srcDir = resolve(__dirname, '../src/checkout');
const isWatch = process.argv.includes('--watch');

// ESM bundles — checkout.ts and payment.ts each import their own dependencies.
// Alpine and @alpinejs/collapse are external: resolved at runtime via the import map in _Layout.cshtml.
const esmEntries = [
  resolve(srcDir, 'checkout.ts'),
  resolve(srcDir, 'payment.ts'),
];

// Classic IIFE bundles — analytics scripts that assign to window globals
const iifeEntries = [
  resolve(srcDir, 'analytics.ts'),
  resolve(srcDir, 'single-page-analytics.ts'),
  resolve(srcDir, 'confirmation.ts'),
  resolve(srcDir, 'post-purchase.ts'),
];

// Payment adapter IIFE bundles — all output into adapters/ subdirectory.
// Each adapter self-registers: window.MerchelloPaymentAdapters[key] = {...}
// globalName is NOT needed in esbuild config — adapters use explicit window property assignment.
const adapterEntries = [
  resolve(srcDir, 'adapters/adapter-interface.ts'),
  resolve(srcDir, 'adapters/stripe-payment-adapter.ts'),
  resolve(srcDir, 'adapters/stripe-card-elements-adapter.ts'),
  resolve(srcDir, 'adapters/stripe-express-adapter.ts'),
  resolve(srcDir, 'adapters/braintree-payment-adapter.ts'),
  resolve(srcDir, 'adapters/braintree-local-payment-adapter.ts'),
  resolve(srcDir, 'adapters/braintree-express-adapter.ts'),
  resolve(srcDir, 'adapters/paypal-unified-adapter.ts'),
  resolve(srcDir, 'adapters/worldpay-payment-adapter.ts'),
  resolve(srcDir, 'adapters/worldpay-express-adapter.ts'),
];

const baseConfig = {
  bundle: true,
  sourcemap: true,
  target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
  logLevel: 'info',
};

const esmConfig = {
  ...baseConfig,
  entryPoints: esmEntries,
  format: 'esm',
  external: ['alpinejs', '@alpinejs/collapse'],
  outdir: outDir,
  entryNames: '[name]',
};

const iifeConfig = {
  ...baseConfig,
  entryPoints: iifeEntries,
  format: 'iife',
  outdir: outDir,
  entryNames: '[name]',
};

const adapterConfig = {
  ...baseConfig,
  entryPoints: adapterEntries,
  format: 'iife',
  outdir: resolve(outDir, 'adapters'),
  entryNames: '[name]',
};

if (isWatch) {
  const [esmCtx, iifeCtx, adapterCtx] = await Promise.all([
    esbuild.context(esmConfig),
    esbuild.context(iifeConfig),
    esbuild.context(adapterConfig),
  ]);
  await Promise.all([esmCtx.watch(), iifeCtx.watch(), adapterCtx.watch()]);
  console.log('[build-checkout] Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(esmConfig),
    esbuild.build(iifeConfig),
    esbuild.build(adapterConfig),
  ]);
  console.log('[build-checkout] Build complete.');
}
```

**Note on `adapter-interface.ts` dual usage:** It is built as an IIFE here for backoffice compatibility but is also imported as an ESM module by `payment.ts`. esbuild handles this cleanly — the IIFE `adapters/adapter-interface.js` is the backoffice-compatible standalone; the ESM-bundled `payment.js` inlines the adapter-interface module directly. No duplication concern.

**Note on `Promise.all` in watch mode:** The `Promise.all([esmCtx.watch(), ...])` in watch mode is safe here — this is a build tool script, not a request handler. It does NOT go through Umbraco's `IEFCoreScopeProvider`. The EFCoreScope `Task.WhenAll` ban applies only to service/controller code touching the database.

---

### Gap 5: `BuildBasketUpdatedTrigger()` Helper in `CheckoutPartialsController`

Add this private method to `CheckoutPartialsController`:

```csharp
private static string BuildBasketUpdatedTrigger(Basket basket, StorefrontDisplayContext displayContext)
{
    decimal Round(decimal amount) =>
        ICurrencyService.Round(amount * displayContext.ExchangeRate, displayContext.CurrencyCode);

    return JsonSerializer.Serialize(new
    {
        basketUpdated = new
        {
            total    = Round(basket.Total),
            subtotal = Round(basket.SubTotal),
            shipping = Round(basket.Shipping),
            tax      = Round(basket.Tax),
            discount = Round(basket.Discount),
            currency = displayContext.CurrencyCode
        }
    });
}
```

This fires the `basketUpdated` custom event that the mobile sticky bar listens to via `htmx:trigger`. Always use display amounts (store currency × exchange rate), never raw store amounts.

---

### Gap 6: Email Hidden Copy Binding in Address Form

The email input is in the contact section OUTSIDE the `<form>`. Two approaches:

**Option A — `hx-include` (recommended):**
```html
<form hx-post="/checkout/partials/addresses"
      hx-target="#shipping-section"
      hx-swap="innerHTML"
      hx-include="[name='email']">
    <!-- hx-include pulls in the email input from outside the form boundary -->
    ...
</form>
```

**Option B — Alpine mirror binding:**
```html
<!-- Contact section (outside the address form) -->
<div x-data="accountSection"
     data-is-logged-in="@Model.IsLoggedIn.ToString().ToLowerInvariant()"
     data-email="@(Model.Session?.Email ?? "")">
    <input id="checkout-email" name="email" type="email"
           x-model="email"
           autocomplete="email"
           inputmode="email" />
</div>

<!-- Address form -->
<form hx-post="/checkout/partials/addresses" ...>
    <input type="hidden" name="Email"
           :value="document.getElementById('checkout-email')?.value ?? ''" />
    ...
</form>
```

Use `hx-include` (Option A) — it is declarative and survives HTMX swaps automatically without requiring Alpine to be active on the form element.

---

### Gap 7: `SaveAddressesFormModel` → Service Parameter Mapping

Inside `CheckoutPartialsController.SaveAddresses()`:

```csharp
private static SaveAddressesParameters MapToSaveAddressesParameters(
    SaveAddressesFormModel model, Guid basketId) => new()
{
    BasketId          = basketId,
    Email             = model.Email,
    AcceptsMarketing  = model.AcceptsMarketing,
    Password          = model.Password, // null = guest

    BillingAddress = new Address
    {
        Name        = model.BillingName,
        Company     = model.BillingCompany,
        AddressOne  = model.BillingAddressOne,
        AddressTwo  = model.BillingAddressTwo,
        TownCity    = model.BillingTownCity,
        CountyState = model.BillingCountyState,
        PostalCode  = model.BillingPostalCode,
        CountryCode = model.BillingCountryCode,
        RegionCode  = model.BillingRegionCode,
        Phone       = model.BillingPhone,
    },

    SameAsBilling  = model.SameAsBilling,

    ShippingAddress = model.SameAsBilling ? null : new Address
    {
        Name        = model.ShippingName        ?? "",
        AddressOne  = model.ShippingAddressOne  ?? "",
        TownCity    = model.ShippingTownCity    ?? "",
        CountyState = model.ShippingCountyState ?? "",
        PostalCode  = model.ShippingPostalCode  ?? "",
        CountryCode = model.ShippingCountryCode ?? "",
        RegionCode  = model.ShippingRegionCode  ?? "",
    },
};
```

---

### Gap 8: `SelectShippingFormModel` → Service Parameter Mapping

Inside `CheckoutPartialsController.SaveShipping()`:

```csharp
private static SaveShippingSelectionsParameters MapToShippingParameters(
    SelectShippingFormModel model, Guid basketId) => new()
{
    BasketId           = basketId,
    ShippingSelections = model.Selections.ToDictionary(
        kvp => Guid.Parse(kvp.Key),   // group ID
        kvp => kvp.Value              // SelectionKey (e.g., "so:{guid}" or "dyn:ups:Ground")
    ),
};
```

`SelectShippingFormModel.Selections` is `Dictionary<string, string>` from form post. Keys are order-group GUIDs, values are shipping selection keys. The selection key contract (`so:{guid}` / `dyn:{provider}:{serviceCode}`) is preserved by the service layer.

---

### Gap 9: Mobile UX Gold Standard Requirements

These requirements are in addition to the base mobile responsive specification. They bring the checkout to Shopify-level mobile quality.

#### iOS Input Zoom Prevention
iOS Safari zooms in when focused inputs have `font-size < 16px`. Prevent unconditionally on mobile, restore on desktop:

```css
/* checkout.css */
@media (max-width: 639px) {
    input, select, textarea {
        font-size: 16px; /* hard pixel, not rem — prevents zoom even if rem < 16 */
    }
}
```

#### Safe Area Insets (Notched Phones)
```css
/* checkout.css */
.checkout-sticky-bar {
    /* Use max() not calc() — ensures padding is at least 1rem AND at least the safe area */
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

body.checkout-page {
    /* Prevent content from hiding under sticky bar + home indicator */
    padding-bottom: max(5rem, calc(4rem + env(safe-area-inset-bottom)));
}
```

**Why `max()` not `calc()`:** `calc(1rem + env(safe-area-inset-bottom, 0px))` always adds 1rem even when `safe-area-inset-bottom` is 0 (flat phones, desktop), resulting in unnecessary extra padding. `max(1rem, env(safe-area-inset-bottom))` gives exactly 1rem on flat screens and correctly uses the safe area height on notched phones without double-padding.

Add `checkout-page` class to `<body>` in `_Layout.cshtml` when rendering the checkout view.

#### Touch Target Sizing
```css
/* checkout.css */
.shipping-option-row {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 12px 16px;
    cursor: pointer;
    width: 100%;
}

.shipping-option-row input[type="radio"],
.shipping-option-row input[type="checkbox"] {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-right: 12px;
}

/* Apple HIG minimum 44px, Android Material 48px */
.btn { min-height: 48px; }
```

#### HTMX Loading State on Submit Buttons
Inline spinner on the button itself (not only the overlay — overlay may be off-screen on mobile):

```html
<button type="submit" class="btn btn-primary w-full"
        :disabled="$store.paymentState.isSubmitting">
    <svg class="htmx-indicator animate-spin h-4 w-4 inline mr-2 hidden"
         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    Continue to Shipping
</button>
```

Add to `checkout.css`:
```css
.htmx-request .htmx-indicator { display: inline-block !important; }
.htmx-request.htmx-indicator  { display: inline-block !important; }
```

#### Smooth Scroll After HTMX Swaps (Mobile Only)
Already included in the `htmx:afterSettle` handler in `checkout.ts` (Gap 2 above):
```typescript
if (window.innerWidth < 1024 && target.id && target.scrollIntoView) {
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}
```

---

### Gap 10: Partial View Markup Specifications

#### `_RegionSelect.cshtml`

ViewModel (add to `Merchello.Models.Checkout`):
```csharp
public class RegionSelectViewModel
{
    public string AddressType  { get; init; } = ""; // "Billing" or "Shipping"
    public string? SelectedCode { get; init; }
    public IReadOnlyList<RegionDto> Regions { get; init; } = [];
}
```

View:
```razor
@model Merchello.Models.Checkout.RegionSelectViewModel
@if (Model.Regions.Any())
{
    <option value="">-- Select region --</option>
    @foreach (var region in Model.Regions)
    {
        <option value="@region.RegionCode"
                @(region.RegionCode == Model.SelectedCode ? "selected" : "")>
            @region.Name
        </option>
    }
}
else
{
    <option value="">-- No regions available --</option>
}
```

Endpoint in `CheckoutPartialsController`:
```csharp
[HttpGet("regions/{addressType}/{countryCode}")]
public async Task<IActionResult> GetRegions(string addressType, string countryCode, CancellationToken ct)
{
    var regions = await _localityService.GetRegionsAsync(countryCode, ct);
    var vm = new RegionSelectViewModel
    {
        AddressType  = addressType, // "Billing" or "Shipping"
        SelectedCode = null,
        Regions      = regions,
    };
    return PartialView("_RegionSelect", vm);
}
```

HTMX trigger on country select in `SinglePage.cshtml`:
```html
<select name="BillingCountryCode"
        hx-get="/checkout/partials/regions/Billing/{value}"
        hx-target="#region-select-billing"
        hx-trigger="change"
        hx-vals="js:{value: event.target.value}"
        hx-swap="innerHTML">
```

Or simpler using `hx-get` with Alpine to build URL:
```html
<select name="BillingCountryCode"
        @change="$refs.billingRegion.setAttribute('hx-get', `/checkout/partials/regions/Billing/${$event.target.value}`); htmx.trigger($refs.billingRegion, 'load')"
        >
```

The cleanest approach: use `hx-get` with a placeholder and update it in Alpine `@change`, then `htmx.trigger`.

#### `_EmailStatus.cshtml`

```razor
@model Merchello.Models.Checkout.EmailStatusViewModel
@if (Model.IsLoggedIn)
{
    <p class="text-sm text-green-600">
        Signed in as <strong>@Model.Email</strong>.
        <a href="/account/logout?returnUrl=/checkout" class="underline">Sign out</a>
    </p>
}
else if (Model.HasDigitalProducts && !Model.IsLoggedIn)
{
    <div class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
        Your order includes digital products that require an account.
        Please sign in or create an account below.
    </div>
}
else if (Model.HasExistingAccount)
{
    <p class="text-sm text-blue-600">
        An account exists for this email.
        <button type="button" x-on:click="showSignIn = true"
                class="underline font-medium">Sign in</button>
        for faster checkout.
    </p>
}
```

#### `_DiscountForm.cshtml`

```razor
@model Merchello.Models.Checkout.DiscountFormViewModel
@if (Model.ShowDiscountCode)
{
    <div id="discount-form">
        <form hx-post="/checkout/partials/discount/apply"
              hx-target="#order-summary"
              hx-swap="innerHTML"
              hx-sync="this:replace"
              class="flex gap-2">
            @Html.AntiForgeryToken()
            <input type="text" name="code"
                   value="@Model.SubmittedCode"
                   placeholder="Discount code"
                   class="input flex-1 @(Model.ErrorMessage != null ? "input-error" : "")"
                   inputmode="text" autocomplete="off" />
            <button type="submit" class="btn btn-secondary">Apply</button>
        </form>
        @if (!string.IsNullOrEmpty(Model.ErrorMessage))
        {
            <p class="text-red-500 text-sm mt-1" role="alert">@Model.ErrorMessage</p>
        }
    </div>
}
```

#### `_MobileTotal.cshtml`

```razor
@model Merchello.Models.Checkout.MobileTotalViewModel
<span id="mobile-total">@Model.CurrencySymbol@Model.FormattedTotal</span>
```

`MobileTotalViewModel`:
```csharp
public class MobileTotalViewModel
{
    public string CurrencySymbol  { get; init; } = "";
    public string FormattedTotal  { get; init; } = "";  // e.g. "129.99"
    public decimal DisplayTotal   { get; init; }
}
```

#### `_ValidationErrors.cshtml`

Full form re-render strategy (not summary-only). The partial replaces the entire form on 422:

```razor
@model Merchello.Models.Checkout.ValidationErrorsViewModel
<div class="validation-error-summary mb-4" role="alert" aria-live="polite">
    <p class="font-medium text-red-700">Please correct the following errors:</p>
    <ul class="list-disc list-inside text-sm text-red-600 mt-1">
        @foreach (var err in Model.Errors)
        {
            <li data-field="@err.Key">@err.Value</li>
        }
    </ul>
</div>
```

The controller re-renders the entire form partial (e.g., `_AddressForm`) with a `ValidationErrorsViewModel` prepended as a sub-model, so every field retains its submitted value. Use `model.SubmittedValues` (a `Dictionary<string, string>` from `Request.Form`) to repopulate inputs:

```razor
<input type="text" name="BillingName"
       value="@(Model.SubmittedValues.GetValueOrDefault("BillingName", ""))"
       class="input @(Model.Errors.ContainsKey("BillingName") ? "input-error" : "")" />
```

---

### Gap 11: `CheckoutViewModelBuilder` Implementation Pattern

Reference implementation of `BuildOrderSummaryAsync()` as the template all builder methods follow:

```csharp
public async Task<OrderSummaryViewModel> BuildOrderSummaryAsync(
    Basket basket, CancellationToken ct)
{
    // Sequential calls — EFCoreScope constraint (no Task.WhenAll)
    var displayContext = await _storefrontContext.GetDisplayContextAsync(ct);
    var rate     = displayContext.ExchangeRate;
    var decimals = displayContext.DecimalPlaces;
    var symbol   = displayContext.CurrencySymbol;

    string Fmt(decimal amount) => $"{symbol}{amount.ToString($"N{decimals}")}";
    decimal Disp(decimal amount) => _currencyService.Round(amount * rate, displayContext.CurrencyCode);

    var lineItems = basket.LineItems
        .Where(li => li.LineItemType == LineItemType.Product)
        .Select(li =>
        {
            var dispUnit  = Disp(li.Amount);
            var dispTotal = Disp(li.Amount * li.Quantity);
            return new OrderSummaryLineItemViewModel
            {
                LineItemId        = li.Id,
                Name              = li.Name,
                Sku               = li.Sku,
                ImageUrl          = li.ExtendedData.GetValueOrDefault("ImageUrl")?.UnwrapJsonElement()?.ToString(),
                Quantity          = li.Quantity,
                DisplayUnitPrice  = dispUnit,
                DisplayLineTotal  = dispTotal,
                FormattedUnitPrice = Fmt(dispUnit),
                FormattedLineTotal = Fmt(dispTotal),
                SelectedOptions   = [],
                Addons            = [],
            };
        }).ToList();

    var dispSubTotal = Disp(basket.SubTotal);
    var dispShipping = Disp(basket.Shipping);
    var dispTax      = Disp(basket.Tax);
    var dispDiscount = Disp(basket.Discount);
    var dispTotal    = Disp(basket.Total);

    string taxIncludedMessage = displayContext.DisplayPricesIncTax && dispTax > 0
        ? $"Including {Fmt(dispTax)} in taxes"
        : "";

    return new OrderSummaryViewModel
    {
        LineItems            = lineItems,
        AppliedDiscounts     = basket.Discounts.Select(MapDiscount).ToList(),
        DisplaySubTotal      = dispSubTotal,
        DisplayShipping      = dispShipping,
        DisplayTax           = dispTax,
        DisplayDiscount      = dispDiscount,
        DisplayTotal         = dispTotal,
        FormattedSubTotal    = Fmt(dispSubTotal),
        FormattedShipping    = dispShipping == 0 ? "Free" : Fmt(dispShipping),
        FormattedTax         = Fmt(dispTax),
        FormattedTotal       = Fmt(dispTotal),
        DisplayPricesIncTax  = displayContext.DisplayPricesIncTax,
        TaxIncludedMessage   = taxIncludedMessage,
        CurrencySymbol       = symbol,
        CurrencyDecimalPlaces = decimals,
        ShowDiscountCode     = true,
        IsPartialSwap        = false,
    };
}
```

All other `BuildXxxAsync()` methods follow the same pattern: resolve `displayContext` first, then all basket/session reads, then construct ViewModel from display (multiplied) amounts.

---

### Gap 12: Payment Selection Persistence Across OOB Swaps

#### Server-Side: Conditional Payment Section Swap

The `#payment-section` OOB swap only fires when the payment amount changes (e.g., a discount alters the total). When only non-payment state changes, omit it from the response:

```csharp
// In CheckoutPartialsController.ApplyDiscount() and similar mutations:
var previousTotal = basket.Total;
// ... apply operation ...
var updatedBasket = result.Basket;
var newTotal = updatedBasket.Total;
bool paymentAmountChanged = previousTotal != newTotal;

var oobFragments = new List<(string partial, string targetId, object vm)>
{
    ("_OrderSummary", "order-summary",        summaryVm),
    ("_MobileTotal",  "mobile-total",         mobileTotalVm),
    ("_MobileTotal",  "mobile-summary-total", mobileTotalVm), // inside mobile collapse toggle header
};

if (paymentAmountChanged)
{
    var paymentVm = await _viewModelBuilder.BuildPaymentMethodsAsync(session, isPartialSwap: true, ct);
    oobFragments.Add(("_PaymentMethods", "payment-section", paymentVm));
}

return PartialViewWithOob("_OrderSummary", summaryVm, oobFragments.ToArray());
```

#### Client-Side: SessionStorage Persistence

In `payment-form.ts` (already included in Gap 3 above):

- `init()` reads `sessionStorage.getItem('checkout:selected-payment')` and pre-selects the remembered method.
- `selectMethod()` writes the alias back to sessionStorage.
- When the payment section IS swapped OOB, `htmx:beforeSwap` destroys the Alpine tree, `htmx:oobAfterSwap` reinitializes it, and `init()` restores the selection from sessionStorage — including re-mounting the payment SDK.

This means the user never loses their Stripe/PayPal selection just because they applied a discount.

---

### Gap 13: `account-section.ts` Full Component Spec

```typescript
// components/account-section.ts
export function accountSection() {
    return {
        email: '',
        hasExistingAccount: false,
        isLoggedIn: false,
        showSignIn: false,
        showCreateAccount: false,
        showCreateAccountPassword: false,

        password: '',
        confirmPassword: '',
        signInPassword: '',
        signInLoading: false,
        signInError: '',
        createLoading: false,
        createError: '',

        init() {
            const el = this.$el as HTMLElement;
            this.isLoggedIn            = el.dataset.isLoggedIn === 'true';
            this.email                 = el.dataset.email ?? '';
            this.hasExistingAccount    = el.dataset.hasExistingAccount === 'true';
            this.showCreateAccount     = el.dataset.requiresAccount === 'true';
        },

        async checkEmail() {
            if (!this.email) return;
            // HTMX handles the check-email call — this method is for Alpine-only state updates
            // after the HTMX response updates #email-status via hx-target
            this.hasExistingAccount = false; // reset; HTMX response sets it via _EmailStatus partial
        },

        async signIn() {
            this.signInLoading = true;
            this.signInError   = '';
            try {
                const res = await fetch('/api/merchello/checkout/sign-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.email, password: this.signInPassword }),
                });
                if (res.ok) {
                    window.location.reload(); // Reload: session now has member context
                } else {
                    const err = await res.json();
                    this.signInError = err.errorMessage ?? 'Sign-in failed. Please try again.';
                }
            } catch {
                this.signInError = 'A network error occurred.';
            } finally {
                this.signInLoading = false;
            }
        },

        async createAccount() {
            if (this.password !== this.confirmPassword) {
                this.createError = 'Passwords do not match.';
                return;
            }
            this.createLoading = true;
            this.createError   = '';
            try {
                const res = await fetch('/api/merchello/checkout/create-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.email, password: this.password }),
                });
                if (res.ok) {
                    window.location.reload();
                } else {
                    const err = await res.json();
                    this.createError = err.errorMessage ?? 'Account creation failed.';
                }
            } catch {
                this.createError = 'A network error occurred.';
            } finally {
                this.createLoading = false;
            }
        },

        openForgotPassword() {
            this.$dispatch('open-forgot-password', { email: this.email });
        },

        toggleCreateAccountPassword() {
            this.showCreateAccountPassword = !this.showCreateAccountPassword;
        },
    };
}
```

Initial state rendered as `data-*` by Razor on the `x-data="accountSection"` element:
```razor
<div x-data="accountSection"
     data-is-logged-in="@Model.IsLoggedIn.ToString().ToLowerInvariant()"
     data-email="@(Model.Session?.Email ?? "")"
     data-has-existing-account="false"
     data-requires-account="@Model.HasDigitalProducts.ToString().ToLowerInvariant()">
```

---

### Gap 14: `upsellInterstitial` Alpine Component Spec

```typescript
// components/upsell-interstitial.ts
export function upsellInterstitial() {
    return {
        visible: false,
        addingProductId: null as string | null,
        addError: '',

        init() {
            const el = this.$el as HTMLElement;
            const basketId = el.dataset.basketId ?? '';
            const key = `merchello:checkout:upsells:seen:${basketId}`;
            if (!sessionStorage.getItem(key)) {
                this.visible = true;
            }
        },

        dismiss() {
            const el = this.$el as HTMLElement;
            const basketId = el.dataset.basketId ?? '';
            sessionStorage.setItem(`merchello:checkout:upsells:seen:${basketId}`, '1');
            this.visible = false;
        },

        async addToCart(productId: string, quantity: number) {
            this.addingProductId = productId;
            this.addError = '';
            try {
                const res = await fetch('/api/merchello/storefront/basket/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, quantity }),
                });
                if (res.ok) {
                    // Full reload — basket changed, all checkout sections need recalculation
                    window.location.reload();
                } else {
                    this.addError = 'Could not add item. Please try again.';
                }
            } catch {
                this.addError = 'A network error occurred.';
            } finally {
                this.addingProductId = null;
            }
        },
    };
}
```

---

### Gap 15: HTMX 2.x Behavioral Notes

HTMX 2.0.4 is a major version; notable behavioral differences from 1.x relevant to this implementation:

| Behavior | HTMX 1.x | HTMX 2.x (this project) |
|---|---|---|
| `hx-on` syntax | `hx-on="htmx:afterSwap:..."` | `hx-on:htmx:after-swap="..."` (kebab-case event) |
| OOB swap event | `htmx:oob-after-swap` | `htmx:oobAfterSwap` (camelCase) |
| DELETE/PUT | Simulated via POST `_method` override | Real HTTP verbs — use `[HttpDelete]`, `[HttpPut]` |
| `hx-swap-oob="true"` | Supported | Still supported (1.x syntax preserved) |
| Global scroll | `htmx.config.defaultSwapStyle` | `htmx.config.scrollBehavior` available but do NOT set globally |
| Boosting | `hx-boost="true"` on body | Supported but not used in checkout |

Do NOT set `htmx.config.scrollBehavior = 'smooth'` globally — use manual `scrollIntoView` in `htmx:afterSettle` for targeted scroll as described in Gap 9.

HTMX 2.x does not support the `hx-ws` WebSocket extension by default; it is a separate extension. Not needed for checkout.

---

### Gap 16: CSP Compatibility

**HTMX + Alpine CSP considerations for the checkout:**

HTMX `innerHTML` swaps are NOT blocked by `script-src` CSP directives — it inserts HTML elements, not inline scripts.

Alpine 3.x with pre-registered components via `Alpine.data()` does NOT require `unsafe-eval` — the `evaluate()` path (which requires `unsafe-eval`) is only used for inline `x-data="{ ... }"` object syntax. All checkout components use the registered factory pattern, so `unsafe-eval` is NOT needed.

Alpine inline event handlers (`x-on:click`, `@click`) do NOT use `unsafe-eval` — they compile at init time, not `eval()`.

**HTMX script tag with nonce-based CSP:**
```razor
<script src="/App_Plugins/Merchello/js/vendor/htmx.min.js"
        nonce="@Model.CspNonce"></script>
```

If the application uses nonce-based CSP, add `nonce` to HTMX, Alpine, and the checkout entry-point script tag. The checkout `_Layout.cshtml` should pass `CspNonce` from `CheckoutViewModel`.

**Summary:** The HTMX + Alpine migration does not worsen the CSP posture relative to the current Alpine-only implementation. No new `unsafe-*` directives required.

---

### Gap 17: Browser History Decision

**Do NOT use `hx-push-url` anywhere in the checkout.**

Rationale: The checkout is a single URL (`/checkout`) with sections revealed progressively via HTMX swaps. Pushing URL state for each step would:
- Break the browser back button (pressing back during checkout would navigate to a previous step state rather than away from checkout)
- Create bookmarkable URLs for in-progress checkout states that require session context to be meaningful
- Duplicate the step-management complexity that HTMX replaces

The existing back-button protection in `confirmation.ts` (which prevents navigating back to `/checkout` from the confirmation page) remains unchanged.

Analytics step tracking is done via `data-checkout-step` attribute and `window.MerchelloLogger.trackCheckoutStep()` in the `htmx:afterSettle` handler — no URL changes required.

---

### Gap 18: `MerchelloCheckoutController` Exact Injection Changes

For Phase 3 task — adding Google auto-discount and upsell suggestions to `RenderSinglePageCheckoutAsync()`:

**Constructor changes** (add optional parameters for backward compatibility with DI containers that don't register these services):
```csharp
public MerchelloCheckoutController(
    // ... existing parameters ...
    IUpsellEngine? upsellEngine = null,
    IUpsellContextBuilder? upsellContextBuilder = null,
    ICheckoutDiscountService? checkoutDiscountService = null)
```

**In `RenderSinglePageCheckoutAsync()`, after basket initialization, BEFORE order grouping:**

```csharp
// 1. Apply Google auto-discount (middleware sets HttpContext.Items entry)
var googleDiscount = HttpContext.Items["MerchelloGoogleAutoDiscount"] as GoogleAutoDiscountActiveDto;
if (googleDiscount != null && _checkoutDiscountService != null)
{
    await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(
        new ApplyGoogleAutoDiscountParameters
        {
            BasketId = basket.Id,
            Discount = googleDiscount,
        }, ct);
    // Reload basket after discount applied
    basket = await _basketService.GetBasketAsync(basket.Id, ct) ?? basket;
}

// 2. Load upsell suggestions (non-blocking on null engine)
IReadOnlyList<UpsellSuggestionDto> upsellSuggestions = [];
if (_upsellEngine != null && _upsellContextBuilder != null && basket.LineItems.Count > 0)
{
    var context = await _upsellContextBuilder.BuildContextAsync(basket, ct);
    upsellSuggestions = await _upsellEngine.GetSuggestionsAsync(context, ct);
}

// 3. Assign to ViewModel (CheckoutViewModel.UpsellSuggestions must be added)
viewModel.UpsellSuggestions = upsellSuggestions;
```

Add `UpsellSuggestions` property to `CheckoutViewModel`:
```csharp
public IReadOnlyList<UpsellSuggestionDto> UpsellSuggestions { get; set; } = [];
```

Code location: `src/Merchello/Controllers/MerchelloCheckoutController.cs`, method `RenderSinglePageCheckoutAsync()`.

---

### Gap 19: `validation.ts` Full Component Spec

Alpine `x-data` factory for real-time field validation UX. Used on the address form (`x-data="validation"`).

```typescript
// src/Merchello/Client/src/checkout/components/validation.ts

export function validation() {
    return {
        errors: {} as Record<string, string>,
        touched: {} as Record<string, boolean>,
        _rules: {} as Record<string, (v: string) => string | null>,

        init() {
            this.$el.querySelectorAll<HTMLInputElement>('[data-validate]').forEach(input => {
                input.addEventListener('blur', () => {
                    this.touched[input.name] = true;
                    this.validateField(input.name, input.value);
                });
                input.addEventListener('input', () => {
                    if (this.touched[input.name] && this.errors[input.name]) {
                        delete this.errors[input.name];
                    }
                });
            });
        },

        validateField(name: string, value: string): boolean {
            const rule = this._rules[name];
            if (!rule) return true;
            const error = rule(value.trim());
            if (error) {
                this.errors[name] = error;
                return false;
            }
            delete this.errors[name];
            return true;
        },

        validateAll(): boolean {
            let valid = true;
            this.$el.querySelectorAll<HTMLInputElement>('[data-validate]').forEach(input => {
                this.touched[input.name] = true;
                if (!this.validateField(input.name, input.value)) valid = false;
            });
            if (!valid) {
                const count = Object.keys(this.errors).length;
                window.MerchelloLogger?.announce?.(
                    `Form has ${count} error${count > 1 ? 's' : ''}. Please correct and try again.`
                );
            }
            return valid;
        },

        hasError(name: string): boolean {
            return !!this.errors[name];
        },

        errorFor(name: string): string {
            return this.errors[name] ?? '';
        },
    };
}

// Built-in validation rules (registered in checkout.ts via Alpine.data)
// Used by _AddressForm.cshtml fields with data-validate attribute
export const ValidationRules = {
    required: (v: string) => v.length === 0 ? 'This field is required.' : null,
    email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Please enter a valid email address.',
    phone: (v: string) =>
        v.replace(/[\s\-+()\d]/g, '').length === 0 && v.replace(/\D/g, '').length >= 7
            ? null : 'Please enter a valid phone number.',
    postalCode: (v: string) => v.length >= 3 ? null : 'Please enter a valid postal code.',
};
```

**How it gates HTMX submission:** The address form's `hx-on:htmx:before-request` handler calls `validateAll()`. If it returns `false`, the handler calls `event.preventDefault()` to abort the HTMX request:

```html
<form x-data="validation"
      hx-post="/checkout/partials/addresses"
      hx-target="#shipping-section"
      hx-on:htmx:before-request="if (!validateAll()) event.preventDefault()">
    <input name="billingFirstName" data-validate required />
    <!-- remaining fields -->
</form>
```

**Rule binding:** Rules are registered once in `checkout.ts` after Alpine is initialised:

```typescript
// In checkout.ts init block
import { validation, ValidationRules } from './components/validation.js';
Alpine.data('validation', () => ({
    ...validation(),
    _rules: {
        billingFirstName: ValidationRules.required,
        billingLastName:  ValidationRules.required,
        billingEmail:     ValidationRules.email,
        billingPhone:     ValidationRules.phone,
        billingAddressOne: ValidationRules.required,
        billingTownCity:   ValidationRules.required,
        billingPostalCode: ValidationRules.postalCode,
        // shipping rules added when sameAsBilling === false
    },
}));
```

Error display in `_AddressForm.cshtml` (per-field):

```html
<input name="billingFirstName"
       data-validate
       class="form-input"
       :class="{ 'border-red-500': hasError('billingFirstName') }" />
<p x-show="hasError('billingFirstName')"
   class="text-red-500 text-xs mt-1"
   x-text="errorFor('billingFirstName')"></p>
```

---

### Gap 20: `address-autocomplete.ts` Full Component Spec

```typescript
// components/address-autocomplete.ts
import { debounce } from '../utils/debounce.js';

interface AddressSuggestion {
    id: string;
    text: string;
    description: string;
}

export function addressAutocomplete() {
    return {
        prefix: 'Billing' as 'Billing' | 'Shipping',
        isEnabled: false,
        providerAlias: '',
        minQueryLength: 3,
        supportedCountries: [] as string[],

        query: '',
        suggestions: [] as AddressSuggestion[],
        showSuggestions: false,
        loading: false,
        selectedIndex: -1,

        init() {
            const el = this.$el as HTMLElement;
            this.prefix             = (el.dataset.prefix ?? 'Billing') as 'Billing' | 'Shipping';
            this.isEnabled          = el.dataset.lookupEnabled === 'true';
            this.providerAlias      = el.dataset.lookupProvider ?? '';
            this.minQueryLength     = parseInt(el.dataset.lookupMinLength ?? '3');
            this.supportedCountries = JSON.parse(el.dataset.lookupCountries ?? '[]');
        },

        onInput: debounce(async function(this: any) {
            if (!this.isEnabled) return;
            if (this.query.length < this.minQueryLength) {
                this.clearSuggestions();
                return;
            }
            // Check if selected country is supported
            const countryInput = document.querySelector<HTMLSelectElement>(
                `[name="${this.prefix}CountryCode"]`);
            const country = countryInput?.value ?? '';
            if (this.supportedCountries.length > 0 && !this.supportedCountries.includes(country)) {
                return;
            }
            await this.getSuggestions(country);
        }, 300),

        async getSuggestions(country: string) {
            this.loading = true;
            try {
                const res = await fetch('/api/merchello/checkout/address-lookup/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: this.query,
                        country,
                        providerAlias: this.providerAlias,
                    }),
                });
                if (res.ok) {
                    this.suggestions  = await res.json();
                    this.showSuggestions = this.suggestions.length > 0;
                    this.selectedIndex   = -1;
                }
            } catch { /* non-critical */ } finally {
                this.loading = false;
            }
        },

        async selectSuggestion(id: string) {
            this.loading = true;
            this.clearSuggestions();
            try {
                const res = await fetch('/api/merchello/checkout/address-lookup/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, providerAlias: this.providerAlias }),
                });
                if (res.ok) {
                    const address = await res.json();
                    this.fillAddressFields(address);
                }
            } catch { /* non-critical */ } finally {
                this.loading = false;
            }
        },

        fillAddressFields(address: Record<string, string>) {
            const p = this.prefix;
            const set = (field: string, value: string) => {
                const el = document.querySelector<HTMLInputElement>(`[name="${p}${field}"]`);
                if (el) { el.value = value; el.dispatchEvent(new Event('input')); }
            };
            set('AddressOne',  address.addressOne  ?? '');
            set('AddressTwo',  address.addressTwo  ?? '');
            set('TownCity',    address.townCity     ?? '');
            set('CountyState', address.countyState  ?? '');
            set('PostalCode',  address.postalCode   ?? '');
            set('CountryCode', address.countryCode  ?? '');
            set('RegionCode',  address.regionCode   ?? '');
        },

        clearSuggestions() {
            this.suggestions     = [];
            this.showSuggestions = false;
            this.selectedIndex   = -1;
        },

        onKeydown(evt: KeyboardEvent) {
            if (!this.showSuggestions) return;
            if (evt.key === 'ArrowDown') {
                evt.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
            } else if (evt.key === 'ArrowUp') {
                evt.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            } else if (evt.key === 'Enter' && this.selectedIndex >= 0) {
                evt.preventDefault();
                this.selectSuggestion(this.suggestions[this.selectedIndex].id);
            } else if (evt.key === 'Escape') {
                this.clearSuggestions();
            }
        },
    };
}
```

Address lookup config must be rendered as `data-*` attributes in `SinglePage.cshtml` from `CheckoutViewModel.AddressLookupConfig` to avoid a separate init fetch:
```razor
<div x-data="addressAutocomplete"
     data-prefix="Billing"
     data-lookup-enabled="@Model.AddressLookupConfig.IsEnabled.ToString().ToLowerInvariant()"
     data-lookup-provider="@Model.AddressLookupConfig.ProviderAlias"
     data-lookup-min-length="@Model.AddressLookupConfig.MinQueryLength"
     data-lookup-countries="@Json.Serialize(Model.AddressLookupConfig.SupportedCountries)">
```

---

### Gap 21: Delivery Date Markup in `_ShippingOptions.cshtml`

Full shipping option row markup including delivery date:

```razor
@foreach (var option in group.Options)
{
    <label class="shipping-option-row" for="shipping-@option.SelectionKey">
        <input type="radio"
               id="shipping-@option.SelectionKey"
               name="Selections[@group.GroupId]"
               value="@option.SelectionKey"
               @(option.IsSelected ? "checked" : "")
               hx-post="/checkout/partials/shipping/select"
               hx-trigger="change"
               hx-target="#order-summary"
               hx-swap="innerHTML"
               hx-sync="closest form:replace"
               hx-include="closest form"
               hx-indicator="#summary-spinner" />
        <div class="flex-1 min-w-0">
            <span class="font-medium block">@option.Name</span>
            @if (!string.IsNullOrEmpty(option.DeliveryDescription))
            {
                <span class="text-sm text-gray-500 block">@option.DeliveryDescription</span>
            }
            @if (option.EstimatedDeliveryDate.HasValue)
            {
                <span class="text-sm text-gray-400 block">
                    Estimated: @option.EstimatedDeliveryDate.Value.ToString("ddd, MMM d")
                </span>
            }
        </div>
        <span class="font-semibold ml-4 shrink-0">
            @if (option.DisplayCost == 0)
            {
                <text>Free</text>
            }
            else
            {
                @($"{Model.CurrencySymbol}{option.DisplayCost.ToString($"N{Model.CurrencyDecimalPlaces}")}")
            }
        </span>
    </label>
}
```

Note: Verify `ShippingOptionViewModel` (or the DTO it maps from in `Merchello.Core.Checkout.Dtos`) includes `DeliveryDescription` (string?) and `EstimatedDeliveryDate` (DateOnly? or DateTime?). If not, add them to the DTO and populate in the shipping quote service.

---

### Gap 22: `_OrderSummary.cshtml` Server-Rendered Razor Template Structure

The single-page checkout branch replaces the existing Alpine `$store.checkout`-driven template. Key structural patterns:

```razor
@model Merchello.Models.Checkout.OrderSummaryViewModel
<div id="order-summary"
     data-announcement="Order summary updated"
     x-data="{ expanded: @(Model.IsPartialSwap ? "false" : "true") }">

    @* Mobile expand/collapse header — only shown in sticky bar context (IsPartialSwap = true) *@
    @if (Model.IsPartialSwap)
    {
        <button type="button" class="w-full flex justify-between items-center p-4"
                @click="expanded = !expanded">
            <span class="font-medium">Order Summary</span>
            <span>@Model.FormattedTotal</span>
        </button>
    }

    <div x-show="expanded" x-collapse>
        @* Line items *@
        @foreach (var item in Model.LineItems)
        {
            <div class="order-summary-item flex gap-3 p-4">
                @if (!string.IsNullOrEmpty(item.ImageUrl))
                {
                    <img src="@item.ImageUrl" alt="@item.Name"
                         class="w-16 h-16 object-cover rounded" loading="lazy" />
                }
                <div class="flex-1">
                    <p class="font-medium">@item.Name</p>
                    @if (item.SelectedOptions.Any())
                    {
                        <p class="text-sm text-gray-500">
                            @string.Join(", ", item.SelectedOptions)
                        </p>
                    }
                    @foreach (var addon in item.Addons)
                    {
                        <p class="text-sm text-gray-500">+ @addon.Name</p>
                    }
                    <p class="text-sm">Qty: @item.Quantity</p>
                </div>
                <p class="font-semibold">@item.FormattedLineTotal</p>
            </div>
        }

        @* Applied discounts *@
        @foreach (var discount in Model.AppliedDiscounts)
        {
            <div class="flex justify-between items-center px-4 py-2 text-green-700">
                <div class="flex items-center gap-2">
                    <span>@discount.Name</span>
                    @* Note: no @Html.AntiForgeryToken() here — token lives outside all swap targets in SinglePage.cshtml.
                       HTMX sends it via RequestVerificationToken header (set in htmx:configRequest handler in checkout.ts). *@
                    <button type="button"
                            hx-delete="/checkout/partials/discount/@discount.Id"
                            hx-target="#order-summary" hx-swap="outerHTML"
                            class="text-xs underline">Remove</button>
                </div>
                <span>-@discount.FormattedAmount</span>
            </div>
        }

        @* Discount code form (OOB target: #discount-form) *@
        @await Html.PartialAsync("_DiscountForm", Model.DiscountFormViewModel)

        @* Totals *@
        <div class="border-t px-4 py-3 space-y-1 text-sm">
            <div class="flex justify-between">
                <span>Subtotal</span>
                <span>@Model.FormattedSubTotal</span>
            </div>
            <div class="flex justify-between">
                <span>Shipping</span>
                <span>@Model.FormattedShipping</span>
            </div>
            @if (!Model.DisplayPricesIncTax && Model.DisplayTax > 0)
            {
                <div class="flex justify-between">
                    <span>Tax</span>
                    <span>@Model.FormattedTax</span>
                </div>
            }
            @if (Model.DisplayDiscount > 0)
            {
                <div class="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>-@Model.FormattedDiscount</span>
                </div>
            }
        </div>
        <div class="flex justify-between font-semibold text-base border-t px-4 py-3">
            <span>Total</span>
            <span>
                @Model.FormattedTotal
                @if (!string.IsNullOrEmpty(Model.TaxIncludedMessage))
                {
                    <span class="block text-xs font-normal text-gray-500">
                        @Model.TaxIncludedMessage
                    </span>
                }
            </span>
        </div>
    </div>
</div>
```

`OrderSummaryViewModel` additions needed (beyond what's in existing spec):
- `FormattedSubTotal`, `FormattedShipping`, `FormattedTax`, `FormattedDiscount`, `FormattedTotal` — pre-formatted strings from server (no JS formatting)
- `DiscountFormViewModel` — nested sub-model for the discount form partial
- `IsPartialSwap` — bool: `false` for full-page sidebar, `true` for HTMX OOB swap (controls mobile collapse toggle visibility)

---

### Gap 23: `_PaymentMethods.cshtml` and `_ShippingOptions.cshtml` Markup Structure

#### `_ShippingOptions.cshtml` Root Structure

```razor
@model Merchello.Models.Checkout.ShippingOptionsViewModel
<div id="shipping-section"
     class="checkout-section"
     data-checkout-step="shipping"
     data-announcement="Shipping options loaded">

    <h2 class="checkout-section-heading">Shipping</h2>

    @foreach (var group in Model.Groups)
    {
        <form hx-post="/checkout/partials/shipping"
              hx-target="#payment-section"
              hx-swap="innerHTML"
              hx-sync="this:queue first"
              hx-indicator=".checkout-loading-overlay">
            @Html.AntiForgeryToken()
            <input type="hidden" name="GroupId" value="@group.GroupId" />

            @if (Model.Groups.Count > 1)
            {
                <h3 class="text-sm font-medium text-gray-600 mb-2">@group.GroupName</h3>
            }

            @foreach (var option in group.Options)
            {
                @* See Gap 21 for full option row markup with delivery date *@
                <label class="shipping-option-row" for="shipping-@option.SelectionKey">
                    <input type="radio"
                           id="shipping-@option.SelectionKey"
                           name="Selections[@group.GroupId]"
                           value="@option.SelectionKey"
                           @(option.IsSelected ? "checked" : "")
                           hx-post="/checkout/partials/shipping/select"
                           hx-trigger="change"
                           hx-target="#order-summary"
                           hx-swap="innerHTML"
                           hx-sync="closest form:replace"
                           hx-include="closest form"
                           hx-indicator="#summary-spinner" />
                    @* ... option label content — see Gap 21 *@
                </label>
            }

            <button type="submit" class="btn btn-primary w-full mt-4">
                <span class="htmx-indicator animate-spin h-4 w-4 inline mr-2 hidden"><!-- spinner --></span>
                Continue to Payment
            </button>
        </form>
    }
</div>
```

#### `_PaymentMethods.cshtml` Root Structure

```razor
@model Merchello.Models.Checkout.PaymentMethodsViewModel
<div id="payment-section"
     class="checkout-section"
     data-checkout-step="payment"
     data-announcement="Payment methods loaded">

    <h2 class="checkout-section-heading">Payment</h2>

    <div x-data="paymentForm"
         data-methods='@Json.Serialize(Model.Methods)'
         data-saved-methods='@Json.Serialize(Model.SavedMethods)'
         data-can-vault="@Model.CanVault.ToString().ToLowerInvariant()"
         data-invoice-id="@Model.InvoiceId"
         data-return-url="@Model.ReturnUrl"
         data-cancel-url="@Model.CancelUrl">

        @* Express checkout (above payment methods if configured above) *@
        @if (Model.ShowExpressAbovePayment && Model.ExpressProviders.Any())
        {
            <div x-data="expressCheckout" data-providers='@Json.Serialize(Model.ExpressProviders)'>
                @* Express buttons rendered by expressCheckout component *@
            </div>
            <div class="separator text-center text-sm text-gray-400 my-4">or pay with card</div>
        }

        @* Payment method radio selection *@
        @foreach (var method in Model.Methods)
        {
            <label class="payment-method-row flex items-center gap-3 p-3 border rounded cursor-pointer mb-2"
                   :class="{ 'border-blue-500 bg-blue-50': selectedMethod?.providerAlias === '@method.ProviderAlias' }">
                <input type="radio"
                       name="paymentMethod"
                       value="@method.ProviderAlias"
                       @@change="selectMethod(@Json.Serialize(method))"
                       class="sr-only" />
                @if (!string.IsNullOrEmpty(method.IconUrl))
                {
                    <img src="@method.IconUrl" alt="@method.DisplayName" class="h-6" />
                }
                <span>@method.DisplayName</span>
            </label>
        }

        @* Saved payment methods (if any) *@
        @if (Model.SavedMethods.Any())
        {
            <div class="mt-3">
                <p class="text-sm font-medium text-gray-600 mb-2">Saved payment methods</p>
                @foreach (var saved in Model.SavedMethods)
                {
                    <label class="payment-method-row flex items-center gap-3 p-3 border rounded cursor-pointer mb-2"
                           :class="{ 'border-blue-500 bg-blue-50': selectedSavedMethod?.id === '@saved.Id' }">
                        <input type="radio"
                               name="paymentMethod"
                               value="saved:@saved.Id"
                               @@change="selectSavedMethod(@Json.Serialize(saved))"
                               class="sr-only" />
                        <span>@saved.DisplayLabel</span>
                    </label>
                }
            </div>
        }

        @* Payment SDK mount point — populated by MerchelloPayment.initiatePayment() *@
        <div id="payment-form-container" class="mt-4"></div>

        @* Error display *@
        <div x-show="error" x-cloak role="alert"
             class="text-red-600 text-sm mt-2" x-text="error"></div>

        @* Terms acceptance *@
        @if (!string.IsNullOrEmpty(Model.TermsUrl))
        {
            <label class="flex items-start gap-2 mt-4 text-sm">
                <input type="checkbox" x-model="$store.paymentState.acceptedTerms"
                       class="mt-0.5" />
                <span>
                    I agree to the
                    <button type="button" @@click="$dispatch('open-terms')"
                            class="underline">Terms and Conditions</button>
                </span>
            </label>
        }

        @* Place order button *@
        <button type="button"
                class="btn btn-primary w-full mt-4"
                :disabled="!$store.paymentState.canSubmit || $store.paymentState.isSubmitting"
                :class="{ 'opacity-50 cursor-not-allowed': !$store.paymentState.canSubmit || $store.paymentState.isSubmitting }"
                @@click="submitOrder()">
            <span class="htmx-indicator animate-spin h-4 w-4 inline mr-2 hidden"><!-- spinner --></span>
            <span x-text="$store.paymentState.isSubmitting ? 'Processing...' : 'Place Order'">
                Place Order
            </span>
        </button>
    </div>
</div>
```

---

### Gap 24: `CheckoutPartialsController.SaveAddresses` — Annotated Sequential Service Call Pattern

```csharp
[HttpPost("addresses")]
[ValidateAntiForgeryToken]
public async Task<IActionResult> SaveAddresses(
    [FromForm] SaveAddressesFormModel model, CancellationToken ct)
{
    // Step 1: Resolve basket + session (EFCoreScope call 1)
    var (basket, session) = await _sessionResolver.ResolveAsync(ct);
    if (basket is null) return EmptyBasketError();

    // Step 2: Validate model (Data Annotations + FluentValidation)
    if (!ModelState.IsValid)
        return ValidationError(model); // 422 with _ValidationErrors partial

    // Step 3: Map form model → service parameters
    var parameters = MapToSaveAddressesParameters(model, basket.Id);

    // Step 4: Save addresses (EFCoreScope call 2)
    var saveResult = await _checkoutService.SaveAddressesAsync(parameters, ct);
    if (!saveResult.Success)
        return ValidationError(saveResult, model); // 422 with error messages

    // Step 5: Calculate basket with new addresses — auto-select cheapest shipping
    //         (EFCoreScope call 3)
    var calcResult = await _checkoutService.CalculateBasketAsync(
        new CalculateBasketParameters
        {
            BasketId          = basket.Id,
            AutoSelectShipping = true,
        }, ct);

    // Step 6: Build shipping options ViewModel (EFCoreScope call 4)
    var shippingVm = await _viewModelBuilder.BuildShippingOptionsAsync(
        calcResult.OrderGroupingResult, ct);

    // Step 7: Build order summary ViewModel (EFCoreScope call 5)
    var summaryVm = await _viewModelBuilder.BuildOrderSummaryAsync(
        calcResult.Basket, ct);

    // Step 8: Build mobile total ViewModel (derived — no additional EFCoreScope)
    var mobileTotalVm = _viewModelBuilder.BuildMobileTotal(calcResult.Basket, summaryVm);

    // Step 9: Build display context for HX-Trigger (from summaryVm — no additional EFCoreScope)
    Response.Headers.Append("HX-Trigger",
        BuildBasketUpdatedTrigger(calcResult.Basket, summaryVm.DisplayContext));

    // Step 10: Return primary swap + OOB fragments (no async after this point)
    // Primary: #shipping-section (HTMX form hx-target)
    // OOB: #order-summary, #mobile-total
    return PartialViewWithOob("_ShippingOptions", shippingVm,
        ("_OrderSummary", "order-summary", summaryVm),
        ("_MobileTotal",  "mobile-total",  mobileTotalVm));
}
```

All 10 steps are sequential (no `Task.WhenAll`) to respect the EFCoreScope `AsyncLocal` ambient transaction constraint.

`PartialViewWithOob()` is a helper method on `CheckoutPartialsController` base class that renders the primary partial and appends OOB fragments as `hx-swap-oob="true"` divs:

```csharp
protected async Task<IActionResult> PartialViewWithOob(
    string primaryPartial, object primaryModel,
    params (string partial, string targetId, object model)[] oobFragments)
{
    // Render primary partial
    var primaryHtml = await RenderPartialToStringAsync(primaryPartial, primaryModel);

    // Append OOB fragments
    var sb = new StringBuilder(primaryHtml);
    foreach (var (partial, targetId, model) in oobFragments)
    {
        var oobHtml = await RenderPartialToStringAsync(partial, model);
        sb.Append($"""<div id="{targetId}" hx-swap-oob="innerHTML">{oobHtml}</div>""");
    }

    return Content(sb.ToString(), "text/html");
}
```

#### OOB Mobile Order Summary — Required in All Mutation Endpoints

Every controller action that updates `#order-summary` MUST also include `#mobile-order-summary` as a second OOB target. The mobile sticky bar shows a collapsible order summary on small screens — it must stay in sync with the desktop sidebar on every mutation.

Pattern (used in `SaveShipping`, `ApplyDiscount`, `RemoveDiscount`, `AddUpsell`):

```csharp
return await PartialViewWithOob("_ShippingOptions", shippingVm,
    ("_OrderSummary", "order-summary",        summaryVm),
    ("_MobileTotal",  "mobile-total",         mobileTotalVm),
    ("_OrderSummary", "mobile-order-summary", summaryVm with { IsPartialSwap = true }));
```

The same `_OrderSummary.cshtml` partial is reused for both OOB targets:

- `IsPartialSwap = false` (desktop sidebar) — renders full summary, no collapse toggle
- `IsPartialSwap = true` (mobile sticky bar) — renders with Alpine `expanded` state and a collapse button

The `mobile-order-summary` element is inside the mobile sticky action bar in `SinglePage.cshtml`:

```html
<div id="mobile-order-summary" class="lg:hidden">
    @* Initial render: full page load populates this from CheckoutViewModel.OrderSummaryViewModel *@
    @if (Model.OrderSummaryViewModel != null)
    {
        @await Html.PartialAsync("_OrderSummary",
            Model.OrderSummaryViewModel with { IsPartialSwap = true })
    }
</div>
```

---

### Gap 25: Initial Page Render — Sequential Build Pattern in `MerchelloCheckoutController`

`RenderSinglePageCheckoutAsync()` builds all ViewModels sequentially before returning the full page. No `Task.WhenAll` — EFCoreScope `AsyncLocal` ambient transaction forbids concurrent DB calls.

```csharp
public async Task<IActionResult> RenderSinglePageCheckoutAsync(CancellationToken ct)
{
    // 1. Basket (always needed — redirect if empty)
    var basket = await _checkoutService.GetBasket(new GetBasketParameters(), ct);
    if (basket is null || basket.LineItems.Count == 0)
        return Redirect("/");

    // 2. Session (needed for restore-on-refresh logic)
    var session = await _sessionService.GetSessionAsync(basket.Id, ct);

    // 3. Google auto-discount (from middleware cookie set upstream)
    var googleDiscount = HttpContext.Items["MerchelloGoogleAutoDiscount"] as GoogleAutoDiscountActiveDto;
    if (googleDiscount != null && _checkoutDiscountService != null)
    {
        await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(
            new ApplyGoogleAutoDiscountParameters { BasketId = basket.Id, Discount = googleDiscount }, ct);
        // Reload basket to get updated totals
        basket = await _checkoutService.GetBasket(new GetBasketParameters(), ct) ?? basket;
    }

    // 4. Upsell suggestions (null engine = feature disabled, graceful degradation)
    IReadOnlyList<UpsellSuggestionDto> upsellSuggestions = [];
    if (_upsellEngine != null && basket.LineItems.Count > 0)
    {
        var context = await _upsellContextBuilder!.BuildContextAsync(basket, ct);
        upsellSuggestions = await _upsellEngine.GetSuggestionsAsync(context, ct);
    }

    // 5. Order summary (always shown on initial load)
    var summaryVm = await _viewModelBuilder.BuildOrderSummaryAsync(basket, ct);

    // 6. Shipping options (only if addresses already saved — restore-on-refresh)
    ShippingOptionsViewModel? shippingVm = null;
    if (session?.BillingAddress != null)
    {
        var calcResult = await _checkoutService.CalculateBasketAsync(
            new CalculateBasketParameters { BasketId = basket.Id, AutoSelectShipping = true }, ct);
        shippingVm = await _viewModelBuilder.BuildShippingOptionsAsync(calcResult.OrderGroupingResult, ct);
    }

    // 7. Payment methods (only if shipping already selected — restore-on-refresh)
    PaymentMethodsViewModel? paymentVm = null;
    if (session?.SelectedShippingOptions?.Count > 0)
    {
        paymentVm = await _viewModelBuilder.BuildPaymentMethodsAsync(
            session, runCreditCheck: false, ct);
    }

    // 8. Address lookup config (for autocomplete component data-* attributes)
    var addressLookupVm = await _viewModelBuilder.BuildAddressLookupConfigAsync(ct);

    // 9. Assemble full CheckoutViewModel
    var viewModel = new CheckoutViewModel
    {
        // ... existing properties populated by current code ...
        UpsellSuggestions        = upsellSuggestions,
        OrderSummaryViewModel    = summaryVm,
        ShippingOptionsViewModel = shippingVm,
        PaymentMethodsViewModel  = paymentVm,
        AddressLookupConfig      = addressLookupVm,
    };

    return View("SinglePage", viewModel);
}
```

All steps sequential, no `Task.WhenAll`. This is the only correct pattern given EFCoreScope constraints.

---

### Gap 26: Service Method Verification Before Implementing `CheckoutPartialsController`

Before writing controller code, verify these service method names against the actual codebase. The JSON API controller (`CheckoutApiController.cs`) is the authoritative reference for currently working method names.

| Method Name Used in This Doc | Verify In | Status |
|---|---|---|
| `ICheckoutService.SaveAddressesAsync()` | `CheckoutService.cs` | Exists — no change needed |
| `ICheckoutService.CalculateBasketAsync()` | `CheckoutService.cs` | Exists — single source of truth |
| `ICheckoutDiscountService.ApplyDiscountCodeAsync()` | `CheckoutDiscountService.cs` | **Verify name** — may be `ApplyDiscountAsync()` |
| `ICheckoutDiscountService.RemovePromotionalDiscountAsync()` | `CheckoutDiscountService.cs` | **Verify name** — may be `RemoveDiscountAsync()` |
| `ICheckoutService.CheckEmailAsync()` | Look in `CheckoutApiController.cs` `CheckEmail` action | **May not exist** — check if it uses `ICustomerService.GetByEmailAsync()` directly |
| `ICheckoutService.AddUpsellToBasketAsync()` | Look in upsell controllers | **May not exist** — may be `IStorefrontService.AddToBasketAsync()` or similar |
| `ILocalityService.GetRegionsAsync(countryCode)` | `CheckoutApiController.cs` `GetRegions` action | **Verify service + method name** |

**Resolution:** Open `CheckoutApiController.cs` and find how each operation is currently called. Use the exact same service + method in `CheckoutPartialsController`. Never invent a new method name — call what already exists.

---

### Gap 27: Antiforgery Token in Email Check Endpoint

The `POST /checkout/partials/check-email` endpoint uses `[ValidateAntiForgeryToken]`. The email input triggers an HTMX request on `blur`. Clarification on how the token reaches the server:

The token does NOT need to be inside `#email-status` (the HTMX swap target). It is placed once in `SinglePage.cshtml` **outside all swap targets** and is never replaced by any HTMX swap. The `htmx:configRequest` handler in `checkout.ts` reads it from the DOM and adds it as the `RequestVerificationToken` request header on every HTMX request.

```typescript
// In checkout.ts htmx:configRequest handler
document.addEventListener('htmx:configRequest', (e: Event) => {
    const event = e as CustomEvent<{ headers: Record<string, string> }>;
    const token = document.querySelector<HTMLInputElement>(
        'input[name="__RequestVerificationToken"]'
    )?.value;
    if (token) {
        event.detail.headers['RequestVerificationToken'] = token;
    }
});
```

Email input HTMX attributes:

```html
<input id="checkout-email"
       name="email"
       type="email"
       hx-post="/checkout/partials/check-email"
       hx-target="#email-status"
       hx-trigger="blur delay:300ms"
       hx-swap="innerHTML"
       hx-sync="this:replace"
       autocomplete="email"
       inputmode="email"
       data-email-capture />
```

`[ValidateAntiForgeryToken]` on ASP.NET Core checks both the form field `__RequestVerificationToken` AND the `RequestVerificationToken` header — no special configuration needed.

---

### Gap 28: Antiforgery Token in OOB Swap Partials

**Do NOT place `@Html.AntiForgeryToken()` inside any partial that is returned as an HTMX OOB swap.**

The original `_DiscountForm.cshtml` template in Gap 10 includes `@Html.AntiForgeryToken()` inside the form. This must be removed. When `_DiscountForm.cshtml` is swapped into `#discount-form` as an OOB target, the new token would be inserted into the DOM alongside the existing token (from `SinglePage.cshtml`). Two tokens in the DOM causes `querySelector('input[name="__RequestVerificationToken"]')` to find whichever comes first in DOM order — this can be the stale OOB-swapped token if placement order differs.

The `htmx:configRequest` handler reads the token from the single persistent token in `SinglePage.cshtml` which is placed before all swap targets and is NEVER replaced. This is safe because:

1. `SinglePage.cshtml` renders `@Html.AntiForgeryToken()` once, outside all HTMX swap targets
2. That token is valid for the lifetime of the page session
3. ASP.NET Core antiforgery tokens don't expire during normal checkout flow (they are session-tied, not time-limited)

**Rule:** No OOB swap partial should contain `@Html.AntiForgeryToken()`. Remove it from `_DiscountForm.cshtml`. The only `@Html.AntiForgeryToken()` call in the checkout is in `SinglePage.cshtml`.

---

### Gap 29: Consolidated `CheckoutViewModel` Property Additions

All new properties added to `src/Merchello/Models/CheckoutViewModel.cs` (additions only — existing properties unchanged):

```csharp
// In CheckoutViewModel.cs — add these properties:

/// <summary>Upsell suggestions for interstitial display above the checkout form.</summary>
public IReadOnlyList<UpsellSuggestionDto> UpsellSuggestions { get; set; } = [];

/// <summary>
/// Order summary for initial page render.
/// Built by ICheckoutViewModelBuilder.BuildOrderSummaryAsync().
/// </summary>
public OrderSummaryViewModel? OrderSummaryViewModel { get; set; }

/// <summary>
/// Shipping options for initial page render.
/// Populated only when session already has a billing address saved (restore-on-refresh).
/// Null on first visit — shipping section shows address form only.
/// </summary>
public ShippingOptionsViewModel? ShippingOptionsViewModel { get; set; }

/// <summary>
/// Payment methods for initial page render.
/// Populated only when session.SelectedShippingOptions.Count > 0 (restore-on-refresh).
/// Null until shipping is confirmed.
/// </summary>
public PaymentMethodsViewModel? PaymentMethodsViewModel { get; set; }

/// <summary>
/// Address lookup autocomplete config. Rendered as data-* attributes on the
/// address-autocomplete Alpine component to avoid an extra fetch on init.
/// </summary>
public AddressLookupConfigViewModel AddressLookupConfig { get; set; } = new();
```

New file `src/Merchello/Models/Checkout/AddressLookupConfigViewModel.cs`:

```csharp
namespace Merchello.Models.Checkout;

public class AddressLookupConfigViewModel
{
    public bool IsEnabled { get; init; }
    public string ProviderAlias { get; init; } = "";
    public int MinQueryLength { get; init; } = 3;
    public IReadOnlyList<string> SupportedCountries { get; init; } = [];
}
```

---

### Gap 30: `_sessionResolver` Naming Clarification and DI Registration

**`_sessionResolver` in Gap 24 is NOT an injected service.** It is shorthand for the private helper method `ResolveSessionAsync()` on `CheckoutPartialsController`. Replace every reference to `await _sessionResolver.ResolveAsync(ct)` with `await ResolveSessionAsync(ct)`.

```csharp
// Private method on CheckoutPartialsController — NOT a separate DI service
private async Task<(Basket? basket, CheckoutSession? session)> ResolveSessionAsync(CancellationToken ct)
{
    var basket = await _checkoutService.GetBasket(new GetBasketParameters(), ct);
    if (basket is null || basket.LineItems.Count == 0)
        return (null, null);
    var session = await _sessionService.GetSessionAsync(basket.Id, ct);
    return (basket, session);
}
```

**DI registrations for new services** (add in `src/Merchello/Startup.cs` alongside `ICheckoutDtoMapper` registration):

```csharp
builder.Services.AddScoped<ICheckoutViewModelBuilder, CheckoutViewModelBuilder>();
builder.Services.AddScoped<Filters.CheckoutPartialsExceptionFilter>();
```

**Express checkout and `_PaymentMethods.cshtml` — two locations:**

Express checkout appears in two places:

1. **Above the checkout form** (always rendered) — `_ExpressCheckout.cshtml` included in `SinglePage.cshtml` outside all HTMX swap targets. This is the primary express location.
2. **Inside the payment section** (optional) — rendered inside `_PaymentMethods.cshtml` when `Model.ShowExpressAbovePayment` is `true` (controlled by `CheckoutSettings.ShowExpressInPaymentSection`). Defaults to `false`.

The `ExpressProviders` on `PaymentMethodsViewModel` comes from `ICheckoutPaymentsOrchestrationService.GetPaymentOptionsAsync()` — it returns express providers alongside standard payment methods in one call.

**New ViewModel files list** (all go in `src/Merchello/Models/Checkout/`):

- `ShippingOptionsViewModel.cs`
- `ShippingGroupViewModel.cs` ← new (was missing from Phase 3 task list)
- `ShippingOptionViewModel.cs` ← new (was missing from Phase 3 task list)
- `OrderSummaryViewModel.cs`
- `OrderSummaryLineItemViewModel.cs`
- `OrderSummaryAddonViewModel.cs`
- `OrderSummaryDiscountViewModel.cs`
- `PaymentMethodsViewModel.cs`
- `EmailStatusViewModel.cs`
- `DiscountFormViewModel.cs`
- `MobileTotalViewModel.cs`
- `ValidationErrorsViewModel.cs`
- `RegionSelectViewModel.cs` ← defined in Gap 10, file must be created
- `AddressFormViewModel.cs` ← required by `_AddressForm.cshtml` @model directive
- `AddressLookupConfigViewModel.cs` ← new (was missing from Phase 3 task list)

**Phase 3 task 23 correction:** Change "Create 7 ViewModel classes" to "Create 15 ViewModel classes" (the 7 original + 8 additional identified above).

**AGENTS.md additions** (if `src/Merchello/AGENTS.md` exists, add a checkout section):

```markdown
## Checkout HTMX Architecture

- Source of truth for checkout runtime JS: `src/Merchello/Client/src/checkout/*.ts`
- Build command: `npm run build:checkout` (Tailwind CSS + esbuild TypeScript)
- HTMX vendored at: `Client/public/js/vendor/htmx.min.js` (pinned to 2.0.4)
- `CheckoutPartialsController` at `src/Merchello/Controllers/CheckoutPartialsController.cs` returns HTML fragments (not JSON)
- `ICheckoutViewModelBuilder` at `src/Merchello/Services/CheckoutViewModelBuilder.cs` builds all partial ViewModels
- NEVER use `Task.WhenAll` in checkout controller or any service it calls (EFCoreScope constraint)
- Antiforgery token: placed once in SinglePage.cshtml OUTSIDE all HTMX swap targets; sent via RequestVerificationToken header
- Do NOT put `@Html.AntiForgeryToken()` inside any OOB swap partial
```
