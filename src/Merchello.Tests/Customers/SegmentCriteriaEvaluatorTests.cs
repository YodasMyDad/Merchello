using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Customers;

/// <summary>
/// Tests for SegmentCriteriaEvaluator - validates criteria evaluation logic.
/// </summary>
[Collection("Integration Tests")]
public class SegmentCriteriaEvaluatorTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ISegmentCriteriaEvaluator _evaluator;
    private readonly TestDataBuilder _dataBuilder;

    public SegmentCriteriaEvaluatorTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _evaluator = fixture.GetService<ISegmentCriteriaEvaluator>();
        _dataBuilder = fixture.CreateDataBuilder();
    }

    #region GetAvailableFields Tests

    [Fact]
    public void GetAvailableFields_ReturnsAllExpectedFields()
    {
        // Act
        var fields = _evaluator.GetAvailableFields();

        // Assert
        fields.ShouldNotBeEmpty();
        fields.Count.ShouldBe(10);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.OrderCount);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.TotalSpend);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.AverageOrderValue);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.FirstOrderDate);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.LastOrderDate);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.DaysSinceLastOrder);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.DateCreated);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.Email);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.Country);
        fields.ShouldContain(f => f.Field == SegmentCriteriaField.Tag);
    }

    [Fact]
    public void GetAvailableFields_OrderCountHasNumericOperators()
    {
        // Act
        var fields = _evaluator.GetAvailableFields();
        var orderCountField = fields.First(f => f.Field == SegmentCriteriaField.OrderCount);

        // Assert
        orderCountField.ValueType.ShouldBe(CriteriaValueType.Number);
        orderCountField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.Equals);
        orderCountField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.GreaterThan);
        orderCountField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.Between);
    }

    [Fact]
    public void GetAvailableFields_EmailHasStringOperators()
    {
        // Act
        var fields = _evaluator.GetAvailableFields();
        var emailField = fields.First(f => f.Field == SegmentCriteriaField.Email);

        // Assert
        emailField.ValueType.ShouldBe(CriteriaValueType.String);
        emailField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.Contains);
        emailField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.StartsWith);
        emailField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.EndsWith);
        emailField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.IsEmpty);
    }

    [Fact]
    public void GetAvailableFields_TagHasTagOperators()
    {
        // Act
        var fields = _evaluator.GetAvailableFields();
        var tagField = fields.First(f => f.Field == SegmentCriteriaField.Tag);

        // Assert
        tagField.ValueType.ShouldBe(CriteriaValueType.String);
        tagField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.Contains);
        tagField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.NotContains);
        tagField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.IsEmpty);
        tagField.SupportedOperators.ShouldContain(SegmentCriteriaOperator.IsNotEmpty);
    }

    #endregion

    #region GetOperatorsForField Tests

    [Theory]
    [InlineData(SegmentCriteriaField.OrderCount)]
    [InlineData(SegmentCriteriaField.TotalSpend)]
    [InlineData(SegmentCriteriaField.AverageOrderValue)]
    [InlineData(SegmentCriteriaField.DaysSinceLastOrder)]
    public void GetOperatorsForField_NumericFields_ReturnsNumericOperators(SegmentCriteriaField field)
    {
        // Act
        var operators = _evaluator.GetOperatorsForField(field);

        // Assert
        operators.ShouldContain(SegmentCriteriaOperator.Equals);
        operators.ShouldContain(SegmentCriteriaOperator.GreaterThan);
        operators.ShouldContain(SegmentCriteriaOperator.GreaterThanOrEqual);
        operators.ShouldContain(SegmentCriteriaOperator.LessThan);
        operators.ShouldContain(SegmentCriteriaOperator.LessThanOrEqual);
        operators.ShouldContain(SegmentCriteriaOperator.Between);
    }

    [Theory]
    [InlineData(SegmentCriteriaField.FirstOrderDate)]
    [InlineData(SegmentCriteriaField.LastOrderDate)]
    [InlineData(SegmentCriteriaField.DateCreated)]
    public void GetOperatorsForField_DateFields_ReturnsDateOperators(SegmentCriteriaField field)
    {
        // Act
        var operators = _evaluator.GetOperatorsForField(field);

        // Assert
        operators.ShouldContain(SegmentCriteriaOperator.Equals);
        operators.ShouldContain(SegmentCriteriaOperator.GreaterThan);
        operators.ShouldContain(SegmentCriteriaOperator.Between);
    }

    #endregion

    #region Numeric Operator Evaluation Tests

    [Fact]
    public async Task EvaluateAsync_OrderCountEquals_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("vip@test.com", 5, 500m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 5
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_OrderCountEquals_ReturnsFalseWhenNotMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("test@test.com", 3, 300m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 5
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_TotalSpendGreaterThan_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("bigspender@test.com", 3, 1500m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 1000m
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TotalSpendLessThan_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("smallspender@test.com", 2, 100m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.LessThan,
                    Value = 500m
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TotalSpendBetween_ReturnsTrueWhenInRange()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("midspender@test.com", 3, 750m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.Between,
                    Value = 500m,
                    Value2 = 1000m
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TotalSpendBetween_ReturnsFalseWhenOutOfRange()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("outlier@test.com", 5, 2000m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.Between,
                    Value = 500m,
                    Value2 = 1000m
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region String Operator Evaluation Tests

    [Fact]
    public async Task EvaluateAsync_EmailContains_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("user@company.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Email",
                    Operator = SegmentCriteriaOperator.Contains,
                    Value = "company"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_EmailStartsWith_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("john.doe@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Email",
                    Operator = SegmentCriteriaOperator.StartsWith,
                    Value = "john"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_EmailEndsWith_ReturnsTrueWhenMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("user@gmail.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Email",
                    Operator = SegmentCriteriaOperator.EndsWith,
                    Value = "gmail.com"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_StringComparison_IsCaseInsensitive()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("John.Doe@Company.COM");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Email",
                    Operator = SegmentCriteriaOperator.Contains,
                    Value = "COMPANY" // Different case
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region Tag Operator Evaluation Tests

    [Fact]
    public async Task EvaluateAsync_TagContains_ReturnsTrueWhenCustomerHasTag()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders(
            "tagged@test.com", 1, 100m, tags: ["VIP", "Wholesale"]);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Tag",
                    Operator = SegmentCriteriaOperator.Contains,
                    Value = "VIP"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TagContains_IsCaseInsensitive()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders(
            "tagged2@test.com", 1, 100m, tags: ["VIP"]);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Tag",
                    Operator = SegmentCriteriaOperator.Contains,
                    Value = "vip" // lowercase
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TagNotContains_ReturnsTrueWhenCustomerMissingTag()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders(
            "notvip@test.com", 1, 100m, tags: ["Regular"]);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Tag",
                    Operator = SegmentCriteriaOperator.NotContains,
                    Value = "VIP"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TagIsEmpty_ReturnsTrueWhenNoTags()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("notags@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Tag",
                    Operator = SegmentCriteriaOperator.IsEmpty,
                    Value = null
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TagIsNotEmpty_ReturnsTrueWhenHasTags()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders(
            "hastags@test.com", 1, 100m, tags: ["Active"]);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Tag",
                    Operator = SegmentCriteriaOperator.IsNotEmpty,
                    Value = null
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region Match Mode Tests

    [Fact]
    public async Task EvaluateAsync_MatchModeAll_RequiresAllCriteriaToMatch()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("all@test.com", 5, 1000m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 5
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 1000m
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_MatchModeAll_ReturnsFalseIfOneCriterionFails()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("partial@test.com", 5, 500m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 5 // Matches
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 1000m // Does not match - only 500
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_MatchModeAny_ReturnsTrueIfOneCriterionMatches()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("any@test.com", 10, 200m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.Any,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 10 // Matches
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 1000m // Does not match - only 200
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_MatchModeAny_ReturnsFalseIfNoCriteriaMatch()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("none@test.com", 2, 100m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.Any,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 10 // Does not match - only 2
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 1000m // Does not match - only 100
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task EvaluateAsync_EmptyCriteria_ReturnsFalse()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("empty@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria = []
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_NonExistentCustomer_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 0
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(nonExistentId, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_CustomerWithNoOrders_HasZeroMetrics()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("noorders@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 0
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_UnknownField_ReturnsFalse()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomer("unknown@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "NonExistentField",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = "test"
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_FieldNameIsCaseInsensitive()
    {
        // Arrange
        var customer = _dataBuilder.CreateCustomerWithOrders("casetest@test.com", 5, 500m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "ORDERCOUNT", // Uppercase
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 5
                }
            ]
        };

        // Act
        var result = await _evaluator.EvaluateAsync(customer.Id, criteriaSet);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region SQL-Based Evaluation (CountMatchingCustomersAsync / QueryMatchingCustomersAsync)

    [Fact]
    public async Task CountMatchingCustomersAsync_TotalSpendGreaterThan_ReturnsCorrectCount()
    {
        // Arrange - create customers with different spend levels
        _dataBuilder.CreateCustomerWithOrders("highspend@test.com", 3, 1500m);
        _dataBuilder.CreateCustomerWithOrders("medspend@test.com", 2, 800m);
        _dataBuilder.CreateCustomerWithOrders("lowspend@test.com", 1, 50m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 500m
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(2);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_OrderCountEquals_ReturnsCorrectCount()
    {
        // Arrange
        _dataBuilder.CreateCustomerWithOrders("five1@test.com", 5, 500m);
        _dataBuilder.CreateCustomerWithOrders("five2@test.com", 5, 300m);
        _dataBuilder.CreateCustomerWithOrders("three@test.com", 3, 200m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 5
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(2);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_TotalSpendBetween_ReturnsCorrectCount()
    {
        // Arrange
        _dataBuilder.CreateCustomerWithOrders("inrange@test.com", 2, 750m);
        _dataBuilder.CreateCustomerWithOrders("belowrange@test.com", 1, 100m);
        _dataBuilder.CreateCustomerWithOrders("aboverange@test.com", 5, 2000m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.Between,
                    Value = 500m,
                    Value2 = 1000m
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(1);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_MultipleCriteriaAllMode_FiltersCorrectly()
    {
        // Arrange
        _dataBuilder.CreateCustomerWithOrders("match@test.com", 5, 1500m);
        _dataBuilder.CreateCustomerWithOrders("highcount@test.com", 5, 200m);
        _dataBuilder.CreateCustomerWithOrders("highspend2@test.com", 2, 1500m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 5
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 1000m
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(1);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_MultipleCriteriaAnyMode_FiltersCorrectly()
    {
        // Arrange
        _dataBuilder.CreateCustomerWithOrders("highcount2@test.com", 10, 200m);
        _dataBuilder.CreateCustomerWithOrders("highspend3@test.com", 1, 2000m);
        _dataBuilder.CreateCustomerWithOrders("neither@test.com", 2, 100m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.Any,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "OrderCount",
                    Operator = SegmentCriteriaOperator.GreaterThanOrEqual,
                    Value = 10
                },
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 1000m
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(2);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_EmailContains_FiltersCorrectly()
    {
        // Arrange
        _dataBuilder.CreateCustomer("user@company.com");
        _dataBuilder.CreateCustomer("admin@company.com");
        _dataBuilder.CreateCustomer("user@gmail.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "Email",
                    Operator = SegmentCriteriaOperator.Contains,
                    Value = "company"
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(2);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_CustomersWithNoOrders_IncludedWithZeroSpend()
    {
        // Arrange - customer with no orders should have TotalSpend = 0
        _dataBuilder.CreateCustomer("noorders2@test.com");
        _dataBuilder.CreateCustomerWithOrders("hasorders@test.com", 1, 100m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.Equals,
                    Value = 0m
                }
            ]
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(1);
    }

    [Fact]
    public async Task QueryMatchingCustomersAsync_TotalSpendGreaterThan_ReturnsMatchingIds()
    {
        // Arrange
        var highSpender = _dataBuilder.CreateCustomerWithOrders("queryhigh@test.com", 3, 1500m);
        _dataBuilder.CreateCustomerWithOrders("querylow@test.com", 1, 50m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 500m
                }
            ]
        };

        // Act
        var result = await _evaluator.QueryMatchingCustomersAsync(criteriaSet);

        // Assert
        result.ShouldNotBeNull();
        result.TotalItems.ShouldBe(1);
        result.Items.ShouldContain(highSpender.Id);
    }

    [Fact]
    public async Task CountMatchingCustomersAsync_EmptyCriteria_ReturnsZero()
    {
        // Arrange
        _dataBuilder.CreateCustomer("empty2@test.com");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var criteriaSet = new SegmentCriteriaSet
        {
            MatchMode = SegmentMatchMode.All,
            Criteria = []
        };

        // Act
        var count = await _evaluator.CountMatchingCustomersAsync(criteriaSet);

        // Assert
        count.ShouldBe(0);
    }

    #endregion
}
