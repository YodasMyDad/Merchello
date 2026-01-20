namespace Merchello.Core.Protocols;

/// <summary>
/// Constants for protocol operations.
/// </summary>
public static class ProtocolConstants
{
    /// <summary>
    /// Well-known paths for protocol discovery.
    /// </summary>
    public static class WellKnownPaths
    {
        public const string Base = "/.well-known";
        public const string Ucp = "/.well-known/ucp";
        public const string OAuthServer = "/.well-known/oauth-authorization-server";
    }

    /// <summary>
    /// Protocol aliases.
    /// </summary>
    public static class Protocols
    {
        public const string Ucp = "ucp";
    }

    /// <summary>
    /// UCP capability namespaces.
    /// </summary>
    public static class UcpCapabilities
    {
        public const string Checkout = "dev.ucp.shopping.checkout";
        public const string Order = "dev.ucp.shopping.order";
        public const string IdentityLinking = "dev.ucp.common.identity_linking";
    }

    /// <summary>
    /// UCP extension namespaces.
    /// </summary>
    public static class UcpExtensions
    {
        public const string Discount = "dev.ucp.shopping.discount";
        public const string Fulfillment = "dev.ucp.shopping.fulfillment";
        public const string BuyerConsent = "dev.ucp.shopping.buyer_consent";
        public const string Ap2Mandates = "dev.ucp.shopping.ap2_mandates";
    }

    /// <summary>
    /// Checkout session status values.
    /// </summary>
    public static class SessionStatus
    {
        public const string Incomplete = "incomplete";
        public const string RequiresEscalation = "requires_escalation";
        public const string ReadyForComplete = "ready_for_complete";
        public const string CompleteInProgress = "complete_in_progress";
        public const string Completed = "completed";
        public const string Canceled = "canceled";
    }

    /// <summary>
    /// Message types.
    /// </summary>
    public static class MessageTypes
    {
        public const string Error = "error";
        public const string Warning = "warning";
        public const string Info = "info";
    }

    /// <summary>
    /// Message codes.
    /// </summary>
    public static class MessageCodes
    {
        public const string Missing = "missing";
        public const string Invalid = "invalid";
        public const string OutOfStock = "out_of_stock";
        public const string ShippingUnavailable = "shipping_unavailable";
        public const string PaymentDeclined = "payment_declined";
        public const string DiscountCodeExpired = "discount_code_expired";
        public const string DiscountCodeInvalid = "discount_code_invalid";
        public const string DiscountCodeAlreadyApplied = "discount_code_already_applied";
        public const string DiscountCodeCombinationDisallowed = "discount_code_combination_disallowed";
        public const string DiscountCodeUserNotLoggedIn = "discount_code_user_not_logged_in";
        public const string DiscountCodeUserIneligible = "discount_code_user_ineligible";
    }

    /// <summary>
    /// Message severity levels.
    /// </summary>
    public static class MessageSeverity
    {
        public const string Recoverable = "recoverable";
        public const string RequiresBuyerInput = "requires_buyer_input";
        public const string RequiresBuyerReview = "requires_buyer_review";
    }

    /// <summary>
    /// Fulfillment method types.
    /// </summary>
    public static class FulfillmentTypes
    {
        public const string Shipping = "shipping";
        public const string Pickup = "pickup";
    }

    /// <summary>
    /// Payment handler types.
    /// </summary>
    public static class PaymentHandlerTypes
    {
        public const string Redirect = "redirect";
        public const string Tokenized = "tokenized";
        public const string Wallet = "wallet";
        public const string Form = "form";
    }

    /// <summary>
    /// Discount types.
    /// </summary>
    public static class DiscountTypes
    {
        public const string Percentage = "percentage";
        public const string FixedAmount = "fixed_amount";
        public const string FreeShipping = "free_shipping";
        public const string BuyXGetY = "buy_x_get_y";
    }

    /// <summary>
    /// Discount allocation methods.
    /// </summary>
    public static class DiscountAllocationMethods
    {
        public const string Each = "each";
        public const string Across = "across";
    }

    /// <summary>
    /// HTTP headers used by protocols.
    /// </summary>
    public static class Headers
    {
        public const string UcpAgent = "UCP-Agent";
        public const string ContentType = "Content-Type";
        public const string IdempotencyKey = "Idempotency-Key";
        public const string RequestSignature = "Request-Signature";
        public const string RequestId = "Request-Id";
        public const string ApiKey = "X-API-Key";
    }

    /// <summary>
    /// Cache key prefixes.
    /// </summary>
    public static class CacheKeys
    {
        public const string ManifestPrefix = "merchello:protocols:manifest:";
        public const string CapabilitiesPrefix = "merchello:protocols:capabilities:";
        public const string SigningKeys = "merchello:protocols:signing-keys";
    }

    /// <summary>
    /// Cache durations.
    /// </summary>
    public static class CacheDurations
    {
        public static readonly TimeSpan ManifestCache = TimeSpan.FromMinutes(60);
        public static readonly TimeSpan CapabilitiesCache = TimeSpan.FromMinutes(60);
        public static readonly TimeSpan SigningKeysCache = TimeSpan.FromHours(24);
    }

    /// <summary>
    /// Order fulfillment event types.
    /// </summary>
    public static class FulfillmentEventTypes
    {
        public const string Processing = "processing";
        public const string Shipped = "shipped";
        public const string InTransit = "in_transit";
        public const string Delivered = "delivered";
        public const string FailedAttempt = "failed_attempt";
        public const string Canceled = "canceled";
        public const string Undeliverable = "undeliverable";
        public const string ReturnedToSender = "returned_to_sender";
    }

    /// <summary>
    /// Order adjustment types.
    /// </summary>
    public static class AdjustmentTypes
    {
        public const string Refund = "refund";
        public const string Return = "return";
        public const string Credit = "credit";
        public const string PriceAdjustment = "price_adjustment";
        public const string Dispute = "dispute";
        public const string Cancellation = "cancellation";
    }

    /// <summary>
    /// Current UCP specification version.
    /// </summary>
    public const string CurrentUcpVersion = "2026-01-11";
}
