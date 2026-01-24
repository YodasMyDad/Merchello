namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for generating product variants from options.
/// </summary>
public class GenerateVariantsParameters
{
    /// <summary>
    /// The product root to generate variants for.
    /// </summary>
    public required Guid ProductRootId { get; set; }

    /// <summary>
    /// Default price for generated variants.
    /// </summary>
    public decimal DefaultPrice { get; set; }

    /// <summary>
    /// Default cost of goods for generated variants.
    /// </summary>
    public decimal DefaultCostOfGoods { get; set; }
}
