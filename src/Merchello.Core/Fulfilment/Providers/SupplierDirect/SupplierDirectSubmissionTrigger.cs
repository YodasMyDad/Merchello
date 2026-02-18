namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Defines when Supplier Direct should submit an order to supplier delivery channels.
/// </summary>
public enum SupplierDirectSubmissionTrigger
{
    /// <summary>
    /// Submit automatically when payment is created and the invoice is fully paid.
    /// </summary>
    OnPaid = 0,

    /// <summary>
    /// Submit only when a staff member explicitly releases the order.
    /// </summary>
    ExplicitRelease = 10
}
