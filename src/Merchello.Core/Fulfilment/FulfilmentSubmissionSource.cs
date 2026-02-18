namespace Merchello.Core.Fulfilment;

/// <summary>
/// Indicates which workflow initiated fulfilment submission.
/// </summary>
public enum FulfilmentSubmissionSource
{
    /// <summary>
    /// Triggered from the payment-created notification flow.
    /// </summary>
    PaymentCreated = 0,

    /// <summary>
    /// Triggered by an explicit staff release action.
    /// </summary>
    ExplicitRelease = 10
}
