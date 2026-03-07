# Merchello Actions

Last reviewed against code: 2026-03-05

Custom actions allow third-party NuGet packages to add buttons to Merchello backoffice pages. Actions appear in an "Actions" dropdown on invoice detail, fulfillment order cards, and product pages. When no actions are registered for a page, the dropdown is hidden.

## Overview

Actions are discovered at runtime via `ExtensionManager` from the assemblies registered into Merchello's startup scan in `AddMerchello(...)`. You implement `IMerchelloAction` in a class library or Razor Class Library (RCL), ensure the host calls `builder.AddMerchello()`, and reference or pass the action assembly so it is included in that scan.

Each action declares:
- **Where** it appears (category)
- **How** it executes (behavior)
- **What** it shows (display name, icon, sort order)

## Categories

Actions are scoped to a page via `ActionCategory`:

| Category | Page | Entity IDs Available |
|---|---|---|
| `Invoice` | Invoice detail header | `InvoiceId` |
| `Order` | Per fulfillment order card (next to Fulfill button) | `InvoiceId`, `OrderId` |
| `ProductRoot` | Product detail header | `ProductRootId` |
| `Product` | Variant detail header | `ProductRootId`, `ProductId` |

## Behaviors

`ActionBehavior` controls what happens when a user clicks the action:

| Behavior | What happens |
|---|---|
| `ServerSide` | Calls `ExecuteAsync` on the server, shows a success/error notification |
| `Download` | Calls `ExecuteAsync` on the server, downloads the returned file |
| `Sidebar` | Opens a sidebar modal containing your custom Lit web component |

## Interface

All actions implement `IMerchelloAction`:

```csharp
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

public interface IMerchelloAction
{
    ActionMetadata Metadata { get; }
    Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken cancellationToken = default);
}
```

### ActionMetadata

| Property | Type | Required | Description |
|---|---|---|---|
| `Key` | `string` | Yes | Unique identifier (e.g., `"my-company.export-csv"`) |
| `DisplayName` | `string` | Yes | Label shown in the dropdown |
| `Category` | `ActionCategory` | Yes | Which page the action appears on |
| `Behavior` | `ActionBehavior` | Yes | How the action executes |
| `Icon` | `string?` | No | Umbraco icon class (e.g., `"icon-document"`) |
| `Description` | `string?` | No | Tooltip text |
| `SortOrder` | `int` | No | Order in dropdown (default `1000`, lower = higher) |
| `SidebarJsModule` | `string?` | No | JS module path for Sidebar behavior |
| `SidebarElementTag` | `string?` | No | Custom element tag for Sidebar behavior |
| `SidebarSize` | `string` | No | Modal size: `"small"`, `"medium"` (default), `"large"` |

### ActionContext

Passed to `ExecuteAsync` with the relevant entity IDs:

| Property | Type | Description |
|---|---|---|
| `Category` | `ActionCategory` | The category this execution is for |
| `InvoiceId` | `Guid?` | Invoice ID (Invoice and Order categories) |
| `OrderId` | `Guid?` | Fulfillment order ID (Order category) |
| `ProductRootId` | `Guid?` | Product root ID (ProductRoot and Product categories) |
| `ProductId` | `Guid?` | Variant product ID (Product category) |
| `Data` | `Dictionary<string, object>?` | Optional free-form data from the frontend |

### ActionResult

Returned from `ExecuteAsync`:

```csharp
// Success
return ActionResult.Ok("Export completed successfully.");

// Failure
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

### Example 1: Server-Side Action (Mark as Reviewed)

A simple action that marks an invoice as reviewed by writing to extended data.

```csharp
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;
using Merchello.Core.Orders.Services.Interfaces;

public class MarkInvoiceReviewedAction(IInvoiceService invoiceService) : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.mark-reviewed",
        DisplayName = "Mark as Reviewed",
        Category = ActionCategory.Invoice,
        Behavior = ActionBehavior.ServerSide,
        Icon = "icon-check",
        Description = "Marks this invoice as reviewed by the current user.",
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

### Example 2: Download Action (Export Invoice as CSV)

An action that generates a CSV file and triggers a browser download.

```csharp
using System.Text;
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;
using Merchello.Core.Orders.Services.Interfaces;

public class ExportInvoiceCsvAction(IInvoiceService invoiceService) : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.export-invoice-csv",
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

        var sb = new StringBuilder();
        sb.AppendLine("SKU,Name,Quantity,UnitPrice,Total");

        foreach (var line in invoice.LineItems)
        {
            sb.AppendLine($"{line.Sku},{line.Name},{line.Quantity},{line.UnitPrice},{line.Total}");
        }

        return new ActionResult
        {
            Success = true,
            FileBytes = Encoding.UTF8.GetBytes(sb.ToString()),
            FileName = $"invoice-{invoice.InvoiceNumber}.csv",
            ContentType = "text/csv"
        };
    }
}
```

### Example 3: Sidebar Action (Custom Panel from an RCL)

A sidebar action opens a modal containing your own web component. This requires a Razor Class Library (RCL) that includes both the C# action class and a JavaScript module with a Lit custom element.

#### C# Action Class

```csharp
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

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
        // Sidebar actions don't need server logic — the UI handles everything.
        return Task.FromResult(ActionResult.Ok());
    }
}
```

#### JavaScript Custom Element

Place this in your RCL at `wwwroot/customer-notes-panel.js` (or use a bundler that outputs there). The element receives entity IDs and a `closeModal` callback as properties.

