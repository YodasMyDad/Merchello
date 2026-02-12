using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Services;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;

namespace Merchello.Controllers;

/// <summary>
/// Storefront API for upsell suggestions and event tracking.
/// </summary>
[ApiController]
[Route("api/merchello/storefront/upsells")]
public class StorefrontUpsellController(
    IUpsellEngine upsellEngine,
    IUpsellAnalyticsService analyticsService,
    ICheckoutService checkoutService,
    IUpsellContextBuilder upsellContextBuilder,
    IStorefrontContextService storefrontContextService,
    ICheckoutSessionService checkoutSessionService,
    IMediaService mediaService,
    MediaUrlGeneratorCollection mediaUrlGenerators,
    IRichTextRenderer richTextRenderer) : ControllerBase
{
    /// <summary>
    /// Get upsell suggestions for the current basket at a specific display location.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSuggestions(
        [FromQuery] UpsellDisplayLocation location,
        [FromQuery] string? countryCode,
        [FromQuery] string? regionCode,
        CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
            return Ok(Array.Empty<UpsellSuggestionDto>());

        var lineItems = await upsellContextBuilder.BuildLineItemsAsync(basket.LineItems, ct);
        if (lineItems.Count == 0)
            return Ok(Array.Empty<UpsellSuggestionDto>());

        var displayContext = await storefrontContextService.GetDisplayContextAsync(ct);
        var resolvedCountryCode = ResolveCountryCode(
            countryCode,
            basket.ShippingAddress?.CountryCode,
            displayContext.TaxCountryCode);
        var resolvedRegionCode = ResolveRegionCode(
            regionCode,
            basket.ShippingAddress?.CountyState?.RegionCode,
            displayContext.TaxRegionCode);
        displayContext = displayContext with
        {
            TaxCountryCode = resolvedCountryCode,
            TaxRegionCode = resolvedRegionCode
        };

        var context = new UpsellContext
        {
            CustomerId = basket.CustomerId,
            BasketId = basket.Id,
            Location = location,
            CountryCode = resolvedCountryCode,
            RegionCode = resolvedRegionCode,
            DisplayContext = displayContext,
            LineItems = lineItems,
        };

        var suggestions = await upsellEngine.GetSuggestionsForLocationAsync(context, location, ct);

        if (suggestions.Count > 0 && basket.Id != Guid.Empty)
        {
            var impressions = suggestions
                .Where(s => s.Products.Count > 0)
                .Select(s => new UpsellImpressionRecord
                {
                    UpsellRuleId = s.UpsellRuleId,
                    DisplayLocation = location,
                    ProductIds = s.Products
                        .Select(p => p.ProductId)
                        .Distinct()
                        .ToList(),
                    Timestamp = DateTime.UtcNow
                })
                .ToList();

            if (impressions.Count > 0)
            {
                await checkoutSessionService.AddUpsellImpressionsAsync(new AddUpsellImpressionsParameters
                {
                    BasketId = basket.Id,
                    Impressions = impressions
                }, ct);
            }
        }

        var dtos = suggestions.Select(MapSuggestionToDto).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Get upsell suggestions for a specific product page.
    /// </summary>
    [HttpGet("product/{productId:guid}")]
    public async Task<IActionResult> GetProductSuggestions(
        Guid productId,
        [FromQuery] string? countryCode,
        [FromQuery] string? regionCode,
        CancellationToken ct)
    {
        var lineItem = await upsellContextBuilder.BuildLineItemAsync(productId, 1, 0m, ct);
        if (lineItem == null)
            return Ok(Array.Empty<UpsellSuggestionDto>());

        var displayContext = await storefrontContextService.GetDisplayContextAsync(ct);
        var locationContext = await storefrontContextService.GetShippingLocationAsync(ct);
        var resolvedCountryCode = ResolveCountryCode(
            countryCode,
            locationContext.CountryCode,
            displayContext.TaxCountryCode);
        var resolvedRegionCode = ResolveRegionCode(
            regionCode,
            locationContext.RegionCode,
            displayContext.TaxRegionCode);

        displayContext = displayContext with
        {
            TaxCountryCode = resolvedCountryCode,
            TaxRegionCode = resolvedRegionCode
        };

        var context = new UpsellContext
        {
            LineItems = [lineItem],
            Location = UpsellDisplayLocation.ProductPage,
            CountryCode = resolvedCountryCode,
            RegionCode = resolvedRegionCode,
            DisplayContext = displayContext
        };

        var suggestions = await upsellEngine.GetSuggestionsForLocationAsync(
            context,
            UpsellDisplayLocation.ProductPage,
            ct);

        var dtos = suggestions.Select(MapSuggestionToDto).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Record upsell impression/click events (batch).
    /// </summary>
    [HttpPost("events")]
    public async Task<IActionResult> RecordEvents(
        [FromBody] RecordUpsellEventsDto? dto,
        CancellationToken ct)
    {
        if (dto?.Events == null || dto.Events.Count == 0)
            return NoContent();

        foreach (var e in dto.Events)
        {
            if (e.UpsellRuleId == Guid.Empty)
                continue;

            var parameters = new RecordUpsellEventParameters
            {
                UpsellRuleId = e.UpsellRuleId,
                DisplayLocation = e.DisplayLocation,
                ProductId = e.ProductId,
            };

            switch (e.EventType)
            {
                case UpsellEventType.Impression:
                    await analyticsService.RecordImpressionAsync(parameters, ct);
                    break;
                case UpsellEventType.Click:
                    await analyticsService.RecordClickAsync(parameters, ct);
                    break;
            }
        }

        return NoContent();
    }

    private UpsellSuggestionDto MapSuggestionToDto(UpsellSuggestion suggestion) => new()
    {
        UpsellRuleId = suggestion.UpsellRuleId,
        Heading = suggestion.Heading,
        Message = suggestion.Message,
        CheckoutMode = suggestion.CheckoutMode,
        DefaultChecked = suggestion.DefaultChecked,
        Products = suggestion.Products.Select(MapProductToDto).ToList()
    };

    private UpsellProductDto MapProductToDto(UpsellProduct product) => new()
    {
        ProductId = product.ProductId,
        ProductRootId = product.ProductRootId,
        Name = product.Name,
        Description = richTextRenderer.Render(product.Description).ToHtmlString(),
        Sku = product.Sku,
        Price = product.Price,
        FormattedPrice = product.FormattedPrice,
        PriceIncludesTax = product.PriceIncludesTax,
        TaxRate = product.TaxRate,
        TaxAmount = product.TaxAmount,
        FormattedTaxAmount = product.FormattedTaxAmount,
        OnSale = product.OnSale,
        PreviousPrice = product.PreviousPrice,
        FormattedPreviousPrice = product.FormattedPreviousPrice,
        Url = product.Url,
        ImageUrl = ResolveFirstImageUrl(product.Images),
        ProductTypeName = product.ProductTypeName,
        AvailableForPurchase = product.AvailableForPurchase,
        HasVariants = product.HasVariants,
        Variants = product.Variants?.Select(MapVariantToDto).ToList()
    };

    private static UpsellVariantDto MapVariantToDto(UpsellVariant variant) => new()
    {
        ProductId = variant.ProductId,
        Name = variant.Name,
        Sku = variant.Sku,
        Price = variant.Price,
        FormattedPrice = variant.FormattedPrice,
        AvailableForPurchase = variant.AvailableForPurchase
    };

    private static string ResolveCountryCode(
        string? queryCountryCode,
        string? sourceCountryCode,
        string fallbackCountryCode)
    {
        if (!string.IsNullOrWhiteSpace(queryCountryCode))
            return queryCountryCode.Trim().ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(sourceCountryCode))
            return sourceCountryCode.Trim().ToUpperInvariant();

        return fallbackCountryCode;
    }

    private static string? ResolveRegionCode(
        string? queryRegionCode,
        string? sourceRegionCode,
        string? fallbackRegionCode)
    {
        if (!string.IsNullOrWhiteSpace(queryRegionCode))
            return queryRegionCode.Trim().ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(sourceRegionCode))
            return sourceRegionCode.Trim().ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(fallbackRegionCode))
            return fallbackRegionCode.Trim().ToUpperInvariant();

        return null;
    }

    private string? ResolveFirstImageUrl(List<string> images)
    {
        foreach (var image in images)
        {
            if (string.IsNullOrWhiteSpace(image)) continue;

            if (image.StartsWith('/') || image.StartsWith("http"))
                return image;

            if (Guid.TryParse(image, out var mediaKey))
            {
                var media = mediaService.GetById(mediaKey);
                if (media != null &&
                    mediaUrlGenerators.TryGetMediaPath(media.ContentType.Alias, media.GetValue<string>("umbracoFile"), out var mediaPath))
                {
                    return mediaPath;
                }
            }
        }

        return null;
    }
}
