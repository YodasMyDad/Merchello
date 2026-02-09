namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// Factory for creating configured FTP/SFTP clients.
/// </summary>
public interface IFtpClientFactory
{
    /// <summary>
    /// Creates an FTP or SFTP client based on settings.
    /// The returned client should be disposed after use.
    /// </summary>
    /// <param name="settings">Connection settings.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A configured FTP client ready for use.</returns>
    Task<IFtpClient> CreateClientAsync(
        FtpConnectionSettings settings,
        CancellationToken ct = default);
}
