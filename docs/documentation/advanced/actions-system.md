# Actions System

The Merchello actions system lets you add custom buttons to backoffice pages. Actions appear in an "Actions" dropdown on invoice detail, order cards, product pages, customer modals, and more. When no actions are registered for a page, the dropdown is hidden automatically.

This is one of the primary extension points for third-party NuGet packages that want to add functionality to the Merchello backoffice.

> **Tip:** The `src/Merchello.ActionExamples/` project in the repo is a complete working example with 14 action classes (CSV downloads + sidebar panels for every category) and a full TypeScript/Vite build pipeline. It's the best place to start if you learn by example.

## How It Works

1. You create a class that implements `IMerchelloAction`
2. Merchello discovers it automatically at startup via `ExtensionManager`
3. Your action appears in the appropriate dropdown based on its category
4. When the user clicks it, Merchello executes it based on its behavior type

That is the entire setup. No configuration files, no manifest registrations -- just implement the interface and ensure your assembly is referenced.

## Categories

Each action targets a specific backoffice page via `ActionCategory`:

| Category | Where it appears | Available entity IDs |
|---|---|---|
| `Invoice` | Invoice detail page header | `InvoiceId` |
| `Order` | Per-fulfilment order card (next to the Fulfill button) | `InvoiceId`, `OrderId` |
| `ProductRoot` | Product detail page header | `ProductRootId` |
| `Product` | Variant detail page header | `ProductRootId`, `ProductId` |
| `Customer` | Customer edit modal | `CustomerId` |
| `Warehouse` | Warehouse detail page header | `WarehouseId` |
| `Supplier` | Supplier edit modal | `SupplierId` |

## Behaviors

`ActionBehavior` controls what happens when the user clicks your action:

| Behavior | What happens |
|---|---|
| `ServerSide` | Calls your `ExecuteAsync` method on the server and shows a success/error notification in the backoffice. |
| `Download` | Calls your `ExecuteAsync` method, then triggers a browser file download with the bytes you return. |
| `Sidebar` | Opens a sidebar modal containing your custom Lit/JS web component. No server execution needed. |

## The IMerchelloAction Interface

Every action implements this interface:

```csharp
public interface IMerchelloAction
{
    ActionMetadata Metadata { get; }
    Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken cancellationToken = default);
}
```

### ActionMetadata

Describes your action's appearance and behavior:

| Property | Type | Required | Description |
|---|---|---|---|
| `Key` | `string` | Yes | Unique identifier, e.g., `"my-company.export-csv"` |
| `DisplayName` | `string` | Yes | Label shown in the dropdown |
| `Category` | `ActionCategory` | Yes | Which page the action appears on |
| `Behavior` | `ActionBehavior` | Yes | How the action executes |
| `Icon` | `string?` | No | Umbraco icon class, e.g., `"icon-document"` |
| `Description` | `string?` | No | Tooltip text |
| `SortOrder` | `int` | No | Order in dropdown (default `1000`; lower = higher) |
| `SidebarJsModule` | `string?` | No | JS module path for Sidebar behavior |
| `SidebarElementTag` | `string?` | No | Custom element tag for Sidebar behavior |
| `SidebarSize` | `string` | No | Modal size: `"small"`, `"medium"` (default), `"large"` |

### ActionContext

Passed to `ExecuteAsync` with the relevant entity IDs and optional free-form data:

```csharp
public record ActionContext
{
    public ActionCategory Category { get; init; }
    public Guid? InvoiceId { get; init; }
    public Guid? OrderId { get; init; }
    public Guid? ProductRootId { get; init; }
    public Guid? ProductId { get; init; }
    public Guid? CustomerId { get; init; }
    public Guid? WarehouseId { get; init; }
    public Guid? SupplierId { get; init; }
    public Dictionary<string, object>? Data { get; init; }
}
```

### ActionResult

Return from `ExecuteAsync` to indicate success, failure, or a file download:

```csharp
// Success with message
return ActionResult.Ok("Invoice marked as reviewed.");

// Failure with message
return ActionResult.Fail("Invoice not found.");

// File download
return new ActionResult
{
    Success = true,
    FileBytes = pdfBytes,
    FileName = "invoice-1001.pdf",
    ContentType = "application/pdf"
};
```

## Examples

### Server-Side Action

A simple action that marks an invoice as reviewed:

```csharp
public class MarkInvoiceReviewedAction(IInvoiceService invoiceService) : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.mark-reviewed",
        DisplayName = "Mark as Reviewed",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.ServerSide,
        Icon = "icon-check",
        Description = "Marks this invoice as reviewed.",
        SortOrder = 100
    };

    public async Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        if (context.InvoiceId is not { } invoiceId)
            return ActionResult.Fail("No invoice ID provided.");

        var invoice = await invoiceService.GetAsync(invoiceId, cancellationToken);
        if (invoice == null)
            return ActionResult.Fail("Invoice not found.");

        invoice.ExtendedData["ReviewedAt"] = DateTime.UtcNow.ToString("O");
        await invoiceService.SaveAsync(invoice, cancellationToken);

        return ActionResult.Ok("Invoice marked as reviewed.");
    }
}
```

