# Merchello.ActionExamples

Example project demonstrating how to build custom backoffice actions for Merchello. Actions appear in the **Actions** dropdown on invoice, order, and product pages in the Umbraco backoffice.

This project is a Razor Class Library (RCL) that doubles as an Umbraco backoffice package. Reference it from your site project and the actions appear automatically — no manual registration required.

## Quick start

```bash
# Install frontend dependencies
cd src/Merchello.ActionExamples/Client
npm install

# Build the TypeScript / Vite bundle
npm run build

# Build the .NET project
cd ..
dotnet build
```

The frontend build outputs to `wwwroot/`. ASP.NET serves RCL static assets at `/_content/{AssemblyName}/`, so the bundle URL is `/_content/Merchello.ActionExamples/merchello-action-examples.js`.

## Project structure

```
Merchello.ActionExamples/
  Actions/                          # C# action classes (auto-discovered)
    InvoiceDialogOpenAction.cs      # Sidebar action for invoice pages
    InvoiceCsvDownloadAction.cs     # Download action for invoice pages
    OrderDialogOpenAction.cs        # Sidebar action for order pages
    OrderCsvDownloadAction.cs       # Download action for order pages
    ProductRootDialogOpenAction.cs  # Sidebar action for product pages
    ProductRootCsvDownloadAction.cs # Download action for product pages
    ProductDialogOpenAction.cs      # Sidebar action for variant pages
    ProductCsvDownloadAction.cs     # Download action for variant pages
  Client/                           # Frontend source (TypeScript + Vite)
    src/
      index.ts                      # Bundle entry point
      panels/
        invoice-panel.element.ts    # Invoice sidebar panel
        order-panel.element.ts      # Fulfillment order sidebar panel
        product-root-panel.element.ts # Product sidebar panel
        product-panel.element.ts    # Product variant sidebar panel
    public/
      App_Plugins/Merchello.ActionExamples/
        umbraco-package.json        # Umbraco package manifest
    package.json
    tsconfig.json
    vite.config.ts
  wwwroot/                          # Build output (gitignored)
    merchello-action-examples.js    # Compiled bundle
    merchello-action-examples.js.map
    App_Plugins/Merchello.ActionExamples/
      umbraco-package.json          # Copied from Client/public/
  Merchello.ActionExamples.csproj
```

## How actions work

### The `IMerchelloAction` interface

Every action implements `IMerchelloAction`. Merchello discovers all implementations automatically via `ExtensionManager` — just add a class and it appears in the dropdown.

```csharp
public interface IMerchelloAction
{
    ActionMetadata Metadata { get; }
    Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken cancellationToken = default);
}
```

### `ActionMetadata` — describing your action

| Property | Type | Description |
|---|---|---|
| `Key` | `string` | Unique identifier (e.g., `"my-company.export-invoice"`) |
| `DisplayName` | `string` | Text shown in the dropdown menu |
| `Category` | `ActionCategory` | Which page it appears on: `Invoice`, `Order`, `ProductRoot`, or `Product` |
| `Behavior` | `ActionBehavior` | How it runs: `ServerSide`, `Download`, or `Sidebar` |
| `Icon` | `string?` | Umbraco icon class (e.g., `"icon-download-alt"`, `"icon-chat"`) |
| `Description` | `string?` | Tooltip text |
| `SortOrder` | `int` | Position in dropdown (lower = higher). Default: `1000` |
| `SidebarJsModule` | `string?` | JS module URL for `Sidebar` behavior |
| `SidebarElementTag` | `string?` | Custom element tag for `Sidebar` behavior |
| `SidebarSize` | `string` | Modal width: `"small"`, `"medium"`, or `"large"`. Default: `"medium"` |

### `ActionContext` — what your action receives

When `ExecuteAsync` is called, the context contains the relevant entity IDs:

```csharp
public record ActionContext
{
    public ActionCategory Category { get; init; }
    public Guid? InvoiceId { get; init; }
    public Guid? OrderId { get; init; }
    public Guid? ProductRootId { get; init; }
    public Guid? ProductId { get; init; }
    public Dictionary<string, object>? Data { get; init; }
}
```

Only the IDs relevant to the category are populated. An invoice action receives `InvoiceId`, an order action receives `InvoiceId` + `OrderId`, etc.

### `ActionResult` — what your action returns

