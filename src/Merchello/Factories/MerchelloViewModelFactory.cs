using Merchello.Core.Products.Models;
using Merchello.Models;

namespace Merchello.Factories;

/// <summary>
/// Factory interface for creating Merchello view models.
/// </summary>
public interface IMerchelloViewModelFactory
{
    /// <summary>
    /// Creates a view model for product Razor views.
    /// </summary>
    /// <param name="publishedProduct">The IPublishedContent wrapper for the product</param>
    /// <param name="productRoot">The product root with all data</param>
    /// <param name="selectedVariant">The selected variant (optional, defaults to default variant)</param>
    MerchelloProductViewModel CreateProductViewModel(
        MerchelloPublishedProduct publishedProduct,
        ProductRoot productRoot,
        Product? selectedVariant = null);
}

/// <summary>
/// Factory for creating Merchello view models.
/// </summary>
public class MerchelloViewModelFactory : IMerchelloViewModelFactory
{
    /// <inheritdoc />
    public MerchelloProductViewModel CreateProductViewModel(
        MerchelloPublishedProduct publishedProduct,
        ProductRoot productRoot,
        Product? selectedVariant = null)
    {
        // Select the default variant if none specified
        selectedVariant ??= productRoot.Products.FirstOrDefault(p => p.Default)
                          ?? productRoot.Products.FirstOrDefault();

        if (selectedVariant is null)
        {
            throw new InvalidOperationException(
                $"ProductRoot '{productRoot.RootName}' has no variants. Cannot create view model.");
        }

        return new MerchelloProductViewModel(publishedProduct, productRoot, selectedVariant);
    }
}
