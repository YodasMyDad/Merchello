using Xunit;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Collection definition for integration tests that share the ServiceTestFixture.
/// Disables parallelization to prevent test interference when resetting the shared database.
/// </summary>
[CollectionDefinition("Integration Tests", DisableParallelization = true)]
public class IntegrationTestCollection : ICollectionFixture<ServiceTestFixture>
{
}

/// <summary>
/// Collection definition for service tests that share the ServiceTestFixture.
/// Used by Protocol tests (SigningKeyStore, WebhookSigner, etc.) that need database access.
/// </summary>
[CollectionDefinition("ServiceTests", DisableParallelization = true)]
public class ServiceTestCollection : ICollectionFixture<ServiceTestFixture>
{
}
