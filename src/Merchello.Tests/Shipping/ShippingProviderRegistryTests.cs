using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Merchello.Core;
using Merchello.Core;
using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.BuiltIn;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Merchello.Tests.Shipping;

public class ShippingProviderRegistryTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;

    public ShippingProviderRegistryTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
    }

    [Fact]
    public async Task GetEnabledProvidersAsync_UsesMetadataWhenNoConfigurationExists()
    {
        var assembliesBackup = CaptureAssemblies();
        try
        {
            AssemblyManager.SetAssemblies(new[] { typeof(FlatRateShippingProvider).Assembly });

            var registry = CreateRegistry();
            var providers = await registry.GetEnabledProvidersAsync();

            var provider = Assert.Single(providers);
            Assert.Equal("flat-rate", provider.Metadata.Key);
        }
        finally
        {
            RestoreAssemblies(assembliesBackup);
        }
    }

    [Fact]
    public async Task GetEnabledProvidersAsync_RespectsDisabledConfiguration()
    {
        var assembliesBackup = CaptureAssemblies();
        try
        {
            AssemblyManager.SetAssemblies(new[] { typeof(FlatRateShippingProvider).Assembly });

            _dbContext.ShippingProviderConfigurations.Add(new ShippingProviderConfiguration
            {
                ProviderKey = "flat-rate",
                IsEnabled = false
            });
            await _dbContext.SaveChangesAsync();

            var registry = CreateRegistry();
            var providers = await registry.GetEnabledProvidersAsync();

            Assert.Empty(providers);
        }
        finally
        {
            RestoreAssemblies(assembliesBackup);
        }
    }

    private ShippingProviderRegistry CreateRegistry()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(_dbContext);

        var serviceProvider = services.BuildServiceProvider();
        var extensionManager = new ExtensionManager(serviceProvider);

        return new ShippingProviderRegistry(extensionManager, _dbContext, NullLogger<ShippingProviderRegistry>.Instance);
    }

    private static Assembly?[] CaptureAssemblies()
    {
        try
        {
            return AssemblyManager.Assemblies?.ToArray() ?? Array.Empty<Assembly?>();
        }
        catch (NullReferenceException)
        {
            return Array.Empty<Assembly?>();
        }
    }

    private static void RestoreAssemblies(Assembly?[] assemblies)
    {
        if (assemblies.Length == 0)
        {
            AssemblyManager.SetAssemblies(new[] { typeof(Startup).Assembly });
        }
        else
        {
            AssemblyManager.SetAssemblies(assemblies!);
        }
    }
}
