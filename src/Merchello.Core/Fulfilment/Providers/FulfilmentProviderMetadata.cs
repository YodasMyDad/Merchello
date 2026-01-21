namespace Merchello.Core.Fulfilment.Providers;

/// <summary>
/// Immutable metadata describing a fulfilment provider implementation.
/// </summary>
public record FulfilmentProviderMetadata
{
    /// <summary>
    /// Unique key identifying this provider (e.g., "shipbob", "shipmonk", "helm-wms").
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display name shown in the backoffice UI.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Umbraco icon class for fallback display (e.g., "icon-box").
    /// Used when IconSvg is not provided.
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// SVG markup for brand logo display. Takes precedence over Icon when present.
    /// Should be a complete SVG element with viewBox for proper scaling (24x24 recommended).
    /// </summary>
    public string? IconSvg { get; init; }

    /// <summary>
    /// Brief description of the provider's capabilities.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Markdown-formatted setup instructions displayed in the configuration modal.
    /// </summary>
    public string? SetupInstructions { get; init; }

    /// <summary>
    /// Whether this provider supports submitting orders to the 3PL.
    /// </summary>
    public bool SupportsOrderSubmission { get; init; }

    /// <summary>
    /// Whether this provider supports cancelling orders at the 3PL.
    /// </summary>
    public bool SupportsOrderCancellation { get; init; }

    /// <summary>
    /// Whether this provider supports receiving webhook notifications.
    /// </summary>
    public bool SupportsWebhooks { get; init; }

    /// <summary>
    /// Whether this provider supports polling for status updates.
    /// </summary>
    public bool SupportsPolling { get; init; }

    /// <summary>
    /// Whether this provider supports syncing product catalog to the 3PL.
    /// </summary>
    public bool SupportsProductSync { get; init; }

    /// <summary>
    /// Whether this provider supports receiving inventory levels from the 3PL.
    /// </summary>
    public bool SupportsInventorySync { get; init; }

    /// <summary>
    /// API style used by the provider. Affects how the provider client is implemented.
    /// </summary>
    public FulfilmentApiStyle ApiStyle { get; init; } = FulfilmentApiStyle.Rest;
}
