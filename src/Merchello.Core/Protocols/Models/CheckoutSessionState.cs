namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of a checkout session.
/// </summary>
public class CheckoutSessionState
{
    public required string SessionId { get; init; }

    /// <summary>
    /// Session status: incomplete, requires_escalation, ready_for_complete,
    /// complete_in_progress, completed, canceled
    /// </summary>
    public required string Status { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }

    /// <summary>
    /// ISO 4217 currency code.
    /// </summary>
    public required string Currency { get; init; }

    public required IReadOnlyList<CheckoutLineItemState> LineItems { get; init; }
    public CheckoutAddressState? BillingAddress { get; init; }
    public CheckoutAddressState? ShippingAddress { get; init; }
    public bool ShippingSameAsBilling { get; init; }

    public IReadOnlyList<CheckoutDiscountState> Discounts { get; init; } = [];
    public CheckoutFulfillmentState? Fulfillment { get; init; }
    public required CheckoutTotalsState Totals { get; init; }

    /// <summary>
    /// Validation messages (errors, warnings, info).
    /// </summary>
    public IReadOnlyList<CheckoutMessageState> Messages { get; init; } = [];

    /// <summary>
    /// URL for escalation handoff when status is requires_escalation.
    /// </summary>
    public string? ContinueUrl { get; init; }

    /// <summary>
    /// Available payment handlers.
    /// </summary>
    public IReadOnlyList<ProtocolPaymentHandler> PaymentHandlers { get; init; } = [];

    public string? BuyerEmail { get; init; }
    public IReadOnlyDictionary<string, object>? Metadata { get; init; }
}
