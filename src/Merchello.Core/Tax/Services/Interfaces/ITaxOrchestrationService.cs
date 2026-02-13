using Merchello.Core.Tax.Services.Models;

namespace Merchello.Core.Tax.Services.Interfaces;

public interface ITaxOrchestrationService
{
    Task<TaxOrchestrationResult> CalculateAsync(
        TaxOrchestrationRequest request,
        CancellationToken cancellationToken = default);
}
