using Merchello.Core.Fulfilment.Providers;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Test provider that does not support webhooks.
/// </summary>
internal class TestProviderNoWebhooks : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "test-no-webhooks",
        DisplayName = "No Webhooks Provider",
        Description = "Provider without webhook support",
        SupportsWebhooks = false
    };
}
