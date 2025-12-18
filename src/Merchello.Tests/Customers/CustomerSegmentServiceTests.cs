using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Customers;

/// <summary>
/// Integration tests for CustomerSegmentService.
/// Tests CRUD operations, membership management, and segment evaluation.
/// </summary>
[Collection("Integration Tests")]
public class CustomerSegmentServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICustomerSegmentService _segmentService;
    private readonly TestDataBuilder _dataBuilder;

    public CustomerSegmentServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _segmentService = fixture.GetService<ICustomerSegmentService>();
        _dataBuilder = fixture.CreateDataBuilder();
    }

    #region Create Tests

    [Fact]
    public async Task CreateAsync_ManualSegment_CreatesSuccessfully()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "VIP Customers",
            Description = "Manually curated VIP list",
            SegmentType = CustomerSegmentType.Manual
        };

        // Act
        var result = await _segmentService.CreateAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("VIP Customers");
        result.ResultObject.Description.ShouldBe("Manually curated VIP list");
        result.ResultObject.SegmentType.ShouldBe(CustomerSegmentType.Manual);
        result.ResultObject.IsActive.ShouldBeTrue();
        result.ResultObject.IsSystemSegment.ShouldBeFalse();
    }

    [Fact]
    public async Task CreateAsync_AutomatedSegment_CreatesWithCriteria()
    {
        // Arrange
        var criteria = new List<SegmentCriteria>
        {
            new()
            {
                Field = "TotalSpend",
                Operator = SegmentCriteriaOperator.GreaterThan,
                Value = 1000m
            }
        };

        var parameters = new CreateSegmentParameters
        {
            Name = "High Spenders",
            Description = "Customers who spent over $1000",
            SegmentType = CustomerSegmentType.Automated,
            Criteria = criteria,
            MatchMode = SegmentMatchMode.All
        };

        // Act
        var result = await _segmentService.CreateAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.SegmentType.ShouldBe(CustomerSegmentType.Automated);
        result.ResultObject.CriteriaJson.ShouldNotBeNullOrEmpty();
        result.ResultObject.MatchMode.ShouldBe(SegmentMatchMode.All);
    }

    [Fact]
    public async Task CreateAsync_AutomatedSegmentWithoutCriteria_Fails()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "Invalid Automated",
            SegmentType = CustomerSegmentType.Automated,
            Criteria = null
        };

        // Act
        var result = await _segmentService.CreateAsync(parameters);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().ShouldNotBeEmpty();
    }

    [Fact]
    public async Task CreateAsync_DuplicateName_Fails()
    {
        // Arrange
        await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Duplicate Test",
            SegmentType = CustomerSegmentType.Manual
        });

        // Act
        var result = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Duplicate Test",
            SegmentType = CustomerSegmentType.Manual
        });

        // Assert
        result.Successful.ShouldBeFalse();
        var errorMessage = result.Messages.ErrorMessages().First().Message;
        errorMessage.ShouldNotBeNull();
        errorMessage.ShouldContain("already exists");
    }

    [Fact]
    public async Task CreateAsync_SystemSegment_SetsFlag()
    {
        // Arrange
        var parameters = new CreateSegmentParameters
        {
            Name = "All Customers",
            SegmentType = CustomerSegmentType.Manual,
            IsSystemSegment = true
        };

        // Act
        var result = await _segmentService.CreateAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject!.IsSystemSegment.ShouldBeTrue();
    }

    #endregion

    #region Read Tests

    [Fact]
    public async Task GetAllAsync_ReturnsAllSegments()
    {
        // Arrange
        await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Segment 1",
            SegmentType = CustomerSegmentType.Manual
        });
        await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Segment 2",
            SegmentType = CustomerSegmentType.Manual
        });

        // Act
        var segments = await _segmentService.GetAllAsync();

        // Assert
        segments.Count.ShouldBe(2);
        segments.ShouldContain(s => s.Name == "Segment 1");
        segments.ShouldContain(s => s.Name == "Segment 2");
    }

    [Fact]
    public async Task GetByIdAsync_ExistingSegment_ReturnsSegment()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Find Me",
            SegmentType = CustomerSegmentType.Manual
        });
        var segmentId = createResult.ResultObject!.Id;

        // Act
        var segment = await _segmentService.GetByIdAsync(segmentId);

        // Assert
        segment.ShouldNotBeNull();
        segment.Name.ShouldBe("Find Me");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentSegment_ReturnsNull()
    {
        // Act
        var segment = await _segmentService.GetByIdAsync(Guid.NewGuid());

        // Assert
        segment.ShouldBeNull();
    }

    #endregion

    #region Update Tests

    [Fact]
    public async Task UpdateAsync_ValidUpdate_UpdatesSegment()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Original Name",
            Description = "Original Description",
            SegmentType = CustomerSegmentType.Manual
        });
        var segmentId = createResult.ResultObject!.Id;

        // Act
        var updateResult = await _segmentService.UpdateAsync(segmentId, new UpdateSegmentParameters
        {
            Name = "Updated Name",
            Description = "Updated Description"
        });

        // Assert
        updateResult.Successful.ShouldBeTrue();
        updateResult.ResultObject!.Name.ShouldBe("Updated Name");
        updateResult.ResultObject.Description.ShouldBe("Updated Description");
    }

    [Fact]
    public async Task UpdateAsync_PartialUpdate_OnlyUpdatesProvidedFields()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Keep Name",
            Description = "Keep Description",
            SegmentType = CustomerSegmentType.Manual
        });
        var segmentId = createResult.ResultObject!.Id;

        // Act - only update IsActive
        var updateResult = await _segmentService.UpdateAsync(segmentId, new UpdateSegmentParameters
        {
            IsActive = false
        });

        // Assert
        updateResult.Successful.ShouldBeTrue();
        updateResult.ResultObject!.Name.ShouldBe("Keep Name");
        updateResult.ResultObject.Description.ShouldBe("Keep Description");
        updateResult.ResultObject.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateAsync_NonExistentSegment_Fails()
    {
        // Act
        var result = await _segmentService.UpdateAsync(Guid.NewGuid(), new UpdateSegmentParameters
        {
            Name = "Won't Work"
        });

        // Assert
        result.Successful.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateAsync_AutomatedSegmentCriteria_UpdatesCriteria()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Auto Segment",
            SegmentType = CustomerSegmentType.Automated,
            Criteria =
            [
                new SegmentCriteria { Field = "OrderCount", Operator = SegmentCriteriaOperator.GreaterThan, Value = 1 }
            ]
        });
        var segmentId = createResult.ResultObject!.Id;

        var newCriteria = new List<SegmentCriteria>
        {
            new() { Field = "TotalSpend", Operator = SegmentCriteriaOperator.GreaterThan, Value = 500m }
        };

        // Act
        var updateResult = await _segmentService.UpdateAsync(segmentId, new UpdateSegmentParameters
        {
            Criteria = newCriteria,
            MatchMode = SegmentMatchMode.Any
        });

        // Assert
        updateResult.Successful.ShouldBeTrue();
        updateResult.ResultObject!.MatchMode.ShouldBe(SegmentMatchMode.Any);
        updateResult.ResultObject.CriteriaJson.ShouldNotBeNull();
        updateResult.ResultObject.CriteriaJson.ShouldContain("TotalSpend");
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task DeleteAsync_ExistingSegment_DeletesSuccessfully()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Delete Me",
            SegmentType = CustomerSegmentType.Manual
        });
        var segmentId = createResult.ResultObject!.Id;

        // Act
        var deleteResult = await _segmentService.DeleteAsync(segmentId);

        // Assert
        deleteResult.Successful.ShouldBeTrue();

        var deletedSegment = await _segmentService.GetByIdAsync(segmentId);
        deletedSegment.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_SystemSegment_Fails()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "System Segment",
            SegmentType = CustomerSegmentType.Manual,
            IsSystemSegment = true
        });
        var segmentId = createResult.ResultObject!.Id;

        // Act
        var deleteResult = await _segmentService.DeleteAsync(segmentId);

        // Assert
        deleteResult.Successful.ShouldBeFalse();
        var deleteErrorMessage = deleteResult.Messages.ErrorMessages().First().Message;
        deleteErrorMessage.ShouldNotBeNull();
        deleteErrorMessage.ShouldContain("system segment");
    }

    [Fact]
    public async Task DeleteAsync_NonExistentSegment_Fails()
    {
        // Act
        var result = await _segmentService.DeleteAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
    }

    #endregion

    #region Manual Membership Tests

    [Fact]
    public async Task AddMembersAsync_AddsCustomersToSegment()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Test Segment");
        var customer1 = _dataBuilder.CreateCustomer("member1@test.com");
        var customer2 = _dataBuilder.CreateCustomer("member2@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _segmentService.AddMembersAsync(
            segment.Id,
            [customer1.Id, customer2.Id],
            notes: "Added via test");

        // Assert
        result.Successful.ShouldBeTrue();

        var members = await _segmentService.GetMemberIdsAsync(segment.Id);
        members.Count.ShouldBe(2);
        members.ShouldContain(customer1.Id);
        members.ShouldContain(customer2.Id);
    }

    [Fact]
    public async Task AddMembersAsync_DuplicateCustomer_DoesNotAddTwice()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Dedup Test");
        var customer = _dataBuilder.CreateCustomer("dedup@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Add once
        await _segmentService.AddMembersAsync(segment.Id, [customer.Id]);

        // Act - try to add again
        var result = await _segmentService.AddMembersAsync(segment.Id, [customer.Id]);

        // Assert
        result.Successful.ShouldBeTrue();

        var members = await _segmentService.GetMemberIdsAsync(segment.Id);
        members.Count.ShouldBe(1); // Still only 1 member
    }

    [Fact]
    public async Task AddMembersAsync_AutomatedSegment_Fails()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Auto Segment",
            SegmentType = CustomerSegmentType.Automated,
            Criteria =
            [
                new SegmentCriteria { Field = "OrderCount", Operator = SegmentCriteriaOperator.GreaterThan, Value = 0 }
            ]
        });
        var customer = _dataBuilder.CreateCustomer("notagain@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _segmentService.AddMembersAsync(
            createResult.ResultObject!.Id,
            [customer.Id]);

        // Assert
        result.Successful.ShouldBeFalse();
        var addMemberErrorMessage = result.Messages.ErrorMessages().First().Message;
        addMemberErrorMessage.ShouldNotBeNull();
        addMemberErrorMessage.ShouldContain("automated");
    }

    [Fact]
    public async Task RemoveMembersAsync_RemovesCustomersFromSegment()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Remove Test");
        var customer = _dataBuilder.CreateCustomer("remove@test.com");
        _dataBuilder.AddCustomerToSegment(segment, customer);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify member exists
        var membersBefore = await _segmentService.GetMemberIdsAsync(segment.Id);
        membersBefore.Count.ShouldBe(1);

        // Act
        var result = await _segmentService.RemoveMembersAsync(segment.Id, [customer.Id]);

        // Assert
        result.Successful.ShouldBeTrue();

        var membersAfter = await _segmentService.GetMemberIdsAsync(segment.Id);
        membersAfter.Count.ShouldBe(0);
    }

    [Fact]
    public async Task GetMembersAsync_ReturnsPaginatedMembers()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Paginated Test");
        for (int i = 0; i < 10; i++)
        {
            var customer = _dataBuilder.CreateCustomer($"page{i}@test.com");
            _dataBuilder.AddCustomerToSegment(segment, customer);
        }
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var page1 = await _segmentService.GetMembersAsync(segment.Id, page: 1, pageSize: 5);

        // Assert
        page1.ShouldNotBeNull();
        // Verify pagination metadata is set correctly
        page1.TotalItems.ShouldBe(10);
        page1.TotalPages.ShouldBe(2);
        // Items should be populated
        if (page1.Items != null)
        {
            page1.Items.Count().ShouldBe(5);
        }
    }

    #endregion

    #region Membership Evaluation Tests

    [Fact]
    public async Task IsCustomerInSegmentAsync_ManualSegment_ReturnsTrueForMembers()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Manual Test");
        var customer = _dataBuilder.CreateCustomer("manual@test.com");
        _dataBuilder.AddCustomerToSegment(segment, customer);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _segmentService.IsCustomerInSegmentAsync(segment.Id, customer.Id);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task IsCustomerInSegmentAsync_ManualSegment_ReturnsFalseForNonMembers()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Manual Test 2");
        var member = _dataBuilder.CreateCustomer("member@test.com");
        var nonMember = _dataBuilder.CreateCustomer("nonmember@test.com");
        _dataBuilder.AddCustomerToSegment(segment, member);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _segmentService.IsCustomerInSegmentAsync(segment.Id, nonMember.Id);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task IsCustomerInSegmentAsync_AutomatedSegment_EvaluatesCriteria()
    {
        // Arrange
        var createResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "High Order Count",
            SegmentType = CustomerSegmentType.Automated,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 5
                }
            ]
        });
        var segmentId = createResult.ResultObject!.Id;

        var qualifyingCustomer = _dataBuilder.CreateCustomerWithOrders("qualifying@test.com", 5, 500m);
        var nonQualifyingCustomer = _dataBuilder.CreateCustomerWithOrders("notqualifying@test.com", 2, 200m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var qualifies = await _segmentService.IsCustomerInSegmentAsync(segmentId, qualifyingCustomer.Id);
        var doesNotQualify = await _segmentService.IsCustomerInSegmentAsync(segmentId, nonQualifyingCustomer.Id);

        // Assert
        qualifies.ShouldBeTrue();
        doesNotQualify.ShouldBeFalse();
    }

    [Fact]
    public async Task GetCustomerSegmentIdsAsync_ReturnsAllMatchingSegments()
    {
        // Arrange
        var manualSegment = _dataBuilder.CreateCustomerSegment("Manual Segment");
        var customer = _dataBuilder.CreateCustomerWithOrders("multi@test.com", 10, 2000m);
        _dataBuilder.AddCustomerToSegment(manualSegment, customer);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create an automated segment that this customer matches
        var autoResult = await _segmentService.CreateAsync(new CreateSegmentParameters
        {
            Name = "Auto Segment",
            SegmentType = CustomerSegmentType.Automated,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 1000m
                }
            ]
        });

        // Act
        var segmentIds = await _segmentService.GetCustomerSegmentIdsAsync(customer.Id);

        // Assert
        segmentIds.Count.ShouldBe(2);
        segmentIds.ShouldContain(manualSegment.Id);
        segmentIds.ShouldContain(autoResult.ResultObject!.Id);
    }

    #endregion

    #region Statistics Tests

    [Fact]
    public async Task GetMemberCountAsync_ManualSegment_CountsStoredMembers()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Count Test");
        for (int i = 0; i < 5; i++)
        {
            var customer = _dataBuilder.CreateCustomer($"count{i}@test.com");
            _dataBuilder.AddCustomerToSegment(segment, customer);
        }
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var count = await _segmentService.GetMemberCountAsync(segment.Id);

        // Assert
        count.ShouldBe(5);
    }

    [Fact]
    public async Task GetStatisticsAsync_ReturnsSegmentStatistics()
    {
        // Arrange
        var segment = _dataBuilder.CreateCustomerSegment("Stats Test");
        var customer1 = _dataBuilder.CreateCustomerWithOrders("stat1@test.com", 3, 300m);
        var customer2 = _dataBuilder.CreateCustomerWithOrders("stat2@test.com", 2, 200m);
        _dataBuilder.AddCustomerToSegment(segment, customer1);
        _dataBuilder.AddCustomerToSegment(segment, customer2);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var stats = await _segmentService.GetStatisticsAsync(segment.Id);

        // Assert
        stats.ShouldNotBeNull();
        stats.TotalMembers.ShouldBe(2);
    }

    #endregion

    #region Validation Tests

    [Fact]
    public async Task ValidateCriteriaAsync_ValidCriteria_ReturnsValid()
    {
        // Arrange
        var criteria = new List<SegmentCriteria>
        {
            new()
            {
                Field = "OrderCount",
                Operator = SegmentCriteriaOperator.GreaterThan,
                Value = 5
            }
        };

        // Act
        var result = await _segmentService.ValidateCriteriaAsync(criteria);

        // Assert
        result.IsValid.ShouldBeTrue();
        result.Errors.ShouldBeEmpty();
    }

    [Fact]
    public async Task ValidateCriteriaAsync_InvalidField_ReturnsError()
    {
        // Arrange
        var criteria = new List<SegmentCriteria>
        {
            new()
            {
                Field = "InvalidFieldName",
                Operator = SegmentCriteriaOperator.Equals,
                Value = "test"
            }
        };

        // Act
        var result = await _segmentService.ValidateCriteriaAsync(criteria);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task ValidateCriteriaAsync_EmptyCriteria_ReturnsError()
    {
        // Arrange
        var criteria = new List<SegmentCriteria>();

        // Act
        var result = await _segmentService.ValidateCriteriaAsync(criteria);

        // Assert
        result.IsValid.ShouldBeFalse();
    }

    #endregion
}
