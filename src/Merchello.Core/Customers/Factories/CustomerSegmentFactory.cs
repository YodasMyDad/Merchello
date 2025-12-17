using System.Text.Json;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Factories;

/// <summary>
/// Factory for creating CustomerSegment and CustomerSegmentMember instances.
/// </summary>
public class CustomerSegmentFactory
{
    /// <summary>
    /// Creates a new CustomerSegment from parameters.
    /// </summary>
    public CustomerSegment Create(CreateSegmentParameters parameters)
    {
        var now = DateTime.UtcNow;
        return new CustomerSegment
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = parameters.Name.Trim(),
            Description = parameters.Description?.Trim(),
            SegmentType = parameters.SegmentType,
            CriteriaJson = parameters.Criteria != null && parameters.Criteria.Count > 0
                ? JsonSerializer.Serialize(parameters.Criteria)
                : null,
            MatchMode = parameters.MatchMode,
            IsActive = true,
            IsSystemSegment = parameters.IsSystemSegment,
            CreatedBy = parameters.CreatedBy,
            DateCreated = now,
            DateUpdated = now,
            Members = []
        };
    }

    /// <summary>
    /// Creates a new CustomerSegmentMember for manual segment membership.
    /// </summary>
    public CustomerSegmentMember CreateMember(Guid segmentId, Guid customerId, Guid? addedBy = null, string? notes = null)
    {
        return new CustomerSegmentMember
        {
            Id = GuidExtensions.NewSequentialGuid,
            SegmentId = segmentId,
            CustomerId = customerId,
            AddedBy = addedBy,
            Notes = notes?.Trim(),
            DateAdded = DateTime.UtcNow
        };
    }
}
