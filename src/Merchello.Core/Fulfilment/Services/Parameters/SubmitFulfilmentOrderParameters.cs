using Merchello.Core.Fulfilment;

namespace Merchello.Core.Fulfilment.Services.Parameters;

/// <summary>
/// Parameters for trigger-aware fulfilment order submission.
/// </summary>
public class SubmitFulfilmentOrderParameters
{
    /// <summary>
    /// Order to submit.
    /// </summary>
    public required Guid OrderId { get; set; }

    /// <summary>
    /// Source workflow requesting submission.
    /// </summary>
    public required FulfilmentSubmissionSource Source { get; set; }

    /// <summary>
    /// Whether to enforce invoice paid status before submission.
    /// </summary>
    public bool RequirePaidInvoice { get; set; }
}
