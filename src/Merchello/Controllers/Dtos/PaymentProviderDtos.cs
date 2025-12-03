using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;

namespace Merchello.Controllers.Dtos;

/// <summary>
/// Payment provider with metadata and enabled status
/// </summary>
public class PaymentProviderDto
{
    public required string Alias { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? Description { get; set; }
    public bool SupportsRefunds { get; set; }
    public bool SupportsPartialRefunds { get; set; }
    public PaymentIntegrationType IntegrationType { get; set; }
    public bool SupportsAuthAndCapture { get; set; }
    public bool RequiresWebhook { get; set; }
    public string? WebhookPath { get; set; }

    /// <summary>
    /// Whether this provider is enabled (has a setting with IsEnabled = true)
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// The setting ID if configured
    /// </summary>
    public Guid? SettingId { get; set; }
}

/// <summary>
/// Configuration field definition for dynamic UI
/// </summary>
public class PaymentProviderFieldDto
{
    public required string Key { get; set; }
    public required string Label { get; set; }
    public string? Description { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public bool IsSensitive { get; set; }
    public string? DefaultValue { get; set; }
    public string? Placeholder { get; set; }
    public List<SelectOptionDto>? Options { get; set; }
}

/// <summary>
/// Select option for dropdown fields
/// </summary>
public class SelectOptionDto
{
    public required string Value { get; set; }
    public required string Label { get; set; }
}

/// <summary>
/// Persisted provider configuration
/// </summary>
public class PaymentProviderSettingDto
{
    public Guid Id { get; set; }
    public required string ProviderAlias { get; set; }
    public required string DisplayName { get; set; }
    public bool IsEnabled { get; set; }
    public Dictionary<string, string>? Configuration { get; set; }
    public int SortOrder { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }

    /// <summary>
    /// Provider metadata
    /// </summary>
    public PaymentProviderDto? Provider { get; set; }
}

/// <summary>
/// Request to create/enable a payment provider
/// </summary>
public class CreatePaymentProviderSettingDto
{
    /// <summary>
    /// The provider alias to enable
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// Display name override (optional, defaults to provider's display name)
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether to enable immediately
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Configuration values (key-value pairs)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}

/// <summary>
/// Request to update a payment provider setting
/// </summary>
public class UpdatePaymentProviderSettingDto
{
    /// <summary>
    /// Display name override
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether the provider is enabled
    /// </summary>
    public bool? IsEnabled { get; set; }

    /// <summary>
    /// Configuration values (key-value pairs)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}

/// <summary>
/// Request to toggle provider enabled status
/// </summary>
public class TogglePaymentProviderDto
{
    public bool IsEnabled { get; set; }
}

/// <summary>
/// Request to reorder payment providers
/// </summary>
public class ReorderPaymentProvidersDto
{
    /// <summary>
    /// Provider setting IDs in desired order
    /// </summary>
    public required List<Guid> OrderedIds { get; set; }
}

