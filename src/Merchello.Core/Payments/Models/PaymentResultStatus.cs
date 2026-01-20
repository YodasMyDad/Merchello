namespace Merchello.Core.Payments.Models;

/// <summary>
/// Status of a payment result.
/// </summary>
public enum PaymentResultStatus
{
    /// <summary>
    /// Payment initiated but not confirmed (async confirmation via webhook).
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Payment authorized but not captured.
    /// </summary>
    Authorized = 10,

    /// <summary>
    /// Payment completed successfully.
    /// </summary>
    Completed = 20,

    /// <summary>
    /// Payment failed.
    /// </summary>
    Failed = 30,

    /// <summary>
    /// Payment cancelled by customer.
    /// </summary>
    Cancelled = 40,

    /// <summary>
    /// Payment requires additional action (e.g., 3DS challenge, redirect).
    /// </summary>
    RequiresAction = 50
}
