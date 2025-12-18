using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Discounts.Services.Interfaces;

/// <summary>
/// Service for managing discounts.
/// </summary>
public interface IDiscountService
{
    // =====================================================
    // CRUD Operations
    // =====================================================

    /// <summary>
    /// Queries discounts with filtering and pagination.
    /// </summary>
    Task<PaginatedList<Discount>> QueryAsync(DiscountQueryParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Gets a discount by ID with all related entities.
    /// </summary>
    Task<Discount?> GetByIdAsync(Guid discountId, CancellationToken ct = default);

    /// <summary>
    /// Gets a discount by code.
    /// </summary>
    Task<Discount?> GetByCodeAsync(string code, CancellationToken ct = default);

    /// <summary>
    /// Creates a new discount.
    /// </summary>
    Task<CrudResult<Discount>> CreateAsync(CreateDiscountParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing discount.
    /// </summary>
    Task<CrudResult<Discount>> UpdateAsync(Guid discountId, UpdateDiscountParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Deletes a discount.
    /// </summary>
    Task<CrudResult<bool>> DeleteAsync(Guid discountId, CancellationToken ct = default);

    // =====================================================
    // Bulk Operations
    // =====================================================

    /// <summary>
    /// Gets all active automatic discounts.
    /// </summary>
    Task<List<Discount>> GetActiveAutomaticDiscountsAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets discounts by IDs with all related entities.
    /// </summary>
    Task<List<Discount>> GetByIdsAsync(List<Guid> discountIds, CancellationToken ct = default);

    // =====================================================
    // Status Management
    // =====================================================

    /// <summary>
    /// Activates a discount (changes status to Active).
    /// </summary>
    Task<CrudResult<Discount>> ActivateAsync(Guid discountId, CancellationToken ct = default);

    /// <summary>
    /// Deactivates a discount (changes status to Disabled).
    /// </summary>
    Task<CrudResult<Discount>> DeactivateAsync(Guid discountId, CancellationToken ct = default);

    /// <summary>
    /// Updates discount statuses based on scheduling.
    /// Called by background job to expire discounts and activate scheduled ones.
    /// </summary>
    Task UpdateExpiredDiscountsAsync(CancellationToken ct = default);

    // =====================================================
    // Code Generation & Validation
    // =====================================================

    /// <summary>
    /// Generates a unique discount code.
    /// </summary>
    string GenerateUniqueCode(int length = 8);

    /// <summary>
    /// Checks if a discount code is available.
    /// </summary>
    Task<bool> IsCodeAvailableAsync(string code, Guid? excludeDiscountId = null, CancellationToken ct = default);

    // =====================================================
    // Usage Tracking
    // =====================================================

    /// <summary>
    /// Records a discount usage.
    /// </summary>
    Task<DiscountUsage> RecordUsageAsync(
        Guid discountId,
        Guid invoiceId,
        Guid? customerId,
        decimal discountAmount,
        decimal discountAmountInStoreCurrency,
        string currencyCode,
        CancellationToken ct = default);

    /// <summary>
    /// Gets the total usage count for a discount.
    /// </summary>
    Task<int> GetUsageCountAsync(Guid discountId, CancellationToken ct = default);

    /// <summary>
    /// Gets the usage count for a specific customer on a discount.
    /// </summary>
    Task<int> GetCustomerUsageCountAsync(Guid discountId, Guid customerId, CancellationToken ct = default);

    // =====================================================
    // Reporting
    // =====================================================

    /// <summary>
    /// Gets performance metrics for a discount.
    /// </summary>
    Task<Dtos.DiscountPerformanceDto?> GetPerformanceAsync(Guid discountId, DateTime? startDate = null, DateTime? endDate = null, CancellationToken ct = default);

    /// <summary>
    /// Gets aggregated usage summary for multiple discounts.
    /// </summary>
    Task<List<Dtos.DiscountUsageSummaryDto>> GetUsageSummaryAsync(DiscountReportParameters parameters, CancellationToken ct = default);
}
