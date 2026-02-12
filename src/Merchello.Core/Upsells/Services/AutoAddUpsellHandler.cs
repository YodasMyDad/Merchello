using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Handles BasketItemAddedNotification to automatically add upsell products to the basket
/// when auto-add rules match. This enables "package protection" style opt-out upsells
/// where products are added by default and customers can remove them.
/// </summary>
[NotificationHandlerPriority(2300)]
public class AutoAddUpsellHandler(
    IUpsellEngine upsellEngine,
    IUpsellService upsellService,
    IUpsellContextBuilder upsellContextBuilder,
    ILineItemService lineItemService,
    LineItemFactory lineItemFactory,
    ICheckoutService checkoutService,
    ICheckoutSessionService checkoutSessionService,
    ILogger<AutoAddUpsellHandler> logger)
    : INotificationAsyncHandler<BasketItemAddedNotification>
{
    public async Task HandleAsync(BasketItemAddedNotification notification, CancellationToken ct)
    {
        try
        {
            // Check if any active auto-add rules exist (early exit to avoid unnecessary work)
            var activeRules = await upsellService.GetActiveUpsellRulesAsync(ct);
            var autoAddRuleIds = activeRules
                .Where(r => r.AutoAddToBasket)
                .Select(r => r.Id)
                .ToHashSet();

            if (autoAddRuleIds.Count == 0) return;

            var basket = notification.Basket;

            // Build upsell context from current basket
            var lineItems = await upsellContextBuilder.BuildLineItemsAsync(basket.LineItems, ct);
            if (lineItems.Count == 0) return;

            var context = new UpsellContext
            {
                CustomerId = basket.CustomerId,
                BasketId = basket.Id,
                LineItems = lineItems
            };

            // Evaluate all rules using the existing engine (reuses trigger/eligibility/scheduling/region logic)
            var suggestions = await upsellEngine.GetSuggestionsAsync(context, ct);
            var autoAddSuggestions = suggestions
                .Where(s => autoAddRuleIds.Contains(s.UpsellRuleId))
                .ToList();

            if (autoAddSuggestions.Count == 0) return;

            // Load suppressed items from checkout session (products customer previously removed)
            var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);
            var suppressedItems = session.RemovedAutoAddUpsells
                .Select(r => (r.UpsellRuleId, r.ProductId))
                .ToHashSet();

            // Track which product IDs are already in the basket
            var basketProductIds = basket.LineItems
                .Where(li => li.ProductId.HasValue)
                .Select(li => li.ProductId!.Value)
                .ToHashSet();

            var itemsAdded = false;

            foreach (var suggestion in autoAddSuggestions)
            {
                foreach (var product in suggestion.Products)
                {
                    // Skip if already in basket
                    if (basketProductIds.Contains(product.ProductId)) continue;

                    // Skip if customer previously removed this auto-added item
                    if (suppressedItems.Contains((suggestion.UpsellRuleId, product.ProductId))) continue;

                    // Create line item — use AddLineItem directly to avoid recursive notification
                    var lineItem = lineItemFactory.CreateAutoAddProductLineItem(
                        product.ProductId,
                        product.Name,
                        product.Sku ?? string.Empty,
                        product.Price,
                        new Dictionary<string, object>
                        {
                            [Constants.ExtendedDataKeys.AutoAddedByUpsellRule] = suggestion.UpsellRuleId.ToString()
                        });

                    var errors = lineItemService.AddLineItem(basket.LineItems, lineItem);
                    if (errors.Count == 0)
                    {
                        basketProductIds.Add(product.ProductId);
                        itemsAdded = true;
                    }
                }
            }

            if (itemsAdded)
            {
                // Recalculate basket totals
                var countryCode = basket.ShippingAddress?.CountryCode;
                if (string.IsNullOrWhiteSpace(countryCode))
                    countryCode = basket.BillingAddress?.CountryCode;

                await checkoutService.CalculateBasketAsync(
                    new CalculateBasketParameters
                    {
                        Basket = basket,
                        CountryCode = countryCode
                    }, ct);

                basket.DateUpdated = DateTime.UtcNow;

                // Persist updated basket to per-request cache
                checkoutSessionService.CacheBasket(basket);
            }
        }
        catch (Exception ex)
        {
            // Auto-add must never break the primary add-to-basket flow
            logger.LogWarning(ex, "Failed to auto-add upsell products to basket");
        }
    }
}
