namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// Abstraction for FTP/SFTP file operations.
/// Implements IAsyncDisposable for connection cleanup.
/// </summary>
public interface IFtpClient : IAsyncDisposable
{
    /// <summary>
    /// Tests the connection to the remote server.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Test result indicating success or failure with error details.</returns>
    Task<FtpTestResult> TestConnectionAsync(CancellationToken ct = default);

    /// <summary>
    /// Uploads a file to the remote path.
    /// </summary>
    /// <param name="remotePath">Full path on the remote server including filename.</param>
    /// <param name="content">File content as bytes.</param>
    /// <param name="overwrite">Whether to overwrite if file exists.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if upload succeeded, false if skipped (file exists and overwrite is false).</returns>
    Task<bool> UploadFileAsync(
        string remotePath,
        byte[] content,
        bool overwrite = false,
        CancellationToken ct = default);

    /// <summary>
    /// Checks if a file exists at the remote path.
    /// </summary>
    /// <param name="remotePath">Full path on the remote server.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if the file exists.</returns>
    Task<bool> FileExistsAsync(string remotePath, CancellationToken ct = default);

    /// <summary>
    /// Disconnects from the remote server.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    Task DisconnectAsync(CancellationToken ct = default);
}
