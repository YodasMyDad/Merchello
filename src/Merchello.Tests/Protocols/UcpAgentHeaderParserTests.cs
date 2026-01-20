using Merchello.Core.Protocols.Authentication;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for RFC 8941 Dictionary Structured Field parsing of UCP-Agent header.
/// </summary>
public class UcpAgentHeaderParserTests
{
    [Fact]
    public void Parse_WithProfileOnly_ExtractsUri()
    {
        // Arrange
        var headerValue = "profile=\"https://platform.example/profile\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result["profile"].ShouldBe("https://platform.example/profile");
    }

    [Fact]
    public void Parse_WithProfileAndVersion_ExtractsBoth()
    {
        // Arrange
        var headerValue = "profile=\"https://platform.example/profile\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result.ShouldContainKey("version");
        result["profile"].ShouldBe("https://platform.example/profile");
        result["version"].ShouldBe("2026-01-11");
    }

    [Fact]
    public void Parse_WithEmptyString_ReturnsEmptyDictionary()
    {
        // Arrange
        var headerValue = "";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public void Parse_WithWhitespace_ReturnsEmptyDictionary()
    {
        // Arrange
        var headerValue = "   ";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public void Parse_WithNullString_ReturnsEmptyDictionary()
    {
        // Arrange
        string headerValue = null!;

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public void Parse_WithUnquotedValue_ExtractsCorrectly()
    {
        // Arrange
        var headerValue = "profile=https://example.com";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result["profile"].ShouldBe("https://example.com");
    }

    [Fact]
    public void Parse_WithMultipleMembers_ExtractsAll()
    {
        // Arrange
        var headerValue = "profile=\"https://example.com\", version=\"2026-01-11\", capabilities=\"checkout,order\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.Count.ShouldBe(3);
        result["profile"].ShouldBe("https://example.com");
        result["version"].ShouldBe("2026-01-11");
        result["capabilities"].ShouldBe("checkout,order");
    }

    [Fact]
    public void Parse_WithLowercaseKeys_ExtractsCorrectly()
    {
        // Arrange - RFC 8941 keys must be lowercase
        var headerValue = "profile=\"https://example.com\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result.ShouldContainKey("version");
    }

    [Fact]
    public void Parse_LookupIsCaseInsensitive()
    {
        // Arrange - Keys stored as-is but lookup is case-insensitive
        var headerValue = "profile=\"https://example.com\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert - Can look up with any case
        result.ShouldContainKey("PROFILE");
        result.ShouldContainKey("Profile");
        result.ShouldContainKey("VERSION");
    }

    [Fact]
    public void GetProfileUri_WithValidHeader_ReturnsProfile()
    {
        // Arrange
        var headerValue = "profile=\"https://gemini.google.com/agent\"";

        // Act
        var result = UcpAgentHeaderParser.GetProfileUri(headerValue);

        // Assert
        result.ShouldBe("https://gemini.google.com/agent");
    }

    [Fact]
    public void GetProfileUri_WithMissingProfile_ReturnsNull()
    {
        // Arrange
        var headerValue = "version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.GetProfileUri(headerValue);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void GetVersion_WithValidHeader_ReturnsVersion()
    {
        // Arrange
        var headerValue = "profile=\"https://example.com\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.GetVersion(headerValue);

        // Assert
        result.ShouldBe("2026-01-11");
    }

    [Fact]
    public void GetVersion_WithMissingVersion_ReturnsNull()
    {
        // Arrange
        var headerValue = "profile=\"https://example.com\"";

        // Act
        var result = UcpAgentHeaderParser.GetVersion(headerValue);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ParseAgentInfo_WithValidHeader_ReturnsAgentInfo()
    {
        // Arrange
        var headerValue = "profile=\"https://gemini.google.com/agent\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.ParseAgentInfo(headerValue);

        // Assert
        result.ShouldNotBeNull();
        result.ProfileUri.ShouldBe("https://gemini.google.com/agent");
        result.Version.ShouldBe("2026-01-11");
    }

    [Fact]
    public void ParseAgentInfo_WithProfileOnly_ReturnsAgentInfo()
    {
        // Arrange
        var headerValue = "profile=\"https://example.com\"";

        // Act
        var result = UcpAgentHeaderParser.ParseAgentInfo(headerValue);

        // Assert
        result.ShouldNotBeNull();
        result.ProfileUri.ShouldBe("https://example.com");
        result.Version.ShouldBeNull();
    }

    [Fact]
    public void ParseAgentInfo_WithMissingProfile_ReturnsNull()
    {
        // Arrange
        var headerValue = "version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.ParseAgentInfo(headerValue);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ParseAgentInfo_WithEmptyProfile_ReturnsNull()
    {
        // Arrange
        var headerValue = "profile=\"\", version=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.ParseAgentInfo(headerValue);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ParseAgentInfo_WithInvalidFormat_ReturnsNull()
    {
        // Arrange
        var headerValue = "invalid header format";

        // Act
        var result = UcpAgentHeaderParser.ParseAgentInfo(headerValue);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void Parse_WithCommaInQuotedValue_ParsesCorrectly()
    {
        // Arrange - comma inside quoted string should not split
        var headerValue = "profile=\"https://example.com/path,with,commas\", version=\"1.0\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.Count.ShouldBe(2);
        result["profile"].ShouldBe("https://example.com/path,with,commas");
        result["version"].ShouldBe("1.0");
    }

    [Fact]
    public void Parse_WithSpacesAroundEquals_ReturnsEmpty_Rfc8941Strict()
    {
        // Arrange - RFC 8941 does NOT allow spaces around the equals sign
        // This is intentionally different from lenient HTTP parsing
        var headerValue = "profile = \"https://example.com\" , version = \"1.0\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert - RFC 8941 strict parser rejects invalid syntax
        result.ShouldBeEmpty();
    }

    [Fact]
    public void Parse_WithSpaceAfterComma_ParsesCorrectly()
    {
        // Arrange - RFC 8941 allows optional whitespace after comma separator
        var headerValue = "profile=\"https://example.com\",  version=\"1.0\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result.ShouldContainKey("version");
        result["profile"].ShouldBe("https://example.com");
        result["version"].ShouldBe("1.0");
    }

    // RFC 8941 Advanced Type Tests (now supported via StructuredFieldValues package)

    [Fact]
    public void Parse_WithIntegerValue_ConvertsToString()
    {
        // Arrange - RFC 8941 integers are bare numbers
        var headerValue = "profile=\"https://example.com\", priority=5";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("priority");
        result["priority"].ShouldBe("5");
    }

    [Fact]
    public void Parse_WithBooleanTrue_ConvertsToRfc8941Format()
    {
        // Arrange - RFC 8941 boolean true is ?1
        var headerValue = "profile=\"https://example.com\", enabled=?1";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("enabled");
        result["enabled"].ShouldBe("?1");
    }

    [Fact]
    public void Parse_WithBooleanFalse_ConvertsToRfc8941Format()
    {
        // Arrange - RFC 8941 boolean false is ?0
        var headerValue = "profile=\"https://example.com\", debug=?0";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("debug");
        result["debug"].ShouldBe("?0");
    }

    [Fact]
    public void Parse_WithTokenValue_ExtractsCorrectly()
    {
        // Arrange - RFC 8941 tokens are unquoted alphanumeric identifiers
        var headerValue = "profile=\"https://example.com\", type=checkout";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("type");
        result["type"].ShouldBe("checkout");
    }

    [Fact]
    public void Parse_WithDecimalValue_ConvertsToString()
    {
        // Arrange - RFC 8941 decimals have up to 3 decimal places
        var headerValue = "profile=\"https://example.com\", rate=0.75";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("rate");
        result["rate"].ShouldBe("0.75");
    }

    [Fact]
    public void Parse_WithMixedTypes_ExtractsAll()
    {
        // Arrange - Mix of strings, integers, booleans, and tokens
        var headerValue = "profile=\"https://example.com\", version=\"2026-01-11\", priority=10, enabled=?1, mode=production";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.Count.ShouldBe(5);
        result["profile"].ShouldBe("https://example.com");
        result["version"].ShouldBe("2026-01-11");
        result["priority"].ShouldBe("10");
        result["enabled"].ShouldBe("?1");
        result["mode"].ShouldBe("production");
    }

    [Fact]
    public void Parse_WithMalformedInput_ReturnsEmptyDictionary()
    {
        // Arrange - Invalid RFC 8941 format
        var headerValue = "===invalid===";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldBeEmpty();
    }
}
