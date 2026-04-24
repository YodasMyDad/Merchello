# Creating Custom Fulfilment Providers

Fulfilment providers connect Merchello to third-party logistics (3PL) services like ShipBob, ShipMonk, or your own warehouse management system. They handle the physical side of getting products to customers: submitting orders, tracking shipments, syncing inventory, and receiving status updates.

## Fulfilment vs Shipping

Before you start, understand the distinction:

- **Shipping providers** determine customer-facing rates and delivery options during checkout
- **Fulfilment providers** handle what happens after an order is placed: sending it to a warehouse, tracking its progress, and syncing inventory

These are intentionally separate concerns. Don't mix carrier quoting logic into fulfilment providers.

## Quick Overview

To create a fulfilment provider, you need to:

1. Create a class that extends `FulfilmentProviderBase`
2. Implement `Metadata` and at least `SubmitOrderAsync()`
3. Optionally implement webhooks, polling, product sync, and inventory sync

## Minimal Example

```csharp
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Shared.Providers;

public class AcmeFulfilmentProvider : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "acme-wms",                    // Unique, immutable identifier
        DisplayName = "Acme WMS",
        Description = "Fulfilment via Acme Warehouse Management System",
        Icon = "icon-box",
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = true,
        SupportsWebhooks = false,
        SupportsPolling = true,
        SupportsProductSync = false,
        SupportsInventorySync = true,
        CreatesShipmentOnSubmission = true,   // Auto-create shipment after submission
        ApiStyle = FulfilmentApiStyle.Rest
    };

    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        // Submit the order to your 3PL
        var result = await CallWmsApi(request, cancellationToken);

        return FulfilmentOrderResult.Succeeded(
            providerReference: result.OrderId,
            message: "Order submitted to Acme WMS"
        );
    }
}
```

## Step-by-Step Breakdown

### Step 1: Define Metadata

The metadata tells Merchello what your provider can do:

```csharp
public override FulfilmentProviderMetadata Metadata => new()
{
    Key = "my-3pl",                        // Required. Unique, immutable.
    DisplayName = "My 3PL",               // Required. Shown in backoffice.
    Description = "...",                   // Optional.
    Icon = "icon-box",                     // Optional. Umbraco icon class.
    IconSvg = "<svg>...</svg>",            // Optional. Takes precedence over Icon.
    SetupInstructions = "## Setup\n...",   // Optional. Markdown.

    // Capability flags -- only set true for features you actually implement
    SupportsOrderSubmission = true,        // Can submit orders to the 3PL
    SupportsOrderCancellation = true,      // Can cancel submitted orders
    SupportsWebhooks = true,               // Can receive webhook status updates
    SupportsPolling = false,               // Can poll for status updates
    SupportsProductSync = true,            // Can sync product catalog to 3PL
    SupportsInventorySync = true,          // Can read inventory levels from 3PL

    // When true, Merchello auto-creates a "Preparing" shipment after successful submission.
    // Set false if your provider sends shipment data via webhooks (like ShipBob).
    CreatesShipmentOnSubmission = false,

    ApiStyle = FulfilmentApiStyle.Rest     // Rest, GraphQL, or Sftp
};
```

### Step 2: Configuration Fields

```csharp
public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
    [
        new ProviderConfigurationField
        {
            Key = "apiKey",
            Label = "API Key",
            FieldType = ConfigurationFieldType.Password,
            IsRequired = true,
            IsSensitive = true
        },
        new ProviderConfigurationField
        {
            Key = "warehouseId",
            Label = "Warehouse ID",
            FieldType = ConfigurationFieldType.Text,
            IsRequired = true,
            Description = "Your 3PL warehouse/facility identifier"
        },
        new ProviderConfigurationField
        {
            Key = "environment",
            Label = "Environment",
            FieldType = ConfigurationFieldType.Select,
            DefaultValue = "sandbox",
            Options =
            [
                new SelectOption { Value = "sandbox", Label = "Sandbox" },
                new SelectOption { Value = "production", Label = "Production" }
            ]
        }
    ]);
}
```

### Step 3: Test Connection

