using Merchello.Core.Locality.Models;

namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Request model for calculating tax via a tax provider.
/// </summary>
public class TaxCalculationRequest
{
    /// <summary>
    /// Shipping/delivery address for destination-based tax calculation.
    /// </summary>
    public required Address ShippingAddress { get; init; }

    /// <summary>
    /// Billing address (may be used for origin-based tax in some jurisdictions).
    /// </summary>
    public Address? BillingAddress { get; init; }

    /// <summary>
    /// Currency code for the transaction.
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Line items to calculate tax for.
    /// </summary>
    public required List<TaxableLineItem> LineItems { get; init; }

    /// <summary>
    /// Shipping amount (may be taxable in some jurisdictions).
    /// </summary>
    public decimal ShippingAmount { get; init; }

    /// <summary>
    /// Customer ID for customer-specific tax exemptions.
    /// </summary>
    public Guid? CustomerId { get; init; }

    /// <summary>
    /// Customer email for providers that require it.
    /// </summary>
    public string? CustomerEmail { get; init; }

    /// <summary>
    /// Tax exemption number/certificate if applicable.
    /// </summary>
    public string? TaxExemptionNumber { get; init; }

    /// <summary>
    /// Whether this is a tax-exempt transaction.
    /// </summary>
    public bool IsTaxExempt { get; init; }

    /// <summary>
    /// Transaction date (defaults to now if not specified).
    /// </summary>
    public DateTime? TransactionDate { get; init; }

    /// <summary>
    /// Optional reference/order number for provider tracking.
    /// </summary>
    public string? ReferenceNumber { get; init; }

    /// <summary>
    /// Whether this request is an estimate (for example checkout preview) rather than a finalized order.
    /// </summary>
    public bool IsEstimate { get; init; } = true;

    /// <summary>
    /// Extended data for provider-specific requirements.
    /// </summary>
    public Dictionary<string, string>? ExtendedData { get; init; }
}
