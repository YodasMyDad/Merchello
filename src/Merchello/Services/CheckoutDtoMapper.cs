using Merchello.Core;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Services;

public class CheckoutDtoMapper(
    IStorefrontContextService storefrontContext,
    ICurrencyConversionService currencyConversion,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> merchelloSettings) : ICheckoutDtoMapper
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    public async Task<CheckoutBasketDto> MapBasketToDtoWithCurrencyAsync(Basket basket, CancellationToken ct = default)
    {
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        return MapBasketToDto(basket, displayContext);
    }

    public CheckoutBasketDto MapBasketToDto(Basket basket, StorefrontDisplayContext displayContext)
    {
        var storeCurrencySymbol = basket.CurrencySymbol ?? _settings.CurrencySymbol;
        var displayCurrencyCode = displayContext.CurrencyCode;
        var displayCurrencySymbol = displayContext.CurrencySymbol;
        var exchangeRate = displayContext.ExchangeRate;

        var lineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product
                      || li.LineItemType == LineItemType.Custom
                      || li.LineItemType == LineItemType.Addon)
            .Select(li =>
            {
                var storeUnitPrice = li.Amount;
                var storeLineTotal = li.Amount * li.Quantity;
                var displayUnitPrice = li.GetDisplayLineItemUnitPrice(displayContext, currencyService);
                var displayLineTotal = li.GetDisplayLineItemTotal(displayContext, currencyService);
                li.ExtendedData.TryGetValue("ImageUrl", out var imageUrlObj);

                return new CheckoutLineItemDto
                {
                    Id = li.Id,
                    Sku = li.Sku ?? "",
                    Name = li.Name ?? "",
                    ProductRootName = li.GetProductRootName(),
                    SelectedOptions = li.GetSelectedOptions()
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList(),
                    Quantity = li.Quantity,
                    UnitPrice = storeUnitPrice,
                    LineTotal = storeLineTotal,
                    FormattedUnitPrice = currencyConversion.Format(storeUnitPrice, storeCurrencySymbol),
                    FormattedLineTotal = currencyConversion.Format(storeLineTotal, storeCurrencySymbol),
                    DisplayUnitPrice = displayUnitPrice,
                    DisplayLineTotal = displayLineTotal,
                    FormattedDisplayUnitPrice = currencyConversion.Format(displayUnitPrice, displayCurrencySymbol),
                    FormattedDisplayLineTotal = currencyConversion.Format(displayLineTotal, displayCurrencySymbol),
                    TaxRate = li.TaxRate,
                    IsTaxable = li.IsTaxable,
                    LineItemType = li.LineItemType,
                    DependantLineItemSku = li.DependantLineItemSku,
                    ParentLineItemId = li.GetParentLineItemId()?.ToString(),
                    ImageUrl = imageUrlObj.UnwrapJsonElement()?.ToString()
                };
            })
            .ToList();

        var appliedDiscounts = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li =>
            {
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var discountIdObj);
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var discountCodeObj);

                var linkedItem = !string.IsNullOrEmpty(li.DependantLineItemSku)
                    ? basket.LineItems.FirstOrDefault(p => p.Sku == li.DependantLineItemSku)
                    : null;
                var linkedTaxRate = linkedItem is { IsTaxable: true } ? linkedItem.TaxRate : (decimal?)null;
                var displayDiscountAmount = li.GetDisplayDiscountTotal(displayContext, currencyService, linkedTaxRate);
                var parsedDiscountId = Guid.TryParse(discountIdObj.UnwrapJsonElement()?.ToString(), out var discountId)
                    ? discountId
                    : li.Id;
                var parsedDiscountCode = discountCodeObj.UnwrapJsonElement()?.ToString();

                return new AppliedDiscountDto
                {
                    Id = parsedDiscountId,
                    Name = li.Name ?? "Discount",
                    Code = parsedDiscountCode,
                    Amount = displayDiscountAmount,
                    FormattedAmount = currencyConversion.Format(displayDiscountAmount, displayCurrencySymbol),
                    IsAutomatic = string.IsNullOrWhiteSpace(parsedDiscountCode)
                };
            })
            .ToList();

        // Use basket's effective shipping tax rate when context rate is null (proportional mode)
        var effectiveContext = displayContext.ShippingTaxRate.HasValue
            ? displayContext
            : displayContext with { ShippingTaxRate = basket.EffectiveShippingTaxRate };

        // Get display amounts with proper tax-inclusive calculations
        var displayAmounts = basket.GetDisplayAmounts(effectiveContext, currencyService);

        return new CheckoutBasketDto
        {
            Id = basket.Id,
            LineItems = lineItems,

            // Store currency amounts (for calculations/backend)
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            AdjustedSubTotal = basket.AdjustedSubTotal,
            Tax = basket.Tax,
            Shipping = basket.Shipping,
            Total = basket.Total,
            FormattedSubTotal = basket.SubTotal.FormatWithSymbol(storeCurrencySymbol),
            FormattedDiscount = basket.Discount.FormatWithSymbol(storeCurrencySymbol),
            FormattedAdjustedSubTotal = basket.AdjustedSubTotal.FormatWithSymbol(storeCurrencySymbol),
            FormattedTax = basket.Tax.FormatWithSymbol(storeCurrencySymbol),
            FormattedShipping = basket.Shipping.FormatWithSymbol(storeCurrencySymbol),
            FormattedTotal = basket.Total.FormatWithSymbol(storeCurrencySymbol),
            Currency = basket.Currency ?? _settings.StoreCurrencyCode,
            CurrencySymbol = storeCurrencySymbol,

            // Display currency amounts (customer's selected currency, tax-inclusive when configured)
            DisplaySubTotal = displayAmounts.SubTotal,
            DisplayDiscount = displayAmounts.Discount,
            DisplayTax = displayAmounts.Tax,
            DisplayShipping = displayAmounts.Shipping,
            DisplayTotal = displayAmounts.Total,
            FormattedDisplaySubTotal = currencyConversion.Format(displayAmounts.SubTotal, displayCurrencySymbol),
            FormattedDisplayDiscount = currencyConversion.Format(displayAmounts.Discount, displayCurrencySymbol),
            FormattedDisplayTax = currencyConversion.Format(displayAmounts.Tax, displayCurrencySymbol),
            FormattedDisplayShipping = currencyConversion.Format(displayAmounts.Shipping, displayCurrencySymbol),
            FormattedDisplayTotal = currencyConversion.Format(displayAmounts.Total, displayCurrencySymbol),
            DisplayCurrencyCode = displayCurrencyCode,
            DisplayCurrencySymbol = displayCurrencySymbol,
            ExchangeRate = exchangeRate,
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = currencyConversion.Format(displayAmounts.TaxInclusiveSubTotal, displayCurrencySymbol),
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,

            BillingAddress = MapAddressToDto(basket.BillingAddress),
            ShippingAddress = MapAddressToDto(basket.ShippingAddress),
            AppliedDiscounts = appliedDiscounts,
            Errors = basket.Errors.Select(e => new BasketErrorDto
            {
                Message = e.Message,
                RelatedLineItemId = e.RelatedLineItemId,
                IsShippingError = e.IsShippingError
            }).ToList(),
            IsEmpty = basket.LineItems.Count == 0
        };
    }

    public List<ShippingGroupDto> MapOrderGroupsToDto(
        OrderGroupingResult result,
        Dictionary<Guid, string>? selectedOptions,
        StorefrontDisplayContext displayContext,
        decimal? effectiveShippingTaxRate = null)
    {
        var exchangeRate = displayContext.ExchangeRate;
        var currencySymbol = displayContext.CurrencySymbol;

        // Use basket's effective shipping tax rate when context rate is null (proportional mode)
        var effectiveContext = displayContext.ShippingTaxRate.HasValue
            ? displayContext
            : displayContext with { ShippingTaxRate = effectiveShippingTaxRate };

        return result.Groups.Select(group => new ShippingGroupDto
        {
            GroupId = group.GroupId,
            GroupName = group.GroupName,
            WarehouseId = group.WarehouseId,
            LineItems = group.LineItems.Select(li =>
            {
                var lineTotal = li.Amount * li.Quantity;
                var displayLineTotal = currencyService.Round(lineTotal * exchangeRate, displayContext.CurrencyCode);
                return new ShippingGroupLineItemDto
                {
                    Id = li.LineItemId,
                    Sku = li.Sku ?? "",
                    Name = li.Name,
                    ProductRootName = li.ProductRootName,
                    SelectedOptions = li.SelectedOptions
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList(),
                    Quantity = li.Quantity,
                    Amount = displayLineTotal,
                    FormattedAmount = displayLineTotal.FormatWithSymbol(currencySymbol)
                };
            }).ToList(),
            ShippingOptions = group.AvailableShippingOptions.Select(opt =>
            {
                var displayCost = DisplayCurrencyExtensions.GetDisplayShippingOptionCost(
                    opt.Cost, effectiveContext, currencyService);
                return new CheckoutShippingOptionDto
                {
                    Id = opt.ShippingOptionId,
                    Name = opt.Name,
                    DaysFrom = opt.DaysFrom,
                    DaysTo = opt.DaysTo,
                    IsNextDay = opt.IsNextDay,
                    Cost = displayCost,
                    FormattedCost = displayCost.FormatWithSymbol(currencySymbol),
                    DeliveryDescription = opt.DeliveryTimeDescription,
                    ProviderKey = opt.ProviderKey,
                    SelectionKey = opt.SelectionKey,
                    ServiceCode = opt.ServiceCode,
                    EstimatedDeliveryDate = opt.EstimatedDeliveryDate,
                    IsFallbackRate = opt.IsFallbackRate,
                    FallbackReason = opt.FallbackReason
                };
            }).ToList(),
            SelectedShippingOptionId = selectedOptions?.TryGetValue(group.GroupId, out var selectedId) == true
                ? selectedId
                : group.SelectedShippingOptionId,
            HasFallbackRates = group.AvailableShippingOptions.Any(o => o.IsFallbackRate)
        }).ToList();
    }

    private static AddressDto? MapAddressToDto(Address? address)
    {
        if (address == null || string.IsNullOrWhiteSpace(address.Name))
        {
            return null;
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = string.IsNullOrWhiteSpace(address.CountyState?.Name)
                ? address.CountyState?.RegionCode
                : address.CountyState?.Name,
            RegionCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }
}
