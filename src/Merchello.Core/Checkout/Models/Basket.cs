using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Checkout.Models;

public class Basket
{
    /// <summary>
    /// Basket Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// If a customer is logged in then this will be the customers id
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// Line items in the basket
    /// </summary>
    public List<LineItem> LineItems { get; set; } = [];

    /// <summary>
    /// Date basket was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date basket was updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Concurrency token to detect conflicting basket modifications (e.g., multiple tabs)
    /// </summary>
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Currency of this basket
    /// </summary>
    public string? Currency { get; set; }

    /// <summary>
    /// Currency Symbol for this basket
    /// </summary>
    public string? CurrencySymbol { get; set; }

    /// <summary>
    /// Holds the sub total of the basket
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Holds any discount amount in the basket as a whole
    /// </summary>
    public decimal Discount { get; set; }

    /// <summary>
    /// Subtotal after discounts are applied
    /// </summary>
    public decimal AdjustedSubTotal { get; set; }

    /// <summary>
    /// Holds any tax amount in the basket as a whole
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Effective shipping tax rate percentage (weighted average of line item rates).
    /// Used for tax-inclusive display when shipping uses proportional calculation.
    /// Null when shipping is not taxable or a specific rate was configured.
    /// </summary>
    public decimal? EffectiveShippingTaxRate { get; set; }

    /// <summary>
    /// Holds the Total of the basket
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Holds the Total of shipping
    /// </summary>
    public decimal Shipping { get; set; }

    /// <summary>
    /// Holds a list of errors
    /// </summary>
    public List<BasketError> Errors { get; set; } = [];

    /// <summary>
    /// Billing address used during checkout
    /// </summary>
    public Address BillingAddress { get; set; } = new();

    /// <summary>
    /// Shipping address used during checkout
    /// </summary>
    public Address ShippingAddress { get; set; } = new();

    /// <summary>
    /// Shipping quotes returned by enabled providers during basket calculation.
    /// </summary>
    public List<ShippingRateQuote> AvailableShippingQuotes { get; set; } = [];
}
