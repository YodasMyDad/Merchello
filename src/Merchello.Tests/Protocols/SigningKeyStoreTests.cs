using System.Security.Cryptography;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for P-256 ECDSA signing key management with database persistence.
/// </summary>
[Collection("ServiceTests")]
public class SigningKeyStoreTests : IAsyncLifetime
{
    private readonly ServiceTestFixture _fixture;
    private IServiceScope _scope = null!;
    private ISigningKeyStore _keyStore = null!;

    public SigningKeyStoreTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync()
    {
        _scope = _fixture.CreateScope();
        _keyStore = _scope.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        _scope.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GetCurrentKeyIdAsync_ReturnsValidKeyId()
    {
        // Act
        var keyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        keyId.ShouldNotBeNullOrWhiteSpace();
        keyId.ShouldStartWith("key-");
    }

    [Fact]
    public async Task GetCurrentKeyIdAsync_ReturnsConsistentValue()
    {
        // Act
        var keyId1 = await _keyStore.GetCurrentKeyIdAsync();
        var keyId2 = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        keyId1.ShouldBe(keyId2);
    }

    [Fact]
    public async Task GetPublicKeysAsync_ReturnsJwkFormat()
    {
        // Act
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Assert
        publicKeys.ShouldNotBeEmpty();

        var jwk = publicKeys.First();
        jwk.Kty.ShouldBe("EC");
        jwk.Crv.ShouldBe("P-256");
        jwk.Use.ShouldBe("sig");
        jwk.Alg.ShouldBe("ES256");
    }

    [Fact]
    public async Task GetPublicKeysAsync_IncludesKeyId()
    {
        // Act
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Assert
        var jwk = publicKeys.First();
        jwk.Kid.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetPublicKeysAsync_IncludesXAndYCoordinates()
    {
        // Act
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Assert
        var jwk = publicKeys.First();
        jwk.X.ShouldNotBeNullOrWhiteSpace();
        jwk.Y.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetEcdsaPrivateKeyAsync_WithValidKeyId_ReturnsKey()
    {
        // Arrange
        var keyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act
        var key = await _keyStore.GetEcdsaPrivateKeyAsync(keyId);

        // Assert
        key.ShouldNotBeNull();
        key.KeySize.ShouldBe(256); // P-256 curve
    }

    [Fact]
    public async Task GetEcdsaPrivateKeyAsync_WithInvalidKeyId_ThrowsKeyNotFoundException()
    {
        // Arrange
        var invalidKeyId = "key-invalid-12345678";

        // Act & Assert
        await Should.ThrowAsync<KeyNotFoundException>(async () =>
            await _keyStore.GetEcdsaPrivateKeyAsync(invalidKeyId));
    }

    [Fact]
    public async Task RotateKeysAsync_GeneratesNewKey()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act
        await _keyStore.RotateKeysAsync();
        var newKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        newKeyId.ShouldNotBe(originalKeyId);
        newKeyId.ShouldStartWith("key-");
    }

    [Fact]
    public async Task RotateKeysAsync_KeepsOldKeyForGracePeriod()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act
        await _keyStore.RotateKeysAsync();

        // Assert - old key should still be available (within grace period)
        var oldKey = await _keyStore.GetEcdsaPrivateKeyAsync(originalKeyId);
        oldKey.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetPublicKeysAsync_AfterRotation_IncludesBothKeys()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act
        await _keyStore.RotateKeysAsync();
        var publicKeys = await _keyStore.GetPublicKeysAsync();
        var newKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        publicKeys.Count.ShouldBeGreaterThanOrEqualTo(2);
        publicKeys.ShouldContain(k => k.Kid == originalKeyId);
        publicKeys.ShouldContain(k => k.Kid == newKeyId);
    }

    [Fact]
    public async Task GetEcdsaPrivateKeyAsync_CanSignAndVerify()
    {
        // Arrange
        var keyId = await _keyStore.GetCurrentKeyIdAsync();
        var key = await _keyStore.GetEcdsaPrivateKeyAsync(keyId);
        var data = System.Text.Encoding.UTF8.GetBytes("test payload");

        // Act
        var signature = key.SignData(data, HashAlgorithmName.SHA256);
        var isValid = key.VerifyData(data, signature, HashAlgorithmName.SHA256);

        // Assert
        isValid.ShouldBeTrue();
    }

    [Fact]
    public async Task KeyId_FollowsExpectedFormat()
    {
        // Act
        var keyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert - format should be "key-YYYY-MM-XXXXXXXX"
        var parts = keyId.Split('-');
        parts.Length.ShouldBe(4);
        parts[0].ShouldBe("key");
        parts[1].Length.ShouldBe(4); // year
        parts[2].Length.ShouldBe(2); // month
        parts[3].Length.ShouldBe(8); // random suffix
    }

    [Fact]
    public async Task Keys_PersistedAcrossScopes()
    {
        // Arrange - get key ID from first scope
        var keyId1 = await _keyStore.GetCurrentKeyIdAsync();

        // Act - create a new scope and get key ID
        using var scope2 = _fixture.CreateScope();
        var keyStore2 = scope2.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var keyId2 = await keyStore2.GetCurrentKeyIdAsync();

        // Assert - both should have the same active key (persisted in database)
        keyId2.ShouldBe(keyId1);
    }

    [Fact]
    public async Task RotateKeysAsync_PersistsNewKeyToDatabase()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();
        await _keyStore.RotateKeysAsync();
        var newKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act - create a new scope and verify the new key is there
        using var scope2 = _fixture.CreateScope();
        var keyStore2 = scope2.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var keyIdFromNewScope = await keyStore2.GetCurrentKeyIdAsync();

        // Assert
        keyIdFromNewScope.ShouldBe(newKeyId);
        keyIdFromNewScope.ShouldNotBe(originalKeyId);
    }

