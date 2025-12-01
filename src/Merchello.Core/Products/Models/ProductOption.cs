namespace Merchello.Core.Products.Models;

public class ProductOption
{
    /// <summary>
    /// Represents the unique identifier for the product option.
    /// Each product option is assigned a new globally unique identifier (GUID) by default.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Represents the display name of the product option.
    /// This name is used to identify the product option, such as a color or size.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Represents an alternate identifier or name associated with the product option.
    /// This is typically used for referencing the product option concisely in different contexts.
    /// </summary>
    public string? Alias { get; set; }

    /// <summary>
    /// Determines the display sequence of the product option relative to others.
    /// The lower the value, the higher the priority in display order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Option types are things like Colour, Material, Size, Pattern etc...
    /// These values will be stored somewhere else usually in the CMS
    /// </summary>
    public string? OptionTypeAlias { get; set; }

    /// <summary>
    /// Option UI would be things like colour, image, dropdown (how it's displayed to user)
    /// These values will be stored somewhere else usually in the CMS
    /// </summary>
    public string? OptionUiAlias { get; set; }

    /// <summary>
    /// When true, this option participates in variant generation.
    /// When false, this option is treated as an add-on/modifier and does not generate variants.
    /// </summary>
    public bool IsVariant { get; set; } = true;

    /// <summary>
    /// Represents the collection of possible values for a product option.
    /// These values define specific variations of a product option, such as different colors or sizes.
    /// </summary>
    public List<ProductOptionValue> ProductOptionValues { get; set; } = [];
}