```csharp
// Simple success/failure
return ActionResult.Ok("Invoice exported successfully.");
return ActionResult.Fail("Export failed: no line items.");

// File download
return new ActionResult
{
    Success = true,
    FileBytes = Encoding.UTF8.GetBytes(csvContent),
    FileName = "invoice-export.csv",
    ContentType = "text/csv"
};
```

## The three action behaviors

### 1. ServerSide

Runs `ExecuteAsync` on the server and shows a success/error notification.

```csharp
public class MarkAsReviewedAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.mark-reviewed",
        DisplayName = "Mark as Reviewed",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.ServerSide,
        Icon = "icon-check",
        SortOrder = 100
    };

    public async Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken ct)
    {
        // Your business logic here using context.InvoiceId
        return ActionResult.Ok("Invoice marked as reviewed.");
    }
}
```

### 2. Download

Runs `ExecuteAsync` on the server and triggers a browser file download from the returned bytes.

```csharp
public class InvoiceCsvDownloadAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.invoice-csv",
        DisplayName = "CSV Download",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.Download,
        Icon = "icon-download-alt",
        SortOrder = 200
    };

    public Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken ct)
    {
        var csv = "Column1,Column2\nValue1,Value2";
        return Task.FromResult(new ActionResult
        {
            Success = true,
            FileBytes = Encoding.UTF8.GetBytes(csv),
            FileName = "export.csv",
            ContentType = "text/csv"
        });
    }
}
```

### 3. Sidebar

Opens an Umbraco sidebar modal containing your custom web component. The C# class just provides metadata — the UI logic lives in your TypeScript panel element.

`SidebarJsModule` tells Merchello which JS module to dynamically import before opening the sidebar. For Razor Class Libraries, ASP.NET serves static assets at `/_content/{AssemblyName}/`, so use that prefix:

```csharp
public class InvoiceDialogOpenAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.invoice-detail-panel",
        DisplayName = "View Details",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-chat",
        SortOrder = 100,
        SidebarJsModule = "/_content/MyPackage/my-bundle.js",
        SidebarElementTag = "my-invoice-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken ct)
    {
        return Task.FromResult(ActionResult.Ok());
    }
}
```

> **Important:** Use `/_content/{AssemblyName}/...` paths for `SidebarJsModule`, not `/App_Plugins/...`. The `/App_Plugins/` path works for Umbraco's internal bundle loading, but JavaScript's `import()` needs the real URL that ASP.NET serves for RCL static files.

## Building sidebar panels

Sidebar panels are custom elements (web components) built with Lit, using the Umbraco backoffice's re-exported Lit module. They are bundled with Vite and served as an Umbraco backoffice package.

### How the sidebar loads your panel

1. User clicks the action in the dropdown
2. If `SidebarJsModule` is set, Merchello dynamically imports the JS module (for the bundle approach this is skipped — elements are already loaded)
3. An Umbraco sidebar modal opens
4. The modal creates your custom element by its tag name (`SidebarElementTag`)
5. Entity IDs and a `closeModal` callback are set as properties on the element
6. Your element renders inside the sidebar

### Properties your panel receives

| Property | Type | Description |
|---|---|---|
| `invoiceId` | `string` | Invoice ID (invoice and order actions) |
| `orderId` | `string` | Fulfillment order ID (order actions only) |
| `productRootId` | `string` | Product root ID (product actions) |
| `productId` | `string` | Product variant ID (product variant actions) |
| `actionKey` | `string` | The action's unique key |
| `closeModal` | `() => void` | Call this to close the sidebar |

### Example panel (invoice)

