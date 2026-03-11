# Checkout Modernization: TypeScript + Alpine.js

## Goal

Modernize the entire checkout frontend so it is built and maintained like the rest of the Merchello client stack, while preserving the current runtime contracts.

This guide now covers the full migration, including:

- the main module-based checkout runtime
- classic checkout scripts
- payment provider adapter files
- the checkout build pipeline
- the shared checkout/backoffice adapter contract

## End State

The target end state is:

- all checkout JavaScript source lives under `src/Merchello/Client/src/checkout/`
- `src/Merchello/Client/public/js/checkout/*` is retired
- the build still emits the exact same public runtime paths under `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/*`
- Razor views keep loading the same URLs
- payment providers keep returning the same adapter URLs from C#
- the backoffice provider test modal keeps working with the same adapter registry contract
- `npm run build:checkout` remains the single checkout build entry point used locally and in CI

## Validated Current Constraints

These points were checked against the current codebase.

- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_Layout.cshtml` loads `/App_Plugins/Merchello/js/checkout/index.js` as `type="module"`.
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/_Layout.cshtml` also injects an import map for `alpinejs` and `@alpinejs/collapse`, and `src/Merchello/Client/public/js/checkout/index.js` currently relies on those bare module specifiers at runtime.
- `src/Merchello/App_Plugins/Merchello/Views/Checkout/Confirmation.cshtml` and `src/Merchello/App_Plugins/Merchello/Views/Checkout/PostPurchase.cshtml` load plain classic scripts.
- `src/Merchello/Client/public/js/checkout/payment.js` dynamically loads provider adapter files by URL and expects global adapter registries.
- `src/Merchello/Client/public/js/checkout/components/express-checkout.js` does the same for express adapters.
- the adapter contract is shared with `src/Merchello/Client/src/payment-providers/modals/test-provider-modal.element.ts`, which loads adapter URLs and reads `window.MerchelloPaymentAdapters` / `window.MerchelloExpressAdapters`
- several adapter flows also call `window.MerchelloPayment` helper methods (`fetchWithTimeout`, `getVaultSettings`, `safeRedirect`), so registry compatibility alone is not the whole shared contract
- payment providers hardcode adapter URLs to `/App_Plugins/Merchello/js/checkout/adapters/*.js`
- `src/Merchello/Client/vite.config.ts` currently owns `Client/public` and writes to `src/Merchello/wwwroot/App_Plugins/Merchello` with `emptyOutDir: true`
- `src/Merchello/Styles/tailwind.config.js` currently scans `../wwwroot/App_Plugins/Merchello/js/checkout/**/*.js`, so moving checkout source out of `Client/public` also requires updating Tailwind content globs or enforcing build order
- CI and release call `npm run build:backoffice` and `npm run build:checkout` directly
- `src/Merchello/Client/src/checkout` already exists and should be expanded, not replaced
- `src/Merchello/Client/src/checkout` already contains helper and test files that import the legacy checkout runtime directly
- `src/Merchello/Client/public/js/checkout/adapters/adapter-interface.js` exists, but the live runtime still uses direct self-registration in each emitted adapter file rather than this helper module

## Critical Runtime Contracts To Preserve

These are non-negotiable during the migration.

### 1. Stable public paths

These paths must remain valid:

- `/App_Plugins/Merchello/js/checkout/index.js`
- `/App_Plugins/Merchello/js/checkout/payment.js`
- `/App_Plugins/Merchello/js/checkout/analytics.js`
- `/App_Plugins/Merchello/js/checkout/single-page-analytics.js`
- `/App_Plugins/Merchello/js/checkout/confirmation.js`
- `/App_Plugins/Merchello/js/checkout/post-purchase.js`
- `/App_Plugins/Merchello/js/checkout/adapters/*.js`

### 2. Mixed script formats

The checkout is not one runtime format.

