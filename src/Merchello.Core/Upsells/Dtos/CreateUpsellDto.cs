using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Create upsell rule request body.
/// </summary>
public class CreateUpsellDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; } = 1000;
    public int MaxProducts { get; set; } = 4;
    public UpsellSortBy SortBy { get; set; }
    public bool SuppressIfInCart { get; set; } = true;
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; } = CheckoutUpsellMode.Inline;
    public bool DefaultChecked { get; set; }
    public bool AutoAddToBasket { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public List<CreateUpsellTriggerRuleDto>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleDto>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleDto>? EligibilityRules { get; set; }
}
