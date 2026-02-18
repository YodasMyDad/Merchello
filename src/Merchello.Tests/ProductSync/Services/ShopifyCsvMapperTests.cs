using System.Text;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ProductSync.Services;

public class ShopifyCsvMapperTests
{
    [Fact]
    public async Task ParseAsync_HandlesQuotedCommasAndMultilineFields()
    {
        var csv = """
                  Handle,Title,Body (HTML),Variant SKU
                  shirt,"Shirt, Large","<p>Line 1
                  Line 2</p>",SKU-1
                  """;

        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var mapper = new ShopifyCsvMapper();

        var document = await mapper.ParseAsync(stream, ProductSyncProfile.ShopifyStrict, CancellationToken.None);

        document.Headers.Count.ShouldBe(4);
        document.Rows.Count.ShouldBe(1);
        document.Rows[0]["Handle"].ShouldBe("shirt");
        document.Rows[0]["Title"].ShouldBe("Shirt, Large");
        document.Rows[0]["Body (HTML)"].ShouldBe("<p>Line 1\nLine 2</p>");
        document.Rows[0]["Variant SKU"].ShouldBe("SKU-1");
    }

    [Fact]
    public async Task WriteAsync_WritesUtf8BomAndExpectedHeaders()
    {
        var mapper = new ShopifyCsvMapper();
        var row = new ProductSyncCsvRow(2, new Dictionary<string, string?>
        {
            ["Handle"] = "shirt",
            ["Title"] = "Shirt",
            ["Variant SKU"] = "SKU-1",
            ["Variant Price"] = "19.99"
        });

        await using var output = new MemoryStream();
        await mapper.WriteAsync(
            output,
            ProductSyncProfile.ShopifyStrict,
            [row],
            CancellationToken.None);

        var bytes = output.ToArray();
        bytes.Length.ShouldBeGreaterThan(3);
        bytes[0].ShouldBe((byte)0xEF);
        bytes[1].ShouldBe((byte)0xBB);
        bytes[2].ShouldBe((byte)0xBF);

        var csv = Encoding.UTF8.GetString(bytes);
        csv.ShouldContain("Handle,Title,Body (HTML)");
        csv.ShouldContain("shirt,Shirt");
    }
}