### Download Action

An action that exports an invoice as CSV:

```csharp
public class ExportInvoiceCsvAction(IInvoiceService invoiceService) : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.export-csv",
        DisplayName = "Export CSV",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.Download,
        Icon = "icon-download-alt",
        SortOrder = 200
    };

    public async Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        if (context.InvoiceId is not { } invoiceId)
            return ActionResult.Fail("No invoice ID provided.");

        var invoice = await invoiceService.GetDetailAsync(invoiceId, cancellationToken);
        if (invoice == null)
            return ActionResult.Fail("Invoice not found.");

        var csv = new StringBuilder();
        csv.AppendLine("SKU,Name,Quantity,UnitPrice,Total");
        foreach (var line in invoice.LineItems)
            csv.AppendLine($"{line.Sku},{line.Name},{line.Quantity},{line.UnitPrice},{line.Total}");

        return new ActionResult
        {
            Success = true,
            FileBytes = Encoding.UTF8.GetBytes(csv.ToString()),
            FileName = $"invoice-{invoice.InvoiceNumber}.csv",
            ContentType = "text/csv"
        };
    }
}
```

### Sidebar Action

A sidebar action opens a modal with your own web component. This requires both a C# class and a JavaScript custom element.

**C# side:**

```csharp
public class CustomerNotesAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.customer-notes",
        DisplayName = "Customer Notes",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-message",
        SidebarJsModule = "/_content/MyCompany.Merchello.Notes/customer-notes-panel.js",
        SidebarElementTag = "my-customer-notes-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        // Sidebar actions handle logic in the UI -- just return Ok
        return Task.FromResult(ActionResult.Ok());
    }
}
```

**TypeScript side** (in your Razor Class Library's `Client/src/` folder, bundled with Vite):

> **Important:** Sidebar panels must extend `UmbElementMixin(LitElement)` (not plain `LitElement`) to access Umbraco's auth context for authenticated API calls. Import from `@umbraco-cms/backoffice/external/lit`, not from `"lit"` directly. See `src/Merchello.ActionExamples/` for the full build setup.

```typescript
import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

@customElement("my-customer-notes-panel")
export class MyCustomerNotesPanel extends UmbElementMixin(LitElement) {
    @property({ type: String }) invoiceId = "";
    @property({ type: String }) actionKey = "";
    @property({ attribute: false }) closeModal: (() => void) | null = null;

    @state() private _notes = "";
    @state() private _loading = true;

    // Auth token function from Umbraco's auth context
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
            this._loadNotes();
        });
    }

    private async _getHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.#tokenFn) {
            const token = await this.#tokenFn();
            if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    private async _loadNotes(): Promise<void> {
        const headers = await this._getHeaders();
        const res = await fetch(`${this.#baseUrl}/api/my-notes/${this.invoiceId}`, {
            credentials: "same-origin",
            headers,
        });
        if (res.ok) this._notes = await res.text();
        this._loading = false;
    }

    private async _handleSave(): Promise<void> {
        const headers = await this._getHeaders();
        await fetch(`${this.#baseUrl}/api/my-notes/${this.invoiceId}`, {
            method: "POST",
            credentials: "same-origin",
            headers,
            body: JSON.stringify({ notes: this._notes }),
        });
        this.closeModal?.();
    }

    render() {
        if (this._loading) return html`<uui-loader></uui-loader>`;

        return html`
            <uui-box headline="Customer Notes">
                <uui-textarea label="Notes" .value=${this._notes}
                    @change=${(e: Event) => (this._notes = (e.target as HTMLTextAreaElement).value)}>
                </uui-textarea>
                <uui-button look="primary" label="Save"
                    @click=${this._handleSave}>Save</uui-button>
            </uui-box>
        `;
    }
}
```

The sidebar modal automatically sets these properties on your element:

| Property | Type | Description |
|---|---|---|
| `invoiceId` | `string` | Set when category is Invoice or Order |
| `orderId` | `string` | Set when category is Order |
| `productRootId` | `string` | Set when category is ProductRoot or Product |
| `productId` | `string` | Set when category is Product |
| `customerId` | `string` | Set when category is Customer |
| `warehouseId` | `string` | Set when category is Warehouse |
| `supplierId` | `string` | Set when category is Supplier |
| `actionKey` | `string` | Always set -- the action's unique key |
| `closeModal` | `() => void` | Call this to close the sidebar modal |

## Dependency Injection

Action classes support constructor injection. Any service registered in the DI container can be injected:

```csharp
public class MyAction(IInvoiceService invoiceService, ILogger<MyAction> logger) : IMerchelloAction
{
    // invoiceService and logger are injected automatically
}
```

Actions are resolved via `ExtensionManager` using `ActivatorUtilities.CreateInstance`, so standard DI rules apply.

## Project Setup

### Class Library (ServerSide / Download)

1. Create a .NET class library targeting the same framework as your Umbraco site
2. Add a package reference to `Umbraco.Community.Merchello.Core`
3. Implement `IMerchelloAction`
4. Reference the class library from your Umbraco web project

### Razor Class Library (Sidebar)

1. Create a Razor Class Library (RCL) project
2. Add a package reference to `Umbraco.Community.Merchello.Core`
3. Implement `IMerchelloAction` with `Behavior = ActionBehavior.Sidebar`
4. Place your JS custom element in `wwwroot/`
5. Set `SidebarJsModule` to `"/_content/YourAssemblyName/your-element.js"`
6. Reference the RCL from your Umbraco web project

ASP.NET automatically serves RCL static files from `/_content/{AssemblyName}/`.

## API Endpoints

These are used internally by the frontend dropdown. You do not need to call them directly, but they are documented for reference:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/umbraco/api/v1/actions?category={category}` | List actions for a category |
| `POST` | `/umbraco/api/v1/actions/execute` | Execute a ServerSide action |
| `POST` | `/umbraco/api/v1/actions/download` | Execute a Download action and return the file |

