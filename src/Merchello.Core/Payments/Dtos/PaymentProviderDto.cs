using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Payment provider with metadata and enabled status
/// </summary>
public class PaymentProviderDto
{
    public required string Alias { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? IconHtml { get; set; }
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

    /// <summary>
    /// Optional setup instructions/documentation for developers (markdown format)
    /// </summary>
    public string? SetupInstructions { get; set; }
}
