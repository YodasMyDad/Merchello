namespace Merchello.Core.Protocols;

/// <summary>
/// Metadata describing a protocol adapter.
/// Follows existing provider patterns (TaxProviderMetadata, PaymentProviderMetadata).
/// </summary>
public record CommerceProtocolAdapterMetadata(
    /// <summary>
    /// Unique identifier for the protocol (e.g., "ucp").
    /// Case-insensitive, used for routing and configuration.
    /// </summary>
    string Alias,

    /// <summary>
    /// Human-readable name for the protocol.
    /// </summary>
    string DisplayName,

    /// <summary>
    /// Protocol version this adapter implements (YYYY-MM-DD format).
    /// </summary>
    string Version,

    /// <summary>
    /// Optional icon for backoffice display.
    /// </summary>
    string? Icon = null,

    /// <summary>
    /// Optional description of the protocol.
    /// </summary>
    string? Description = null,

    /// <summary>
    /// Whether this adapter supports the Identity Linking capability.
    /// </summary>
    bool SupportsIdentityLinking = false,

    /// <summary>
    /// Whether this adapter supports Order lifecycle webhooks.
    /// </summary>
    bool SupportsOrderWebhooks = false,

    /// <summary>
    /// Setup instructions for backoffice display.
    /// </summary>
    string? SetupInstructions = null
);
