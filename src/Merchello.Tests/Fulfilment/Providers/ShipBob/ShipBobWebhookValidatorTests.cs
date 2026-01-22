using System.Security.Cryptography;
using System.Text;
using Merchello.Core.Fulfilment.Providers.ShipBob;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.ShipBob;

public class ShipBobWebhookValidatorTests
{
    private const string TestSecret = "whsec_test123456789abcdefghijklmnop";
    private readonly ShipBobWebhookValidator _validator = new();

    #region Valid Signature Tests

    [Fact]
    public void Validate_WithValidSignature_ReturnsSuccess()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{"id":12345}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_123abc456def";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeTrue();
        result.MessageId.ShouldBe(messageId);
        result.ErrorMessage.ShouldBeNull();
    }

    [Fact]
    public void Validate_WithLowercaseHeaders_ReturnsSuccess()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            ["webhook-signature"] = $"v1,{signature}",
            ["webhook-timestamp"] = timestamp.ToString(),
            ["webhook-id"] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeTrue();
    }

    #endregion

    #region Invalid Signature Tests

    [Fact]
    public void Validate_WithInvalidSignature_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,InvalidSignatureHere",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid signature");
    }

    [Fact]
    public void Validate_WithTamperedBody_ReturnsFailed()
    {
        // Arrange - Sign one body, validate with different body
        var originalBody = """{"topic":"order.shipped","data":{"id":12345}}""";
        var tamperedBody = """{"topic":"order.shipped","data":{"id":99999}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        var signedPayload = $"{messageId}.{timestamp}.{originalBody}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, tamperedBody, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid signature");
    }

    [Fact]
    public void Validate_WithWrongSecret_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        // Sign with one secret
        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Validate with different secret
        var result = _validator.Validate(headers, body, "different_secret");

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid signature");
    }

    #endregion

    #region Missing Header Tests

    [Fact]
    public void Validate_MissingSignatureHeader_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.TimestampHeader] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = "msg_test"
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("webhook-signature");
    }

    [Fact]
    public void Validate_MissingTimestampHeader_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,test",
            [ShipBobWebhookValidator.MessageIdHeader] = "msg_test"
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("webhook-timestamp");
    }

    [Fact]
    public void Validate_MissingMessageIdHeader_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,test",
            [ShipBobWebhookValidator.TimestampHeader] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("webhook-id");
    }

    #endregion

    #region Timestamp Validation Tests

    [Fact]
    public void Validate_WithExpiredTimestamp_ReturnsFailed()
    {
        // Arrange - 10 minutes old (max is 5 minutes)
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds();
        var messageId = "msg_test";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("expired");
    }

    [Fact]
    public void Validate_WithFutureTimestamp_ReturnsFailed()
    {
        // Arrange - 5 minutes in the future
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeSeconds();
        var messageId = "msg_test";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("future");
    }

    [Fact]
    public void Validate_WithInvalidTimestampFormat_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,test",
            [ShipBobWebhookValidator.TimestampHeader] = "not_a_number",
            [ShipBobWebhookValidator.MessageIdHeader] = "msg_test"
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid timestamp format");
    }

    [Fact]
    public void Validate_WithRecentTimestamp_ReturnsSuccess()
    {
        // Arrange - 2 minutes ago (within 5 minute window)
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.AddMinutes(-2).ToUnixTimeSeconds();
        var messageId = "msg_test";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeTrue();
    }

    #endregion

    #region Signature Format Tests

    [Fact]
    public void Validate_WithInvalidSignatureFormat_ReturnsFailed()
    {
        // Arrange - Missing v1 prefix
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "just_a_signature_no_version",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid signature format");
    }

    [Fact]
    public void Validate_WithWrongSignatureVersion_ReturnsFailed()
    {
        // Arrange - v2 instead of v1
        var body = """{"topic":"order.shipped","data":{}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_test";

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v2,someSignature",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid signature format");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Validate_WithEmptySecret_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,test",
            [ShipBobWebhookValidator.TimestampHeader] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = "msg_test"
        };

        // Act
        var result = _validator.Validate(headers, body, "");

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("secret");
    }

    [Fact]
    public void Validate_WithNullSecret_ReturnsFailed()
    {
        // Arrange
        var body = """{"topic":"order.shipped","data":{}}""";
        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = "v1,test",
            [ShipBobWebhookValidator.TimestampHeader] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = "msg_test"
        };

        // Act
        var result = _validator.Validate(headers, body, null!);

        // Assert
        result.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Validate_WithUnicodeBody_ReturnsSuccess()
    {
        // Arrange - Body with unicode characters
        var body = """{"topic":"order.shipped","data":{"name":"日本語テスト","emoji":"🎉"}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var messageId = "msg_unicode";

        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var signature = ComputeHmacSha256(signedPayload, TestSecret);

        var headers = new Dictionary<string, string>
        {
            [ShipBobWebhookValidator.SignatureHeader] = $"v1,{signature}",
            [ShipBobWebhookValidator.TimestampHeader] = timestamp.ToString(),
            [ShipBobWebhookValidator.MessageIdHeader] = messageId
        };

        // Act
        var result = _validator.Validate(headers, body, TestSecret);

        // Assert
        result.IsValid.ShouldBeTrue();
    }

    #endregion

    #region Helper Methods

    private static string ComputeHmacSha256(string payload, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(payloadBytes);
        return Convert.ToBase64String(hashBytes);
    }

    #endregion
}
