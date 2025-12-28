using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Models;

/// <summary>
/// Stub IPublishedContentType for Merchello checkout pages.
/// The Alias property triggers Umbraco's route hijacking to MerchelloCheckoutController.
/// </summary>
public class MerchelloCheckoutContentType : IPublishedContentType
{
    public static readonly MerchelloCheckoutContentType Instance = new();

    // Always "MerchelloCheckout" for route hijacking - Umbraco finds MerchelloCheckoutController
    public string Alias => "MerchelloCheckout";

    public Guid Key => new("00000000-0000-0000-C0EC-000000000000");
    public int Id => -1001; // Negative to avoid conflicts with Umbraco content types
    public PublishedItemType ItemType => PublishedItemType.Content;
    public HashSet<string> CompositionAliases => [];
    public ContentVariation Variations => ContentVariation.Nothing;
    public bool IsElement => false;

    public IEnumerable<IPublishedPropertyType> PropertyTypes => [];

    public int GetPropertyIndex(string alias) => -1;

    public IPublishedPropertyType? GetPropertyType(string alias) => null;

    public IPublishedPropertyType? GetPropertyType(int index) => null;
}