## How Discovery Works

The `ActionResolver` uses `ExtensionManager` to scan loaded assemblies for `IMerchelloAction` implementations at startup. Actions are cached after first resolution. Duplicate keys are detected and logged as warnings -- only the first instance of each key is used.

## Working Example: `Merchello.ActionExamples`

The repo includes a complete example project at `src/Merchello.ActionExamples/` that demonstrates every action type. It's a Razor Class Library (RCL) that doubles as an Umbraco backoffice package -- reference it from your site and the actions appear automatically.

### What's included

| Action | Category | Behavior | What it demonstrates |
| --- | --- | --- | --- |
| `InvoiceDialogOpenAction` | Invoice | Sidebar | Fetching invoice data, displaying line items and totals |
| `InvoiceCsvDownloadAction` | Invoice | Download | Returning CSV file bytes for browser download |
| `OrderDialogOpenAction` | Order | Sidebar | Finding a specific fulfilment order within invoice data |
| `OrderCsvDownloadAction` | Order | Download | Download action scoped to an order |
| `ProductRootDialogOpenAction` | ProductRoot | Sidebar | Displaying product options and variant summary |
| `ProductRootCsvDownloadAction` | ProductRoot | Download | Download action on product pages |
| `ProductDialogOpenAction` | Product | Sidebar | Finding a specific variant and showing details |
| `ProductCsvDownloadAction` | Product | Download | Download action on variant pages |
| `CustomerDialogOpenAction` | Customer | Sidebar | Customer sidebar panel |
| `CustomerCsvDownloadAction` | Customer | Download | Customer CSV export |
| `SupplierDialogOpenAction` | Supplier | Sidebar | Supplier sidebar panel |
| `SupplierCsvDownloadAction` | Supplier | Download | Supplier CSV export |
| `WarehouseDialogOpenAction` | Warehouse | Sidebar | Warehouse sidebar panel |
| `WarehouseCsvDownloadAction` | Warehouse | Download | Warehouse CSV export |

### Building the example

```bash
# Install frontend dependencies and build
cd src/Merchello.ActionExamples/Client
npm install
npm run build

# Build the .NET project
cd ..
dotnet build
```

The frontend build outputs to `wwwroot/`. ASP.NET serves RCL static assets at `/_content/Merchello.ActionExamples/`, so the sidebar JS bundle URL is `/_content/Merchello.ActionExamples/merchello-action-examples.js`.

### Project structure

```text
Merchello.ActionExamples/
  Actions/                          # C# action classes (auto-discovered)
  Client/                           # Frontend source (TypeScript + Vite)
    src/
      index.ts                      # Bundle entry point
      panels/                       # Sidebar panel web components
    public/
      App_Plugins/.../umbraco-package.json  # Umbraco package manifest
    package.json / tsconfig.json / vite.config.ts
  wwwroot/                          # Build output
  Merchello.ActionExamples.csproj   # Razor Class Library
```

> **Tip:** Use this project as a template for your own action packages. Copy the structure, rename the assembly, and replace the action classes with your own.

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Actions/Interfaces/IMerchelloAction.cs` | The interface you implement |
| `Merchello.Core/Actions/Models/ActionMetadata.cs` | Action metadata record |
| `Merchello.Core/Actions/Models/ActionContext.cs` | Execution context with entity IDs |
| `Merchello.Core/Actions/Models/ActionResult.cs` | Execution result with static helpers |
| `Merchello.Core/Actions/Models/ActionCategory.cs` | Category enum |
| `Merchello.Core/Actions/Models/ActionBehavior.cs` | Behavior enum |
| `Merchello.Core/Actions/ActionResolver.cs` | Discovery and caching |
| `Merchello/Controllers/ActionsApiController.cs` | API endpoints |
