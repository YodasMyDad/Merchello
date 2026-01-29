using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// Evaluates upsell rules against a basket context and returns product recommendations.
/// </summary>
public interface IUpsellEngine
{
    /// <summary>
    /// Evaluates all active upsell rules against the given context and returns suggestions.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsAsync(UpsellContext context, CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions filtered to a specific display location.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForLocationAsync(
        UpsellContext context,
        UpsellDisplayLocation location,
        CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions for email templates based on an invoice's line items.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForInvoiceAsync(Guid invoiceId, CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions for a product page by creating a synthetic context
    /// with that product as if it were in the basket.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForProductAsync(Guid productId, CancellationToken ct = default);
}
