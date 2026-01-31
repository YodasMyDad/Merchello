using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Update upsell rule request body. Null properties keep existing values.
/// </summary>
public class UpdateUpsellDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Heading { get; set; }
    public string? Message { get; set; }
    public int? Priority { get; set; }
    public int? MaxProducts { get; set; }
    public UpsellSortBy? SortBy { get; set; }
    public bool? SuppressIfInCart { get; set; }
    public UpsellDisplayLocation? DisplayLocation { get; set; }
    public CheckoutUpsellMode? CheckoutMode { get; set; }
    public bool? DefaultChecked { get; set; }
    public bool? AutoAddToBasket { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ClearEndsAt { get; set; }
    public string? Timezone { get; set; }
    public List<CreateUpsellTriggerRuleDto>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleDto>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleDto>? EligibilityRules { get; set; }
}
