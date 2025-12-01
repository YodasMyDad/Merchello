using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Products.Factories;

public class ProductOptionFactory(SlugHelper slugHelper)
{
    public ProductOption Create(
        string name,
        string? alias,
        int sortOrder,
        string? optionTypeAlias,
        string? optionUiAlias,
        bool isVariant,
        List<(string Name, string? FullName, int SortOrder, string? HexValue, decimal PriceAdjustment, decimal CostAdjustment, string? SkuSuffix)> values)
    {
        return new ProductOption
        {
            Id = Guid.NewGuid(),
            Name = name,
            Alias = string.IsNullOrWhiteSpace(alias) ? slugHelper.GenerateSlug(name) : alias,
            SortOrder = sortOrder,
            OptionTypeAlias = optionTypeAlias,
            OptionUiAlias = optionUiAlias,
            IsVariant = isVariant,
            ProductOptionValues = values.Select(v => new ProductOptionValue
            {
                Id = Guid.NewGuid(),
                Name = v.Name,
                FullName = v.FullName ?? v.Name,
                SortOrder = v.SortOrder,
                HexValue = v.HexValue,
                PriceAdjustment = v.PriceAdjustment,
                CostAdjustment = v.CostAdjustment,
                SkuSuffix = v.SkuSuffix
            }).ToList()
        };
    }
}

