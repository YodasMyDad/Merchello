using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Log entry for a received fulfilment webhook.
/// </summary>
public class FulfilmentWebhookLog
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// FK to the provider configuration
    /// </summary>
    public Guid ProviderConfigurationId { get; set; }

    /// <summary>
    /// The provider configuration
    /// </summary>
    public virtual FulfilmentProviderConfiguration? ProviderConfiguration { get; set; }

    /// <summary>
    /// Provider's webhook/message ID (for deduplication)
    /// </summary>
    public string? MessageId { get; set; }

    /// <summary>
    /// Type of event (e.g., "shipment.created")
    /// </summary>
    public string? EventType { get; set; }

    /// <summary>
    /// Raw webhook body (for debugging)
    /// </summary>
    public string? Payload { get; set; }

    /// <summary>
    /// When the webhook was processed
    /// </summary>
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// TTL for cleanup (default: 7 days from processing)
    /// </summary>
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
}
