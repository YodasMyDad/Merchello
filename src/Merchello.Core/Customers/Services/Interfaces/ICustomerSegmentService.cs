using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Customers.Services.Interfaces;

/// <summary>
/// Service for managing customer segments.
/// All segment membership checks should go through this service.
/// </summary>
public interface ICustomerSegmentService
{
    // CRUD Operations

    /// <summary>
    /// Gets all customer segments.
    /// </summary>
    Task<List<CustomerSegment>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets a customer segment by ID.
    /// </summary>
    Task<CustomerSegment?> GetByIdAsync(Guid segmentId, CancellationToken ct = default);

    /// <summary>
    /// Gets customer segments by their IDs in a single batch query.
    /// </summary>
    Task<List<CustomerSegment>> GetByIdsAsync(List<Guid> segmentIds, CancellationToken ct = default);

    /// <summary>
    /// Creates a new customer segment.
    /// </summary>
    Task<CrudResult<CustomerSegment>> CreateAsync(CreateSegmentParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing customer segment.
    /// </summary>
    Task<CrudResult<CustomerSegment>> UpdateAsync(Guid segmentId, UpdateSegmentParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Deletes a customer segment (fails if it's a system segment).
    /// </summary>
    Task<CrudResult<bool>> DeleteAsync(Guid segmentId, CancellationToken ct = default);

    // Membership - Manual Segments

    /// <summary>
    /// Gets IDs of all customers in a segment (manual segments only).
    /// </summary>
    Task<List<Guid>> GetMemberIdsAsync(Guid segmentId, CancellationToken ct = default);

    /// <summary>
    /// Gets paginated members of a segment with customer details.
    /// </summary>
    Task<PaginatedList<CustomerSegmentMember>> GetMembersAsync(GetSegmentMembersParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Adds customers to a manual segment.
    /// </summary>
    Task<CrudResult<bool>> AddMembersAsync(AddSegmentMembersParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Removes customers from a manual segment.
    /// </summary>
    Task<CrudResult<bool>> RemoveMembersAsync(Guid segmentId, List<Guid> customerIds, CancellationToken ct = default);

    // Membership - Evaluation (CENTRALIZED)

    /// <summary>
    /// Check if a customer is in a segment.
    /// For manual segments, checks database.
    /// For automated segments, evaluates criteria against customer data.
    /// THIS IS THE CENTRALIZED METHOD FOR ALL SEGMENT MEMBERSHIP CHECKS.
    /// </summary>
    Task<bool> IsCustomerInSegmentAsync(Guid segmentId, Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Get all segment IDs that a customer belongs to.
    /// </summary>
    Task<List<Guid>> GetCustomerSegmentIdsAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Get customers matching an automated segment's criteria (for preview/testing).
    /// </summary>
    Task<PaginatedList<Guid>> GetMatchingCustomerIdsAsync(Guid segmentId, int page = 1, int pageSize = 50, CancellationToken ct = default);

    // Validation & Statistics

    /// <summary>
    /// Gets total spend for multiple customers (batch operation for efficiency).
    /// </summary>
    Task<Dictionary<Guid, decimal>> GetCustomerSpendsAsync(List<Guid> customerIds, CancellationToken ct = default);

    /// <summary>
    /// Validates criteria rules before saving.
    /// </summary>
    Task<CriteriaValidationResult> ValidateCriteriaAsync(List<SegmentCriteria> criteria, CancellationToken ct = default);

    /// <summary>
    /// Gets the member count for a segment.
    /// For manual segments, counts stored members.
    /// For automated segments, counts matching customers.
    /// </summary>
    Task<int> GetMemberCountAsync(Guid segmentId, CancellationToken ct = default);

    /// <summary>
    /// Gets statistics for a segment (member count, revenue, etc.).
    /// </summary>
    Task<SegmentStatisticsDto> GetStatisticsAsync(Guid segmentId, CancellationToken ct = default);

    /// <summary>
    /// Gets member counts for multiple segments in a single operation.
    /// For manual segments, counts stored members.
    /// For automated segments, counts matching customers.
    /// </summary>
    /// <param name="segmentIds">The segment IDs to get counts for.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Dictionary mapping segment ID to member count.</returns>
    Task<Dictionary<Guid, int>> GetMemberCountsAsync(List<Guid> segmentIds, CancellationToken ct = default);
}
