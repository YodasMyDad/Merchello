using FluentFTP;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// FTP client wrapper using FluentFTP library.
/// </summary>
public sealed class FtpClientWrapper : IFtpClient
{
    private readonly AsyncFtpClient _client;
    private readonly FtpConnectionSettings _settings;
    private readonly ILogger<FtpClientWrapper> _logger;
    private bool _disposed;

    public FtpClientWrapper(FtpConnectionSettings settings, ILogger<FtpClientWrapper> logger)
    {
        _settings = settings;
        _logger = logger;

        _client = new AsyncFtpClient(
            _settings.Host,
            _settings.Username,
            _settings.Password,
            _settings.Port)
        {
            Config = new FtpConfig
            {
                DataConnectionType = _settings.UsePassiveMode
                    ? FtpDataConnectionType.AutoPassive
                    : FtpDataConnectionType.AutoActive,
                EncryptionMode = _settings.UseTls
                    ? FtpEncryptionMode.Explicit
                    : FtpEncryptionMode.None,
                ConnectTimeout = _settings.TimeoutSeconds * 1000,
                DataConnectionConnectTimeout = _settings.TimeoutSeconds * 1000,
                ReadTimeout = _settings.TimeoutSeconds * 1000
            }
        };
    }

    /// <inheritdoc />
    public async Task<FtpTestResult> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            await _client.Connect(ct);

            var exists = await _client.DirectoryExists(_settings.RemotePath, ct);
            if (!exists)
            {
                return FtpTestResult.Failed($"Remote directory '{_settings.RemotePath}' does not exist");
            }

            _logger.LogDebug("FTP connection test successful for {Host}", _settings.Host);
            return FtpTestResult.Succeeded();
        }
        catch (Exception ex)
        {
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
            _logger.LogWarning(
                "FTP connection test failed for {Host}. Error: {Error}",
                _settings.Host,
                safeError);
            return FtpTestResult.Failed($"FTP connection failed: {safeError}");
        }
    }

    /// <inheritdoc />
    public async Task<bool> UploadFileAsync(
        string remotePath,
        byte[] content,
        bool overwrite = false,
        CancellationToken ct = default)
    {
        if (!_client.IsConnected)
        {
            await _client.Connect(ct);
        }

        // Check if file exists when not overwriting
        if (!overwrite)
        {
            var exists = await _client.FileExists(remotePath, ct);
            if (exists)
            {
                _logger.LogDebug("FTP file already exists and overwrite=false: {RemotePath}", remotePath);
                return false;
            }
        }

        using var stream = new MemoryStream(content);
        var mode = overwrite ? FtpRemoteExists.Overwrite : FtpRemoteExists.Skip;
        var result = await _client.UploadStream(stream, remotePath, mode, createRemoteDir: true, token: ct);

        if (result == FtpStatus.Success)
        {
            _logger.LogInformation("FTP upload successful: {RemotePath} ({Size} bytes)", remotePath, content.Length);
            return true;
        }

        _logger.LogWarning("FTP upload returned status {Status}: {RemotePath}", result, remotePath);
        return false;
    }

    /// <inheritdoc />
    public async Task<bool> FileExistsAsync(string remotePath, CancellationToken ct = default)
    {
        if (!_client.IsConnected)
        {
            await _client.Connect(ct);
        }

        return await _client.FileExists(remotePath, ct);
    }

    /// <inheritdoc />
    public async Task DisconnectAsync(CancellationToken ct = default)
    {
        if (_client.IsConnected)
        {
            await _client.Disconnect(ct);
        }
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        await DisconnectAsync();
        _client.Dispose();
    }
}
