using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Accounting.Models;

public class Order
{
    /// <summary>
    /// Order Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The invoice id
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Invoice this order is part of
    /// </summary>
    public Invoice? Invoice { get; set; }

    /// <summary>
    /// Warehouse this order ships from
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// The selected shipping option/method for this order.
    /// For dynamic providers (FedEx, UPS), this will be Guid.Empty.
    /// </summary>
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// The shipping provider key (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public string? ShippingProviderKey { get; set; }

    /// <summary>
    /// The carrier service code for dynamic providers (e.g., "FEDEX_GROUND", "03").
    /// Null for flat-rate options.
    /// </summary>
    public string? ShippingServiceCode { get; set; }

    /// <summary>
    /// The carrier service display name (e.g., "FedEx Ground").
    /// Stored for historical display even if service codes change.
    /// </summary>
    public string? ShippingServiceName { get; set; }

    /// <summary>
    /// Classified speed tier for this order's shipping service.
    /// Inferred from delivery time data at order creation (works for both flat-rate and dynamic options).
    /// Used by fulfilment providers to determine 3PL-specific shipping methods.
    /// Null when no delivery time data is available (uses DefaultShippingMethod fallback).
    /// </summary>
    public ShippingServiceCategory? ShippingServiceCategory { get; set; }

    /// <summary>
    /// Shipping cost for this order
    /// </summary>
    public decimal ShippingCost { get; set; }

    /// <summary>
    /// The shipping cost quoted to the customer at selection time.
    /// Used for reconciliation if actual carrier rate differs at fulfillment.
    /// </summary>
    public decimal? QuotedShippingCost { get; set; }

    /// <summary>
    /// When the shipping rate was quoted to the customer.
    /// </summary>
    public DateTime? QuotedAt { get; set; }

    /// <summary>
    /// Store currency equivalent of ShippingCost (for reporting).
    /// </summary>
    public decimal? ShippingCostInStoreCurrency { get; set; }

    /// <summary>
    /// Customer's requested delivery date (if applicable)
    /// </summary>
    public DateTime? RequestedDeliveryDate { get; set; }

    /// <summary>
    /// Whether the delivery date is guaranteed or best effort
    /// Copied from ShippingOption at time of order creation
    /// </summary>
    public bool? IsDeliveryDateGuaranteed { get; set; }

    /// <summary>
    /// Additional surcharge for the selected delivery date (if any)
    /// Included in ShippingCost but stored separately for transparency
    /// </summary>
    public decimal? DeliveryDateSurcharge { get; set; }

    /// <summary>
    /// Store currency equivalent of DeliveryDateSurcharge (for reporting).
    /// </summary>
    public decimal? DeliveryDateSurchargeInStoreCurrency { get; set; }

    /// <summary>
    /// Line items on the order
    /// </summary>
    public virtual ICollection<LineItem>? LineItems { get; set; }

    /// <summary>
    /// Shipments on this order
    /// </summary>
    public virtual ICollection<Shipment>? Shipments { get; set; }

    /// <summary>
    /// Current status of the order
    /// </summary>
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    /// <summary>
    /// Date when order processing started
    /// </summary>
    public DateTime? ProcessingStartedDate { get; set; }

    /// <summary>
    /// Date when all items were shipped
    /// </summary>
    public DateTime? ShippedDate { get; set; }

    /// <summary>
    /// Date when order was completed/delivered
    /// </summary>
    public DateTime? CompletedDate { get; set; }

    /// <summary>
    /// Date when order was cancelled
    /// </summary>
    public DateTime? CancelledDate { get; set; }

    /// <summary>
    /// Reason for cancellation (if applicable)
    /// </summary>
    public string? CancellationReason { get; set; }

    /// <summary>
    /// Internal notes for warehouse staff or admin
    /// </summary>
    public string? InternalNotes { get; set; }

    /// <summary>
    /// Extended data for provider-specific or custom information
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    // Fulfilment Provider Tracking

    /// <summary>
    /// FK to the fulfilment provider configuration used for this order
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// The fulfilment provider configuration used for this order
    /// </summary>
    public virtual FulfilmentProviderConfiguration? FulfilmentProviderConfiguration { get; set; }

    /// <summary>
    /// The 3PL's order ID/reference (e.g., "SB-12345")
    /// </summary>
    public string? FulfilmentProviderReference { get; set; }

    /// <summary>
    /// When the order was submitted to the 3PL
    /// </summary>
    public DateTime? FulfilmentSubmittedAt { get; set; }

    /// <summary>
    /// Last error message from fulfilment submission
    /// </summary>
    public string? FulfilmentErrorMessage { get; set; }

    /// <summary>
    /// Number of retry attempts for fulfilment submission
    /// </summary>
    public int FulfilmentRetryCount { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
