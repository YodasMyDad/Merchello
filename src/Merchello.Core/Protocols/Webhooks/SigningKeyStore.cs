using System.Security.Cryptography;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Protocols.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

using Merchello.Core.Protocols.Webhooks.Interfaces;

namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Manages ECDSA signing keys for webhook signatures.
/// Keys are persisted in the database with in-memory caching for performance.
/// </summary>
public class SigningKeyStore : ISigningKeyStore, IDisposable
{
    private readonly MerchelloDbContext _dbContext;
    private readonly ICacheService _cacheService;
    private readonly ILogger<SigningKeyStore> _logger;
    private readonly object _keyLock = new();

    // In-memory cache of loaded ECDsa keys for fast signing operations
    private readonly Dictionary<string, ECDsa> _keyCache = new();
    private string? _currentKeyId;
    private bool _initialized;
    private bool _disposed;

    public SigningKeyStore(
        MerchelloDbContext dbContext,
        ICacheService cacheService,
        ILogger<SigningKeyStore> logger)
    {
        _dbContext = dbContext;
        _cacheService = cacheService;
        _logger = logger;
    }

    /// <summary>
    /// Disposes all cached ECDsa keys.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;

        lock (_keyLock)
        {
            if (_disposed) return;

            foreach (var key in _keyCache.Values)
            {
                key.Dispose();
            }
            _keyCache.Clear();
            _disposed = true;
        }

