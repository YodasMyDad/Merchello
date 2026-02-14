using Merchello.Core.Locality.Models;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Services.Models;

public class TaxOrchestrationRequest
{
    public required Address ShippingAddress { get; init; }

    public Address? BillingAddress { get; init; }

    public required string CurrencyCode { get; init; }

    public required List<TaxableLineItem> LineItems { get; init; }

    public decimal ShippingAmount { get; init; }

    public Guid? CustomerId { get; init; }

    public string? CustomerEmail { get; init; }

    public bool IsTaxExempt { get; init; }

    public DateTime? TransactionDate { get; init; }

    public string? ReferenceNumber { get; init; }

    public bool AllowEstimate { get; init; }
}
