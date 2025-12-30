using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Result from testing a payment provider
/// </summary>
public class TestPaymentProviderResultDto
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
    public bool IsSuccessful { get; set; }

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

    /// <summary>
    /// URL to the payment adapter JavaScript file.
    /// Required for HostedFields and Widget integration types.
    /// </summary>
    public string? AdapterUrl { get; set; }

    /// <summary>
    /// Configuration object to pass to the JavaScript SDK.
    /// Structure varies by provider.
    /// </summary>
    public Dictionary<string, object>? SdkConfiguration { get; set; }

    /// <summary>
    /// The method alias within the provider (e.g., "cards", "applepay").
    /// </summary>
    public string? MethodAlias { get; set; }

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
    /// Test invoice ID generated for this test session.
    /// Should be passed to ProcessTestPayment for invoice ID consistency.
    /// </summary>
    public Guid? TestInvoiceId { get; set; }

    /// <summary>
    /// Error message if the test failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code from the provider
    /// </summary>
    public string? ErrorCode { get; set; }
}