| Surface | Current runtime contract | Required output |
| --- | --- | --- |
| `index.js`, `payment.js`, `stores/*`, `components/*`, `services/*`, `utils/*` | loaded as ES modules | ESM |
| `analytics.js`, `single-page-analytics.js`, `confirmation.js`, `post-purchase.js` | loaded as plain scripts | classic script |
| `adapters/*.js` | dynamically injected, self-registering globals | classic script |

### 3. Global adapter registries

These must keep working:

- `window.MerchelloPaymentAdapters`
- `window.MerchelloExpressAdapters`
- `window.MerchelloPayment`
- `window.MerchelloCheckout`
- `window.MerchelloSinglePageAnalytics`
- `window.MerchelloExpressConfig`

### 4. Import map dependency

This currently exists and cannot be ignored during the build change.

- `index.js` imports `alpinejs` and `@alpinejs/collapse` as bare specifiers
- `_Layout.cshtml` provides the import map that resolves those specifiers in the browser
- if the new checkout build stops relying on the import map, Razor and dependency ownership must change in the same phase

### 5. Backoffice compatibility

The checkout adapters are not storefront-only. The backoffice payment provider test modal also loads them by URL and expects the same global registration behavior.

## What Will Not Work

The original "convert all `.js` to `.ts` and emit via one Vite checkout build" is not valid by itself.

It would fail for at least one of these reasons:

- classic scripts would accidentally become ESM
- adapters would stop self-registering on globals
- the backoffice test modal would stop finding adapters
- adapters that call `window.MerchelloPayment.*` would lose helper functions even if the registries still existed
- Vite `publicDir` copy and generated checkout output would fight for the same paths
- Vite would continue clearing `src/Merchello/wwwroot/App_Plugins/Merchello` via `emptyOutDir: true`, deleting checkout files emitted by the new pipeline
- hashed files or chunks would break hardcoded provider URLs
- Tailwind would keep scanning built `wwwroot` checkout JS instead of the new source location, which makes CSS generation depend on build order or stale outputs
- treating `adapters/adapter-interface.js` as the current runtime source of truth would miss the direct self-registration logic actually used today

## Recommended Build Architecture

## Overview

Use a dedicated checkout build pipeline separate from the existing backoffice Vite bundle.

Keep Vite as the owner of:

- backoffice extension bundles from `src/Merchello/Client/src/*` excluding checkout runtime output concerns
- `Client/public/img/*`
- `Client/public/umbraco-package.json`
- other public assets that are not checkout JavaScript

Use a dedicated checkout build script for all checkout JS/TS output.

## Required Vite change

This is not optional.

Because Vite currently writes to `../wwwroot/App_Plugins/Merchello` with `emptyOutDir: true`, it cannot continue to own that shared root unchanged once checkout JS is emitted by a second pipeline.

At minimum, the migration must ensure that:

- Vite no longer clears checkout JS output on `build:backoffice` or watch rebuilds
- checkout JS is no longer sourced from `Client/public/js/checkout/*`
- `build:backoffice` and `build:checkout` can run in either order without deleting each other's artifacts

## Recommended tool choice

Use a dedicated Node build script, for example:

- `src/Merchello/Client/scripts/build-checkout.mjs`

with direct `esbuild` usage for checkout JS.

Reason:

- it can emit both ESM and classic IIFE outputs
- it can preserve stable filenames
- it can bundle classic scripts and adapters into self-contained outputs
- it avoids trying to make one Vite config own incompatible runtime shapes

## Recommended output model

### A. ESM transpile group

For the module checkout graph:

- `index.ts`
- `payment.ts`
- `stores/**/*.ts`
- `components/**/*.ts`
- `services/**/*.ts`
- `utils/**/*.ts`

emit as ESM to the same relative output paths under `wwwroot/App_Plugins/Merchello/js/checkout/`.

Recommended behavior:

- preserve relative file structure
- keep `.js` import specifiers in source
- do not emit hashed filenames
- do not bundle this graph into one file

