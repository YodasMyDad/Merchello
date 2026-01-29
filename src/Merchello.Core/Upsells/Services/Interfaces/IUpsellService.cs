using Merchello.Core.Shared.Models;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Parameters;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// CRUD operations for managing upsell rules.
/// </summary>
public interface IUpsellService
{
    // =====================================================
    // CRUD Operations
    // =====================================================

    Task<PaginatedList<UpsellRule>> QueryAsync(UpsellQueryParameters parameters, CancellationToken ct = default);
    Task<UpsellRule?> GetByIdAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> CreateAsync(CreateUpsellParameters parameters, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> UpdateAsync(Guid upsellRuleId, UpdateUpsellParameters parameters, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteAsync(Guid upsellRuleId, CancellationToken ct = default);

    // =====================================================
    // Status Management
    // =====================================================

    Task<CrudResult<UpsellRule>> ActivateAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> DeactivateAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task UpdateExpiredUpsellsAsync(CancellationToken ct = default);

    // =====================================================
    // Bulk Operations
    // =====================================================

    Task<List<UpsellRule>> GetActiveUpsellRulesAsync(CancellationToken ct = default);
    Task<List<UpsellRule>> GetActiveUpsellRulesForLocationAsync(UpsellDisplayLocation location, CancellationToken ct = default);
}
