using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Database entity for persisted payment provider configuration.
/// </summary>
public class PaymentProviderSetting : ProviderConfiguration
{
    /// <summary>
    /// The provider alias (must match the provider's metadata alias).
    /// </summary>
    [NotMapped]
    public string ProviderAlias
    {
        get => ProviderKey;
        set => ProviderKey = value;
    }

    /// <summary>
    /// Whether this provider is in test/sandbox mode.
    /// When true, the provider should use test credentials and sandbox environments.
    /// </summary>
    public bool IsTestMode { get; set; } = true;

    /// <summary>
    /// Whether vaulting is enabled for this provider.
    /// Only applies if the provider supports vaulting (SupportsVaultedPayments = true).
    /// When enabled, customers can save payment methods for future purchases.
    /// Controlled via backoffice provider configuration.
    /// </summary>
    public bool IsVaultingEnabled { get; set; }

    /// <summary>
    /// JSON-serialized configuration values.
    /// </summary>
    [NotMapped]
    public string? Configuration
    {
        get => SettingsJson;
        set => SettingsJson = value;
    }

    /// <summary>
    /// Serialized payment method settings for this provider.
    /// </summary>
    public string? MethodSettingsJson { get; set; }

    /// <summary>
    /// Method settings for this provider. Each method can be individually enabled/disabled.
    /// </summary>
    [NotMapped]
    public List<PaymentMethodSetting> MethodSettings =>
        string.IsNullOrEmpty(MethodSettingsJson) ? [] :
        JsonSerializer.Deserialize<List<PaymentMethodSetting>>(MethodSettingsJson) ?? [];

    public void SetMethodSettings(List<PaymentMethodSetting>? settings) =>
        MethodSettingsJson = settings is { Count: > 0 } ? JsonSerializer.Serialize(settings) : null;

    [NotMapped]
    public DateTime DateCreated
    {
        get => CreateDate;
        set => CreateDate = value;
    }

    [NotMapped]
    public DateTime DateUpdated
    {
        get => UpdateDate;
        set => UpdateDate = value;
    }
}

