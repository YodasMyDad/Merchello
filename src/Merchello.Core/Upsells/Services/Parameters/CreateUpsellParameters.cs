using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for creating a new upsell rule.
/// </summary>
public class CreateUpsellParameters
{
    // Basic Info
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }

    // Configuration
    public int Priority { get; set; } = 1000;
    public int MaxProducts { get; set; } = 4;
    public UpsellSortBy SortBy { get; set; } = UpsellSortBy.BestSeller;
    public bool SuppressIfInCart { get; set; } = true;
    public UpsellDisplayLocation DisplayLocation { get; set; } = UpsellDisplayLocation.All;
    public CheckoutUpsellMode CheckoutMode { get; set; } = CheckoutUpsellMode.Inline;
    public bool DefaultChecked { get; set; }
    public bool AutoAddToBasket { get; set; }

    // Scheduling
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public UpsellDisplayStyles? DisplayStyles { get; set; }

    // Audit
    public Guid? CreatedBy { get; set; }

    // Rules
    public List<CreateUpsellTriggerRuleParameters>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleParameters>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleParameters>? EligibilityRules { get; set; }
}
