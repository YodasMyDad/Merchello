using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Wraps a payment provider instance with its persisted configuration.
/// </summary>
public sealed class RegisteredPaymentProvider
{
    public RegisteredPaymentProvider(IPaymentProvider provider, PaymentProviderSetting? setting)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Setting = setting;
    }

    /// <summary>
    /// The payment provider instance.
    /// </summary>
    public IPaymentProvider Provider { get; }

    /// <summary>
    /// The persisted configuration setting (if any).
    /// </summary>
    public PaymentProviderSetting? Setting { get; }

    /// <summary>
    /// Provider metadata (convenience accessor).
    /// </summary>
    public PaymentProviderMetadata Metadata => Provider.Metadata;

    /// <summary>
    /// Whether this provider is enabled.
    /// </summary>
    public bool IsEnabled => Setting?.IsEnabled ?? false;

    /// <summary>
    /// Display name (from setting if configured, otherwise from metadata).
    /// </summary>
    public string DisplayName => Setting?.DisplayName ?? Metadata.DisplayName;

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    public int SortOrder => Setting?.SortOrder ?? int.MaxValue;
}