### B. Classic root script group

For classic root files:

- `analytics.ts`
- `single-page-analytics.ts`
- `confirmation.ts`
- `post-purchase.ts`

emit classic script outputs at:

- `analytics.js`
- `single-page-analytics.js`
- `confirmation.js`
- `post-purchase.js`

Recommended behavior:

- bundle each entry into a self-contained file
- output classic browser scripts, not modules

### C. Adapter script group

For:

- `adapters/*.ts`

emit classic script outputs at:

- `adapters/*.js`

Recommended behavior:

- bundle each adapter entry into a self-contained file
- preserve current filenames exactly
- preserve current self-registration on `window.MerchelloPaymentAdapters` and `window.MerchelloExpressAdapters`

## File ownership rules

This is the key rule that keeps the build seamless.

| Concern | Source of truth | Output | Build owner |
| --- | --- | --- | --- |
| Backoffice client code | `src/Merchello/Client/src/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/*.js` | Vite |
| Checkout module runtime | `src/Merchello/Client/src/checkout/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/*` | checkout build |
| Checkout classic scripts | `src/Merchello/Client/src/checkout/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/*` | checkout build |
| Checkout adapters | `src/Merchello/Client/src/checkout/adapters/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/adapters/*` | checkout build |
| Checkout CSS | `src/Merchello/Styles/checkout.css` | `src/Merchello/wwwroot/App_Plugins/Merchello/css/checkout.css` | Tailwind step |
| Public images | `src/Merchello/Client/public/img/*` | `src/Merchello/wwwroot/App_Plugins/Merchello/img/*` | Vite `publicDir` |

### Important rule

Once a checkout JS path is migrated to `src/Merchello/Client/src/checkout/*`, the corresponding `Client/public/js/checkout/*` source must be removed in the same phase. Do not keep dual ownership for the same emitted path.

### Tailwind rule

Once checkout JS ownership moves out of `Client/public`, `src/Merchello/Styles/tailwind.config.js` should scan the checkout source tree directly, for example `../Client/src/checkout/**/*.{ts,js}`.

Do not leave Tailwind dependent on already-built `wwwroot/App_Plugins/Merchello/js/checkout/**/*.js` files as the long-term source of class discovery.

## Source Layout

Use `src/Merchello/Client/src/checkout/` as the new full source root and mirror the current public shape as closely as possible.

Recommended structure:

```text
src/Merchello/Client/src/checkout/
  adapters/
  components/
  services/
  stores/
  types/
  utils/
  analytics.ts
  confirmation.ts
  index.ts
  payment.ts
  post-purchase.ts
  single-page-analytics.ts
```

This keeps the mapping to `/js/checkout/*` obvious.

## Package Scripts

Keep `build:checkout` as the stable public command, but split its internals.

Recommended scripts:

- `build:backoffice`
- `build:checkout:js`
- `build:checkout:css`
- `build:checkout`
- `watch:checkout`
- `watch`

Recommended behavior:

- `build:checkout:js` builds all checkout TS targets
- `build:checkout:css` keeps the current Tailwind output
- `build:checkout` runs both
- `watch` runs the backoffice watch plus checkout watch

This keeps the client build seamless without forcing CI/release changes.

## Migration Phases

## Phase 1: Build Foundation

### Files to modify

- `src/Merchello/Client/package.json`
- `src/Merchello/Client/tsconfig.json`
- `src/Merchello/Client/tsconfig.checkout.json` (new)
- `src/Merchello/Client/scripts/build-checkout.mjs` (new)
- `src/Merchello/Client/vite.config.ts`
- `src/Merchello/Styles/tailwind.config.js`

### Tasks

1. Add `esbuild` as a dev dependency.
2. Add a checkout-specific TS config.
3. Add a dedicated checkout build script that handles:
   - ESM outputs
   - classic script outputs
   - adapter outputs