Let admins verify their credentials work:

```csharp
public override async Task<FulfilmentConnectionTestResult> TestConnectionAsync(
    CancellationToken cancellationToken = default)
{
    try
    {
        var apiKey = Configuration?.GetValue("apiKey");
        if (string.IsNullOrEmpty(apiKey))
            return FulfilmentConnectionTestResult.Failed("API key is required");

        // Make a lightweight API call to verify credentials
        var response = await _httpClient.GetAsync("/api/ping", cancellationToken);
        if (!response.IsSuccessStatusCode)
            return FulfilmentConnectionTestResult.Failed($"API returned {response.StatusCode}");

        return FulfilmentConnectionTestResult.Succeeded("Connected successfully");
    }
    catch (Exception ex)
    {
        return FulfilmentConnectionTestResult.Failed(ex.Message);
    }
}
```

### Step 4: Submit Orders

This is the core method. It sends an order to your 3PL:

```csharp
public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
    FulfilmentOrderRequest request,
    CancellationToken cancellationToken = default)
{
    // Available data:
    //   request.OrderId           - Merchello order ID
    //   request.OrderNumber       - Human-readable order number
    //   request.LineItems         - Products with SKU, name, quantity
    //   request.ShippingAddress   - Delivery address
    //   request.ShippingMethod    - Selected shipping method details
    //   request.CustomerEmail     - Customer email
    //   request.ExtendedData      - Any additional context

    try
    {
        var apiOrder = MapToApiOrder(request);
        var response = await _httpClient.PostAsJsonAsync("/api/orders", apiOrder, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            return FulfilmentOrderResult.Failed($"3PL rejected order: {error}");
        }

        var result = await response.Content.ReadFromJsonAsync<ApiOrderResponse>(cancellationToken);

        return FulfilmentOrderResult.Succeeded(
            providerReference: result!.ExternalOrderId,
            message: "Order submitted successfully"
        );
    }
    catch (Exception ex)
    {
        return FulfilmentOrderResult.Failed($"Failed to submit order: {ex.Message}");
    }
}
```

### Step 5: Cancel Orders

```csharp
public override async Task<FulfilmentCancelResult> CancelOrderAsync(
    string providerReference,
    CancellationToken cancellationToken = default)
{
    var response = await _httpClient.DeleteAsync(
        $"/api/orders/{providerReference}", cancellationToken);

    if (!response.IsSuccessStatusCode)
        return FulfilmentCancelResult.Failed("3PL could not cancel the order");

    return FulfilmentCancelResult.Succeeded();
}
```

### Step 6: Webhooks

If your 3PL sends status updates via webhooks:

```csharp
public override async Task<bool> ValidateWebhookAsync(
    HttpRequest request,
    CancellationToken cancellationToken = default)
{
    // Verify the webhook signature
    var signature = request.Headers["X-Webhook-Signature"].FirstOrDefault();
    var secret = Configuration?.GetValue("webhookSecret");

    // Read and verify the payload
    request.Body.Position = 0;
    var body = await new StreamReader(request.Body).ReadToEndAsync(cancellationToken);
    return VerifyHmac(body, signature, secret);
}

public override async Task<FulfilmentWebhookResult> ProcessWebhookAsync(
    HttpRequest request,
    CancellationToken cancellationToken = default)
{
    request.Body.Position = 0;
    var payload = await request.Body.ReadFromJsonAsync<WebhookPayload>(cancellationToken);

    return new FulfilmentWebhookResult
    {
        Success = true,
        ProviderReference = payload.OrderId,
        Status = MapStatus(payload.EventType),
        TrackingNumber = payload.TrackingNumber,
        TrackingUrl = payload.TrackingUrl,
        CarrierName = payload.Carrier
    };
}
```

### Step 7: Status Polling

If your 3PL doesn't support webhooks, you can poll for updates:

