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
    public Task<FtpTestResult> TestConnectionAsync(CancellationToken ct = default)
    {
        try
        {
            _client.Connect();

            if (!_client.Exists(_settings.RemotePath))
            {
                return Task.FromResult(FtpTestResult.Failed($"Remote directory '{_settings.RemotePath}' does not exist"));
            }

            _logger.LogDebug("SFTP connection test successful for {Host}", _settings.Host);
            return Task.FromResult(FtpTestResult.Succeeded());
        }
        catch (Exception ex)
        {
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
            _logger.LogWarning(
                "SFTP connection test failed for {Host}. Error: {Error}",
                _settings.Host,
                safeError);
            return Task.FromResult(FtpTestResult.Failed($"SFTP connection failed: {safeError}"));
        }
    }

    /// <inheritdoc />
    public Task<bool> UploadFileAsync(
        string remotePath,
        byte[] content,
        bool overwrite = false,
        CancellationToken ct = default)
    {
        if (!_client.IsConnected)
        {
            _client.Connect();
        }

        // Check if file exists when not overwriting
        if (!overwrite && _client.Exists(remotePath))
        {
            _logger.LogDebug("SFTP file already exists and overwrite=false: {RemotePath}", remotePath);
            return Task.FromResult(false);
        }

        // Ensure parent directory exists
        var directory = Path.GetDirectoryName(remotePath)?.Replace('\\', '/');
        if (!string.IsNullOrEmpty(directory) && !_client.Exists(directory))
        {
            CreateDirectoryRecursive(directory);
        }

        using var stream = new MemoryStream(content);
        _client.UploadFile(stream, remotePath, overwrite);

        _logger.LogInformation("SFTP upload successful: {RemotePath} ({Size} bytes)", remotePath, content.Length);
        return Task.FromResult(true);
    }

    /// <inheritdoc />
    public Task<bool> FileExistsAsync(string remotePath, CancellationToken ct = default)
    {
        if (!_client.IsConnected)
        {
            _client.Connect();
        }

        return Task.FromResult(_client.Exists(remotePath));
    }

    /// <inheritdoc />
    public Task DisconnectAsync(CancellationToken ct = default)
    {
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

    private void CreateDirectoryRecursive(string path)
    {
        var parts = path.Split('/').Where(p => !string.IsNullOrEmpty(p)).ToList();
        var currentPath = "";

        foreach (var part in parts)
        {
            currentPath = currentPath + "/" + part;
            if (!_client.Exists(currentPath))
            {
                _client.CreateDirectory(currentPath);
            }
        }
    }
}
