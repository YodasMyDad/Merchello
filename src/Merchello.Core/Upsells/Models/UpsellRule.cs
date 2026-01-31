using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Represents an upsell rule that recommends products when trigger conditions are met.
/// </summary>
public class UpsellRule
{
    /// <summary>
    /// Unique identifier for the upsell rule.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // =====================================================
    // Basic Info
    // =====================================================

    /// <summary>
    /// Admin display name (e.g., "Bed -> Pillow Upsell").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional internal admin notes.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Current status of the upsell rule.
    /// </summary>
    public UpsellStatus Status { get; set; } = UpsellStatus.Draft;

    // =====================================================
    // Customer-Facing Display
    // =====================================================

    /// <summary>
    /// Customer-facing heading (e.g., "Complete your bedroom").
    /// </summary>
    public string Heading { get; set; } = string.Empty;

    /// <summary>
    /// Optional customer-facing message (e.g., "Don't forget your pillows!").
    /// </summary>
    public string? Message { get; set; }

    // =====================================================
    // Configuration
    // =====================================================

    /// <summary>
    /// Priority for ordering suggestions. Lower values = higher priority.
    /// </summary>
    public int Priority { get; set; } = 1000;

    /// <summary>
    /// Maximum number of products to show for this rule.
    /// </summary>
    public int MaxProducts { get; set; } = 4;

    /// <summary>
    /// How recommended products are sorted.
    /// </summary>
    public UpsellSortBy SortBy { get; set; }

    /// <summary>
    /// When true, products already in the customer's basket are excluded from suggestions.
    /// </summary>
    public bool SuppressIfInCart { get; set; } = true;

    /// <summary>
    /// Where this upsell is displayed. Flags enum supporting multiple locations.
    /// </summary>
    public UpsellDisplayLocation DisplayLocation { get; set; }

    /// <summary>
    /// How this upsell displays within the checkout. Only applies when DisplayLocation includes Checkout.
    /// </summary>
    public CheckoutUpsellMode CheckoutMode { get; set; } = CheckoutUpsellMode.Inline;

    /// <summary>
    /// When true and CheckoutMode is OrderBump, the checkbox renders checked by default (opt-out).
    /// </summary>
    public bool DefaultChecked { get; set; }

    /// <summary>
    /// When true, recommended products are automatically added to the basket when trigger conditions are met.
    /// Customers can remove them (opt-out). Removed items are not re-added during the same session.
    /// </summary>
    public bool AutoAddToBasket { get; set; }

    // =====================================================
    // Scheduling
    // =====================================================

    /// <summary>
    /// When the upsell rule becomes active (UTC).
    /// </summary>
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the upsell rule expires (UTC). Null for no expiry.
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Timezone for display purposes (e.g., "Europe/London").
    /// </summary>
    public string? Timezone { get; set; }

    // =====================================================
    // JSON Rule Columns
    // =====================================================

    /// <summary>
    /// Serialized JSON for trigger rules.
    /// </summary>
    public string? TriggerRulesJson { get; set; }

    /// <summary>
    /// Serialized JSON for recommendation rules.
    /// </summary>
    public string? RecommendationRulesJson { get; set; }

    /// <summary>
    /// Serialized JSON for eligibility rules.
    /// </summary>
    public string? EligibilityRulesJson { get; set; }

    // =====================================================
    // Audit
    // =====================================================

    /// <summary>
    /// Date the upsell rule was created (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the upsell rule was last updated (UTC).
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The user who created this upsell rule (optional).
    /// </summary>
    public Guid? CreatedBy { get; set; }

    // =====================================================
    // Computed Properties (not mapped to DB)
    // =====================================================

    [NotMapped]
    public List<UpsellTriggerRule> TriggerRules =>
        string.IsNullOrEmpty(TriggerRulesJson) ? [] :
        JsonSerializer.Deserialize<List<UpsellTriggerRule>>(TriggerRulesJson) ?? [];

    [NotMapped]
    public List<UpsellRecommendationRule> RecommendationRules =>
        string.IsNullOrEmpty(RecommendationRulesJson) ? [] :
        JsonSerializer.Deserialize<List<UpsellRecommendationRule>>(RecommendationRulesJson) ?? [];

    [NotMapped]
    public List<UpsellEligibilityRule> EligibilityRules =>
        string.IsNullOrEmpty(EligibilityRulesJson) ? [] :
        JsonSerializer.Deserialize<List<UpsellEligibilityRule>>(EligibilityRulesJson) ?? [];

    // =====================================================
    // Setter Helpers
    // =====================================================

    public void SetTriggerRules(List<UpsellTriggerRule>? rules) =>
        TriggerRulesJson = rules is { Count: > 0 } ? JsonSerializer.Serialize(rules) : null;

    public void SetRecommendationRules(List<UpsellRecommendationRule>? rules) =>
        RecommendationRulesJson = rules is { Count: > 0 } ? JsonSerializer.Serialize(rules) : null;

    public void SetEligibilityRules(List<UpsellEligibilityRule>? rules) =>
        EligibilityRulesJson = rules is { Count: > 0 } ? JsonSerializer.Serialize(rules) : null;
}
