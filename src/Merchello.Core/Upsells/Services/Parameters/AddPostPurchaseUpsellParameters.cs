using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for adding a post-purchase upsell item and charging the saved payment method.
/// </summary>
public class AddPostPurchaseUpsellParameters
{
    /// <summary>
    /// The invoice to add the product to.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The product variant to add.
    /// </summary>
    public required Guid ProductId { get; init; }

    /// <summary>
    /// Quantity to add.
    /// </summary>
    public int Quantity { get; init; } = 1;

    /// <summary>
    /// The upsell rule that recommended this product.
    /// </summary>
    public required Guid UpsellRuleId { get; init; }

    /// <summary>
    /// The saved payment method to charge.
    /// </summary>
    public required Guid SavedPaymentMethodId { get; init; }

    /// <summary>
    /// Idempotency key to prevent duplicate charges.
    /// </summary>
    public string? IdempotencyKey { get; init; }

    /// <summary>
    /// Selected add-on options (non-variant product options).
    /// </summary>
    public List<OrderAddonDto>? Addons { get; init; }
}
