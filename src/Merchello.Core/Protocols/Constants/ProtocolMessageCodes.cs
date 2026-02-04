namespace Merchello.Core.Protocols;

/// <summary>
/// Protocol message codes.
/// </summary>
public static class ProtocolMessageCodes
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
