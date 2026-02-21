using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ProductSync.Services;

public class ProductSyncServiceVariantRowDetectionTests
{
    [Fact]
    public void HasVariantRowData_ReturnsFalse_ForImageOnlyContinuationRow()
    {
        var row = new ProductSyncCsvRow(10, new Dictionary<string, string?>
        {
            ["Handle"] = "sample-handle",
            ["Image Src"] = "https://example.com/image-2.jpg",
            ["Image Position"] = "2"
        });

        ProductSyncService.HasVariantRowData(row).ShouldBeFalse();
    }

    [Fact]
    public void HasVariantRowData_ReturnsTrue_ForOptionValueRow()
    {
        var row = new ProductSyncCsvRow(3, new Dictionary<string, string?>
        {
            ["Handle"] = "sample-handle",
            ["Option1 Value"] = "Grey",
            ["Variant SKU"] = "SKU-1"
        });

        ProductSyncService.HasVariantRowData(row).ShouldBeTrue();
    }

    [Fact]
    public void HasVariantRowData_ReturnsTrue_ForVariantImageRow()
    {
        var row = new ProductSyncCsvRow(4, new Dictionary<string, string?>
        {
            ["Handle"] = "single-variant",
            ["Variant Image"] = "https://example.com/variant.jpg"
        });

        ProductSyncService.HasVariantRowData(row).ShouldBeTrue();
    }
}
