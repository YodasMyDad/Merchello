using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Storefront upsell suggestion with recommended products.
/// </summary>
public class UpsellSuggestionDto
{
    public Guid UpsellRuleId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public bool DefaultChecked { get; set; }
    public UpsellDisplayStyles? DisplayStyles { get; set; }
    public List<UpsellProductDto> Products { get; set; } = [];
}
