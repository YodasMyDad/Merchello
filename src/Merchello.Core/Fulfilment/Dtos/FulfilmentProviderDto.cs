using Merchello.Core.Fulfilment.Providers;

namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Fulfilment provider with metadata and configuration status.
/// </summary>
public class FulfilmentProviderDto
{
    public required string Key { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? IconSvg { get; set; }
    public string? Description { get; set; }
    public string? SetupInstructions { get; set; }

    // Capabilities
    public bool SupportsOrderSubmission { get; set; }
    public bool SupportsOrderCancellation { get; set; }
    public bool SupportsWebhooks { get; set; }
    public bool SupportsPolling { get; set; }
    public bool SupportsProductSync { get; set; }
    public bool SupportsInventorySync { get; set; }
    public FulfilmentApiStyle ApiStyle { get; set; }
    public string ApiStyleLabel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this provider is enabled (has a configuration with IsEnabled = true)
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// The configuration ID if configured
    /// </summary>
    public Guid? ConfigurationId { get; set; }
}
