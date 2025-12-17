using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Customers;

/// <summary>
/// Unit tests for CustomerSegmentFactory.
/// </summary>
public class CustomerSegmentFactoryTests
{
    private readonly CustomerSegmentFactory _factory;

    public CustomerSegmentFactoryTests()
    {
        _factory = new CustomerSegmentFactory();
    }

    #region Create Segment Tests

    [Fact]
    public void Create_ManualSegment_SetsAllProperties()
    {
        // Arrange
        var createdBy = Guid.NewGuid();
        var parameters = new CreateSegmentParameters
        {
            Name = "  Test Segment  ", // Include whitespace to test trimming
            Description = "  Test Description  ",
            SegmentType = CustomerSegmentType.Manual,
            CreatedBy = createdBy
        };

        // Act
        var segment = _factory.Create(parameters);

        // Assert
        segment.ShouldNotBeNull();
        segment.Id.ShouldNotBe(Guid.Empty);
        segment.Name.ShouldBe("Test Segment"); // Should be trimmed
        segment.Description.ShouldBe("Test Description"); // Should be trimmed
        segment.SegmentType.ShouldBe(CustomerSegmentType.Manual);
        segment.IsActive.ShouldBeTrue();
        segment.IsSystemSegment.ShouldBeFalse();
        segment.CreatedBy.ShouldBe(createdBy);
        segment.CriteriaJson.ShouldBeNull();
        segment.MatchMode.ShouldBe(SegmentMatchMode.All);
        segment.Members.ShouldNotBeNull();
        segment.Members.ShouldBeEmpty();
    }

    [Fact]
    public void Create_AutomatedSegment_SerializesCriteriaToJson()
    {
        // Arrange
        var criteria = new List<SegmentCriteria>
        {
            new()
            {
                Field = "TotalSpend",
                Operator = SegmentCriteriaOperator.GreaterThan,
                Value = 1000m
            },
            new()
            {
                Field = "OrderCount",
                Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                Value = 5
            }
        };

        var parameters = new CreateSegmentParameters
        {
            Name = "Automated Segment",
            SegmentType = CustomerSegmentType.Automated,
            Criteria = criteria,
            MatchMode = SegmentMatchMode.Any
        };

        // Act
        var segment = _factory.Create(parameters);

        // Assert
        segment.SegmentType.ShouldBe(CustomerSegmentType.Automated);
        segment.CriteriaJson.ShouldNotBeNullOrEmpty();
        segment.CriteriaJson.ShouldContain("TotalSpend");
        segment.CriteriaJson.ShouldContain("OrderCount");
        segment.MatchMode.ShouldBe(SegmentMatchMode.Any);
    }

    [Fact]
    public void Create_SystemSegment_SetsFlagCorrectly()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "System Segment",
            SegmentType = CustomerSegmentType.Manual,
            IsSystemSegment = true
        };

        // Act
        var segment = _factory.Create(parameters);

        // Assert
        segment.IsSystemSegment.ShouldBeTrue();
    }

    [Fact]
    public void Create_SetsDateTimesToUtc()
    {
        // Arrange
        var before = DateTime.UtcNow;
        var parameters = new CreateSegmentParameters
        {
            Name = "Date Test",
            SegmentType = CustomerSegmentType.Manual
        };

        // Act
        var segment = _factory.Create(parameters);
        var after = DateTime.UtcNow;

        // Assert
        segment.DateCreated.Kind.ShouldBe(DateTimeKind.Utc);
        segment.DateUpdated.Kind.ShouldBe(DateTimeKind.Utc);
        segment.DateCreated.ShouldBeInRange(before, after);
        segment.DateUpdated.ShouldBeInRange(before, after);
        segment.DateCreated.ShouldBe(segment.DateUpdated);
    }

    [Fact]
    public void Create_EmptyCriteria_SetsNullCriteriaJson()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "Empty Criteria",
            SegmentType = CustomerSegmentType.Automated,
            Criteria = [] // Empty list
        };

        // Act
        var segment = _factory.Create(parameters);

        // Assert
        segment.CriteriaJson.ShouldBeNull();
    }

    [Fact]
    public void Create_NullCriteria_SetsNullCriteriaJson()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "Null Criteria",
            SegmentType = CustomerSegmentType.Manual,
            Criteria = null
        };

        // Act
        var segment = _factory.Create(parameters);

        // Assert
        segment.CriteriaJson.ShouldBeNull();
    }

    #endregion

    #region Create Member Tests

    [Fact]
    public void CreateMember_SetsAllProperties()
    {
        // Arrange
        var segmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var addedBy = Guid.NewGuid();
        var notes = "  Test notes with whitespace  ";

        // Act
        var member = _factory.CreateMember(segmentId, customerId, addedBy, notes);

        // Assert
        member.ShouldNotBeNull();
        member.Id.ShouldNotBe(Guid.Empty);
        member.SegmentId.ShouldBe(segmentId);
        member.CustomerId.ShouldBe(customerId);
        member.AddedBy.ShouldBe(addedBy);
        member.Notes.ShouldBe("Test notes with whitespace"); // Should be trimmed
    }

    [Fact]
    public void CreateMember_WithoutOptionalFields_SetsNulls()
    {
        // Arrange
        var segmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        // Act
        var member = _factory.CreateMember(segmentId, customerId);

        // Assert
        member.AddedBy.ShouldBeNull();
        member.Notes.ShouldBeNull();
    }

    [Fact]
    public void CreateMember_SetsDateAddedToUtcNow()
    {
        // Arrange
        var before = DateTime.UtcNow;
        var segmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        // Act
        var member = _factory.CreateMember(segmentId, customerId);
        var after = DateTime.UtcNow;

        // Assert
        member.DateAdded.Kind.ShouldBe(DateTimeKind.Utc);
        member.DateAdded.ShouldBeInRange(before, after);
    }

    [Fact]
    public void CreateMember_GeneratesUniqueIds()
    {
        // Arrange
        var segmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        // Act
        var member1 = _factory.CreateMember(segmentId, customerId);
        var member2 = _factory.CreateMember(segmentId, customerId);

        // Assert
        member1.Id.ShouldNotBe(member2.Id);
    }

    #endregion
}
