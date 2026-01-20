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
    public void Parse_IsCaseInsensitive()
    {
        // Arrange
        var headerValue = "PROFILE=\"https://example.com\", VERSION=\"2026-01-11\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result.ShouldContainKey("version");
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
    public void Parse_WithSpacesAroundEquals_TrimsCorrectly()
    {
        // Arrange
        var headerValue = "profile = \"https://example.com\" , version = \"1.0\"";

        // Act
        var result = UcpAgentHeaderParser.Parse(headerValue);

        // Assert
        result.ShouldContainKey("profile");
        result["profile"].ShouldBe("https://example.com");
    }
}
