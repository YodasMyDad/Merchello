using System.Text.Json;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.CustomerSegmentNotifications;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Customers.Services;

/// <summary>
/// Service for managing customer segments.
/// </summary>
public class CustomerSegmentService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    CustomerSegmentFactory segmentFactory,
    ISegmentCriteriaEvaluator criteriaEvaluator,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<CustomerSegmentService> logger) : ICustomerSegmentService
{
    #region CRUD Operations

    /// <inheritdoc />
    public async Task<List<CustomerSegment>> GetAllAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments
                .AsNoTracking()
                .OrderBy(s => s.Name)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CustomerSegment?> GetByIdAsync(Guid segmentId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == segmentId, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<CustomerSegment>> GetByIdsAsync(List<Guid> segmentIds, CancellationToken ct = default)
    {
        if (segmentIds.Count == 0)
            return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments
                .AsNoTracking()
                .Where(s => segmentIds.Contains(s.Id))
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<CustomerSegment>> CreateAsync(CreateSegmentParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<CustomerSegment>();

        // Validate name
        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.AddErrorMessage("Segment name is required.");
            return result;
        }

        // Validate criteria for automated segments
        if (parameters.SegmentType == CustomerSegmentType.Automated)
        {
            if (parameters.Criteria == null || parameters.Criteria.Count == 0)
            {
                result.AddErrorMessage("Automated segments require at least one criterion.");
                return result;
            }

            var validationResult = await ValidateCriteriaAsync(parameters.Criteria, ct);
            if (!validationResult.IsValid)
            {
                foreach (var error in validationResult.Errors)
                {
                    result.AddErrorMessage(error);
                }
                return result;
            }
        }

        // Check for duplicate name
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments.AnyAsync(s => s.Name == parameters.Name.Trim(), ct));

        if (exists)
        {
            result.AddErrorMessage($"A segment with name '{parameters.Name}' already exists.");
            scope.Complete();
            return result;
        }

        // Create segment
        var segment = segmentFactory.Create(parameters);

        // Publish "Before" notification - handlers can modify or cancel
        var creatingNotification = new CustomerSegmentCreatingNotification(segment);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
        {
            result.AddErrorMessage(creatingNotification.CancelReason ?? "Segment creation cancelled.");
            scope.Complete();
            return result;
        }

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.CustomerSegments.Add(segment);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new CustomerSegmentCreatedNotification(segment), ct);

        result.ResultObject = segment;
        result.AddSuccessMessage($"Segment '{segment.Name}' created successfully.");
        logger.LogInformation("Created customer segment {SegmentId} - {SegmentName}", segment.Id, segment.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<CustomerSegment>> UpdateAsync(Guid segmentId, UpdateSegmentParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<CustomerSegment>();

        using var scope = efCoreScopeProvider.CreateScope();
        var segment = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments.FirstOrDefaultAsync(s => s.Id == segmentId, ct));

        if (segment == null)
        {
            result.AddErrorMessage("Segment not found.");
            scope.Complete();
            return result;
        }

        // Validate criteria for automated segments
        if (segment.SegmentType == CustomerSegmentType.Automated && parameters.Criteria != null)
        {
            if (parameters.Criteria.Count == 0)
            {
                result.AddErrorMessage("Automated segments require at least one criterion.");
                scope.Complete();
                return result;
            }

            var validationResult = await ValidateCriteriaAsync(parameters.Criteria, ct);
            if (!validationResult.IsValid)
            {
                foreach (var error in validationResult.Errors)
                {
                    result.AddErrorMessage(error);
                }
                scope.Complete();
                return result;
            }
        }

        // Publish "Before" notification - handlers can modify or cancel
        var savingNotification = new CustomerSegmentSavingNotification(segment);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, ct))
        {
            result.AddErrorMessage(savingNotification.CancelReason ?? "Segment update cancelled.");
            scope.Complete();
            return result;
        }

        // Update fields
        if (!string.IsNullOrWhiteSpace(parameters.Name))
        {
            // Check for duplicate name
            var nameExists = await scope.ExecuteWithContextAsync(async db =>
                await db.CustomerSegments.AnyAsync(s => s.Name == parameters.Name.Trim() && s.Id != segmentId, ct));

            if (nameExists)
            {
                result.AddErrorMessage($"A segment with name '{parameters.Name}' already exists.");
                scope.Complete();
                return result;
            }

            segment.Name = parameters.Name.Trim();
        }

        if (parameters.Description != null)
            segment.Description = parameters.Description.Trim();

        if (parameters.Criteria != null && segment.SegmentType == CustomerSegmentType.Automated)
            segment.CriteriaJson = JsonSerializer.Serialize(parameters.Criteria);

        if (parameters.MatchMode.HasValue)
            segment.MatchMode = parameters.MatchMode.Value;

        if (parameters.IsActive.HasValue)
            segment.IsActive = parameters.IsActive.Value;

        segment.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new CustomerSegmentSavedNotification(segment), ct);

        result.ResultObject = segment;
        result.AddSuccessMessage($"Segment '{segment.Name}' updated successfully.");
        logger.LogInformation("Updated customer segment {SegmentId} - {SegmentName}", segment.Id, segment.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteAsync(Guid segmentId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        var segment = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments.FirstOrDefaultAsync(s => s.Id == segmentId, ct));

        if (segment == null)
        {
            result.AddErrorMessage("Segment not found.");
            scope.Complete();
            return result;
        }

        if (segment.IsSystemSegment)
        {
            result.AddErrorMessage("System segments cannot be deleted.");
            scope.Complete();
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var deletingNotification = new CustomerSegmentDeletingNotification(segment);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, ct))
        {
            result.AddErrorMessage(deletingNotification.CancelReason ?? "Segment deletion cancelled.");
            scope.Complete();
            return result;
        }

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Members will be cascade deleted
            db.CustomerSegments.Remove(segment);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new CustomerSegmentDeletedNotification(segment), ct);

        result.ResultObject = true;
        result.AddSuccessMessage($"Segment '{segment.Name}' deleted successfully.");
        logger.LogInformation("Deleted customer segment {SegmentId} - {SegmentName}", segment.Id, segment.Name);

        return result;
    }

    #endregion

    #region Membership - Manual Segments

    /// <inheritdoc />
    public async Task<List<Guid>> GetMemberIdsAsync(Guid segmentId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegmentMembers
                .Where(m => m.SegmentId == segmentId)
                .Select(m => m.CustomerId)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<PaginatedList<CustomerSegmentMember>> GetMembersAsync(GetSegmentMembersParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.CustomerSegmentMembers
                .Where(m => m.SegmentId == parameters.SegmentId)
                .OrderByDescending(m => m.DateAdded);

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .AsNoTracking()
                .ToListAsync(ct);

            return new PaginatedList<CustomerSegmentMember>(items, totalCount, parameters.Page, parameters.PageSize);
        });
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> AddMembersAsync(AddSegmentMembersParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        if (parameters.CustomerIds.Count == 0)
        {
            result.AddErrorMessage("No customer IDs provided.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();

        // Verify segment exists and is manual
        var segment = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments.FirstOrDefaultAsync(s => s.Id == parameters.SegmentId, ct));

        if (segment == null)
        {
            result.AddErrorMessage("Segment not found.");
            scope.Complete();
            return result;
        }

        if (segment.SegmentType != CustomerSegmentType.Manual)
        {
            result.AddErrorMessage("Cannot add members to automated segments. Membership is determined by criteria.");
            scope.Complete();
            return result;
        }

        // Get existing member IDs to avoid duplicates
        var existingMemberIds = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegmentMembers
                .Where(m => m.SegmentId == parameters.SegmentId && parameters.CustomerIds.Contains(m.CustomerId))
                .Select(m => m.CustomerId)
                .ToListAsync(ct));

        var newCustomerIds = parameters.CustomerIds.Except(existingMemberIds).ToList();

        if (newCustomerIds.Count == 0)
        {
            result.AddWarningMessage("All specified customers are already members of this segment.");
            result.ResultObject = true;
            scope.Complete();
            return result;
        }

        // Create membership records
        var newMembers = newCustomerIds.Select(customerId =>
            segmentFactory.CreateMember(parameters.SegmentId, customerId, parameters.AddedBy, parameters.Notes)).ToList();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.CustomerSegmentMembers.AddRange(newMembers);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        result.ResultObject = true;
        result.AddSuccessMessage($"Added {newMembers.Count} customer(s) to segment '{segment.Name}'.");
        logger.LogInformation("Added {Count} customers to segment {SegmentId}", newMembers.Count, parameters.SegmentId);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> RemoveMembersAsync(Guid segmentId, List<Guid> customerIds, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        if (customerIds.Count == 0)
        {
            result.AddErrorMessage("No customer IDs provided.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();

        // Verify segment exists and is manual
        var segment = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments.FirstOrDefaultAsync(s => s.Id == segmentId, ct));

        if (segment == null)
        {
            result.AddErrorMessage("Segment not found.");
            scope.Complete();
            return result;
        }

        if (segment.SegmentType != CustomerSegmentType.Manual)
        {
            result.AddErrorMessage("Cannot remove members from automated segments. Membership is determined by criteria.");
            scope.Complete();
            return result;
        }

        var removedCount = await scope.ExecuteWithContextAsync(async db =>
        {
            var membersToRemove = await db.CustomerSegmentMembers
                .Where(m => m.SegmentId == segmentId && customerIds.Contains(m.CustomerId))
                .ToListAsync(ct);

            if (membersToRemove.Count > 0)
            {
                db.CustomerSegmentMembers.RemoveRange(membersToRemove);
                await db.SaveChangesAsync(ct);
            }

            return membersToRemove.Count;
        });
        scope.Complete();

        result.ResultObject = true;
        result.AddSuccessMessage($"Removed {removedCount} customer(s) from segment '{segment.Name}'.");
        logger.LogInformation("Removed {Count} customers from segment {SegmentId}", removedCount, segmentId);

        return result;
    }

    #endregion

    #region Membership - Evaluation

    /// <inheritdoc />
    public async Task<bool> IsCustomerInSegmentAsync(Guid segmentId, Guid customerId, CancellationToken ct = default)
    {
        var segment = await GetByIdAsync(segmentId, ct);
        if (segment == null || !segment.IsActive)
            return false;

        if (segment.SegmentType == CustomerSegmentType.Manual)
        {
            // Check membership table
            using var scope = efCoreScopeProvider.CreateScope();
            var isMember = await scope.ExecuteWithContextAsync(async db =>
                await db.CustomerSegmentMembers
                    .AnyAsync(m => m.SegmentId == segmentId && m.CustomerId == customerId, ct));
            scope.Complete();
            return isMember;
        }
        else
        {
            // Evaluate criteria
            var criteriaSet = ParseCriteria(segment);
            if (criteriaSet.Criteria.Count == 0)
                return false;

            return await criteriaEvaluator.EvaluateAsync(customerId, criteriaSet, ct);
        }
    }

    /// <inheritdoc />
    public async Task<List<Guid>> GetCustomerSegmentIdsAsync(Guid customerId, CancellationToken ct = default)
    {
        var segments = await GetAllAsync(ct);
        List<Guid> matchingSegmentIds = [];

        foreach (var segment in segments.Where(s => s.IsActive))
        {
            var isInSegment = await IsCustomerInSegmentAsync(segment.Id, customerId, ct);
            if (isInSegment)
            {
                matchingSegmentIds.Add(segment.Id);
            }
        }

        return matchingSegmentIds;
    }

    /// <inheritdoc />
    public async Task<PaginatedList<Guid>> GetMatchingCustomerIdsAsync(Guid segmentId, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var segment = await GetByIdAsync(segmentId, ct);
        if (segment == null)
            return new PaginatedList<Guid>([], 0, page, pageSize);

        if (segment.SegmentType == CustomerSegmentType.Manual)
        {
            // For manual segments, just return member IDs
            var members = await GetMembersAsync(new GetSegmentMembersParameters { SegmentId = segmentId, Page = page, PageSize = pageSize }, ct);
            return new PaginatedList<Guid>(
                members.Items.Select(m => m.CustomerId),
                members.TotalItems,
                page,
                pageSize);
        }

        // For automated segments, use SQL-based evaluation for scalability
        var criteriaSet = ParseCriteria(segment);
        if (criteriaSet.Criteria.Count == 0)
            return new PaginatedList<Guid>([], 0, page, pageSize);

        return await criteriaEvaluator.QueryMatchingCustomersAsync(criteriaSet, page, pageSize, ct);
    }

    #endregion

    #region Validation & Statistics

    /// <inheritdoc />
    public async Task<Dictionary<Guid, decimal>> GetCustomerSpendsAsync(List<Guid> customerIds, CancellationToken ct = default)
    {
        if (customerIds.Count == 0)
            return [];

        using var scope = efCoreScopeProvider.CreateScope();
        // Fetch data and aggregate client-side to avoid SQLite ef_sum compatibility issue
        var invoiceData = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .Where(i => customerIds.Contains(i.CustomerId) && !i.IsDeleted && !i.IsCancelled)
                .Select(i => new { i.CustomerId, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(ct));
        scope.Complete();

        return invoiceData
            .GroupBy(i => i.CustomerId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Total));
    }

    /// <inheritdoc />
    public Task<CriteriaValidationResult> ValidateCriteriaAsync(List<SegmentCriteria> criteria, CancellationToken ct = default)
    {
        var result = new CriteriaValidationResult { IsValid = true };

        if (criteria.Count == 0)
        {
            result.IsValid = false;
            result.Errors.Add("At least one criterion is required.");
            return Task.FromResult(result);
        }

        var availableFields = criteriaEvaluator.GetAvailableFields();
        var fieldNames = availableFields.Select(f => f.Field.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var criterion in criteria)
        {
            // Validate field
            if (string.IsNullOrWhiteSpace(criterion.Field))
            {
                result.IsValid = false;
                result.Errors.Add("Criterion field is required.");
                continue;
            }

            if (!fieldNames.Contains(criterion.Field))
            {
                result.IsValid = false;
                result.Errors.Add($"Unknown field: {criterion.Field}");
                continue;
            }

            // Validate operator for field
            if (Enum.TryParse<SegmentCriteriaField>(criterion.Field, ignoreCase: true, out var field))
            {
                var validOperators = criteriaEvaluator.GetOperatorsForField(field);
                if (!validOperators.Contains(criterion.Operator))
                {
                    result.IsValid = false;
                    result.Errors.Add($"Operator '{criterion.Operator}' is not valid for field '{criterion.Field}'.");
                }
            }

            // Validate value (required for most operators)
            var requiresValue = criterion.Operator != SegmentCriteriaOperator.IsEmpty &&
                               criterion.Operator != SegmentCriteriaOperator.IsNotEmpty;

            if (requiresValue && criterion.Value == null)
            {
                result.IsValid = false;
                result.Errors.Add($"Value is required for operator '{criterion.Operator}'.");
            }

            // Validate second value for Between
            if (criterion.Operator == SegmentCriteriaOperator.Between && criterion.Value2 == null)
            {
                result.IsValid = false;
                result.Errors.Add("Second value is required for 'Between' operator.");
            }
        }

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public async Task<int> GetMemberCountAsync(Guid segmentId, CancellationToken ct = default)
    {
        var segment = await GetByIdAsync(segmentId, ct);
        if (segment == null)
            return 0;

        if (segment.SegmentType == CustomerSegmentType.Manual)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            var count = await scope.ExecuteWithContextAsync(async db =>
                await db.CustomerSegmentMembers.CountAsync(m => m.SegmentId == segmentId, ct));
            scope.Complete();
            return count;
        }
        else
        {
            // For automated segments, use SQL-based count
            var criteriaSet = ParseCriteria(segment);
            if (criteriaSet.Criteria.Count == 0)
                return 0;

            return await criteriaEvaluator.CountMatchingCustomersAsync(criteriaSet, ct);
        }
    }

    /// <inheritdoc />
    public async Task<Dictionary<Guid, int>> GetMemberCountsAsync(List<Guid> segmentIds, CancellationToken ct = default)
    {
        if (segmentIds.Count == 0)
            return [];

        Dictionary<Guid, int> result = [];

        // Get all segments
        using var scope = efCoreScopeProvider.CreateScope();
        var segments = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments
                .AsNoTracking()
                .Where(s => segmentIds.Contains(s.Id))
                .ToListAsync(ct));

        var manualSegmentIds = segments
            .Where(s => s.SegmentType == CustomerSegmentType.Manual)
            .Select(s => s.Id)
            .ToList();

        var automatedSegments = segments
            .Where(s => s.SegmentType == CustomerSegmentType.Automated)
            .ToList();

        // Batch count for manual segments (single query)
        if (manualSegmentIds.Count > 0)
        {
            var manualCounts = await scope.ExecuteWithContextAsync(async db =>
                await db.CustomerSegmentMembers
                    .Where(m => manualSegmentIds.Contains(m.SegmentId))
                    .GroupBy(m => m.SegmentId)
                    .Select(g => new { SegmentId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.SegmentId, x => x.Count, ct));

            foreach (var segmentId in manualSegmentIds)
            {
                result[segmentId] = manualCounts.GetValueOrDefault(segmentId, 0);
            }
        }

        scope.Complete();

        // For automated segments, we still need to evaluate criteria per segment
        // (each segment has unique criteria)
        foreach (var segment in automatedSegments)
        {
            var criteriaSet = ParseCriteria(segment);
            if (criteriaSet.Criteria.Count == 0)
            {
                result[segment.Id] = 0;
            }
            else
            {
                result[segment.Id] = await criteriaEvaluator.CountMatchingCustomersAsync(criteriaSet, ct);
            }
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<SegmentStatisticsDto> GetStatisticsAsync(Guid segmentId, CancellationToken ct = default)
    {
        var segment = await GetByIdAsync(segmentId, ct);
        if (segment == null)
            return new SegmentStatisticsDto();

        // Get member IDs based on segment type
        List<Guid> memberIds;
        int totalMembers;

        if (segment.SegmentType == CustomerSegmentType.Manual)
        {
            memberIds = await GetMemberIdsAsync(segmentId, ct);
            totalMembers = memberIds.Count;
        }
        else
        {
            // For automated segments, get a sample for stats (limit for performance)
            var matchResult = await GetMatchingCustomerIdsAsync(segmentId, 1, 1000, ct);
            memberIds = matchResult.Items.ToList();
            totalMembers = matchResult.TotalItems;
        }

        if (totalMembers == 0)
            return new SegmentStatisticsDto { TotalMembers = 0 };

        // Fetch invoice data and aggregate client-side to avoid SQLite ef_sum compatibility issue
        using var scope = efCoreScopeProvider.CreateScope();
        var invoiceData = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .Where(i => memberIds.Contains(i.CustomerId))
                .Where(i => !i.IsDeleted && !i.IsCancelled)
                .Select(i => new { i.CustomerId, Total = i.TotalInStoreCurrency ?? i.Total })
                .ToListAsync(ct)) ?? [];
        scope.Complete();

        // Aggregate client-side
        var totalRevenue = invoiceData.Sum(i => i.Total);
        var orderCount = invoiceData.Count;
        var activeCustomers = invoiceData.Select(i => i.CustomerId).Distinct().Count();

        return new SegmentStatisticsDto
        {
            TotalMembers = totalMembers,
            ActiveMembers = activeCustomers,
            TotalRevenue = totalRevenue,
            AverageOrderValue = orderCount > 0
                ? (totalRevenue / orderCount)
                : 0
        };
    }

    #endregion

    #region Private Helpers

    private static SegmentCriteriaSet ParseCriteria(CustomerSegment segment)
    {
        if (string.IsNullOrWhiteSpace(segment.CriteriaJson))
            return new SegmentCriteriaSet { Criteria = [], MatchMode = segment.MatchMode };

        try
        {
            var criteria = JsonSerializer.Deserialize<List<SegmentCriteria>>(segment.CriteriaJson) ?? [];
            return new SegmentCriteriaSet
            {
                Criteria = criteria,
                MatchMode = segment.MatchMode
            };
        }
        catch (JsonException)
        {
            // Invalid JSON in criteria - return empty criteria set
            return new SegmentCriteriaSet { Criteria = [], MatchMode = segment.MatchMode };
        }
    }

    #endregion
}
