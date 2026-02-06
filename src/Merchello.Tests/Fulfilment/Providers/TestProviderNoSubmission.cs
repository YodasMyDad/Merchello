using Merchello.Core.Fulfilment.Providers;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Test provider that does not support order submission.
/// </summary>
internal class TestProviderNoSubmission : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "test-no-submission",
        DisplayName = "No Submission Provider",
        Description = "Provider without order submission support",
        SupportsOrderSubmission = false
    };
}