4. Update `package.json` so `build:checkout` remains the one public checkout build command.
5. Ensure Vite no longer clears or owns checkout JS output paths.
6. Update Tailwind content globs so checkout CSS generation reads the new checkout source tree.
7. Preserve the current Alpine import strategy explicitly:
   - either keep `alpinejs` / `@alpinejs/collapse` as external bare imports resolved by Razor's import map
   - or add them as checkout build dependencies and change Razor/runtime ownership in the same phase

### Deliverable

A build that can emit all checkout JS targets from `src/Merchello/Client/src/checkout/*` without changing public URLs.

## Phase 2: Shared Types And Global Contracts

### New files

- `src/Merchello/Client/src/checkout/types/checkout.types.ts`
- `src/Merchello/Client/src/checkout/types/api.types.ts`
- `src/Merchello/Client/src/checkout/types/payment-adapter.types.ts`
- `src/Merchello/Client/src/checkout/checkout-globals.d.ts`

### Source of truth

Frontend names must match backend DTO names and emitted JSON shapes.

Primary DTO sources:

- `src/Merchello.Core/Checkout/Dtos/CheckoutBasketDto.cs`
- `src/Merchello.Core/Checkout/Dtos/CheckoutLineItemDto.cs`
- `src/Merchello.Core/Checkout/Dtos/ShippingGroupDto.cs`
- `src/Merchello.Core/Checkout/Dtos/CheckoutShippingOptionDto.cs`
- `src/Merchello.Core/Checkout/Dtos/CheckoutPaymentOptionsDto.cs`
- `src/Merchello.Core/Payments/Dtos/PaymentMethodDto.cs`
- `src/Merchello.Core/Payments/Dtos/StorefrontSavedMethodDto.cs`
- `src/Merchello.Core/Payments/Dtos/PaymentSessionResultDto.cs`
- `src/Merchello.Core/Payments/Dtos/ExpressCheckoutConfigDto.cs`
- address lookup DTOs under `src/Merchello.Core/AddressLookup/Dtos/*`

### Additional contract source

`CheckoutInitialData` must come from the JSON emitted by:

- `src/Merchello/App_Plugins/Merchello/Views/Checkout/SinglePage.cshtml`

Important:

- this payload is not a direct DTO serialization
- it is a view-composed anonymous object with renamed and flattened fields
- TypeScript types must be derived from the actual JSON block, not inferred from DTO names alone

That payload currently includes, among others:

- `basket`
- `basketId`
- `basketLineItems`
- `currency`
- `displayPricesIncTax`
- `taxInclusiveDisplaySubTotal`
- `formattedTaxInclusiveDisplaySubTotal`
- `taxInclusiveDisplayDiscount`
- `taxIncludedMessage`
- `exchangeRate`
- `currencyDecimalPlaces`
- `isLoggedIn`
- `hasDigitalProducts`
- `billingPhoneRequired`
- `email`
- `billing`
- `shipping`
- `shippingGroups`
- `hasShippingGroups`
- `appliedDiscounts`
- `orderTerms`
- `addressLookup`
- `expressConfig`

Examples of fields that are easy to miss because they are composed in the view:

- `basketLineItems[].displayUnitPriceWithAddons`
- `basketLineItems[].displayLineTotalWithAddons`
- `basketLineItems[].formattedDisplayUnitPriceWithAddons`
- `basketLineItems[].formattedDisplayLineTotalWithAddons`
- `basketLineItems[].parentLineItemId`
- `basketLineItems[].imageUrl`
- `shippingGroups[].selectedOptionId`
- `shippingGroups[].shippingOptions[].providerKey`
- `shippingGroups[].shippingOptions[].selectionKey`
- `shippingGroups[].shippingOptions[].isFallbackRate`

Also note:

- `shippingSameAsBilling` is not currently emitted in this payload, so do not type it as present unless the server output changes

### Required globals

Declare and type:

