using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

public class ProductVariantKeyNameTests
{
    [Fact]
    public void GenerateVariantKeyName_PreservesInputOrder_ForKeyAndName()
    {
        // Arrange: IDs intentionally sort opposite to input order.
        var sizeValueId = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");
        var colourValueId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        var selectedValues = new List<ProductOptionValue>
        {
            new() { Id = sizeValueId, Name = "6'0 x 6'6 Super King" },
            new() { Id = colourValueId, Name = "Charcoal" }
        };

        // Act
        var (key, name) = selectedValues.GenerateVariantKeyName();

        // Assert
        key.ShouldBe($"{sizeValueId},{colourValueId}");
        name.ShouldBe("6'0 x 6'6 Super King - Charcoal");
    }

    [Fact]
    public void GenerateVariantKeyName_EnumerableOverload_MatchesListOverload()
    {
        // Arrange
        var first = new ProductOptionValue { Id = Guid.NewGuid(), Name = "Small" };
        var second = new ProductOptionValue { Id = Guid.NewGuid(), Name = "Stone" };
        var selectedValues = new[] { first, second };

        // Act
        var fromEnumerable = selectedValues.GenerateVariantKeyName();
        var fromList = selectedValues.ToList().GenerateVariantKeyName();

        // Assert
        fromEnumerable.ShouldBe(fromList);
        fromEnumerable.Name.ShouldBe("Small - Stone");
    }
}
