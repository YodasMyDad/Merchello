# Backoffice UI Development

Merchello's backoffice UI is built as an Umbraco v17 package using TypeScript, Lit web components, and Vite. This page covers the technology stack, project structure, build process, and key patterns you need to know when working on (or extending) the backoffice.

## Technology Stack

| Technology | Purpose |
|---|---|
| **TypeScript** | Strict mode, no `any`. All component code is typed. |
| **Lit** | Web component framework. One element per file, kebab-case tag names with project prefix. |
| **Vite** | Build tool. Bundles TypeScript into a single ES module. |
| **Umbraco Backoffice API** | UUI components (`uui-*`), Umbraco wrappers (`umb-*`), manifest system, routing. |

## Project Structure

```
src/Merchello/Client/
  src/
    api/                    -- API client and store settings
      merchello-api.ts      -- Central API wrapper
      store-settings.ts     -- Store configuration cache
    shared/
      utils/                -- Shared utilities
        formatting.ts       -- Currency/number formatting (use instead of .toFixed())
        validation.ts       -- Shared validation helpers
      styles/               -- Shared CSS-in-JS styles
      components/           -- Shared components (actions dropdown, etc.)
      modals/               -- Shared modal elements and tokens
    {feature}/
      components/           -- Lit elements for the feature
      modals/               -- Modal elements and tokens
      contexts/             -- Umbraco workspace contexts
      types/                -- TypeScript type definitions
      manifest.ts           -- Feature manifest registration
    bundle.manifests.ts     -- Entry point that registers all feature manifests
  public/
    js/checkout/            -- Checkout runtime JS (plain JS, not TypeScript)
    img/                    -- Plugin images and logos
  vite.config.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

### Feature Modules

Each backoffice feature is a self-contained folder. Here are the main ones:

| Feature | Purpose |
|---|---|
| `products` | Product listing, editing, variant management |
| `orders` | Order listing, detail, fulfilment |
| `customers` | Customer listing, editing, segments |
| `discounts` | Discount creation, editing, rules |
| `shipping` | Shipping option configuration |
| `tax` | Tax group and rate management |
| `payment-providers` | Payment provider configuration |
| `warehouses` | Warehouse management |
| `suppliers` | Supplier management |
| `analytics` | Dashboard charts and KPIs |
| `email` | Email template configuration |
| `webhooks` | Webhook subscription management |
| `product-feed` | Google Shopping feed configuration |
| `collections` | Product collection management |
| `filters` | Product filter/facet configuration |
| `upsells` | Upsell rule configuration |
| `settings` | Store settings |

## Build Process

The Vite build is configured in `Client/vite.config.ts`:

```bash
# Install dependencies
cd src/Merchello/Client
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Run tests
npm run test
```

The build outputs to `src/Merchello/wwwroot/App_Plugins/Merchello/`. The entry point is `bundle.manifests.ts`, which registers all feature manifests with Umbraco's extension system.

> **Note:** Umbraco packages (`@umbraco/*`) are marked as external in the Rollup config. They are provided by the Umbraco runtime and should not be bundled.

## Manifest System

Every feature registers itself through Umbraco's manifest system. A typical manifest file:

```typescript
// products/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'workspace',
    alias: 'Merchello.Workspace.Product',
    name: 'Product Workspace',
    element: () => import('./components/product-workspace.element.js'),
    meta: {
      entityType: 'merchello-product',
    },
  },
  {
    type: 'workspaceView',
    alias: 'Merchello.WorkspaceView.Product.Details',
    name: 'Product Details',
    element: () => import('./components/product-details.element.js'),
    meta: {
      label: 'Details',
      pathname: 'details',
      icon: 'icon-settings',
    },
    conditions: [
      { alias: 'Umb.Condition.WorkspaceAlias', match: 'Merchello.Workspace.Product' },
    ],
  },
];
```

The `bundle.manifests.ts` entry point imports and registers manifests from all features.

## Component Patterns

### Lit Element Structure

Every Lit element follows this pattern:

```typescript
import { LitElement, html, css, customElement, property, state } from 'lit';

@customElement('merchello-product-list')
export class ProductListElement extends LitElement {
  @property({ type: String })
  headline = '';

  @state()
  private _products: ProductListItem[] = [];

  @state()
  private _isLoading = true;

  override render() {
    // Handle loading state first
    if (this._isLoading) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    // Handle empty state
    if (this._products.length === 0) {
      return html`<p>No products found.</p>`;
    }

    // Render content
    return html`
      <umb-table .items=${this._products} .columns=${this._columns}>
      </umb-table>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }
  `;
}
```

Key conventions:
- **PascalCase** class names
- **Kebab-case** tag names with `merchello-` prefix
- Handle **error, loading, and empty** states in `render()` before the happy path
- Use `@property` for public API, `@state` for internal state
- Never use `innerHTML`

### API Calls

All API calls go through the central `merchello-api.ts` wrapper:

```typescript
import { MerchelloApi } from '@api/merchello-api.js';

const products = await MerchelloApi.get<ProductListItem[]>('/products');
const result = await MerchelloApi.post<CreateResult>('/products', productData);
```

### Currency and Number Formatting

> **Warning:** Never use `.toFixed()` for currency formatting. Always use the shared formatting utilities:

```typescript
import { formatCurrency, formatNumber } from '@shared/utils/formatting.js';

// Formats according to store currency settings
const price = formatCurrency(29.99, 'GBP');  // "\u00a329.99"
const qty = formatNumber(1500);               // "1,500"
```

### TypeScript Types

Types that mirror C# DTOs must use identical names (PascalCase in C#, camelCase in JSON/JS):

```typescript
// types/product.types.ts
export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  statusLabel: string;      // Use DTO-provided labels
  statusCssClass: string;   // Use DTO-provided CSS classes
}
```

> **Note:** Backend is the source of truth. Use `statusLabel` and `statusCssClass` from DTOs rather than hardcoding enum-to-label mappings in the frontend.

### Modal Pattern

Modals use Umbraco's modal system with typed data and value:

```typescript
// modals/create-product-modal.token.ts
export interface CreateProductModalData {
  productTypeId: string;
}

export interface CreateProductModalValue {
  name: string;
  sku: string;
}

export const CREATE_PRODUCT_MODAL = new UmbModalToken<
  CreateProductModalData,
  CreateProductModalValue
>('Merchello.Modal.CreateProduct', {
  modal: { type: 'sidebar', size: 'medium' },
});
```

### Event Pattern

Custom events use typed `detail`:

```typescript
export interface ProductSelectedDetail {
  productId: string;
  productName: string;
}

// Emitting
this.dispatchEvent(new CustomEvent<ProductSelectedDetail>('product-selected', {
  detail: { productId: product.id, productName: product.name },
  bubbles: true,
  composed: true,
}));
```

## Umbraco UI Components

The backoffice uses Umbraco's component library extensively. Key components:

| Component | Use for |
|---|---|
| `umb-workspace-editor` | Entity editing pages (wraps header, navigation tabs, footer actions) |
| `umb-body-layout` | Section views, collection pages, complex modals |
| `uui-box` | Grouped content sections |
| `umb-property-layout` | Label/description/editor rows |
| `umb-table` | Collection list views with sorting and selection |
| `uui-button` | Actions and submissions |
| `uui-input`, `uui-select`, `uui-toggle` | Form controls |
| `uui-dialog-layout` | Simple confirmation dialogs |
| `uui-loader-bar` | Loading indicators |

> **Tip:** Prefer Umbraco wrappers (`umb-*`) when available. Use raw UUI components (`uui-*`) only for low-level controls. See the internal `docs/Umbraco-Backoffice-Dev.md` for the complete component selection guide.

## Spacing and Styling

Use Umbraco's UUI design tokens, not custom pixel values:

```css
:host {
  padding: var(--uui-size-layout-1);  /* Layout spacing */
}

.section {
  margin-top: var(--uui-size-space-4);  /* Component spacing */
}

.divider {
  border-bottom: 1px solid var(--uui-color-divider);
}
```

## Testing

Tests use Vitest (configured in `vitest.config.ts`):

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
```

Unit test pure functions. Add component tests for critical UI elements.

## Key Files

| File | Purpose |
|---|---|
| `Client/src/bundle.manifests.ts` | Entry point registering all manifests |
| `Client/src/api/merchello-api.ts` | Central API client |
| `Client/src/api/store-settings.ts` | Store settings cache |
| `Client/src/shared/utils/formatting.ts` | Currency and number formatting |
| `Client/vite.config.ts` | Vite build configuration |
| `Client/tsconfig.json` | TypeScript configuration |