- `window.Alpine`
- `window.MerchelloPayment`
- `window.MerchelloPaymentAdapters`
- `window.MerchelloExpressAdapters`
- `window.MerchelloCheckout`
- `window.MerchelloSinglePageAnalytics`
- `window.MerchelloLogger`
- `window.merchelloCheckoutData`

## Phase 3: Convert The ESM Checkout Graph

This is the lowest-risk runtime track and should still happen first.

### Convert

- `utils/formatters.js`
- `utils/debounce.js`
- `utils/security.js`
- `utils/regions.js`
- `utils/announcer.js`
- `utils/payment-errors.js`
- `services/validation.js`
- `services/logger.js`
- `services/error-boundary.js`
- `services/api.js`
- `stores/checkout.store.js`
- `components/checkout-address-form.js`
- `components/checkout-shipping.js`
- `components/checkout-payment.js`
- `components/order-summary.js`
- `components/express-checkout.js`
- `components/single-page-checkout.js`
- `payment.js`
- `index.js`

### Rules

- keep emitted runtime path and filename stable
- keep `.js` import specifiers in TS source where runtime imports require them
- keep the module entry at `/App_Plugins/Merchello/js/checkout/index.js`
- keep Alpine startup behavior unchanged

## Phase 4: Convert Classic Root Scripts

These files are part of the full migration and should be modernized, but through the classic-script output pipeline.

### Convert

- `analytics.js`
- `single-page-analytics.js`
- `confirmation.js`
- `post-purchase.js`

### Recommended source pattern

For each classic entry:

1. move reusable logic into normal typed modules
2. keep a thin entry file that auto-runs and emits a classic bundled output

Examples:

- `confirmation.core.ts` for testable functions
- `confirmation.ts` for DOM bootstrap and auto-init

This avoids losing testability when moving away from ad hoc global scripts.

### Rules

- emitted files must remain plain scripts, not modules
- Razor views should not need URL changes
- `window.MerchelloCheckout` and `window.MerchelloSinglePageAnalytics` behavior must remain unchanged

## Phase 5: Convert Adapter Infrastructure

This phase covers the adapter layer itself, not just the main checkout runtime.

### Convert foundational files first

- `adapters/adapter-interface.js`

Audit correction:

- `adapters/adapter-interface.js` is not currently on the live storefront or backoffice code path
- the live source of truth is the self-registration behavior in each emitted adapter plus the lookup logic in:
  - `src/Merchello/Client/public/js/checkout/payment.js`
  - `src/Merchello/Client/public/js/checkout/components/express-checkout.js`
  - `src/Merchello/Client/src/payment-providers/modals/test-provider-modal.element.ts`

Treat `adapter-interface.js` as optional cleanup or a future shared helper, not as a migration prerequisite that everything else depends on.

Add typed definitions for:

- standard payment adapter contract
- express adapter contract
- render context
- adapter registration helpers

### Runtime rule

Even after conversion, emitted adapter files must still behave as classic scripts that self-register on global registries.

That means:

- no ESM-only adapter runtime
- no hashed filenames
- no change to provider-returned adapter URLs

## Phase 6: Convert Provider Adapter Files

Convert every current provider adapter file to TypeScript and emit it back to the same runtime path.

### Standard adapters

- `adapters/stripe-payment-adapter.js`
- `adapters/stripe-card-elements-adapter.js`
- `adapters/braintree-payment-adapter.js`
- `adapters/braintree-local-payment-adapter.js`
- `adapters/paypal-unified-adapter.js`
- `adapters/worldpay-payment-adapter.js`

### Express adapters

- `adapters/stripe-express-adapter.js`
- `adapters/braintree-express-adapter.js`
- `adapters/worldpay-express-adapter.js`
- express registration paths within `paypal-unified-adapter.js`

### Recommended order

1. `paypal-unified-adapter`
2. Stripe adapters
3. Braintree adapters
4. WorldPay adapters

That order reduces duplication while hardening the shared registry model early.

### Rules

