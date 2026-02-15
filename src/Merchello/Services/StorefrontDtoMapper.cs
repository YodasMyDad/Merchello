using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Services;

public class StorefrontDtoMapper(
    ICurrencyService currencyService,
    ICurrencyConversionService currencyConversion) : IStorefrontDtoMapper
{
    public BasketOperationResultDto MapBasketOperationResult(
        bool success,
        string? message,
        Basket? basket,
        string storeCurrencySymbol)
    {
        var total = basket?.Total ?? 0m;
        return new BasketOperationResultDto
        {
            Success = success,
            Message = message,
            ItemCount = basket.GetStorefrontItemCount(),
            Total = total,
            FormattedTotal = currencyConversion.Format(total, storeCurrencySymbol)
        };
    }

    public BasketCountDto MapBasketCount(Basket? basket, string storeCurrencySymbol)
    {
        var total = basket?.Total ?? 0m;
        return new BasketCountDto
        {
            ItemCount = basket.GetStorefrontItemCount(),
            Total = total,
            FormattedTotal = currencyConversion.Format(total, storeCurrencySymbol)
        };
    }

    public StorefrontBasketDto MapBasket(
        Basket? basket,
        StorefrontDisplayContext displayContext,
        string storeCurrencySymbol,
        BasketLocationAvailability? availability = null)
    {
        var symbol = displayContext.CurrencySymbol;
        if (basket == null || basket.LineItems.Count == 0)
        {
            return new StorefrontBasketDto
            {
                IsEmpty = true,
                CurrencySymbol = storeCurrencySymbol,
                DisplayCurrencyCode = displayContext.CurrencyCode,
                DisplayCurrencySymbol = symbol,
                ExchangeRate = displayContext.ExchangeRate,
                DisplayPricesIncTax = displayContext.DisplayPricesIncTax,
                IsTaxEstimated = false,
                AllItemsAvailable = true
            };
        }

        var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);
        var items = basket.LineItems.Select(li =>
        {
            var displayUnitPrice = li.GetDisplayLineItemUnitPrice(displayContext, currencyService);
            var displayLineTotal = li.GetDisplayLineItemTotal(displayContext, currencyService);
            var displayUnitPriceWithAddons = li.GetDisplayLineItemUnitPriceWithAddons(
                basket.LineItems,
                displayContext,
                currencyService);
            var displayLineTotalWithAddons = li.GetDisplayLineItemTotalWithAddons(
                basket.LineItems,
                displayContext,
                currencyService);

            return new StorefrontLineItemDto
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
                UnitPrice = li.Amount,
                LineTotal = li.Amount * li.Quantity,
                FormattedUnitPrice = currencyConversion.Format(li.Amount, storeCurrencySymbol),
                FormattedLineTotal = currencyConversion.Format(li.Amount * li.Quantity, storeCurrencySymbol),
                DisplayUnitPrice = displayUnitPrice,
                DisplayLineTotal = displayLineTotal,
                FormattedDisplayUnitPrice = currencyConversion.Format(displayUnitPrice, symbol),
                FormattedDisplayLineTotal = currencyConversion.Format(displayLineTotal, symbol),
                DisplayUnitPriceWithAddons = displayUnitPriceWithAddons,
                DisplayLineTotalWithAddons = displayLineTotalWithAddons,
                FormattedDisplayUnitPriceWithAddons = currencyConversion.Format(displayUnitPriceWithAddons, symbol),
                FormattedDisplayLineTotalWithAddons = currencyConversion.Format(displayLineTotalWithAddons, symbol),
                TaxRate = li.TaxRate,
                IsTaxable = li.IsTaxable,
                LineItemType = li.LineItemType.ToString(),
                DependentLineItemSku = li.DependantLineItemSku,
                ParentLineItemId = li.GetParentLineItemId()?.ToString()
            };
        }).ToList();

        var itemAvailability = availability?.Items.ToDictionary(
            i => i.LineItemId.ToString(),
            i => new BasketItemAvailabilityDto
            {
                CanShipToLocation = i.CanShipToLocation,
                HasStock = i.HasStock,
                Message = i.StatusMessage
            }) ?? [];

        return new StorefrontBasketDto
        {
            Items = items,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            Tax = basket.Tax,
            Shipping = basket.Shipping,
            Total = basket.Total,
            IsTaxEstimated = basket.IsTaxEstimated,
            TaxEstimationReason = basket.TaxEstimationReason,
            FormattedSubTotal = currencyConversion.Format(basket.SubTotal, storeCurrencySymbol),
            FormattedDiscount = currencyConversion.Format(basket.Discount, storeCurrencySymbol),
            FormattedTax = currencyConversion.Format(basket.Tax, storeCurrencySymbol),
            FormattedTotal = currencyConversion.Format(basket.Total, storeCurrencySymbol),
            CurrencySymbol = storeCurrencySymbol,
            DisplaySubTotal = displayAmounts.SubTotal,
            DisplayDiscount = displayAmounts.Discount,
            DisplayTax = displayAmounts.Tax,
            DisplayShipping = displayAmounts.Shipping,
            DisplayTotal = displayAmounts.Total,
            FormattedDisplaySubTotal = currencyConversion.Format(displayAmounts.SubTotal, symbol),
            FormattedDisplayDiscount = currencyConversion.Format(displayAmounts.Discount, symbol),
            FormattedDisplayTax = currencyConversion.Format(displayAmounts.Tax, symbol),
            FormattedDisplayShipping = currencyConversion.Format(displayAmounts.Shipping, symbol),
            FormattedDisplayTotal = currencyConversion.Format(displayAmounts.Total, symbol),
            DisplayCurrencyCode = displayContext.CurrencyCode,
            DisplayCurrencySymbol = symbol,
            ExchangeRate = displayContext.ExchangeRate,
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = currencyConversion.Format(displayAmounts.TaxInclusiveSubTotal, symbol),
            TaxInclusiveDisplayShipping = displayAmounts.TaxInclusiveShipping,
            FormattedTaxInclusiveDisplayShipping = currencyConversion.Format(displayAmounts.TaxInclusiveShipping, symbol),
            TaxInclusiveDisplayDiscount = displayAmounts.TaxInclusiveDiscount,
            FormattedTaxInclusiveDisplayDiscount = currencyConversion.Format(displayAmounts.TaxInclusiveDiscount, symbol),
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
            ItemCount = basket.GetStorefrontItemCount(),
            IsEmpty = false,
            AllItemsAvailable = availability?.AllItemsAvailable ?? true,
            ItemAvailability = itemAvailability
        };
    }

    public ShippingCountriesDto MapShippingCountries(
        IReadOnlyCollection<CountryAvailability> countries,
        ShippingLocation currentLocation,
        StorefrontCurrency currency)
    {
        return new ShippingCountriesDto
        {
            Countries = countries.Select(c => new CountryDto
            {
                Code = c.Code,
                Name = c.Name
            }).ToList(),
            Current = new CountryDto
            {
                Code = currentLocation.CountryCode,
                Name = currentLocation.CountryName
            },
            CurrentRegionCode = currentLocation.RegionCode,
            CurrentRegionName = currentLocation.RegionName,
            Currency = MapCurrency(currency)
        };
    }

    public StorefrontCurrencyDto MapCurrency(StorefrontCurrency currency)
    {
        return new StorefrontCurrencyDto
        {
            CurrencyCode = currency.CurrencyCode,
            CurrencySymbol = currency.CurrencySymbol,
            DecimalPlaces = currency.DecimalPlaces
        };
    }

    public SetCountryResultDto MapSetCountryResult(CountryAvailability country, StorefrontCurrency currency)
    {
        return new SetCountryResultDto
        {
            CountryCode = country.Code,
            CountryName = country.Name,
            CurrencyCode = currency.CurrencyCode,
            CurrencySymbol = currency.CurrencySymbol
        };
    }

    public List<RegionDto> MapRegions(string countryCode, IReadOnlyCollection<RegionAvailability> regions)
    {
        return regions.Select(r => new RegionDto
        {
            CountryCode = countryCode,
            RegionCode = r.RegionCode,
            Name = r.Name
        }).ToList();
    }

    public StorefrontContextDto MapStorefrontContext(
        ShippingLocation currentLocation,
        StorefrontCurrency currency,
        Basket? basket,
        string storeCurrencySymbol)
    {
        return new StorefrontContextDto
        {
            Country = new CountryDto
            {
                Code = currentLocation.CountryCode,
                Name = currentLocation.CountryName
            },
            RegionCode = currentLocation.RegionCode,
            RegionName = currentLocation.RegionName,
            Currency = MapCurrency(currency),
            Basket = MapBasketCount(basket, storeCurrencySymbol)
        };
    }

    public ProductAvailabilityDto MapProductAvailability(ProductLocationAvailability availability)
    {
        return new ProductAvailabilityDto
        {
            CanShipToLocation = availability.CanShipToLocation,
            HasStock = availability.HasStock,
            AvailableStock = availability.AvailableStock,
            Message = availability.StatusMessage,
            ShowStockLevels = availability.ShowStockLevels
        };
    }

    public BasketAvailabilityDto MapBasketAvailability(BasketLocationAvailability availability)
    {
        return new BasketAvailabilityDto
        {
            AllItemsAvailable = availability.AllItemsAvailable,
            Items = availability.Items.Select(item => new BasketItemAvailabilityDetailDto
            {
                LineItemId = item.LineItemId,
                ProductId = item.ProductId,
                CanShipToLocation = item.CanShipToLocation,
                HasStock = item.HasStock,
                Message = item.StatusMessage
            }).ToList()
        };
    }

    public EstimatedShippingDto MapEstimatedShippingFailure(string? message)
    {
        return new EstimatedShippingDto
        {
            Success = false,
            Message = message
        };
    }

    public EstimatedShippingDto MapEstimatedShippingSuccess(
        GetEstimatedShippingResult result,
        Basket basket,
        StorefrontDisplayContext displayContext,
        string storeCurrencySymbol)
    {
        var symbol = displayContext.CurrencySymbol;
        var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);
        var displayEstimatedShipping = currencyConversion.Convert(
            result.EstimatedShipping,
            displayContext.ExchangeRate,
            displayContext.CurrencyCode);

        return new EstimatedShippingDto
        {
            Success = true,
            EstimatedShipping = result.EstimatedShipping,
            FormattedEstimatedShipping = currencyConversion.Format(result.EstimatedShipping, storeCurrencySymbol),
            DisplayEstimatedShipping = displayEstimatedShipping,
            FormattedDisplayEstimatedShipping = currencyConversion.Format(displayEstimatedShipping, symbol),
            DisplayTotal = displayAmounts.Total,
            FormattedDisplayTotal = currencyConversion.Format(displayAmounts.Total, symbol),
            DisplayTax = displayAmounts.Tax,
            FormattedDisplayTax = currencyConversion.Format(displayAmounts.Tax, symbol),
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = currencyConversion.Format(displayAmounts.TaxInclusiveSubTotal, symbol),
            TaxInclusiveDisplayShipping = displayAmounts.TaxInclusiveShipping,
            FormattedTaxInclusiveDisplayShipping = currencyConversion.Format(displayAmounts.TaxInclusiveShipping, symbol),
            TaxInclusiveDisplayDiscount = displayAmounts.TaxInclusiveDiscount,
            FormattedTaxInclusiveDisplayDiscount = currencyConversion.Format(displayAmounts.TaxInclusiveDiscount, symbol),
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
            GroupCount = result.GroupCount
        };
    }
}
