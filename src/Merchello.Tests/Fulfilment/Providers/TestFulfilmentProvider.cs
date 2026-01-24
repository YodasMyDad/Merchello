using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Test fulfilment provider for unit and integration testing.
/// Allows configuration of responses for each method to simulate various scenarios.
/// </summary>
public class TestFulfilmentProvider : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "test-fulfilment",
        DisplayName = "Test Fulfilment Provider",
        Description = "Provider for testing purposes",
        Icon = "icon-lab",
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = true,
        SupportsWebhooks = true,
        SupportsPolling = true,
        SupportsProductSync = true,
        SupportsInventorySync = true,
        ApiStyle = FulfilmentApiStyle.Rest
    };

    // Configurable responses for testing
    public FulfilmentOrderResult? NextSubmitOrderResult { get; set; }
    public FulfilmentCancelResult? NextCancelResult { get; set; }
    public FulfilmentConnectionTestResult? NextConnectionTestResult { get; set; }
    public bool NextWebhookValidationResult { get; set; } = true;
    public FulfilmentWebhookResult? NextWebhookResult { get; set; }
    public IReadOnlyList<FulfilmentStatusUpdate> NextPollResult { get; set; } = [];
    public FulfilmentSyncResult? NextProductSyncResult { get; set; }
    public IReadOnlyList<FulfilmentInventoryLevel> NextInventoryLevels { get; set; } = [];

    // Tracking for verification
    public List<FulfilmentOrderRequest> SubmittedOrders { get; } = [];
    public List<string> CancelledReferences { get; } = [];
    public List<IEnumerable<FulfilmentProduct>> SyncedProducts { get; } = [];
    public int ConnectionTestCallCount { get; private set; }
    public int GetInventoryLevelsCallCount { get; private set; }
    public int PollOrderStatusCallCount { get; private set; }

    // Exception simulation
    public Exception? ExceptionToThrow { get; set; }

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
                IsSensitive = true,
                Description = "Your test API key"
            },
            new ProviderConfigurationField
            {
                Key = "warehouseId",
                Label = "Warehouse ID",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Optional warehouse identifier"
            },
            new ProviderConfigurationField
            {
                Key = "sandbox",
                Label = "Sandbox Mode",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "true",
                Description = "Enable sandbox mode for testing"
            }
        ]);
    }

    public override Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        ConnectionTestCallCount++;

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextConnectionTestResult ?? FulfilmentConnectionTestResult.Succeeded(
            accountName: "Test Account",
            providerVersion: "1.0.0"));
    }

    public override Task<FulfilmentOrderResult> SubmitOrderAsync(FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        SubmittedOrders.Add(request);

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextSubmitOrderResult ??
            FulfilmentOrderResult.Succeeded($"TEST-{request.OrderId.ToString("N")[..8].ToUpperInvariant()}"));
    }

    public override Task<FulfilmentCancelResult> CancelOrderAsync(string providerReference,
        CancellationToken cancellationToken = default)
    {
        CancelledReferences.Add(providerReference);

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextCancelResult ?? FulfilmentCancelResult.Succeeded());
    }

    public override Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextWebhookValidationResult);
    }

    public override Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextWebhookResult ?? new FulfilmentWebhookResult
        {
            Success = true,
            EventType = "test.event"
        });
    }

    public override Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(
        IEnumerable<string> providerReferences,
        CancellationToken cancellationToken = default)
    {
        PollOrderStatusCallCount++;

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextPollResult);
    }

    public override Task<FulfilmentSyncResult> SyncProductsAsync(IEnumerable<FulfilmentProduct> products,
        CancellationToken cancellationToken = default)
    {
        SyncedProducts.Add(products);

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        var productList = products.ToList();
        return Task.FromResult(NextProductSyncResult ?? new FulfilmentSyncResult
        {
            Success = true,
            ItemsProcessed = productList.Count,
            ItemsSucceeded = productList.Count,
            ItemsFailed = 0
        });
    }

    public override Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
        CancellationToken cancellationToken = default)
    {
        GetInventoryLevelsCallCount++;

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(NextInventoryLevels);
    }

    /// <summary>
    /// Resets all tracking and configuration state.
    /// </summary>
    public void Reset()
    {
        NextSubmitOrderResult = null;
        NextCancelResult = null;
        NextConnectionTestResult = null;
        NextWebhookValidationResult = true;
        NextWebhookResult = null;
        NextPollResult = [];
        NextProductSyncResult = null;
        NextInventoryLevels = [];
        ExceptionToThrow = null;

        SubmittedOrders.Clear();
        CancelledReferences.Clear();
        SyncedProducts.Clear();
        ConnectionTestCallCount = 0;
        GetInventoryLevelsCallCount = 0;
        PollOrderStatusCallCount = 0;
    }
}
