using Xunit;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Collection definition for service tests that share the ServiceTestFixture.
/// Used by protocol tests that need database access.
/// </summary>
[CollectionDefinition("ServiceTests", DisableParallelization = true)]
public class ServiceTestCollection : ICollectionFixture<ServiceTestFixture>
{
}
