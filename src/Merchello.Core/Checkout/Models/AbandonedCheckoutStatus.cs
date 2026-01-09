namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Status of an abandoned checkout record.
/// </summary>
public enum AbandonedCheckoutStatus
{
    /// <summary>
    /// Checkout is still potentially active (customer may return).
    /// </summary>
    Active = 0,

    /// <summary>
    /// Checkout has been detected as abandoned (past inactivity threshold).
    /// </summary>
    Abandoned = 10,

    /// <summary>
    /// Customer returned via recovery link.
    /// </summary>
    Recovered = 20,

    /// <summary>
    /// Customer completed purchase after recovery.
    /// </summary>
    Converted = 30,

    /// <summary>
    /// Recovery window has expired.
    /// </summary>
    Expired = 40
}
