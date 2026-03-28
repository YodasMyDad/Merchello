# Checkout Frontend Asset Pipeline

The Merchello checkout runs on the storefront (your public-facing website), not in the Umbraco backoffice. It uses plain JavaScript with Alpine.js and is served from stable, predictable URLs. This page explains how the checkout JS and static assets are built, where they live, and how they get to the browser.

## Architecture at a Glance

There are **two separate frontend systems** in Merchello:

| System | Technology | Served from | Purpose |
|---|---|---|---|
| **Backoffice UI** | TypeScript, Lit, Vite (bundled) | `/App_Plugins/Merchello/merchello.js` (hashed) | Umbraco admin panel |
| **Checkout runtime** | Plain JavaScript, Alpine.js | `/App_Plugins/Merchello/js/checkout/*` (stable URLs) | Customer-facing checkout pages |

> **Warning:** These two systems have different build and serving strategies. Do not point checkout views at hashed bundle filenames, and do not try to import backoffice Lit components into checkout pages.

## Directory Structure

```
src/Merchello/Client/
  public/                          <-- Source of truth for checkout assets
    js/checkout/
      index.js                     <-- Main checkout entry point
      payment.js                   <-- Payment form rendering
      confirmation.js              <-- Order confirmation page
      analytics.js                 <-- Checkout analytics/tracking
      adapters/
        adapter-interface.js       <-- Base adapter contract
        stripe-payment-adapter.js  <-- Stripe card elements
        stripe-express-adapter.js  <-- Stripe express checkout (Apple/Google Pay)
        braintree-payment-adapter.js
        braintree-express-adapter.js
        braintree-local-payment-adapter.js
        paypal-unified-adapter.js
        worldpay-payment-adapter.js
        worldpay-express-adapter.js
      components/
        checkout-address-form.js   <-- Address form Alpine component
        checkout-payment.js        <-- Payment step Alpine component
        checkout-shipping.js       <-- Shipping selection Alpine component
        express-checkout.js        <-- Express checkout button component
        order-summary.js           <-- Cart/order summary component
        single-page-checkout.js    <-- Single-page checkout orchestrator
      services/                    <-- Internal service modules
      stores/                      <-- Alpine stores
    img/
      merchello.png                <-- Merchello logo
      merchello-tag.png            <-- Merchello tag image

  src/                             <-- Source of truth for backoffice UI
    bundle.manifests.ts            <-- Backoffice entry point
    ...                            <-- TypeScript/Lit components

  vite.config.ts                   <-- Vite build configuration

src/Merchello/wwwroot/
  App_Plugins/Merchello/           <-- Build output (DO NOT edit directly)
    js/checkout/...                <-- Copied from Client/public/js/checkout/
    img/...                        <-- Copied from Client/public/img/
    merchello.js                   <-- Bundled backoffice JS (hashed)
```

## How Assets Get Built

The Vite configuration in `Client/vite.config.ts` does two things:

1. **Bundles the backoffice UI** from `src/bundle.manifests.ts` into a hashed JS file.
2. **Copies the `public/` directory** contents into the build output at `wwwroot/App_Plugins/Merchello/`.

The relevant Vite config:

```typescript
export default defineConfig({
  // Copy checkout JS and images from public/ into the build output
  publicDir: "public",

  build: {
    lib: {
      entry: "src/bundle.manifests.ts",
      formats: ["es"],
      fileName: "merchello",
    },
    outDir: "../wwwroot/App_Plugins/Merchello",
    emptyOutDir: true,
  },
});
```

Because `publicDir: "public"` is set, Vite copies everything in `Client/public/` directly into the output directory. The checkout JS files are **not bundled or hashed** -- they are copied as-is, preserving their file names and directory structure.

## Stable URLs

Checkout script URLs are stable and must not change. Your checkout views reference these paths:

```
/App_Plugins/Merchello/js/checkout/index.js
/App_Plugins/Merchello/js/checkout/payment.js
/App_Plugins/Merchello/js/checkout/confirmation.js
/App_Plugins/Merchello/js/checkout/analytics.js
```

Payment adapter URLs follow the pattern:

```
/App_Plugins/Merchello/js/checkout/adapters/stripe-payment-adapter.js
/App_Plugins/Merchello/js/checkout/adapters/paypal-unified-adapter.js
```

Image URLs:

```
/App_Plugins/Merchello/img/merchello.png
```

> **Warning:** If checkout JS or image paths return 404, verify the files exist in `Client/public/` first, then rebuild the frontend assets.

## The Checkout Entry Point

The checkout `index.js` is the main entry point. It:

1. Installs a global error boundary for checkout error handling
2. Sets up the checkout logger (`window.MerchelloLogger`)
3. Imports Alpine.js and the collapse plugin as ES modules
4. Registers all checkout Alpine components and stores
5. Reads initial checkout data from the DOM (`#checkout-initial-data`)
6. Starts Alpine.js after all components are registered

```html
<!-- In your checkout Razor view -->
<div id="checkout-initial-data" data-checkout='@Json.Serialize(checkoutModel)'></div>
<script type="module" src="/App_Plugins/Merchello/js/checkout/index.js"></script>
```

## Payment Adapters

Payment adapters follow a common interface defined in `adapter-interface.js`. Each payment provider has its own adapter file that handles:

- Rendering the payment form UI
- Tokenizing card details
- Handling express checkout flows (Apple Pay, Google Pay)
- Communicating with payment provider client-side SDKs

The checkout system dynamically loads the appropriate adapter based on the configured payment provider. Adapters are plain JS files -- not bundled -- so they can load payment provider SDKs independently.

## Plugin Logo and Image Assets

Plugin logos and images live in `Client/public/img/`. These are used by:

- Payment provider configuration screens
- Checkout UI branding
- Provider adapter display elements

The source of truth is always `Client/public/img/`. Do not place images directly in `wwwroot/` -- they will be overwritten on the next build.

## Making Changes

### Editing checkout JavaScript

1. Edit files in `src/Merchello/Client/public/js/checkout/`
2. Rebuild the frontend: `cd src/Merchello/Client && npm run build`
3. The files are copied to `wwwroot/App_Plugins/Merchello/js/checkout/`
4. Refresh your checkout page

### Adding a new payment adapter

1. Create `src/Merchello/Client/public/js/checkout/adapters/my-provider-adapter.js`
2. Implement the adapter interface from `adapter-interface.js`
3. Rebuild the frontend
4. Configure the payment provider to reference the adapter path

### Adding images

1. Place the image in `src/Merchello/Client/public/img/`
2. Rebuild the frontend
3. Reference it at `/App_Plugins/Merchello/img/your-image.png`

## Troubleshooting

| Problem | Check |
|---|---|
| Checkout JS returns 404 | Verify files exist in `Client/public/js/checkout/`, then rebuild |
| Images return 404 | Verify files exist in `Client/public/img/`, then rebuild |
| Changes not appearing | Make sure you ran `npm run build` in the `Client/` directory |
| Backoffice changes not appearing | Make sure you ran `npm run build` (backoffice is also built by Vite) |
| Old files persisting | The build uses `emptyOutDir: true`, so the output directory is cleared on each build |

## Key Files

| File | Purpose |
|---|---|
| `Client/public/js/checkout/index.js` | Checkout entry point |
| `Client/public/js/checkout/adapters/` | Payment provider adapters |
| `Client/public/img/` | Plugin logos and images |
| `Client/vite.config.ts` | Vite build configuration |
| `Client/src/bundle.manifests.ts` | Backoffice UI entry point |