```csharp
public override async Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(
    IEnumerable<string> providerReferences,
    CancellationToken cancellationToken = default)
{
    var updates = new List<FulfilmentStatusUpdate>();

    foreach (var reference in providerReferences)
    {
        var response = await _httpClient.GetAsync($"/api/orders/{reference}", cancellationToken);
        if (!response.IsSuccessStatusCode) continue;

        var order = await response.Content.ReadFromJsonAsync<ApiOrder>(cancellationToken);
        updates.Add(new FulfilmentStatusUpdate
        {
            ProviderReference = reference,
            Status = MapStatus(order.Status),
            TrackingNumber = order.TrackingNumber,
            UpdatedAt = order.UpdatedAt
        });
    }

    return updates;
}
```

### Step 8: Product Sync

Sync your product catalog to the 3PL:

```csharp
public override async Task<FulfilmentSyncResult> SyncProductsAsync(
    IEnumerable<FulfilmentProduct> products,
    CancellationToken cancellationToken = default)
{
    var syncedCount = 0;
    var errors = new List<string>();

    foreach (var product in products)
    {
        try
        {
            await _httpClient.PutAsJsonAsync(
                $"/api/products/{product.Sku}", product, cancellationToken);
            syncedCount++;
        }
        catch (Exception ex)
        {
            errors.Add($"Failed to sync {product.Sku}: {ex.Message}");
        }
    }

    return new FulfilmentSyncResult
    {
        Success = errors.Count == 0,
        SyncedCount = syncedCount,
        Errors = errors
    };
}
```

### Step 9: Inventory Sync

Read stock levels from the 3PL:

```csharp
public override async Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
    CancellationToken cancellationToken = default)
{
    var response = await _httpClient.GetAsync("/api/inventory", cancellationToken);
    var inventory = await response.Content.ReadFromJsonAsync<List<ApiInventoryItem>>(cancellationToken);

    return inventory!.Select(item => new FulfilmentInventoryLevel
    {
        Sku = item.Sku,
        AvailableQuantity = item.Available,
        ReservedQuantity = item.Reserved,
        WarehouseId = item.LocationId
    }).ToList();
}
```

## Submission Trigger Policies

How orders get submitted to fulfilment providers is controlled by trigger policies. The values are defined on the Supplier Direct-style enum ([SupplierDirectSubmissionTrigger.cs](../../../src/Merchello.Core/Fulfilment/Providers/SupplierDirect/SupplierDirectSubmissionTrigger.cs)):

| Policy | Behavior |
|---|---|
| `OnPaid` | Auto-submitted from the payment-created flow when the invoice is fully paid |
| `ExplicitRelease` | Staff must manually release via `POST /orders/{orderId}/fulfillment/release` (paid-gated) |

> **Note:** `ExplicitRelease` is a Supplier Direct-style policy. Dynamic / non-Supplier-Direct providers (for example ShipBob) are unaffected and follow their own submission lifecycle -- typically driven by `OnPaid` or by the provider's own webhook-triggered flow. Do not repurpose `ExplicitRelease` for arbitrary providers.

## Dependency Injection

> **Warning:** Use **constructor injection only**. `ExtensionManager` activates fulfilment providers via `ActivatorUtilities.CreateInstance`; setter injection and post-construction configuration hooks are not supported. See [Extension Manager](extension-manager.md).

## Built-in Providers for Reference

| Provider | Location | Notes |
|---|---|---|
| ShipBob | [ShipBobFulfilmentProvider.cs](../../../src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobFulfilmentProvider.cs) | Full REST API integration with webhooks |
| Supplier Direct | [SupplierDirectFulfilmentProvider.cs](../../../src/Merchello.Core/Fulfilment/Providers/SupplierDirect/SupplierDirectFulfilmentProvider.cs) | CSV/FTP-based submission; supports `OnPaid` and `ExplicitRelease` triggers |

Base class: [FulfilmentProviderBase.cs](../../../src/Merchello.Core/Fulfilment/Providers/FulfilmentProviderBase.cs). Metadata: [FulfilmentProviderMetadata.cs](../../../src/Merchello.Core/Fulfilment/Providers/FulfilmentProviderMetadata.cs). Interface: [IFulfilmentProvider.cs](../../../src/Merchello.Core/Fulfilment/Providers/Interfaces/IFulfilmentProvider.cs).
