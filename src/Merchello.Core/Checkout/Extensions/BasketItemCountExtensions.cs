using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Extensions;

public static class BasketItemCountExtensions
{
    /// <summary>
    /// Gets the storefront-visible item count (products/custom items only; excludes add-ons and non-sellable lines).
    /// </summary>
    public static int GetStorefrontItemCount(this Basket? basket)
    {
        return basket?.LineItems.GetStorefrontItemCount() ?? 0;
    }

    /// <summary>
    /// Gets the storefront-visible item count from line items (products/custom items only).
    /// </summary>
    public static int GetStorefrontItemCount(this IEnumerable<LineItem>? lineItems)
    {
        return lineItems?
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom)
            .Sum(li => li.Quantity) ?? 0;
    }
}
