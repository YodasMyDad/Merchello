namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Classifies exceptions for retry decision making.
/// </summary>
public static class SupplierDirectErrorClassifier
{
    /// <summary>
    /// Classifies an exception to determine retry behavior.
    /// </summary>
    public static ErrorClassification Classify(Exception exception)
    {
        return exception switch
        {
            // Configuration errors - don't retry
            ArgumentNullException => ErrorClassification.ConfigurationError,
            ArgumentException => ErrorClassification.ConfigurationError,
            InvalidOperationException when exception.Message.Contains("not configured") => ErrorClassification.ConfigurationError,

            // Auth errors - could be transient (credential rotation) or permanent
            UnauthorizedAccessException => ErrorClassification.TransientAuth,

            // Network/IO errors - typically transient
            System.Net.Sockets.SocketException => ErrorClassification.TransientNetwork,
            System.Net.Http.HttpRequestException => ErrorClassification.TransientNetwork,
            IOException when exception.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => ErrorClassification.TransientNetwork,
            IOException when exception.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => ErrorClassification.TransientNetwork,
            TimeoutException => ErrorClassification.TransientNetwork,
            OperationCanceledException => ErrorClassification.TransientNetwork,

            // Permission errors - need external intervention
            IOException when exception.Message.Contains("access denied", StringComparison.OrdinalIgnoreCase) => ErrorClassification.PermissionError,
            IOException when exception.Message.Contains("permission", StringComparison.OrdinalIgnoreCase) => ErrorClassification.PermissionError,

            // Default
            _ => ErrorClassification.Unknown
        };
    }

    /// <summary>
    /// Determines if an error classification is retryable.
    /// </summary>
    public static bool IsRetryable(ErrorClassification classification)
    {
        return classification switch
        {
            ErrorClassification.TransientNetwork => true,
            ErrorClassification.TransientAuth => true,
            ErrorClassification.Unknown => true, // Retry once for unknown errors
            _ => false
        };
    }

    /// <summary>
    /// Determines if an exception is retryable.
    /// </summary>
    public static bool IsRetryable(Exception exception)
    {
        return IsRetryable(Classify(exception));
    }
}
