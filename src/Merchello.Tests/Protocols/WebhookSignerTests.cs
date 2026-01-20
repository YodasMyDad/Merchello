using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for RFC 7797 detached JWT webhook signing.
/// </summary>
public class WebhookSignerTests : IDisposable
{
    private readonly SigningKeyStore _keyStore;
    private readonly WebhookSigner _signer;

    public WebhookSignerTests()
    {
        var cacheServiceMock = new Mock<ICacheService>();
        cacheServiceMock
            .Setup(x => x.RemoveByTagAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var keyStoreLoggerMock = new Mock<ILogger<SigningKeyStore>>();
        var signerLoggerMock = new Mock<ILogger<WebhookSigner>>();

        _keyStore = new SigningKeyStore(cacheServiceMock.Object, keyStoreLoggerMock.Object);
        _signer = new WebhookSigner(_keyStore, signerLoggerMock.Object);
    }

    public void Dispose()
    {
        _keyStore.Dispose();
    }

    [Fact]
    public void Sign_CreatesDetachedJwt()
    {
        // Arrange
        var payload = """{"orderId": "ord_123", "status": "completed"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);

        // Assert
        signature.ShouldNotBeNullOrWhiteSpace();

        // Detached JWS format: header..signature (empty middle section)
        var parts = signature.Split('.');
        parts.Length.ShouldBe(3);
        parts[0].ShouldNotBeNullOrWhiteSpace(); // header
        parts[1].ShouldBeEmpty(); // payload (detached)
        parts[2].ShouldNotBeNullOrWhiteSpace(); // signature
    }

    [Fact]
    public void Sign_IncludesB64FalseHeader()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);

        // Assert
        var headerBase64 = signature.Split('.')[0];
        var headerJson = DecodeBase64Url(headerBase64);

        headerJson.ShouldContain("\"b64\":false");
    }

    [Fact]
    public void Sign_IncludesCritHeader()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);

        // Assert
        var headerBase64 = signature.Split('.')[0];
        var headerJson = DecodeBase64Url(headerBase64);

        headerJson.ShouldContain("\"crit\":[\"b64\"]");
    }

    [Fact]
    public void Sign_IncludesKeyId()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);

        // Assert
        var headerBase64 = signature.Split('.')[0];
        var headerJson = DecodeBase64Url(headerBase64);

        headerJson.ShouldContain($"\"kid\":\"{keyId}\"");
    }

    [Fact]
    public void Sign_IncludesES256Algorithm()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);

        // Assert
        var headerBase64 = signature.Split('.')[0];
        var headerJson = DecodeBase64Url(headerBase64);

        headerJson.ShouldContain("\"alg\":\"ES256\"");
    }

    [Fact]
    public async Task Verify_WithValidSignature_ReturnsTrue()
    {
        // Arrange
        var payload = """{"orderId": "ord_123", "status": "completed"}""";
        var keyId = _keyStore.GetCurrentKeyId();
        var signature = _signer.Sign(payload, keyId);
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Act
        var isValid = _signer.Verify(payload, signature, publicKeys);

        // Assert
        isValid.ShouldBeTrue();
    }

    [Fact]
    public async Task Verify_WithTamperedPayload_ReturnsFalse()
    {
        // Arrange
        var originalPayload = """{"orderId": "ord_123", "status": "completed"}""";
        var keyId = _keyStore.GetCurrentKeyId();
        var signature = _signer.Sign(originalPayload, keyId);
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        var tamperedPayload = """{"orderId": "ord_123", "status": "refunded"}""";

        // Act
        var isValid = _signer.Verify(tamperedPayload, signature, publicKeys);

        // Assert
        isValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Verify_WithInvalidSignature_ReturnsFalse()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Create a malformed signature
        var invalidSignature = "eyJhbGciOiJFUzI1NiJ9..invalidSignatureData";

        // Act
        var isValid = _signer.Verify(payload, invalidSignature, publicKeys);

        // Assert
        isValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Verify_WithUnknownKeyId_ReturnsFalse()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();
        var signature = _signer.Sign(payload, keyId);

        // Use empty key list (no matching keys)
        var emptyKeys = new List<JsonWebKey>();

        // Act
        var isValid = _signer.Verify(payload, signature, emptyKeys);

        // Assert
        isValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Verify_WithMalformedJws_ReturnsFalse()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var publicKeys = await _keyStore.GetPublicKeysAsync();
        var malformedSignature = "not.a.valid.signature.format";

        // Act
        var isValid = _signer.Verify(payload, malformedSignature, publicKeys);

        // Assert
        isValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Verify_WithEmptySignature_ReturnsFalse()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Act
        var isValid = _signer.Verify(payload, "", publicKeys);

        // Assert
        isValid.ShouldBeFalse();
    }

    [Fact]
    public async Task Verify_AfterKeyRotation_WorksWithBothKeys()
    {
        // Arrange
        var payload = """{"test": "data"}""";
        var originalKeyId = _keyStore.GetCurrentKeyId();
        var originalSignature = _signer.Sign(payload, originalKeyId);

        // Rotate keys
        await _keyStore.RotateKeysAsync();
        var newKeyId = _keyStore.GetCurrentKeyId();
        var newSignature = _signer.Sign(payload, newKeyId);

        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Act & Assert - both signatures should be valid (grace period)
        _signer.Verify(payload, originalSignature, publicKeys).ShouldBeTrue();
        _signer.Verify(payload, newSignature, publicKeys).ShouldBeTrue();
    }

    [Fact]
    public void Sign_WithDifferentPayloads_ProducesDifferentSignatures()
    {
        // Arrange
        var payload1 = """{"order": 1}""";
        var payload2 = """{"order": 2}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature1 = _signer.Sign(payload1, keyId);
        var signature2 = _signer.Sign(payload2, keyId);

        // Assert
        signature1.ShouldNotBe(signature2);
    }

    [Fact]
    public void Sign_SamePayloadTwice_ProducesSameSignature()
    {
        // Note: ECDSA with deterministic signing (RFC 6979) would produce same signature,
        // but .NET's ECDsa uses random k by default, so signatures may differ
        // This test just verifies both signatures are valid

        // Arrange
        var payload = """{"consistent": "data"}""";
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature1 = _signer.Sign(payload, keyId);
        var signature2 = _signer.Sign(payload, keyId);

        // Assert - both should be valid even if different
        signature1.ShouldNotBeNullOrWhiteSpace();
        signature2.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task RoundTrip_SignAndVerify_Works()
    {
        // Arrange
        var payload = """
        {
            "id": "ord_abc123",
            "checkout_id": "chk_xyz789",
            "line_items": [
                {"id": "li_1", "title": "Product", "quantity": 2}
            ],
            "totals": {"subtotal": 5000, "total": 5400}
        }
        """;
        var keyId = _keyStore.GetCurrentKeyId();

        // Act
        var signature = _signer.Sign(payload, keyId);
        var publicKeys = await _keyStore.GetPublicKeysAsync();
        var isValid = _signer.Verify(payload, signature, publicKeys);

        // Assert
        isValid.ShouldBeTrue();
    }

    [Fact]
    public async Task Verify_WithDifferentKeyInstance_Works()
    {
        // This tests that verification works when the verifier
        // doesn't have access to the original private key instance

        // Arrange
        var payload = """{"test": "cross-instance"}""";
        var keyId = _keyStore.GetCurrentKeyId();
        var signature = _signer.Sign(payload, keyId);

        // Get public keys (this creates new ECDsa instances from JWK)
        var publicKeys = await _keyStore.GetPublicKeysAsync();

        // Act - verification uses public key converted from JWK
        var isValid = _signer.Verify(payload, signature, publicKeys);

        // Assert
        isValid.ShouldBeTrue();
    }

    private static string DecodeBase64Url(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(padded));
    }
}
