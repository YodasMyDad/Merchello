using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductOptionFactory(SlugHelper slugHelper)
{
    public ProductOption Create(AddProductOptionParameters parameters)
    {
        return new ProductOption
        {
            Id = Guid.NewGuid(),
            Name = parameters.Name,
            Alias = string.IsNullOrWhiteSpace(parameters.Alias) ? slugHelper.GenerateSlug(parameters.Name) : parameters.Alias,
            SortOrder = parameters.SortOrder,
            OptionTypeAlias = parameters.OptionTypeAlias,
            OptionUiAlias = parameters.OptionUiAlias,
            IsVariant = parameters.IsVariant,
            ProductOptionValues = parameters.Values.Select(v => new ProductOptionValue
            {
                Id = Guid.NewGuid(),
                Name = v.Name,
                FullName = v.FullName ?? v.Name,
                SortOrder = v.SortOrder,
                HexValue = v.HexValue,
                PriceAdjustment = v.PriceAdjustment,
                CostAdjustment = v.CostAdjustment,
                SkuSuffix = v.SkuSuffix,
                WeightKg = v.WeightKg
            }).ToList()
        };
    }

    /// <summary>
    /// Creates an empty ProductOption for update scenarios where properties will be set later.
    /// </summary>
    public ProductOption CreateEmpty()
    {
        return new ProductOption
        {
            Id = Guid.NewGuid(),
            ProductOptionValues = []
        };
    }

    /// <summary>
    /// Creates an empty ProductOptionValue for update scenarios where properties will be set later.
    /// </summary>
    public ProductOptionValue CreateEmptyValue()
    {
        return new ProductOptionValue
        {
            Id = Guid.NewGuid()
        };
    }
}

