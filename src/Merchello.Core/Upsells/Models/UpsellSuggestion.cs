namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Result from the upsell engine — a matched upsell rule with its recommended products.
/// </summary>
public class UpsellSuggestion
{
    public Guid UpsellRuleId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public bool DefaultChecked { get; set; }
    public List<UpsellProduct> Products { get; set; } = [];
}
