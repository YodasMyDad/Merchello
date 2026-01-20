using System.Security.Cryptography;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for P-256 ECDSA signing key management.
/// </summary>
public class SigningKeyStoreTests : IDisposable
{
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<ILogger<SigningKeyStore>> _loggerMock;
    private readonly SigningKeyStore _keyStore;

    public SigningKeyStoreTests()
    {
        _cacheServiceMock = new Mock<ICacheService>();
        _cacheServiceMock
            .Setup(x => x.RemoveByTagAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _loggerMock = new Mock<ILogger<SigningKeyStore>>();

        _keyStore = new SigningKeyStore(_cacheServiceMock.Object, _loggerMock.Object);
    }

    public void Dispose()
    {
        _keyStore.Dispose();
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
        publicKeys.Count.ShouldBe(1);

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
        jwk.Kid.ShouldBe(_keyStore.GetCurrentKeyId());
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
    public async Task RotateKeysAsync_InvalidatesCacheByTag()
    {
        // Act
        await _keyStore.RotateKeysAsync();

        // Assert
        _cacheServiceMock.Verify(
            x => x.RemoveByTagAsync("protocols", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RotateKeysAsync_MultipleRotations_IncrementsKeyCount()
    {
        // Arrange & Act
        await _keyStore.RotateKeysAsync();
        await _keyStore.RotateKeysAsync();

        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Assert - should have 3 keys: original + 2 rotations (all within grace period)
        publicKeys.Count.ShouldBe(3);
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
        publicKeys.Count.ShouldBe(2);
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
    public void Dispose_DisposesKeys()
    {
        // Arrange
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        _keyStore.Dispose();

        // Assert - calling GetCurrentKeyId after dispose should work (just returns cached string)
        // But attempting to use the key should fail
        Should.Throw<KeyNotFoundException>(() => _keyStore.GetEcdsaPrivateKey(keyId));
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
}