    [Fact]
    public async Task RotateKeysIfDueAsync_WithNonPositiveDays_DoesNotRotate()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Act
        var rotated = await _keyStore.RotateKeysIfDueAsync(0);
        var currentKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        rotated.ShouldBeFalse();
        currentKeyId.ShouldBe(originalKeyId);
    }

    [Fact]
    public async Task RotateKeysIfDueAsync_WhenActiveKeyNotDue_DoesNotRotate()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();
        await SetActiveKeyCreatedAtAsync(DateTimeOffset.UtcNow);

        // Act
        var rotated = await _keyStore.RotateKeysIfDueAsync(90);
        var currentKeyId = await _keyStore.GetCurrentKeyIdAsync();

        // Assert
        rotated.ShouldBeFalse();
        currentKeyId.ShouldBe(originalKeyId);
    }

    [Fact]
    public async Task RotateKeysIfDueAsync_WhenActiveKeyIsDue_RotatesAndPreservesOverlapKeys()
    {
        // Arrange
        var originalKeyId = await _keyStore.GetCurrentKeyIdAsync();
        await SetActiveKeyCreatedAtAsync(DateTimeOffset.UtcNow.AddDays(-91));

        // Act
        var rotated = await _keyStore.RotateKeysIfDueAsync(90);
        var newKeyId = await _keyStore.GetCurrentKeyIdAsync();
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Assert
        rotated.ShouldBeTrue();
        newKeyId.ShouldNotBe(originalKeyId);
        publicKeys.ShouldContain(k => k.Kid == originalKeyId);
        publicKeys.ShouldContain(k => k.Kid == newKeyId);
    }

    private async Task SetActiveKeyCreatedAtAsync(DateTimeOffset createdAtUtc)
    {
        using var db = _fixture.CreateDbContext();
        var activeKey = await db.SigningKeys.FirstAsync(k => k.IsActive);
        activeKey.CreatedAt = createdAtUtc;
        await db.SaveChangesAsync();
    }
}