        GC.SuppressFinalize(this);
    }

    /// <inheritdoc />
    public ECDsa GetEcdsaPrivateKey(string keyId)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        EnsureInitialized();

        lock (_keyLock)
        {
            // Check in-memory cache first
            if (_keyCache.TryGetValue(keyId, out var cachedKey))
            {
                return cachedKey;
            }

            // Load from database
            var signingKey = _dbContext.SigningKeys
                .AsNoTracking()
                .FirstOrDefault(k => k.KeyId == keyId);

            if (signingKey == null)
            {
                throw new KeyNotFoundException($"Signing key '{keyId}' not found");
            }

            if (signingKey.ExpiredAt.HasValue && signingKey.ExpiredAt.Value < DateTimeOffset.UtcNow)
            {
                throw new InvalidOperationException($"Signing key '{keyId}' has expired");
            }

            // Import and cache the key
            var key = ImportPrivateKey(signingKey.PrivateKeyPem);
            _keyCache[keyId] = key;

            return key;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<JsonWebKey>> GetPublicKeysAsync(CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await EnsureInitializedAsync(ct);

        var now = DateTimeOffset.UtcNow;

        // Get all keys from database (small number expected) and filter in memory
        // Note: DateTimeOffset comparisons don't translate well in SQLite provider
        var allKeys = await _dbContext.SigningKeys
            .AsNoTracking()
            .ToListAsync(ct);

        var signingKeys = allKeys
            .Where(k => k.ExpiredAt == null || k.ExpiredAt > now)
            .ToList();

        return signingKeys
            .Select(k => new JsonWebKey
            {
                Kty = "EC",
                Kid = k.KeyId,
                Crv = k.CurveName,
                X = k.PublicKeyX,
                Y = k.PublicKeyY,
                Use = "sig",
                Alg = k.Algorithm
            })
            .ToList();
    }

    /// <inheritdoc />
    public string GetCurrentKeyId()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        EnsureInitialized();

        lock (_keyLock)
        {
            return _currentKeyId!;
        }
    }

    /// <inheritdoc />
    public async Task RotateKeysAsync(CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await EnsureInitializedAsync(ct);

        var gracePeriod = TimeSpan.FromHours(24);
        var now = DateTimeOffset.UtcNow;

        lock (_keyLock)
        {
            // Mark current active key as expiring
            var currentKey = _dbContext.SigningKeys.FirstOrDefault(k => k.IsActive);
            if (currentKey != null)
            {
                currentKey.IsActive = false;
                currentKey.ExpiredAt = now.Add(gracePeriod);
            }

            // Generate new key
            var newKeyId = GenerateKeyId();
            var (privateKey, publicKeyX, publicKeyY) = GenerateKeyMaterial();

            var newSigningKey = new SigningKey
            {
                KeyId = newKeyId,
                IsActive = true,
                CreatedAt = now,
                ExpiredAt = null,
                PrivateKeyPem = privateKey,
                PublicKeyX = publicKeyX,
                PublicKeyY = publicKeyY
            };

            _dbContext.SigningKeys.Add(newSigningKey);
            _currentKeyId = newKeyId;

            // Dispose and clear in-memory cache for rotated keys
            foreach (var cachedKey in _keyCache.Values)
            {
                cachedKey.Dispose();
            }
            _keyCache.Clear();
        }

        await _dbContext.SaveChangesAsync(ct);

        // Clean up old expired keys from database
        // Note: DateTimeOffset comparisons don't translate well in SQLite provider
        var allKeysForCleanup = await _dbContext.SigningKeys.ToListAsync(ct);
        var expiredKeys = allKeysForCleanup
            .Where(k => k.ExpiredAt != null && k.ExpiredAt < now)
            .ToList();

        if (expiredKeys.Count > 0)
        {
            _dbContext.SigningKeys.RemoveRange(expiredKeys);
            await _dbContext.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Rotated signing keys. New key: {NewKeyId}, Expired cleaned: {ExpiredCount}",
            _currentKeyId, expiredKeys.Count);

        // Invalidate cached manifests that include signing keys
        await _cacheService.RemoveByTagAsync("protocols", ct);
    }

    private void EnsureInitialized()
    {
        if (_initialized) return;

        lock (_keyLock)
        {
            if (_initialized) return;

            // Check if there's an active key in the database
            var activeKey = _dbContext.SigningKeys
                .AsNoTracking()
                .FirstOrDefault(k => k.IsActive);

            if (activeKey != null)
            {
                _currentKeyId = activeKey.KeyId;
                _logger.LogInformation("SigningKeyStore loaded active key {KeyId} from database", _currentKeyId);
            }
            else
            {
                // No active key exists, create initial key
                CreateInitialKey();
            }

            _initialized = true;
        }
    }

    private async Task EnsureInitializedAsync(CancellationToken ct = default)
    {
        if (_initialized) return;

        // Check if there's an active key in the database
        var activeKey = await _dbContext.SigningKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.IsActive, ct);

        lock (_keyLock)
        {
            if (_initialized) return;

            if (activeKey != null)
            {
                _currentKeyId = activeKey.KeyId;
                _logger.LogInformation("SigningKeyStore loaded active key {KeyId} from database", _currentKeyId);
            }
            else
            {
                // No active key exists, create initial key
                CreateInitialKey();
            }

            _initialized = true;
        }
    }

    private void CreateInitialKey()
    {
        var keyId = GenerateKeyId();
        var (privateKey, publicKeyX, publicKeyY) = GenerateKeyMaterial();

        var signingKey = new SigningKey
        {
            KeyId = keyId,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            PrivateKeyPem = privateKey,
            PublicKeyX = publicKeyX,
            PublicKeyY = publicKeyY
        };

        _dbContext.SigningKeys.Add(signingKey);
        _dbContext.SaveChanges();

        _currentKeyId = keyId;
        _logger.LogInformation("SigningKeyStore created initial key {KeyId}", keyId);
    }

    private static (string PrivateKeyPem, string PublicKeyX, string PublicKeyY) GenerateKeyMaterial()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var privateKeyPem = key.ExportPkcs8PrivateKeyPem();
        var parameters = key.ExportParameters(includePrivateParameters: false);

        return (
            privateKeyPem,
            Base64UrlEncoder.Encode(parameters.Q.X!),
            Base64UrlEncoder.Encode(parameters.Q.Y!)
        );
    }

    private static ECDsa ImportPrivateKey(string privateKeyPem)
    {
        var key = ECDsa.Create();
        key.ImportFromPem(privateKeyPem);
        return key;
    }

    private static string GenerateKeyId()
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        return $"key-{date}-{suffix}";
    }
}
