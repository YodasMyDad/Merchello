namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Classification of errors for retry decision making.
/// </summary>
public enum ErrorClassification
{
    /// <summary>
    /// Transient network error - should retry.
    /// Examples: Socket errors, connection timeouts.
    /// </summary>
    TransientNetwork,

    /// <summary>
    /// Transient authentication error - may retry if credentials change.
    /// Examples: Auth failures that may be due to credential rotation.
    /// </summary>
    TransientAuth,

    /// <summary>
    /// Configuration error - should not retry without user intervention.
    /// Examples: Missing host, invalid settings.
    /// </summary>
    ConfigurationError,

    /// <summary>
    /// Permission error - should not retry without external intervention.
    /// Examples: Access denied, quota exceeded.
    /// </summary>
    PermissionError,

    /// <summary>
    /// Unknown error - default behavior, may retry once.
    /// </summary>
    Unknown
}
