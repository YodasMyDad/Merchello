using Microsoft.Extensions.Logging;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// Factory for creating FTP/SFTP clients based on connection settings.
/// </summary>
public sealed class FtpClientFactory : IFtpClientFactory
{
    private readonly ILoggerFactory _loggerFactory;

    public FtpClientFactory(ILoggerFactory loggerFactory)
    {
        _loggerFactory = loggerFactory;
    }

    /// <inheritdoc />
    public Task<IFtpClient> CreateClientAsync(FtpConnectionSettings settings, CancellationToken ct = default)
    {
        IFtpClient client = settings.UseSftp
            ? new SftpClientWrapper(settings, _loggerFactory.CreateLogger<SftpClientWrapper>())
            : new FtpClientWrapper(settings, _loggerFactory.CreateLogger<FtpClientWrapper>());

        return Task.FromResult(client);
    }
}
