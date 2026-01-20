using Merchello.Core.Notifications.Base;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Notifications.Product;

/// <summary>
/// Notification published before a ProductRoot is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Sync product data to external PIM or ERP systems
/// - Validate pricing rules (margin requirements, price floors)
/// - Auto-generate SEO metadata or slugs
/// - Enforce product data consistency rules
/// </remarks>
public class ProductSavingNotification(ProductRoot product)
    : MerchelloCancelableNotification<ProductRoot>(product)
{
    /// <summary>
    /// The product being saved.
    /// </summary>
    public ProductRoot Product => Entity;
}
