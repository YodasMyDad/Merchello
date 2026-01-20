using System.Security.Cryptography;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Manages ECDSA signing keys for webhook signatures.
/// Keys are stored in memory with caching support.
/// </summary>
/// <remarks>
/// For production use, consider implementing a persistent key store
/// that saves keys to database or secure key vault.
/// </remarks>
public class SigningKeyStore : ISigningKeyStore, IDisposable
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<SigningKeyStore> _logger;
    private readonly object _keyLock = new();

    private ECDsa? _currentKey;
    private string _currentKeyId;
    private readonly List<SigningKeyInfo> _keys = [];
    private bool _disposed;

    public SigningKeyStore(
        ICacheService cacheService,
        ILogger<SigningKeyStore> logger)
    {
        _cacheService = cacheService;
        _logger = logger;

        // Generate initial key on startup
        _currentKeyId = GenerateKeyId();
        _currentKey = GenerateKey();
        _keys.Add(new SigningKeyInfo(_currentKeyId, _currentKey, DateTimeOffset.UtcNow, null));

        _logger.LogInformation("SigningKeyStore initialized with key {KeyId}", _currentKeyId);
    }

    /// <inheritdoc />
    public ECDsa GetEcdsaPrivateKey(string keyId)
    {
        lock (_keyLock)
        {
            var keyInfo = _keys.FirstOrDefault(k => k.KeyId == keyId);
            if (keyInfo == null)
            {
                throw new KeyNotFoundException($"Signing key '{keyId}' not found");
            }

            if (keyInfo.ExpiredAt.HasValue && keyInfo.ExpiredAt.Value < DateTimeOffset.UtcNow)
            {
                throw new InvalidOperationException($"Signing key '{keyId}' has expired");
            }

            return keyInfo.Key;
        }
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<JsonWebKey>> GetPublicKeysAsync(CancellationToken ct = default)
    {
        lock (_keyLock)
        {
            var publicKeys = _keys
                .Where(k => !k.ExpiredAt.HasValue || k.ExpiredAt.Value > DateTimeOffset.UtcNow)
                .Select(k => ExportPublicKey(k.KeyId, k.Key))
                .ToList();

            return Task.FromResult<IReadOnlyList<JsonWebKey>>(publicKeys);
        }
    }

    /// <inheritdoc />
    public string GetCurrentKeyId()
    {
        lock (_keyLock)
        {
            return _currentKeyId;
        }
    }

    /// <inheritdoc />
    public Task RotateKeysAsync(CancellationToken ct = default)
    {
        lock (_keyLock)
        {
            // Mark current key as expiring (give grace period for in-flight requests)
            var currentKeyInfo = _keys.FirstOrDefault(k => k.KeyId == _currentKeyId);
            if (currentKeyInfo != null)
            {
                var gracePeriod = TimeSpan.FromHours(24);
                _keys.Remove(currentKeyInfo);
                _keys.Add(currentKeyInfo with { ExpiredAt = DateTimeOffset.UtcNow.Add(gracePeriod) });
            }

            // Generate new key
            var newKeyId = GenerateKeyId();
            var newKey = GenerateKey();
            _keys.Add(new SigningKeyInfo(newKeyId, newKey, DateTimeOffset.UtcNow, null));

            _currentKeyId = newKeyId;
            _currentKey = newKey;

            // Clean up old expired keys
            var expiredKeys = _keys
                .Where(k => k.ExpiredAt.HasValue && k.ExpiredAt.Value < DateTimeOffset.UtcNow)
                .ToList();

            foreach (var expiredKey in expiredKeys)
            {
                _keys.Remove(expiredKey);
                expiredKey.Key.Dispose();
            }

            _logger.LogInformation("Rotated signing keys. New key: {NewKeyId}, Expired: {ExpiredCount}",
                newKeyId, expiredKeys.Count);
        }

        // Invalidate cached manifests that include signing keys
        return _cacheService.RemoveByTagAsync("protocols", ct);
    }

    private static ECDsa GenerateKey()
    {
        return ECDsa.Create(ECCurve.NamedCurves.nistP256);
    }

    private static string GenerateKeyId()
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        return $"key-{date}-{suffix}";
    }

    private static JsonWebKey ExportPublicKey(string keyId, ECDsa key)
    {
        var parameters = key.ExportParameters(includePrivateParameters: false);

        return new JsonWebKey
        {
            Kty = "EC",
            Kid = keyId,
            Crv = "P-256",
            X = Base64UrlEncoder.Encode(parameters.Q.X!),
            Y = Base64UrlEncoder.Encode(parameters.Q.Y!),
            Use = "sig",
            Alg = "ES256"
        };
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        lock (_keyLock)
        {
            foreach (var keyInfo in _keys)
            {
                keyInfo.Key.Dispose();
            }
            _keys.Clear();
            _currentKey = null;
        }

        GC.SuppressFinalize(this);
    }

    private sealed record SigningKeyInfo(
        string KeyId,
        ECDsa Key,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ExpiredAt);
}
