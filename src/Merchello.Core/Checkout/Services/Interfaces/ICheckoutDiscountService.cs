using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Checkout.Services.Interfaces;

public interface ICheckoutDiscountService
{
    /// <summary>
    /// Applies a discount code to the basket.
    /// </summary>
    /// <param name="basket">The basket to apply the discount to.</param>
    /// <param name="code">The discount code to apply.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> ApplyDiscountCodeAsync(
        Basket basket,
        string code,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all applicable automatic discounts for the basket.
    /// </summary>
    /// <param name="basket">The basket to check.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of applicable automatic discounts with calculated amounts.</returns>
    Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        Basket basket,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes automatic discounts on the basket, adding new ones and removing expired ones.
    /// </summary>
    /// <param name="basket">The basket to refresh.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated basket.</returns>
    Task<Basket> RefreshAutomaticDiscountsAsync(
        Basket basket,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a promotional discount from the basket.
    /// </summary>
    /// <param name="basket">The basket.</param>
    /// <param name="discountId">The discount ID to remove.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> RemovePromotionalDiscountAsync(
        Basket basket,
        Guid discountId,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a discount to the basket as a discount line item.
    /// </summary>
    /// <param name="parameters">Parameters for adding the discount</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task AddDiscountToBasketAsync(
        AddDiscountToBasketParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove a discount line item from the basket
    /// </summary>
    /// <param name="basket">The basket</param>
    /// <param name="discountLineItemId">The ID of the discount line item to remove</param>
    /// <param name="countryCode">Country code for recalculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RemoveDiscountFromBasketAsync(
        Basket basket,
        Guid discountLineItemId,
        string? countryCode = null,
        CancellationToken cancellationToken = default);
}
