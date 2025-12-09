using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to test a payment provider configuration
/// </summary>
public class TestPaymentProviderRequestDto
{
    /// <summary>
    /// Test amount (defaults to 100.00)
    /// </summary>
    public decimal Amount { get; set; } = 100.00m;

    /// <summary>
    /// Currency code (uses store default if null)
    /// </summary>
    public string? CurrencyCode { get; set; }
}

/// <summary>
/// Response from testing a payment provider
/// </summary>
public class TestPaymentProviderResponseDto
{
    /// <summary>
    /// Provider alias
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// Provider display name
    /// </summary>
    public required string ProviderName { get; set; }

    /// <summary>
    /// Whether the test was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Integration type of the provider
    /// </summary>
    public PaymentIntegrationType IntegrationType { get; set; }

    // Redirect type
    /// <summary>
    /// Redirect URL for Redirect integration type
    /// </summary>
    public string? RedirectUrl { get; set; }

    // HostedFields/Widget types
    /// <summary>
    /// Client token for HostedFields/Widget integration types
    /// </summary>
    public string? ClientToken { get; set; }

    /// <summary>
    /// Client secret for HostedFields/Widget integration types
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// JavaScript SDK URL for HostedFields/Widget integration types
    /// </summary>
    public string? JavaScriptSdkUrl { get; set; }

    // DirectForm type
    /// <summary>
    /// Form fields for DirectForm integration type
    /// </summary>
    public List<TestCheckoutFormFieldDto>? FormFields { get; set; }

    // Common
    /// <summary>
    /// Session ID from the provider
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Error message if the test failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code from the provider
    /// </summary>
    public string? ErrorCode { get; set; }
}

/// <summary>
/// Checkout form field for DirectForm providers
/// </summary>
public class TestCheckoutFormFieldDto
{
    /// <summary>
    /// Field key
    /// </summary>
    public required string Key { get; set; }

    /// <summary>
    /// Field label
    /// </summary>
    public required string Label { get; set; }

    /// <summary>
    /// Field description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Field type
    /// </summary>
    public string FieldType { get; set; } = "Text";

    /// <summary>
    /// Whether the field is required
    /// </summary>
    public bool IsRequired { get; set; }
}
