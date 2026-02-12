using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for updating an existing upsell rule. All properties nullable (null = keep existing).
/// </summary>
public class UpdateUpsellParameters
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
    public UpsellDisplayStyles? DisplayStyles { get; set; }
    public bool ClearDisplayStyles { get; set; }
    public List<CreateUpsellTriggerRuleParameters>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleParameters>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleParameters>? EligibilityRules { get; set; }
}
