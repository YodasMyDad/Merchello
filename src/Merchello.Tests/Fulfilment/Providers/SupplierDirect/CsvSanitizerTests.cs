using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.SupplierDirect;

public class CsvSanitizerTests
{
    [Fact]
    public void SanitizeRemotePath_NormalizesBackslashesAndTraversal()
    {
        var sanitized = CsvSanitizer.SanitizeRemotePath(@"..\incoming\\orders");

        sanitized.ShouldBe("/incoming/orders");
    }

    [Fact]
    public void SanitizeRemotePath_EmptyInput_ReturnsRoot()
    {
        CsvSanitizer.SanitizeRemotePath(string.Empty).ShouldBe("/");
        CsvSanitizer.SanitizeRemotePath("   ").ShouldBe("/");
    }

    [Fact]
    public void SanitizeFileName_RemovesTraversalAndInvalidCharacters()
    {
        var sanitized = CsvSanitizer.SanitizeFileName(@"..\..\ord:123?.csv");

        sanitized.ShouldNotBeNullOrWhiteSpace();
        sanitized.ShouldNotContain("..");
        sanitized.ShouldNotContain(@"\");
        sanitized.ShouldNotContain("/");
        sanitized.ShouldNotContain(":");
        sanitized.ShouldNotContain("?");
    }

    [Theory]
    [InlineData("=2+2")]
    [InlineData("+SUM(A1:A2)")]
    [InlineData("-1+2")]
    [InlineData("@cmd")]
    public void EscapeCsvField_FormulaStarts_ArePrefixed(string input)
    {
        var escaped = CsvSanitizer.EscapeCsvField(input);

        escaped.ShouldStartWith("'");
    }
}
