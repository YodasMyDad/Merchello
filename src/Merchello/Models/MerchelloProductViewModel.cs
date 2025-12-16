using Merchello.Core.Products.Models;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Models;

/// <summary>
/// View model passed to product Razor views. Implements IContentModel for Umbraco view compatibility.
/// </summary>
public class MerchelloProductViewModel : IContentModel
{
    public MerchelloProductViewModel(
        IPublishedContent content,
        ProductRoot productRoot,
        Product selectedVariant)
    {
        Content = content;
        ProductRoot = productRoot;
        SelectedVariant = selectedVariant;
        AllVariants = productRoot.Products.ToList().AsReadOnly();
        VariantOptions = productRoot.ProductOptions.Where(o => o.IsVariant).ToList().AsReadOnly();
        AddOnOptions = productRoot.ProductOptions.Where(o => !o.IsVariant).ToList().AsReadOnly();
    }

    /// <summary>
    /// IContentModel implementation (for Umbraco view compatibility).
    /// Also provides access to element type properties via Properties.
    /// </summary>
    public IPublishedContent Content { get; }

    /// <summary>
    /// The full product root with all data.
    /// </summary>
    public ProductRoot ProductRoot { get; }

    /// <summary>
    /// Currently selected variant (from URL or default).
    /// </summary>
    public Product SelectedVariant { get; }

    /// <summary>
    /// All variants for building variant picker UI.
    /// </summary>
    public IReadOnlyList<Product> AllVariants { get; }

    /// <summary>
    /// Options where IsVariant == true (generate variants).
    /// </summary>
    public IReadOnlyList<ProductOption> VariantOptions { get; }

    /// <summary>
    /// Options where IsVariant == false (add-ons/modifiers).
    /// </summary>
    public IReadOnlyList<ProductOption> AddOnOptions { get; }

    /// <summary>
    /// Direct access to element properties.
    /// Prefer using Content.Value&lt;T&gt;() for type-safe access.
    /// </summary>
    public IEnumerable<IPublishedProperty> Properties => Content.Properties;

    // Pricing (from SelectedVariant)
    public decimal Price => SelectedVariant.Price;
    public decimal? PreviousPrice => SelectedVariant.PreviousPrice;
    public bool OnSale => SelectedVariant.OnSale;

    // Stock (from SelectedVariant)
    public int TotalStock => SelectedVariant.ProductWarehouses.Sum(pw => pw.Stock);
    public bool AvailableForPurchase => SelectedVariant.AvailableForPurchase;
    public bool TrackStock => SelectedVariant.ProductWarehouses.Any(pw => pw.TrackStock);

    // Media (combined root + variant, respecting ExcludeRootProductImages)
    public IReadOnlyList<string> Images
    {
        get
        {
            var images = new List<string>(SelectedVariant.Images);
            if (!SelectedVariant.ExcludeRootProductImages)
            {
                images.AddRange(ProductRoot.RootImages);
            }
            return images.AsReadOnly();
        }
    }

    // SEO (from ProductRoot)
    public string? MetaTitle => ProductRoot.PageTitle ?? ProductRoot.RootName;
    public string? MetaDescription => ProductRoot.MetaDescription;
    public string? CanonicalUrl => ProductRoot.CanonicalUrl;

    // URLs
    public string ProductUrl => $"/{ProductRoot.RootUrl}";
    public string SelectedVariantUrl => GetVariantUrl(SelectedVariant);

    /// <summary>
    /// Gets the URL for a specific variant.
    /// </summary>
    public string GetVariantUrl(Product variant)
    {
        if (string.IsNullOrEmpty(variant.Url) || variant.Default)
            return ProductUrl;
        return $"/{ProductRoot.RootUrl}/{variant.Url}";
    }

    /// <summary>
    /// Checks if a variant is the currently selected one.
    /// </summary>
    public bool IsVariantSelected(Product variant)
    {
        return variant.Id == SelectedVariant.Id;
    }
}
