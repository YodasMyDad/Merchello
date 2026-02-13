using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Providers;

/// <summary>
/// Wrapper combining a tax provider instance with its persisted settings.
/// </summary>
public sealed class RegisteredTaxProvider
{
    public RegisteredTaxProvider(
        ITaxProvider provider,
        TaxProviderSetting? setting,
        TaxProviderConfiguration? configuration)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Setting = setting;
        Configuration = configuration;
    }

    /// <summary>
    /// The tax provider instance.
    /// </summary>
    public ITaxProvider Provider { get; }

    /// <summary>
    /// The persisted settings for this provider.
    /// </summary>
    public TaxProviderSetting? Setting { get; }

    /// <summary>
    /// Decrypted provider configuration.
    /// </summary>
    public TaxProviderConfiguration? Configuration { get; }

    /// <summary>
    /// Provider metadata.
    /// </summary>
    public TaxProviderMetadata Metadata => Provider.Metadata;

    /// <summary>
    /// Whether this provider is the currently active one.
    /// </summary>
    public bool IsActive => Setting?.IsEnabled ?? false;
}
