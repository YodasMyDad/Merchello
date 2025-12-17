using Merchello.Core.Customers.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Customers.Services.Interfaces;

/// <summary>
/// Evaluates customer segment criteria for automated segments.
/// </summary>
public interface ISegmentCriteriaEvaluator
{
    /// <summary>
    /// Evaluates if a customer matches the given criteria set.
    /// </summary>
    /// <param name="customerId">The customer to evaluate.</param>
    /// <param name="criteriaSet">The criteria rules and match mode.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if the customer matches the criteria based on the match mode.</returns>
    Task<bool> EvaluateAsync(Guid customerId, SegmentCriteriaSet criteriaSet, CancellationToken ct = default);

    /// <summary>
    /// Gets all available criteria fields with their metadata.
    /// </summary>
    List<CriteriaFieldMetadata> GetAvailableFields();

    /// <summary>
    /// Gets valid operators for a specific field.
    /// </summary>
    List<SegmentCriteriaOperator> GetOperatorsForField(SegmentCriteriaField field);

    /// <summary>
    /// Queries customers matching criteria using SQL-based evaluation.
    /// Returns paginated customer IDs without loading all customers into memory.
    /// This is the high-performance method for automated segment evaluation at scale.
    /// </summary>
    /// <param name="criteriaSet">The criteria rules and match mode.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Items per page.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Paginated list of matching customer IDs.</returns>
    Task<PaginatedList<Guid>> QueryMatchingCustomersAsync(
        SegmentCriteriaSet criteriaSet,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default);

    /// <summary>
    /// Gets the total count of customers matching criteria (for statistics).
    /// </summary>
    /// <param name="criteriaSet">The criteria rules and match mode.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Count of matching customers.</returns>
    Task<int> CountMatchingCustomersAsync(
        SegmentCriteriaSet criteriaSet,
        CancellationToken ct = default);
}