```javascript
import { LitElement, html, css } from "lit";

class MyCustomerNotesPanel extends LitElement {
  static properties = {
    invoiceId: { type: String },
    actionKey: { type: String },
    closeModal: { attribute: false },
    _notes: { state: true },
  };

  constructor() {
    super();
    this.invoiceId = "";
    this.actionKey = "";
    this.closeModal = null;
    this._notes = "";
  }

  async connectedCallback() {
    super.connectedCallback();
    // Fetch existing notes from your own API
    const res = await fetch(`/api/my-notes/${this.invoiceId}`);
    if (res.ok) {
      const data = await res.json();
      this._notes = data.notes ?? "";
    }
  }

  async _handleSave() {
    await fetch(`/api/my-notes/${this.invoiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: this._notes }),
    });
    this.closeModal?.();
  }

  render() {
    return html`
      <uui-box headline="Customer Notes">
        <uui-textarea
          label="Notes"
          .value=${this._notes}
          @change=${(e) => (this._notes = e.target.value)}
        ></uui-textarea>
        <uui-button look="primary" label="Save" @click=${this._handleSave}>
          Save
        </uui-button>
      </uui-box>
    `;
  }

  static styles = css`
    uui-textarea { width: 100%; min-height: 200px; }
    uui-button { margin-top: var(--uui-size-space-4); }
  `;
}

customElements.define("my-customer-notes-panel", MyCustomerNotesPanel);
```

#### Properties Set on the Custom Element

The sidebar modal automatically sets these properties on your element:

| Property | Type | Description |
|---|---|---|
| `invoiceId` | `string` | Set when category is Invoice or Order |
| `orderId` | `string` | Set when category is Order |
| `productRootId` | `string` | Set when category is ProductRoot or Product |
| `productId` | `string` | Set when category is Product |
| `actionKey` | `string` | Always set — the action's unique key |
| `closeModal` | `() => void` | Call this to close the sidebar modal |

### Example 4: Order-Level Action (Print Packing Slip)

Actions on the `Order` category appear on each fulfillment order card.

```csharp
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

public class PrintPackingSlipAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "my-company.print-packing-slip",
        DisplayName = "Print Packing Slip",
        Category = ActionCategory.Order,
        Behavior = ActionBehavior.Download,
        Icon = "icon-print",
        SortOrder = 100
    };

    public async Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        if (context.OrderId is not { } orderId)
            return ActionResult.Fail("No order ID provided.");

        // Generate packing slip PDF for this fulfillment order
        byte[] pdf = await GeneratePackingSlipAsync(orderId, cancellationToken);

        return new ActionResult
        {
            Success = true,
            FileBytes = pdf,
            FileName = $"packing-slip-{orderId}.pdf",
            ContentType = "application/pdf"
        };
    }

    private Task<byte[]> GeneratePackingSlipAsync(Guid orderId, CancellationToken ct)
    {
        // Your PDF generation logic here
        throw new NotImplementedException();
    }
}
```

## Project Setup

### Class Library (ServerSide / Download actions)

1. Create a .NET class library targeting the same framework as your Umbraco site
2. Add a package reference to `Umbraco.Community.Merchello.Core`
3. Implement `IMerchelloAction`
4. Ensure the host app calls `builder.AddMerchello()` during startup
5. Reference the class library from your Umbraco web project, or pass its assembly to `AddMerchello(pluginAssemblies)` for deterministic discovery

### Razor Class Library (Sidebar actions)

1. Create a Razor Class Library (RCL) project
2. Add a package reference to `Umbraco.Community.Merchello.Core`
3. Implement `IMerchelloAction` with `Behavior = ActionBehavior.Sidebar`
4. Place your JavaScript custom element in `wwwroot/`
5. Set `SidebarJsModule` to `"/_content/YourAssemblyName/your-element.js"`
6. Set `SidebarElementTag` to your custom element tag name
7. Ensure the host app calls `builder.AddMerchello()` during startup
8. Reference the RCL from your Umbraco web project, or pass its assembly to `AddMerchello(pluginAssemblies)` for deterministic discovery

ASP.NET automatically serves RCL static files from `/_content/{AssemblyName}/`.

## Dependency Injection

Action classes support constructor injection. Any service registered in the DI container can be injected:

```csharp
public class MyAction(IInvoiceService invoiceService, ILogger<MyAction> logger) : IMerchelloAction
{
    // invoiceService and logger are injected automatically
}
```

Actions are resolved via `ExtensionManager` using `ActivatorUtilities.CreateInstance`, so standard DI rules apply.

## API Endpoints

These are used internally by the frontend dropdown. Third-party actions don't need to call these directly, but they're documented for reference:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/umbraco/api/v1/actions?category={category}` | List actions for a category |
| `POST` | `/umbraco/api/v1/actions/execute` | Execute a ServerSide action |
| `POST` | `/umbraco/api/v1/actions/download` | Execute a Download action and return the file |

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Actions/Interfaces/IMerchelloAction.cs` | Core interface to implement |
| `Merchello.Core/Actions/Models/ActionMetadata.cs` | Action metadata record |
| `Merchello.Core/Actions/Models/ActionContext.cs` | Execution context with entity IDs |
| `Merchello.Core/Actions/Models/ActionResult.cs` | Execution result with static helpers |
| `Merchello.Core/Actions/Models/ActionCategory.cs` | Category enum |
| `Merchello.Core/Actions/Models/ActionBehavior.cs` | Behavior enum |
| `Merchello.Core/Actions/ActionResolver.cs` | Discovery and caching (singleton) |
| `Merchello/Controllers/ActionsApiController.cs` | API endpoints |
| `Client/src/shared/components/actions-dropdown.element.ts` | Frontend dropdown component |
| `Client/src/shared/modals/action-sidebar-modal.element.ts` | Generic sidebar modal wrapper |
