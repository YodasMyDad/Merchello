using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Result from payment session creation
/// </summary>
public class PaymentSessionResultDto
{
    /// <summary>
    /// Whether the session was created successfully
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The invoice ID the payment is for
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Session identifier
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// How the frontend should handle this payment
    /// </summary>
    public PaymentIntegrationType IntegrationType { get; set; }

    /// <summary>
    /// URL to redirect customer to for payment (Redirect type)
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Client token for JS SDK initialization (HostedFields/Widget types)
    /// </summary>
    public string? ClientToken { get; set; }

    /// <summary>
    /// Client secret for Stripe-style integrations
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// URL to the payment provider's JavaScript SDK
    /// </summary>
    public string? JavaScriptSdkUrl { get; set; }

    /// <summary>
    /// SDK configuration object
    /// </summary>
    public Dictionary<string, object>? SdkConfiguration { get; set; }

    /// <summary>
    /// Form fields for DirectForm type
    /// </summary>
    public List<CheckoutFormFieldDto>? FormFields { get; set; }

    /// <summary>
    /// Error message if not successful
    /// </summary>
    public string? ErrorMessage { get; set; }
}
