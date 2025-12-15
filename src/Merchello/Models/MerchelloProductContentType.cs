using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Models;

/// <summary>
/// Stub IPublishedContentType for Merchello products.
/// The Alias property triggers Umbraco's route hijacking to MerchelloProductController.
/// When an element type is configured, delegates property types to the element type.
/// </summary>
public class MerchelloProductContentType : IPublishedContentType
{
    private readonly IPublishedContentType? _elementType;

    public static readonly MerchelloProductContentType Instance = new();

    public MerchelloProductContentType(IPublishedContentType? elementType = null)
    {
        _elementType = elementType;
    }

    // Always "MerchelloProduct" for route hijacking - Umbraco finds MerchelloProductController
    public string Alias => "MerchelloProduct";

    public Guid Key => _elementType?.Key ?? new Guid("00000000-0000-0000-0000-MERCHPRODUCT");
    public int Id => _elementType?.Id ?? -1000; // Negative to avoid conflicts with Umbraco content types
    public PublishedItemType ItemType => PublishedItemType.Content;
    public HashSet<string> CompositionAliases => _elementType?.CompositionAliases ?? [];
    public ContentVariation Variations => _elementType?.Variations ?? ContentVariation.Nothing;
    public bool IsElement => false;

    // Delegate property types to element type
    public IEnumerable<IPublishedPropertyType> PropertyTypes =>
        _elementType?.PropertyTypes ?? Enumerable.Empty<IPublishedPropertyType>();

    public int GetPropertyIndex(string alias) =>
        _elementType?.GetPropertyIndex(alias) ?? -1;

    public IPublishedPropertyType? GetPropertyType(string alias) =>
        _elementType?.GetPropertyType(alias);

    public IPublishedPropertyType? GetPropertyType(int index) =>
        _elementType?.GetPropertyType(index);
}
