using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Fulfilment.Services.Interfaces;

/// <summary>
/// Coordinates trigger-aware fulfilment submission workflows.
/// </summary>
public interface IFulfilmentSubmissionService
{
    /// <summary>
    /// Submits a single order when trigger/source policy allows it.
    /// </summary>
    Task<CrudResult<Order>> SubmitOrderAsync(
        SubmitFulfilmentOrderParameters parameters,
        CancellationToken cancellationToken = default);
}
