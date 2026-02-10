namespace Merchello.Core.Products.Dtos;

public class GoogleShoppingCategoryResultDto
{
    public string CountryCode { get; set; } = Constants.FallbackCountryCode;
    public string SourceUrl { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = [];
}

