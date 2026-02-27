namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// A single client-side log entry from the checkout.
/// Only named, validated fields are accepted (no arbitrary data objects) to prevent PII injection.
/// </summary>
public record CheckoutLogEntryDto
{
    /// <summary>
    /// Log level: debug, info, warning, error, critical.
    /// </summary>
    public string Level { get; init; } = "error";

    /// <summary>
    /// Human-readable log message (truncated server-side to 500 chars).
    /// </summary>
    public string Message { get; init; } = "";

    /// <summary>
    /// Log category: payment, shipping, address, validation, api, adapter, init, general.
    /// </summary>
    public string? Category { get; init; }

    /// <summary>
    /// Standardized error code (e.g. NETWORK_ERROR, CARD_DECLINED).
    /// </summary>
    public string? ErrorCode { get; init; }

    /// <summary>
    /// Current checkout step: init, information, shipping, payment, submitting.
    /// </summary>
    public string? CheckoutStep { get; init; }

    /// <summary>
    /// Page pathname only (no query params to avoid tokens/PII).
    /// </summary>
    public string? Url { get; init; }

    /// <summary>
    /// Random per-pageload session ID for correlating batched entries.
    /// </summary>
    public string? SessionId { get; init; }

    /// <summary>
    /// Unix timestamp in milliseconds.
    /// </summary>
    public long Timestamp { get; init; }

    /// <summary>
    /// Browser user agent string (useful for browser-specific bug diagnosis).
    /// </summary>
    public string? UserAgent { get; init; }
}
