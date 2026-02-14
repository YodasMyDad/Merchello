using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Tax.Providers.BuiltIn;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Tests.Tax.Providers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Integration fixture variant that uses a real <see cref="TaxProviderManager"/> instance.
/// The default service fixture still uses a mocked manager for broad test stability.
/// </summary>
public class RealTaxProviderManagerFixture : IDisposable
{
    private readonly TaxProviderManager _taxProviderManager;
    private readonly IReadOnlyCollection<System.Reflection.Assembly?> _originalAssemblies;

    public RealTaxProviderManagerFixture()
    {
        Services = new ServiceTestFixture();
        Services.ResetDatabase();
        Services.ResetMocks();
        _originalAssemblies = AssemblyManager.Assemblies.ToArray();

        var assembliesToScan = _originalAssemblies
            .Concat(
            [
                typeof(ManualTaxProvider).Assembly,
                typeof(AvalaraTaxProvider).Assembly,
                typeof(DeterministicExternalTaxProvider).Assembly
            ])
            .Distinct()
            .ToArray();

        AssemblyManager.SetAssemblies(assembliesToScan);

        _taxProviderManager = CreateTaxProviderManager(new PassthroughProviderSettingsProtector());
    }

    public ServiceTestFixture Services { get; }

    public ITaxProviderManager TaxProviderManager => _taxProviderManager;

    public TaxProviderManager CreateTaxProviderManager(IProviderSettingsProtector protector)
    {
        var extensionManager = Services.GetService<ExtensionManager>();
        var serviceScopeFactory = Services.GetService<IServiceScopeFactory>();
        var scopeProvider = Services.GetService<IEFCoreScopeProvider<MerchelloDbContext>>();

        return new TaxProviderManager(
            extensionManager,
            serviceScopeFactory,
            scopeProvider,
            protector,
            NullLogger<TaxProviderManager>.Instance);
    }

    public void Dispose()
    {
        _taxProviderManager.Dispose();
        AssemblyManager.SetAssemblies(_originalAssemblies);
        Services.Dispose();
    }
}