```typescript
import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

@customElement("my-invoice-panel")
export class MyInvoicePanelElement extends UmbElementMixin(LitElement) {
  // Properties set by the sidebar modal
  @property({ type: String }) invoiceId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _data: any = null;
  @state() private _loading = true;
  @state() private _error: string | null = null;

  // Auth token function and base URL from Umbraco's auth context
  #tokenFn?: () => Promise<string | undefined>;
  #baseUrl = "";

  constructor() {
    super();
    // Consume Umbraco's auth context to get the Bearer token for API calls
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      if (!authContext) return;
      const config = authContext.getOpenApiConfiguration();
      this.#tokenFn = config.token;
      this.#baseUrl = config.base ?? "";
      this._fetchData();
    });
  }

  private async _fetchData(): Promise<void> {
    try {
      // Build headers with Bearer token
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.#tokenFn) {
        const token = await this.#tokenFn();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${this.#baseUrl}/umbraco/api/v1/orders/${this.invoiceId}`, {
        credentials: "same-origin",
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      this._data = await res.json();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;
    if (this._error) return html`<p>${this._error}</p>`;

    return html`
      <uui-box headline="Invoice ${this._data.invoiceNumber}">
        <p>Total: ${this._data.total}</p>
        <uui-button look="primary" label="Close"
          @click=${() => this.closeModal?.()}>Close</uui-button>
      </uui-box>
    `;
  }
}
```

### Key rules for panels

- **Extend `UmbElementMixin(LitElement)`**, not plain `LitElement`. The mixin provides `consumeContext()` which is required to access Umbraco's auth context and other backoffice services.
- **Use `UMB_AUTH_CONTEXT`** to get the Bearer token for authenticated API calls. Consume it in the constructor with `this.consumeContext()`, then include the token in fetch headers. Without this, API calls will return 401 Unauthorized.
- **Import from `@umbraco-cms/backoffice/external/lit`**, not from `"lit"` directly. Bare module specifiers don't work in the Umbraco backoffice without a bundler.
- **Use `Intl.NumberFormat`** for currency formatting, not `.toFixed()`. This respects the user's locale and the store's currency code.
- **Use `credentials: "same-origin"`** on `fetch()` calls to include auth cookies.
- **Handle loading, error, and empty states** in your `render()` method.
- **Call `this.closeModal?.()`** to close the sidebar from your panel.

### Currency formatting pattern

```typescript
private _formatCurrency(amount: number | null | undefined, currencyCode: string): string {
  if (amount == null) return "N/A";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
```

## Frontend build setup

The `Client/` folder mirrors the main Merchello backoffice build pipeline:

- **`package.json`** — Dependencies: `@umbraco-cms/backoffice`, `typescript`, `vite`
- **`tsconfig.json`** — Strict TypeScript with decorator support and bundler module resolution
- **`vite.config.ts`** — Builds a single ES module, externalizes `@umbraco` imports (provided by the backoffice at runtime)
- **`public/umbraco-package.json`** — Registers the bundle with Umbraco's extension system

The Vite build externalizes all `@umbraco/*` imports because the Umbraco backoffice provides them at runtime. Your bundle only contains your own code.

### Build commands

```bash
cd src/Merchello.ActionExamples/Client

# Production build
npm run build

# Watch mode (rebuild on file changes)
npm run watch
```

### Adding to your own project

To create your own action package, follow this structure:

1. Create a Razor Class Library (`Microsoft.NET.Sdk.Razor`) with a `Client/` folder
2. Copy the `package.json`, `tsconfig.json`, and `vite.config.ts` from this project
3. Create your panel elements in `Client/src/`
4. Create a `Client/public/umbraco-package.json` manifest pointing to your bundle
5. Add your `IMerchelloAction` C# classes
6. Reference `Merchello.Core` from your csproj
7. Run `npm install && npm run build` in the `Client/` folder
8. Reference your project from your Umbraco site

## Available API endpoints

The example panels fetch data from these Merchello API endpoints:

| Endpoint | Returns | Used by |
|---|---|---|
| `GET /umbraco/api/v1/orders/{invoiceId}` | Invoice with orders, line items, totals | Invoice panel, Order panel |
| `GET /umbraco/api/v1/products/{productRootId}` | Product with options, variants | Product root panel, Product panel |

These are authenticated endpoints — the `credentials: "same-origin"` option on `fetch()` ensures the backoffice auth cookie is sent.

## What each example demonstrates

| Action | Category | Behavior | What it shows |
|---|---|---|---|
| `InvoiceDialogOpenAction` | Invoice | Sidebar | Fetching invoice data, displaying line items and totals |
| `InvoiceCsvDownloadAction` | Invoice | Download | Returning file bytes for browser download |
| `OrderDialogOpenAction` | Order | Sidebar | Finding a specific fulfillment order within invoice data |
| `OrderCsvDownloadAction` | Order | Download | Download action on order pages |
| `ProductRootDialogOpenAction` | ProductRoot | Sidebar | Displaying product options and variant summary table |
| `ProductRootCsvDownloadAction` | ProductRoot | Download | Download action on product pages |
| `ProductDialogOpenAction` | Product | Sidebar | Finding a specific variant and showing its details |
| `ProductCsvDownloadAction` | Product | Download | Download action on variant pages |
