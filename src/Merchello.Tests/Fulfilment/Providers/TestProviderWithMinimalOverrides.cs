using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Test provider with minimal overrides that supports most features but doesn't implement them.
/// Used to test default base class behavior.
/// </summary>
internal class TestProviderWithMinimalOverrides : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "test-minimal",
        DisplayName = "Test Minimal Provider",
        Description = "Minimal test provider",
        SupportsOrderSubmission = true,
        SupportsWebhooks = true,
        SupportsPolling = true,
        ApiStyle = FulfilmentApiStyle.Rest
    };

    public FulfilmentProviderConfiguration? ExposedConfiguration => Configuration;
}
