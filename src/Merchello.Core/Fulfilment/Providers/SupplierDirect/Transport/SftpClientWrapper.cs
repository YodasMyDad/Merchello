using Microsoft.Extensions.Logging;
using Renci.SshNet;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// SFTP client wrapper using SSH.NET library.
/// </summary>
public sealed class SftpClientWrapper : IFtpClient
{
    private readonly SftpClient _client;
    private readonly FtpConnectionSettings _settings;
    private readonly ILogger<SftpClientWrapper> _logger;
    private bool _disposed;

    public SftpClientWrapper(FtpConnectionSettings settings, ILogger<SftpClientWrapper> logger)
    {
        _settings = settings;
        _logger = logger;

        var connectionInfo = new ConnectionInfo(
            _settings.Host,
            _settings.Port,
            _settings.Username,
            new PasswordAuthenticationMethod(_settings.Username, _settings.Password))
        {
            Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds)
        };

        _client = new SftpClient(connectionInfo);

        // Host key validation
        if (!string.IsNullOrEmpty(_settings.HostFingerprint))
        {
            _client.HostKeyReceived += (sender, e) =>
            {
                var fingerprint = BitConverter.ToString(e.FingerPrint).Replace("-", ":");
                e.CanTrust = fingerprint.Equals(_settings.HostFingerprint, StringComparison.OrdinalIgnoreCase);

                if (!e.CanTrust)
                {
                    _logger.LogWarning(
                        "SFTP host key mismatch for {Host}.",
                        _settings.Host);
                }
            };
        }
        else
        {
            // Accept all host keys when fingerprint not configured
            _client.HostKeyReceived += (sender, e) => e.CanTrust = true;
        }
    }

    /// <inheritdoc />
    public async Task<FtpTestResult> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            ct.ThrowIfCancellationRequested();
            if (!_client.IsConnected)
            {
                await _client.ConnectAsync(ct);
            }

            if (!await _client.ExistsAsync(_settings.RemotePath, ct))
            {
                return FtpTestResult.Failed($"Remote directory '{_settings.RemotePath}' does not exist");
            }

            _logger.LogDebug("SFTP connection test successful for {Host}", _settings.Host);
            return FtpTestResult.Succeeded();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
            _logger.LogWarning(
                "SFTP connection test failed for {Host}. Error: {Error}",
                _settings.Host,
                safeError);
            return FtpTestResult.Failed($"SFTP connection failed: {safeError}");
        }
    }

    /// <inheritdoc />
    public async Task<bool> UploadFileAsync(
        string remotePath,
        byte[] content,
        bool overwrite = false,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (!_client.IsConnected)
        {
            await _client.ConnectAsync(ct);
        }

        // Check if file exists when not overwriting
        if (!overwrite && await _client.ExistsAsync(remotePath, ct))
        {
            _logger.LogDebug("SFTP file already exists and overwrite=false: {RemotePath}", remotePath);
            return false;
        }

        // Ensure parent directory exists
        var directory = Path.GetDirectoryName(remotePath)?.Replace('\\', '/');
        if (!string.IsNullOrEmpty(directory) && !await _client.ExistsAsync(directory, ct))
        {
            await CreateDirectoryRecursiveAsync(directory, ct);
        }

        await using var localStream = new MemoryStream(content, writable: false);
        await using var remoteStream = await _client.OpenAsync(
            remotePath,
            overwrite ? FileMode.Create : FileMode.CreateNew,
            FileAccess.Write,
            ct);
        await localStream.CopyToAsync(remoteStream, ct);
        await remoteStream.FlushAsync(ct);

        _logger.LogInformation("SFTP upload successful: {RemotePath} ({Size} bytes)", remotePath, content.Length);
        return true;
    }

    /// <inheritdoc />
    public async Task<bool> FileExistsAsync(string remotePath, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (!_client.IsConnected)
        {
            await _client.ConnectAsync(ct);
        }

        return await _client.ExistsAsync(remotePath, ct);
    }

    /// <inheritdoc />
    public Task DisconnectAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (_client.IsConnected)
        {
            _client.Disconnect();
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public ValueTask DisposeAsync()
    {
        if (_disposed) return ValueTask.CompletedTask;
        _disposed = true;

        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private async Task CreateDirectoryRecursiveAsync(string path, CancellationToken ct)
    {
        var parts = path.Split('/').Where(p => !string.IsNullOrEmpty(p)).ToList();
        var currentPath = "";

        foreach (var part in parts)
        {
            ct.ThrowIfCancellationRequested();
            currentPath = currentPath + "/" + part;
            if (!await _client.ExistsAsync(currentPath, ct))
            {
                await _client.CreateDirectoryAsync(currentPath, ct);
            }
        }
    }
}
