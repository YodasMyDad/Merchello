using System.Text.Json;
using Merchello.Core.Accounting.Models;
using System.Linq;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Models;
using Merchello.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
namespace Merchello.Core.Checkout.Services;

public class CheckoutService(
    ILineItemService lineItemService,
    IMerchDbContext dbContext,
    IHttpContextAccessor httpContextAccessor,
    IShippingQuoteService shippingQuoteService,
    ILocationsService? locationsService = null) : ICheckoutService
{
    private readonly ILocationsService _locationsService = locationsService ?? new NoopLocationsService();
    /// <summary>
    /// Add line item to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newLineItem"></param>
    /// <param name="countryCode"></param>
    public void AddToBasket(Basket basket, LineItem newLineItem, string countryCode)
    {
        basket.Errors = lineItemService.AddLineItem(basket.LineItems, newLineItem)
            .Select(x => new BasketError { Message = x, RelatedLineItemId = newLineItem.Id}).ToList();
        if (basket.Errors.Any())
        {
            return;
        }

        CalculateBasket(basket, countryCode);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// Add adjustment to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newAdjustment"></param>
    /// <param name="countryCode"></param>
    public void AddToBasket(Basket basket, Adjustment newAdjustment, string countryCode)
    {
        basket.Errors = lineItemService.AddAdjustment(basket.Adjustments, newAdjustment)
            .Select(x => new BasketError { Message = x}).ToList();
        if (basket.Errors.Any())
        {
            return;
        }

        CalculateBasket(basket, countryCode);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// Remove item from basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="lineItemId"></param>
    /// <param name="countryCode"></param>
    public void RemoveFromBasket(Basket basket, Guid lineItemId, string countryCode)
    {
        var itemToRemove = basket.LineItems.FirstOrDefault(item => item.Id == lineItemId);
        if (itemToRemove != null)
        {
            basket.LineItems.Remove(itemToRemove);
            CalculateBasket(basket, countryCode);
            basket.DateUpdated = DateTime.UtcNow;
        }
        else
        {
            basket.Errors.Add(new ()
            {
                Message = "Unable to find line item to remove",
                RelatedLineItemId = lineItemId
            });
        }
    }

    /// <summary>
    /// Calculate the basket if there are any changes
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="countryCode"></param>
    /// <param name="defaultTaxRate"></param>
    /// <param name="isShippingTaxable"></param>
    public void CalculateBasket(Basket basket, string countryCode = "GB", decimal defaultTaxRate = 20, bool isShippingTaxable = true)
    {
        basket.Errors = basket.Errors.Where(error => !error.IsShippingError).ToList();

        var shippingQuotes = shippingQuoteService
            .GetQuotesAsync(basket, countryCode, null)
            .GetAwaiter()
            .GetResult()
            .ToList();

        basket.AvailableShippingQuotes = shippingQuotes;

        foreach (var quoteError in shippingQuotes.SelectMany(q => q.Errors))
        {
            basket.Errors.Add(new BasketError
            {
                Message = quoteError,
                IsShippingError = true
            });
        }

        var shippingCost = shippingQuotes
            .SelectMany(q => q.ServiceLevels)
            .OrderBy(level => level.TotalCost)
            .Select(level => level.TotalCost)
            .FirstOrDefault();

        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            lineItemService.CalculateLineItems(basket.LineItems, basket.Adjustments, shippingCost, defaultTaxRate, isShippingTaxable, basket.TaxRounding);

        basket.SubTotal = subTotal;
        basket.Discount = discount;
        basket.AdjustedSubTotal = adjustedSubTotal;
        basket.Tax = tax;
        basket.Total = total;
        basket.Shipping = shipping;
    }

    /// <summary>
    /// Get basket for a customer or anonymous user
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task<Basket?> GetBasket(GetBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        Basket? basket;
        var httpContext = httpContextAccessor.HttpContext;

        // Check in the session first
        var basketInSession = httpContext?.Session.GetString("Basket");
        if (!string.IsNullOrEmpty(basketInSession))
        {
            basket = JsonSerializer.Deserialize<Basket>(basketInSession);
            if (basket != null) return basket;
        }

        Basket? anonBasket = null;
        Basket? userBasket = null;

        if (parameters.CustomerId.HasValue)
        {
            // User is logged in
            // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataQuery
            userBasket = await dbContext.Baskets
                .FirstOrDefaultAsync(b => b.CustomerId == parameters.CustomerId, cancellationToken);
        }

        // User is not logged in or has items added before logging in, retrieve using cookie
        var basketId = httpContext?.Request.Cookies[Constants.Cookies.BasketId];
        if (!string.IsNullOrEmpty(basketId) && Guid.TryParse(basketId, out var parsedBasketId))
        {
            // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataQuery
            anonBasket = await dbContext.Baskets
                .FirstOrDefaultAsync(b => b.Id == parsedBasketId, cancellationToken);
        }

        if (parameters.CustomerId.HasValue && anonBasket != null)
        {
            // Merge baskets
            if (userBasket == null)
            {
                // No existing user basket, so assign the anonymous basket to the user
                anonBasket.CustomerId = parameters.CustomerId;
            }
            else
            {
                // Merge line items from anonBasket to userBasket
                // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataUsage
                foreach (var anonItem in anonBasket.LineItems)
                {
                    // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataUsage
                    var existingItem = userBasket.LineItems
                        .FirstOrDefault(li => li.ProductId == anonItem.ProductId);

                    if (existingItem != null)
                    {
                        // Item exists in both baskets, so update the quantity in the user's basket
                        existingItem.Quantity += anonItem.Quantity;
                    }
                    else
                    {
                        // Item only exists in anonBasket, so add to user's basket
                        userBasket.LineItems.Add(anonItem);
                    }
                }

                // Remove the anonymous basket from the database
                dbContext.Baskets.Remove(anonBasket);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        basket = userBasket ?? anonBasket;

        // If we retrieved a basket, cache it in the session for subsequent requests
        if (basket != null)
        {
            httpContext?.Session.SetString(Constants.Cookies.BasketId, JsonSerializer.Serialize(basket));
        }

        return basket;
    }

    /// <summary>
    /// Add item to basket with automatic basket retrieval/creation
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task AddToBasket(AddToBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        if (parameters.ItemToAdd != null)
        {
            // 1. Retrieve the basket using the GetBasket method
            var basket = await GetBasket(new GetBasketParameters { CustomerId = parameters.CustomerId }, cancellationToken);

            var isNewBasket = false;
            if (basket == null)
            {
                isNewBasket = true;
                basket = new Basket
                {
                    CustomerId = parameters.CustomerId,
                    DateCreated = DateTime.UtcNow,
                    DateUpdated = DateTime.UtcNow
                };
                dbContext.Baskets.Add(basket);
            }

            // 2. Use CheckoutService to add the new item to the basket
            AddToBasket(basket, parameters.ItemToAdd, "GB");

            // 3. Save the changes to the database
            await dbContext.SaveChangesAsync(cancellationToken);

            // 4. If it's a new basket and for a guest user, update the cookie
            if (isNewBasket && !parameters.CustomerId.HasValue)
            {
                httpContextAccessor.HttpContext?.Response.Cookies.Append(Constants.Cookies.BasketId, basket.Id.ToString());
            }

            // 5. Update the basket stored in the session for immediate reflection on the UI
            httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket));
        }
    }

    /// <summary>
    /// Update line item quantity in basket
    /// </summary>
    public async Task UpdateLineItemQuantity(Guid lineItemId, int quantity, string countryCode = "GB", CancellationToken cancellationToken = default)
    {
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket != null)
        {
            var lineItem = basket.LineItems.FirstOrDefault(li => li.Id == lineItemId);
            if (lineItem != null)
            {
                lineItem.Quantity = quantity;
                CalculateBasket(basket, countryCode);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }
    }

    /// <summary>
    /// Remove line item from basket
    /// </summary>
    public async Task RemoveLineItem(Guid lineItemId, string countryCode = "GB", CancellationToken cancellationToken = default)
    {
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket != null)
        {
            RemoveFromBasket(basket, lineItemId, countryCode);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Delete basket (used after order completion)
    /// </summary>
    public async Task DeleteBasket(Guid basketId, CancellationToken cancellationToken = default)
    {
        var basketToDelete = await dbContext.Baskets
            .FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);

        if (basketToDelete != null)
        {
            dbContext.Baskets.Remove(basketToDelete);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    // Convenience facade methods for locations
    public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken cancellationToken = default)
        => _locationsService.GetAvailableCountriesAsync(cancellationToken);

    public async Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken cancellationToken = default)
    {
        // Start from globally available regions (warehouse service regions + catalog)
        var regions = await _locationsService.GetAvailableRegionsAsync(countryCode, cancellationToken);

        // If no basket or no product items, return the base regions
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);
        if (basket == null || !basket.LineItems.Any(li => li.ProductId.HasValue))
        {
            return regions;
        }

        // Load products with shipping info for current basket
        var productIds = basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        // Reuse the same includes used by ShippingQuoteService to ensure consistency
        var products = await dbContext.Products
            .Include(product => product.ProductRoot)
                .ThenInclude(pr => pr!.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                        .ThenInclude(w => w!.ShippingOptions)
                            .ThenInclude(so => so.ShippingCosts)
            .Include(product => product.ProductRoot)
                .ThenInclude(pr => pr!.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                        .ThenInclude(w => w!.ServiceRegions)
            .Include(product => product.ShippingOptions)
                .ThenInclude(option => option.ShippingCosts)
            .Include(product => product.ShippingOptions)
                .ThenInclude(option => option.Warehouse)
                    .ThenInclude(w => w!.ServiceRegions)
            .AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        // If any basket product is missing, fall back to base regions
        if (products.Count == 0)
        {
            return regions;
        }

        // Filter regions so that all basket items have at least one valid shipping option to that region
        // Uses ProductExtensionMethods.GetValidShippingOptionsForCountry to match provider logic
        var filtered = regions
            .Where(r =>
            {
                foreach (var li in basket.LineItems.Where(x => x.ProductId.HasValue))
                {
                    if (!products.TryGetValue(li.ProductId!.Value, out var product))
                    {
                        return false;
                    }

                    var hasValid = Merchello.Core.Products.ExtensionMethods.ProductExtensionMethods
                        .GetShippingAmountForCountry(product, countryCode, r.RegionCode)
                        .HasValue;

                    if (!hasValid)
                    {
                        return false;
                    }
                }
                return true;
            })
            .ToList();

        return filtered;
    }

    private sealed class NoopLocationsService : ILocationsService
    {
        public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<CountryAvailability>>(Array.Empty<CountryAvailability>());

        public Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<RegionAvailability>>(Array.Empty<RegionAvailability>());
    }
}
