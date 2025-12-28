using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Site.Storefront.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Site.Storefront.Controllers;

[ApiController]
[Route("api/storefront")]
public class StorefrontApiController(
    ICheckoutService checkoutService,
    IProductService productService,
    IOptions<MerchelloSettings> settings) : ControllerBase
{
    private readonly MerchelloSettings _settings = settings.Value;

    /// <summary>
    /// Add item to basket
    /// </summary>
    [HttpPost("basket/add")]
    public async Task<IActionResult> AddToBasket([FromBody] AddToBasketRequest request, CancellationToken ct)
    {
        // Get the product (variant)
        var product = await productService.GetProduct(new GetProductParameters
        {
            ProductId = request.ProductId,
            IncludeProductRoot = true,
            IncludeTaxGroup = true,
            NoTracking = true
        }, ct);

        if (product == null)
        {
            return BadRequest(new BasketResponse
            {
                Success = false,
                Message = "Product not found"
            });
        }

        // Check if product is available for purchase
        if (!product.AvailableForPurchase)
        {
            return BadRequest(new BasketResponse
            {
                Success = false,
                Message = "This product is currently out of stock"
            });
        }

        // Create the main product line item
        var lineItem = checkoutService.CreateLineItem(product, request.Quantity);

        // Add to basket
        await checkoutService.AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = lineItem
        }, ct);

        // Handle add-ons if any
        if (request.Addons.Count > 0 && product.ProductRoot?.ProductOptions != null)
        {
            var addonOptions = product.ProductRoot.ProductOptions
                .Where(po => !po.IsVariant)
                .ToList();

            var valueLookup = addonOptions
                .SelectMany(o => o.ProductOptionValues.Select(v => (Option: o, Value: v)))
                .ToDictionary(x => x.Value.Id, x => x);

            foreach (var addon in request.Addons)
            {
                if (!valueLookup.TryGetValue(addon.ValueId, out var ov))
                    continue;

                // Create addon line item
                var addonLineItem = new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = $"{ov.Option.Name}: {ov.Value.Name}",
                    Sku = string.IsNullOrWhiteSpace(ov.Value.SkuSuffix)
                        ? $"ADDON-{ov.Value.Id.ToString()[..8]}"
                        : $"{product.Sku}-{ov.Value.SkuSuffix}",
                    DependantLineItemSku = lineItem.Sku,
                    Quantity = request.Quantity,
                    Amount = ov.Value.PriceAdjustment,
                    LineItemType = LineItemType.Custom,
                    IsTaxable = true,
                    TaxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 20m
                };

                addonLineItem.ExtendedData["AddonOptionId"] = ov.Option.Id.ToString();
                addonLineItem.ExtendedData["AddonValueId"] = ov.Value.Id.ToString();

                await checkoutService.AddToBasket(new AddToBasketParameters
                {
                    ItemToAdd = addonLineItem
                }, ct);
            }
        }

        // Get updated basket to return count
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Added to basket",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Get full basket with all line items
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new FullBasketResponse
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol
            });
        }

        var items = basket.LineItems.Select(li => new BasketLineItemDto
        {
            Id = li.Id,
            Sku = li.Sku ?? "",
            Name = li.Name ?? "",
            Quantity = li.Quantity,
            UnitPrice = li.Amount,
            LineTotal = li.Amount * li.Quantity,
            FormattedUnitPrice = FormatPrice(li.Amount),
            FormattedLineTotal = FormatPrice(li.Amount * li.Quantity),
            LineItemType = li.LineItemType.ToString(),
            DependantLineItemSku = li.DependantLineItemSku
        }).ToList();

        return Ok(new FullBasketResponse
        {
            Items = items,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            Tax = basket.Tax,
            Total = basket.Total,
            FormattedSubTotal = FormatPrice(basket.SubTotal),
            FormattedDiscount = FormatPrice(basket.Discount),
            FormattedTax = FormatPrice(basket.Tax),
            FormattedTotal = FormatPrice(basket.Total),
            CurrencySymbol = _settings.CurrencySymbol,
            ItemCount = basket.LineItems.Sum(li => li.Quantity),
            IsEmpty = false
        });
    }

    /// <summary>
    /// Get basket item count
    /// </summary>
    [HttpGet("basket/count")]
    public async Task<IActionResult> GetBasketCount(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketCountResponse
        {
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Update line item quantity
    /// </summary>
    [HttpPost("basket/update")]
    public async Task<IActionResult> UpdateQuantity([FromBody] UpdateQuantityRequest request, CancellationToken ct)
    {
        await checkoutService.UpdateLineItemQuantity(request.LineItemId, request.Quantity, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Quantity updated",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Remove item from basket
    /// </summary>
    [HttpDelete("basket/{lineItemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid lineItemId, CancellationToken ct)
    {
        await checkoutService.RemoveLineItem(lineItemId, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Item removed",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    private string FormatPrice(decimal price)
    {
        return $"{_settings.CurrencySymbol}{price:N2}";
    }
}
