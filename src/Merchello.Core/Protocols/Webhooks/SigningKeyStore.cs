using System.Security.Cryptography;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Protocols.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Umbraco.Cms.Persistence.EFCore.Scoping;

using Merchello.Core.Protocols.Webhooks.Interfaces;

namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Manages ECDSA signing keys for webhook signatures.
/// Keys are persisted in the database with in-memory caching for performance.
/// </summary>
public class SigningKeyStore(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ICacheService cacheService,
    ILogger<SigningKeyStore> logger) : ISigningKeyStore, IDisposable
{
    private readonly SemaphoreSlim _keyLock = new(1, 1);

    // In-memory cache of loaded ECDsa keys for fast signing operations
    private readonly Dictionary<string, ECDsa> _keyCache = new();
    private string? _currentKeyId;
    private bool _initialized;
    private bool _disposed;

    /// <summary>
    /// Disposes all cached ECDsa keys.
    /// </summary>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _keyLock.Wait();
        try
        {
            if (_disposed)
            {
                return;
            }

            foreach (var key in _keyCache.Values)
            {
                key.Dispose();
            }
            _keyCache.Clear();
            _disposed = true;
        }
        finally
        {
            _keyLock.Release();
        }

        _keyLock.Dispose();
        GC.SuppressFinalize(this);
    }

    /// <inheritdoc />
    public async Task<ECDsa> GetEcdsaPrivateKeyAsync(string keyId, CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await EnsureInitializedAsync(ct);

        await _keyLock.WaitAsync(ct);
        try
        {
            // Check in-memory cache first
            if (_keyCache.TryGetValue(keyId, out var cachedKey))
            {
                return cachedKey;
            }

            // Load from database using scope
            using var scope = efCoreScopeProvider.CreateScope();
            var signingKey = await scope.ExecuteWithContextAsync(async db =>
                await db.SigningKeys
                    .AsNoTracking()
                    .FirstOrDefaultAsync(k => k.KeyId == keyId, ct));
            scope.Complete();

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
        finally
        {
            _keyLock.Release();
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
        using var scope = efCoreScopeProvider.CreateScope();
        var allKeys = await scope.ExecuteWithContextAsync(async db =>
            await db.SigningKeys
                .AsNoTracking()
                .ToListAsync(ct));
        scope.Complete();

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
    public async Task<string> GetCurrentKeyIdAsync(CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await EnsureInitializedAsync(ct);

        await _keyLock.WaitAsync(ct);
        try
        {
            return _currentKeyId!;
        }
        finally
        {
            _keyLock.Release();
        }
    }

    /// <inheritdoc />
    public async Task RotateKeysAsync(CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await EnsureInitializedAsync(ct);

        var gracePeriod = TimeSpan.FromHours(24);
        var now = DateTimeOffset.UtcNow;
        var newKeyId = GenerateKeyId();
        var (privateKey, publicKeyX, publicKeyY) = GenerateKeyMaterial();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Mark current active key as expiring
            var currentKey = await db.SigningKeys.FirstOrDefaultAsync(k => k.IsActive, ct);
            if (currentKey != null)
            {
                currentKey.IsActive = false;
                currentKey.ExpiredAt = now.Add(gracePeriod);
            }

            // Generate new key
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

            db.SigningKeys.Add(newSigningKey);
            await db.SaveChangesAsync(ct);

            // Clean up old expired keys from database
            // Note: DateTimeOffset comparisons don't translate well in SQLite provider
            var allKeysForCleanup = await db.SigningKeys.ToListAsync(ct);
            var expiredKeys = allKeysForCleanup
                .Where(k => k.ExpiredAt != null && k.ExpiredAt < now)
                .ToList();

            if (expiredKeys.Count > 0)
            {
                db.SigningKeys.RemoveRange(expiredKeys);
                await db.SaveChangesAsync(ct);
            }

            logger.LogInformation("Rotated signing keys. New key: {NewKeyId}, Expired cleaned: {ExpiredCount}",
                newKeyId, expiredKeys.Count);
            return true;
        });
        scope.Complete();

        await _keyLock.WaitAsync(ct);
        try
        {
            _currentKeyId = newKeyId;

            // Dispose and clear in-memory cache for rotated keys
            foreach (var cachedKey in _keyCache.Values)
            {
                cachedKey.Dispose();
            }
            _keyCache.Clear();
        }
        finally
        {
            _keyLock.Release();
        }

        // Invalidate cached manifests that include signing keys
        await cacheService.RemoveByTagAsync("protocols", ct);
    }

    private async Task EnsureInitializedAsync(CancellationToken ct = default)
    {
        if (_initialized)
        {
            return;
        }

        await _keyLock.WaitAsync(ct);
        try
        {
            if (_initialized)
            {
                return;
            }

            // Check if there's an active key in the database
            using var scope = efCoreScopeProvider.CreateScope();
            var activeKey = await scope.ExecuteWithContextAsync(async db =>
                await db.SigningKeys
                    .AsNoTracking()
                    .FirstOrDefaultAsync(k => k.IsActive, ct));

            if (activeKey != null)
            {
                _currentKeyId = activeKey.KeyId;
                logger.LogInformation("SigningKeyStore loaded active key {KeyId} from database", _currentKeyId);
                scope.Complete();
            }
            else
            {
                // No active key exists, create initial key
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

                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    db.SigningKeys.Add(signingKey);
                    await db.SaveChangesAsync(ct);
                    return true;
                });
                scope.Complete();

                _currentKeyId = keyId;
                logger.LogInformation("SigningKeyStore created initial key {KeyId}", keyId);
            }

            _initialized = true;
        }
        finally
        {
            _keyLock.Release();
        }
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
