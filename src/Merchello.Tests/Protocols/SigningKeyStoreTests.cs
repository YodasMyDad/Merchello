using System.Security.Cryptography;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Tests.TestInfrastructure;
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
    public void GetCurrentKeyId_ReturnsValidKeyId()
    {
        // Act
        var keyId = _keyStore.GetCurrentKeyId();

        // Assert
        keyId.ShouldNotBeNullOrWhiteSpace();
        keyId.ShouldStartWith("key-");
    }

    [Fact]
    public void GetCurrentKeyId_ReturnsConsistentValue()
    {
        // Act
        var keyId1 = _keyStore.GetCurrentKeyId();
        var keyId2 = _keyStore.GetCurrentKeyId();

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
    public void GetEcdsaPrivateKey_WithValidKeyId_ReturnsKey()
    {
        // Arrange
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var key = _keyStore.GetEcdsaPrivateKey(keyId);

        // Assert
        key.ShouldNotBeNull();
        key.KeySize.ShouldBe(256); // P-256 curve
    }

    [Fact]
    public void GetEcdsaPrivateKey_WithInvalidKeyId_ThrowsKeyNotFoundException()
    {
        // Arrange
        var invalidKeyId = "key-invalid-12345678";

        // Act & Assert
        Should.Throw<KeyNotFoundException>(() => _keyStore.GetEcdsaPrivateKey(invalidKeyId));
    }

    [Fact]
    public async Task RotateKeysAsync_GeneratesNewKey()
    {
        // Arrange
        var originalKeyId = _keyStore.GetCurrentKeyId();

        // Act
        await _keyStore.RotateKeysAsync();
        var newKeyId = _keyStore.GetCurrentKeyId();

        // Assert
        newKeyId.ShouldNotBe(originalKeyId);
        newKeyId.ShouldStartWith("key-");
    }

    [Fact]
    public async Task RotateKeysAsync_KeepsOldKeyForGracePeriod()
    {
        // Arrange
        var originalKeyId = _keyStore.GetCurrentKeyId();

        // Act
        await _keyStore.RotateKeysAsync();

        // Assert - old key should still be available (within grace period)
        var oldKey = _keyStore.GetEcdsaPrivateKey(originalKeyId);
        oldKey.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetPublicKeysAsync_AfterRotation_IncludesBothKeys()
    {
        // Arrange
        var originalKeyId = _keyStore.GetCurrentKeyId();

        // Act
        await _keyStore.RotateKeysAsync();
        var publicKeys = await _keyStore.GetPublicKeysAsync();
        var newKeyId = _keyStore.GetCurrentKeyId();

        // Assert
        publicKeys.Count.ShouldBeGreaterThanOrEqualTo(2);
        publicKeys.ShouldContain(k => k.Kid == originalKeyId);
        publicKeys.ShouldContain(k => k.Kid == newKeyId);
    }

    [Fact]
    public void GetEcdsaPrivateKey_CanSignAndVerify()
    {
        // Arrange
        var keyId = _keyStore.GetCurrentKeyId();
        var key = _keyStore.GetEcdsaPrivateKey(keyId);
        var data = System.Text.Encoding.UTF8.GetBytes("test payload");

        // Act
        var signature = key.SignData(data, HashAlgorithmName.SHA256);
        var isValid = key.VerifyData(data, signature, HashAlgorithmName.SHA256);

        // Assert
        isValid.ShouldBeTrue();
    }

    [Fact]
    public void KeyId_FollowsExpectedFormat()
    {
        // Act
        var keyId = _keyStore.GetCurrentKeyId();

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
        var keyId1 = _keyStore.GetCurrentKeyId();

        // Act - create a new scope and get key ID
        using var scope2 = _fixture.CreateScope();
        var keyStore2 = scope2.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var keyId2 = keyStore2.GetCurrentKeyId();

        // Assert - both should have the same active key (persisted in database)
        keyId2.ShouldBe(keyId1);
    }

    [Fact]
    public async Task RotateKeysAsync_PersistsNewKeyToDatabase()
    {
        // Arrange
        var originalKeyId = _keyStore.GetCurrentKeyId();
        await _keyStore.RotateKeysAsync();
        var newKeyId = _keyStore.GetCurrentKeyId();

        // Act - create a new scope and verify the new key is there
        using var scope2 = _fixture.CreateScope();
        var keyStore2 = scope2.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var keyIdFromNewScope = keyStore2.GetCurrentKeyId();

        // Assert
        keyIdFromNewScope.ShouldBe(newKeyId);
        keyIdFromNewScope.ShouldNotBe(originalKeyId);
    }
}