- keep current output filenames
- keep current provider aliases and registration keys
- keep current `window.MerchelloPaymentAdapters['provider']` and `window.MerchelloExpressAdapters['provider:method']` behavior
- keep compatibility with the backoffice provider test modal

## Phase 7: Remove Legacy Checkout JS From `Client/public`

After all checkout runtime files have migrated to `src/Merchello/Client/src/checkout/*`:

1. remove `src/Merchello/Client/public/js/checkout/*`
2. keep `Client/public/img/*` and other true static assets
3. verify Vite `publicDir` is no longer expected to supply checkout JS

This is the final ownership handoff.

## Phase 8: Tests

Carry forward existing tests under `src/Merchello/Client/src/checkout/` and expand them.

### Add or update tests for

- basket update helpers
- tax-inclusive discount display helpers
- validation helpers
- formatter helpers
- checkout store behavior
- payment session matching
- classic analytics helper behavior
- confirmation bootstrap logic
- post-purchase helper logic
- adapter registration and lookup behavior
- at least one integration-style test per major adapter family where practical

### Important note

Where current classic scripts are difficult to test, split logic into typed core modules and keep the emitted classic entry thin.

## Phase 9: Documentation Follow-Through

Once the migration is complete, update:

- `docs/Architecture-Diagrams.md`
- `docs/Checkout.md`
- `docs/PaymentProviders-DevGuide.md`

These documents currently reference `src/Merchello/Client/public/js/checkout/*` as the source location and will become stale once the migration is complete.

## Files That Should Not Need Behavioral Changes

If the migration is done correctly, these should keep the same runtime behavior:

- checkout Razor page routes
- payment provider C# adapter URL constants
- checkout API endpoints
- checkout service-layer calculations
- Tailwind CSS output path

What may still need changes:

- Tailwind content globs and checkout CSS build wiring
- Vite output ownership and cleanup behavior

## Verification

Build verification must prove the whole checkout still works, not just the main module entry.

### Build verification

1. `npm run test:run`
2. `npm run build:backoffice`
3. `npm run build:checkout`
4. `npm run build:backoffice` after `npm run build:checkout` must not delete `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/*`
5. Tailwind output must still include classes referenced only from checkout source files after they move out of `Client/public`

### Runtime verification

1. `/App_Plugins/Merchello/js/checkout/index.js` still loads as a module
2. `/App_Plugins/Merchello/js/checkout/payment.js` still drives dynamic adapter loading
3. `/App_Plugins/Merchello/js/checkout/analytics.js` still works as a classic script
4. `/App_Plugins/Merchello/js/checkout/single-page-analytics.js` still works as a classic script
5. `/App_Plugins/Merchello/js/checkout/confirmation.js` still works as a classic script
6. `/App_Plugins/Merchello/js/checkout/post-purchase.js` still works as a classic script
7. `/App_Plugins/Merchello/js/checkout/adapters/*.js` still load by URL and self-register globally

### Checkout flow verification

1. checkout page initializes from `#checkout-initial-data`
2. address save works
3. shipping selection works
4. discount apply/remove works
5. payment options and saved methods load
6. hosted fields, direct form, and redirect flows still work
7. express checkout still renders and re-renders correctly after basket changes
8. confirmation page still emits purchase analytics
9. post-purchase page still loads offers and processes saved-method upsells
10. backoffice payment provider test modal still loads and runs adapter files
11. checkout module still resolves `alpinejs` and `@alpinejs/collapse` under the chosen ownership model
12. adapter flows that call `window.MerchelloPayment.*` still work in storefront and in any supported backoffice test flow

## Recommendation

Proceed with a full TypeScript migration of the checkout, but do it with a build architecture that explicitly supports both ESM and classic output types.

That is the only path that modernizes everything while keeping the current system behavior intact:

- module checkout runtime
- classic scripts
- provider adapters
- Razor views
- provider URL constants
- backoffice adapter testing
- CI build commands
