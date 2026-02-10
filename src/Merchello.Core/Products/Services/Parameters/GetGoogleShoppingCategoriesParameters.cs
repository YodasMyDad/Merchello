namespace Merchello.Core.Products.Services.Parameters;

public class GetGoogleShoppingCategoriesParameters
{
    public string? Query { get; set; }
    public string? CountryCode { get; set; }
    public int Limit { get; set; } = 25;
}

