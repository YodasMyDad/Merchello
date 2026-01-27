using Merchello.Core.Products.Models;
using Merchello.Models;

namespace Merchello.Factories;

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
