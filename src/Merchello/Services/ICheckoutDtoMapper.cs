using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Storefront.Models;

namespace Merchello.Services;

/// <summary>
/// Maps checkout domain models to API DTOs.
/// </summary>
public interface ICheckoutDtoMapper
{
    /// <summary>
    /// Maps basket data to a checkout response DTO using the active storefront display context.
    /// </summary>
    Task<CheckoutBasketDto> MapBasketToDtoWithCurrencyAsync(Basket basket, CancellationToken ct = default);

    /// <summary>
    /// Maps basket data to a checkout response DTO using a provided display context.
    /// </summary>
    CheckoutBasketDto MapBasketToDto(Basket basket, StorefrontDisplayContext displayContext);

    /// <summary>
    /// Maps grouped shipping options to checkout DTOs.
    /// </summary>
    List<ShippingGroupDto> MapOrderGroupsToDto(
        OrderGroupingResult result,
        Dictionary<Guid, string>? selectedOptions,
        StorefrontDisplayContext displayContext,
        decimal? effectiveShippingTaxRate = null);
}
