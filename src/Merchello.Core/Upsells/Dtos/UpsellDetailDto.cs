using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Full detail for the editor.
/// </summary>
public class UpsellDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public UpsellStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "default";
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; }
    public int MaxProducts { get; set; }
    public UpsellSortBy SortBy { get; set; }
    public bool SuppressIfInCart { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public bool DefaultChecked { get; set; }
    public bool AutoAddToBasket { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public List<UpsellTriggerRuleDto> TriggerRules { get; set; } = [];
    public List<UpsellRecommendationRuleDto> RecommendationRules { get; set; } = [];
    public List<UpsellEligibilityRuleDto> EligibilityRules { get; set; } = [];
}
