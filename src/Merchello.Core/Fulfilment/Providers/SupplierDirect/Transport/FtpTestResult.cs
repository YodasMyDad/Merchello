namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// Result of an FTP/SFTP connection test.
/// </summary>
public record FtpTestResult(bool Success, string? ErrorMessage = null)
{
    /// <summary>
    /// Creates a successful test result.
    /// </summary>
    public static FtpTestResult Succeeded() => new(true);

    /// <summary>
    /// Creates a failed test result with an error message.
    /// </summary>
    public static FtpTestResult Failed(string errorMessage) => new(false, errorMessage);
}
