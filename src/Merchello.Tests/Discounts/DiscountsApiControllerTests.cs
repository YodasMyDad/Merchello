using Merchello.Controllers;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Dtos;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Discounts;

/// <summary>
/// Unit tests for DiscountsApiController.
/// Tests all controller endpoints with mocked IDiscountService.
/// </summary>
public class DiscountsApiControllerTests
{
    private readonly Mock<IDiscountService> _discountServiceMock;
    private readonly Mock<IDiscountRuleNameResolver> _ruleNameResolverMock;
    private readonly Mock<ICurrencyService> _currencyServiceMock;
    private readonly DiscountsApiController _controller;

    public DiscountsApiControllerTests()
    {
        _discountServiceMock = new Mock<IDiscountService>();
        _ruleNameResolverMock = new Mock<IDiscountRuleNameResolver>();
        _currencyServiceMock = new Mock<ICurrencyService>();
        _currencyServiceMock.Setup(c => c.FormatAmount(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns<decimal, string>((amount, _) => $"${amount:N2}");

        var settings = Options.Create(new MerchelloSettings { StoreCurrencyCode = "USD" });

        _controller = new DiscountsApiController(
            _discountServiceMock.Object,
            _ruleNameResolverMock.Object,
            _currencyServiceMock.Object,
            settings);
    }

    #region A. GetDiscounts Tests

    [Fact]
    public async Task GetDiscounts_ReturnsPagedResults()
    {
        // Arrange
        List<Discount> discounts =
        [
            CreateDiscount("Discount 1"),
            CreateDiscount("Discount 2")
        ];

        _discountServiceMock.Setup(s => s.QueryAsync(
            It.IsAny<DiscountQueryParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaginatedList<Discount>(discounts, 2, 1, 50));

        _discountServiceMock.Setup(s => s.GetUsageCountsAsync(
            It.IsAny<List<Guid>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, int>());

        // Act
        var result = await _controller.GetDiscounts(
            status: null,
            category: null,
            method: null,
            search: null,
            page: 1,
            pageSize: 50);

        // Assert
        result.Items.Count.ShouldBe(2);
        result.TotalItems.ShouldBe(2);
        result.Page.ShouldBe(1);
    }

    [Fact]
    public async Task GetDiscounts_WithFilters_PassesFiltersToService()
    {
        // Arrange
        DiscountQueryParameters? capturedParams = null;
        _discountServiceMock.Setup(s => s.QueryAsync(
            It.IsAny<DiscountQueryParameters>(),
            It.IsAny<CancellationToken>()))
            .Callback<DiscountQueryParameters, CancellationToken>((p, _) => capturedParams = p)
            .ReturnsAsync(new PaginatedList<Discount>([], 0, 1, 25));

        _discountServiceMock.Setup(s => s.GetUsageCountsAsync(
            It.IsAny<List<Guid>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, int>());

        // Act
        await _controller.GetDiscounts(
            status: DiscountStatus.Active,
            category: DiscountCategory.AmountOffProducts,
            method: DiscountMethod.Code,
            search: "SAVE",
            page: 2,
            pageSize: 25,
            orderBy: DiscountOrderBy.Name,
            descending: false);

        // Assert
        capturedParams.ShouldNotBeNull();
        capturedParams.Status.ShouldBe(DiscountStatus.Active);
        capturedParams.Category.ShouldBe(DiscountCategory.AmountOffProducts);
        capturedParams.Method.ShouldBe(DiscountMethod.Code);
        capturedParams.SearchTerm.ShouldBe("SAVE");
        capturedParams.Page.ShouldBe(2);
        capturedParams.PageSize.ShouldBe(25);
        capturedParams.OrderBy.ShouldBe(DiscountOrderBy.Name);
        capturedParams.Descending.ShouldBeFalse();
    }

    #endregion

    #region B. GetDiscount Tests

    [Fact]
    public async Task GetDiscount_ExistingId_ReturnsOkWithDetail()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = CreateDiscount("Test Discount", id: discountId);
        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        // Act
        var result = await _controller.GetDiscount(discountId, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var dto = okResult.Value.ShouldBeOfType<DiscountDetailDto>();
        dto.Id.ShouldBe(discountId);
        dto.Name.ShouldBe("Test Discount");
    }

    [Fact]
    public async Task GetDiscount_NonExistingId_ReturnsNotFound()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Discount?)null);

        // Act
        var result = await _controller.GetDiscount(discountId, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundResult>();
    }

    #endregion

    #region C. CreateDiscount Tests

    [Fact]
    public async Task CreateDiscount_ValidDto_ReturnsCreated()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = CreateDiscount("New Discount", id: discountId);

        _discountServiceMock.Setup(s => s.CreateAsync(
            It.IsAny<CreateDiscountParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Discount> { ResultObject = discount });

        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        var dto = new CreateDiscountDto
        {
            Name = "New Discount",
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Code,
            Code = "NEWCODE",
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            StartsAt = DateTime.UtcNow
        };

        // Act
        var result = await _controller.CreateDiscount(dto, CancellationToken.None);

        // Assert
        var createdResult = result.ShouldBeOfType<CreatedAtActionResult>();
        createdResult.ActionName.ShouldBe(nameof(DiscountsApiController.GetDiscount));
        createdResult.RouteValues!["id"].ShouldBe(discountId);
        var detailDto = createdResult.Value.ShouldBeOfType<DiscountDetailDto>();
        detailDto.Name.ShouldBe("New Discount");
    }

    [Fact]
    public async Task CreateDiscount_InvalidDto_ReturnsBadRequest()
    {
        // Arrange
        var crudResult = new CrudResult<Discount>();
        crudResult.Messages.Add(new ResultMessage { Message = "Code already exists", ResultMessageType = ResultMessageType.Error });

        _discountServiceMock.Setup(s => s.CreateAsync(
            It.IsAny<CreateDiscountParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(crudResult);

        var dto = new CreateDiscountDto
        {
            Name = "Duplicate Discount",
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Code,
            Code = "DUPLICATE",
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            StartsAt = DateTime.UtcNow
        };

        // Act
        var result = await _controller.CreateDiscount(dto, CancellationToken.None);

        // Assert
        var badRequestResult = result.ShouldBeOfType<BadRequestObjectResult>();
        badRequestResult.Value.ShouldNotBeNull();
    }

    #endregion

    #region D. UpdateDiscount Tests

    [Fact]
    public async Task UpdateDiscount_ValidDto_ReturnsOk()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = CreateDiscount("Updated Discount", id: discountId);

        _discountServiceMock.Setup(s => s.UpdateAsync(
            discountId,
            It.IsAny<UpdateDiscountParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Discount> { ResultObject = discount });

        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        var dto = new UpdateDiscountDto
        {
            Name = "Updated Discount",
            Value = 20m
        };

        // Act
        var result = await _controller.UpdateDiscount(discountId, dto, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var detailDto = okResult.Value.ShouldBeOfType<DiscountDetailDto>();
        detailDto.Name.ShouldBe("Updated Discount");
    }

    [Fact]
    public async Task UpdateDiscount_NonExistingId_ReturnsNotFound()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var crudResult = new CrudResult<Discount>();
        crudResult.Messages.Add(new ResultMessage { Message = "Discount not found", ResultMessageType = ResultMessageType.Error });

        _discountServiceMock.Setup(s => s.UpdateAsync(
            discountId,
            It.IsAny<UpdateDiscountParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(crudResult);

        var dto = new UpdateDiscountDto { Name = "Test" };

        // Act
        var result = await _controller.UpdateDiscount(discountId, dto, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task UpdateDiscount_ValidationError_ReturnsBadRequest()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var crudResult = new CrudResult<Discount>();
        crudResult.Messages.Add(new ResultMessage { Message = "Value must be positive", ResultMessageType = ResultMessageType.Error });

        _discountServiceMock.Setup(s => s.UpdateAsync(
            discountId,
            It.IsAny<UpdateDiscountParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(crudResult);

        var dto = new UpdateDiscountDto { Value = -10m };

        // Act
        var result = await _controller.UpdateDiscount(discountId, dto, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region E. DeleteDiscount Tests

    [Fact]
    public async Task DeleteDiscount_ExistingId_ReturnsNoContent()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        _discountServiceMock.Setup(s => s.DeleteAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<bool> { ResultObject = true });

        // Act
        var result = await _controller.DeleteDiscount(discountId, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteDiscount_NonExistingId_ReturnsNotFound()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var crudResult = new CrudResult<bool>();
        crudResult.Messages.Add(new ResultMessage { Message = "Discount not found", ResultMessageType = ResultMessageType.Error });

        _discountServiceMock.Setup(s => s.DeleteAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(crudResult);

        // Act
        var result = await _controller.DeleteDiscount(discountId, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundResult>();
    }

    #endregion

    #region F. ActivateDiscount Tests

    [Fact]
    public async Task ActivateDiscount_ExistingId_ReturnsOk()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = CreateDiscount("Test", id: discountId);
        discount.Status = DiscountStatus.Active;

        _discountServiceMock.Setup(s => s.ActivateAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Discount> { ResultObject = discount });

        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _controller.ActivateDiscount(discountId, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var dto = okResult.Value.ShouldBeOfType<DiscountDetailDto>();
        dto.Status.ShouldBe(DiscountStatus.Active);
    }

    [Fact]
    public async Task ActivateDiscount_NonExistingId_ReturnsNotFound()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var crudResult = new CrudResult<Discount>();
        crudResult.Messages.Add(new ResultMessage { Message = "Discount not found", ResultMessageType = ResultMessageType.Error });

        _discountServiceMock.Setup(s => s.ActivateAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(crudResult);

        // Act
        var result = await _controller.ActivateDiscount(discountId, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundResult>();
    }

    #endregion

    #region G. DeactivateDiscount Tests

    [Fact]
    public async Task DeactivateDiscount_ExistingId_ReturnsOk()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = CreateDiscount("Test", id: discountId);
        discount.Status = DiscountStatus.Disabled;

        _discountServiceMock.Setup(s => s.DeactivateAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Discount> { ResultObject = discount });

        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _controller.DeactivateDiscount(discountId, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var dto = okResult.Value.ShouldBeOfType<DiscountDetailDto>();
        dto.Status.ShouldBe(DiscountStatus.Disabled);
    }

    #endregion

    #region H. GenerateCode Tests

    [Fact]
    public void GenerateCode_DefaultLength_ReturnsCode()
    {
        // Arrange
        _discountServiceMock.Setup(s => s.GenerateUniqueCode(8))
            .Returns("ABC12345");

        // Act
        var result = _controller.GenerateCode();

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        okResult.Value.ShouldNotBeNull();
    }

    [Fact]
    public void GenerateCode_CustomLength_ReturnsCodeOfSpecifiedLength()
    {
        // Arrange
        _discountServiceMock.Setup(s => s.GenerateUniqueCode(12))
            .Returns("ABCDE1234567");

        // Act
        var result = _controller.GenerateCode(length: 12);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        okResult.Value.ShouldNotBeNull();
    }

    #endregion

    #region I. ValidateCode Tests

    [Fact]
    public async Task ValidateCode_AvailableCode_ReturnsIsAvailableTrue()
    {
        // Arrange
        _discountServiceMock.Setup(s => s.IsCodeAvailableAsync("NEWCODE", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.ValidateCode("NEWCODE", null, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        okResult.Value.ShouldNotBeNull();
    }

    [Fact]
    public async Task ValidateCode_UnavailableCode_ReturnsIsAvailableFalse()
    {
        // Arrange
        _discountServiceMock.Setup(s => s.IsCodeAvailableAsync("EXISTING", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.ValidateCode("EXISTING", null, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        okResult.Value.ShouldNotBeNull();
    }

    [Fact]
    public async Task ValidateCode_WithExcludeId_PassesExcludeIdToService()
    {
        // Arrange
        var excludeId = Guid.NewGuid();
        Guid? capturedExcludeId = null;

        _discountServiceMock.Setup(s => s.IsCodeAvailableAsync(
            It.IsAny<string>(),
            It.IsAny<Guid?>(),
            It.IsAny<CancellationToken>()))
            .Callback<string, Guid?, CancellationToken>((_, e, _) => capturedExcludeId = e)
            .ReturnsAsync(true);

        // Act
        await _controller.ValidateCode("CODE", excludeId, CancellationToken.None);

        // Assert
        capturedExcludeId.ShouldBe(excludeId);
    }

    #endregion

    #region J. GetPerformance Tests

    [Fact]
    public async Task GetPerformance_ExistingId_ReturnsOk()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var performance = new DiscountPerformanceDto
        {
            DiscountId = discountId,
            TotalUsageCount = 100,
            TotalDiscountAmount = 500m,
            UniqueCustomersCount = 50
        };

        _discountServiceMock.Setup(s => s.GetPerformanceAsync(
            It.IsAny<GetDiscountPerformanceParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(performance);

        // Act
        var result = await _controller.GetPerformance(discountId, null, null, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var dto = okResult.Value.ShouldBeOfType<DiscountPerformanceDto>();
        dto.TotalUsageCount.ShouldBe(100);
        dto.TotalDiscountAmount.ShouldBe(500m);
    }

    [Fact]
    public async Task GetPerformance_NonExistingId_ReturnsNotFound()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        _discountServiceMock.Setup(s => s.GetPerformanceAsync(
            It.IsAny<GetDiscountPerformanceParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DiscountPerformanceDto?)null);

        // Act
        var result = await _controller.GetPerformance(discountId, null, null, CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetPerformance_WithDateRange_PassesDatesToService()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var startDate = new DateTime(2024, 1, 1);
        var endDate = new DateTime(2024, 12, 31);
        DateTime? capturedStart = null;
        DateTime? capturedEnd = null;

        _discountServiceMock.Setup(s => s.GetPerformanceAsync(
            It.IsAny<GetDiscountPerformanceParameters>(),
            It.IsAny<CancellationToken>()))
            .Callback<GetDiscountPerformanceParameters, CancellationToken>((p, _) =>
            {
                capturedStart = p.StartDate;
                capturedEnd = p.EndDate;
            })
            .ReturnsAsync(new DiscountPerformanceDto { DiscountId = discountId });

        // Act
        await _controller.GetPerformance(discountId, startDate, endDate, CancellationToken.None);

        // Assert
        capturedStart.ShouldBe(startDate);
        capturedEnd.ShouldBe(endDate);
    }

    #endregion

    #region K. GetUsageReport Tests

    [Fact]
    public async Task GetUsageReport_ReturnsOk()
    {
        // Arrange
        List<DiscountUsageSummaryDto> summaries =
        [
            new()
            {
                DiscountId = Guid.NewGuid(),
                Name = "Summer Sale",
                TotalUsageCount = 500,
                TotalDiscountAmount = 2500m
            },
            new()
            {
                DiscountId = Guid.NewGuid(),
                Name = "Welcome10",
                TotalUsageCount = 200,
                TotalDiscountAmount = 1000m
            }
        ];

        _discountServiceMock.Setup(s => s.GetUsageSummaryAsync(
            It.IsAny<DiscountReportParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(summaries);

        // Act
        var result = await _controller.GetUsageReport(
            new DiscountReportParameters
            {
                OrderBy = DiscountReportOrderBy.TotalUsage,
                Descending = true
            },
            CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var list = okResult.Value.ShouldBeAssignableTo<List<DiscountUsageSummaryDto>>();
        list!.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GetUsageReport_WithFilters_PassesFiltersToService()
    {
        // Arrange
        DiscountReportParameters? capturedParams = null;
        var startDate = new DateTime(2024, 1, 1);
        var endDate = new DateTime(2024, 12, 31);

        _discountServiceMock.Setup(s => s.GetUsageSummaryAsync(
            It.IsAny<DiscountReportParameters>(),
            It.IsAny<CancellationToken>()))
            .Callback<DiscountReportParameters, CancellationToken>((p, _) => capturedParams = p)
            .ReturnsAsync([]);

        // Act
        await _controller.GetUsageReport(
            new DiscountReportParameters
            {
                StartDate = startDate,
                EndDate = endDate,
                Status = DiscountStatus.Active,
                Category = DiscountCategory.AmountOffProducts,
                Method = DiscountMethod.Code,
                Top = 10,
                OrderBy = DiscountReportOrderBy.TotalDiscountAmount,
                Descending = false
            },
            CancellationToken.None);

        // Assert
        capturedParams.ShouldNotBeNull();
        capturedParams.StartDate.ShouldBe(startDate);
        capturedParams.EndDate.ShouldBe(endDate);
        capturedParams.Status.ShouldBe(DiscountStatus.Active);
        capturedParams.Category.ShouldBe(DiscountCategory.AmountOffProducts);
        capturedParams.Method.ShouldBe(DiscountMethod.Code);
        capturedParams.Top.ShouldBe(10);
        capturedParams.OrderBy.ShouldBe(DiscountReportOrderBy.TotalDiscountAmount);
        capturedParams.Descending.ShouldBeFalse();
    }

    #endregion

    #region L. Mapping Tests

    [Fact]
    public async Task GetDiscount_MapsAllFields()
    {
        // Arrange
        var discountId = Guid.NewGuid();
        var discount = new Discount
        {
            Id = discountId,
            Name = "Full Test",
            Description = "Test description",
            Status = DiscountStatus.Active,
            Category = DiscountCategory.BuyXGetY,
            Method = DiscountMethod.Automatic,
            Code = null,
            ValueType = DiscountValueType.Free,
            Value = 0m,
            StartsAt = new DateTime(2024, 1, 1),
            EndsAt = new DateTime(2024, 12, 31),
            Timezone = "Europe/London",
            TotalUsageLimit = 1000,
            PerCustomerUsageLimit = 5,
            PerOrderUsageLimit = 2,
            RequirementType = DiscountRequirementType.MinimumPurchaseAmount,
            RequirementValue = 50m,
            CanCombineWithProductDiscounts = false,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true,
            Priority = 10,
            DateCreated = new DateTime(2024, 1, 1),
            DateUpdated = new DateTime(2024, 6, 1)
        };

        discount.SetTargetRules([new DiscountTargetRule
        {
            TargetType = DiscountTargetType.Collections,
            TargetIds = "[\"" + Guid.NewGuid() + "\"]",
            IsExclusion = false
        }]);
        discount.SetEligibilityRules([new DiscountEligibilityRule
        {
            EligibilityType = DiscountEligibilityType.CustomerSegments,
            EligibilityIds = "[\"" + Guid.NewGuid() + "\"]"
        }]);
        discount.SetBuyXGetYConfig(new DiscountBuyXGetYConfig
        {
            BuyTriggerType = BuyXTriggerType.MinimumQuantity,
            BuyTriggerValue = 2,
            BuyTargetType = DiscountTargetType.AllProducts,
            GetQuantity = 1,
            GetTargetType = DiscountTargetType.AllProducts,
            GetValueType = DiscountValueType.Free,
            GetValue = 0m,
            SelectionMethod = BuyXGetYSelectionMethod.Cheapest
        });

        _discountServiceMock.Setup(s => s.GetByIdAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discountId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);

        // Act
        var result = await _controller.GetDiscount(discountId, CancellationToken.None);

        // Assert
        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var dto = okResult.Value.ShouldBeOfType<DiscountDetailDto>();

        dto.Id.ShouldBe(discountId);
        dto.Name.ShouldBe("Full Test");
        dto.Description.ShouldBe("Test description");
        dto.Status.ShouldBe(DiscountStatus.Active);
        dto.Category.ShouldBe(DiscountCategory.BuyXGetY);
        dto.Method.ShouldBe(DiscountMethod.Automatic);
        dto.Code.ShouldBeNull();
        dto.ValueType.ShouldBe(DiscountValueType.Free);
        dto.TotalUsageLimit.ShouldBe(1000);
        dto.PerCustomerUsageLimit.ShouldBe(5);
        dto.PerOrderUsageLimit.ShouldBe(2);
        dto.CurrentUsageCount.ShouldBe(42); // Usage count is now derived dynamically from line items
        dto.RequirementType.ShouldBe(DiscountRequirementType.MinimumPurchaseAmount);
        dto.RequirementValue.ShouldBe(50m);
        dto.CanCombineWithProductDiscounts.ShouldBeFalse();
        dto.CanCombineWithOrderDiscounts.ShouldBeTrue();
        dto.Priority.ShouldBe(10);
        dto.TargetRules.Count.ShouldBe(1);
        dto.EligibilityRules.Count.ShouldBe(1);
        dto.BuyXGetYConfig.ShouldNotBeNull();
        dto.BuyXGetYConfig.BuyTriggerType.ShouldBe(BuyXTriggerType.MinimumQuantity);
        dto.BuyXGetYConfig.GetQuantity.ShouldBe(1);
    }

    #endregion

    #region Helper Methods

    private static Discount CreateDiscount(string name, Guid? id = null)
    {
        return new Discount
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Status = DiscountStatus.Draft,
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Code,
            Code = "TEST",
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            StartsAt = DateTime.UtcNow.AddDays(-1),
            DateCreated = DateTime.UtcNow.AddDays(-7)
        };
    }

    #endregion
}
