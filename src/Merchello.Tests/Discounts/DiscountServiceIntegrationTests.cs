using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Discounts;

[Collection("Integration")]
public class DiscountServiceIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IDiscountService _discountService;

    public DiscountServiceIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _discountService = fixture.GetService<IDiscountService>();
    }

    [Fact]
    public async Task CreateAsync_WithMissingProductFilterRule_ReturnsValidationError()
    {
        var result = await _discountService.CreateAsync(CreateParametersWithTargetRule(
            DiscountTargetType.ProductFilters,
            Guid.NewGuid()));

        result.Success.ShouldBeFalse();
        result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error &&
                                 (m.Message?.Contains("Product filter IDs not found", StringComparison.Ordinal) ?? false))
            .ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithMissingProductTypeRule_ReturnsValidationError()
    {
        var result = await _discountService.CreateAsync(CreateParametersWithTargetRule(
            DiscountTargetType.ProductTypes,
            Guid.NewGuid()));

        result.Success.ShouldBeFalse();
        result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error &&
                                 (m.Message?.Contains("Product type IDs not found", StringComparison.Ordinal) ?? false))
            .ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithMissingSupplierRule_ReturnsValidationError()
    {
        var result = await _discountService.CreateAsync(CreateParametersWithTargetRule(
            DiscountTargetType.Suppliers,
            Guid.NewGuid()));

        result.Success.ShouldBeFalse();
        result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error &&
                                 (m.Message?.Contains("Supplier IDs not found", StringComparison.Ordinal) ?? false))
            .ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithMissingWarehouseRule_ReturnsValidationError()
    {
        var result = await _discountService.CreateAsync(CreateParametersWithTargetRule(
            DiscountTargetType.Warehouses,
            Guid.NewGuid()));

        result.Success.ShouldBeFalse();
        result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error &&
                                 (m.Message?.Contains("Warehouse IDs not found", StringComparison.Ordinal) ?? false))
            .ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateAsync_WithFutureStartDate_SetsScheduledStatus()
    {
        var created = await _discountService.CreateAsync(CreateValidParameters("SCHEDULED-TEST"));
        created.Success.ShouldBeTrue();

        var update = await _discountService.UpdateAsync(created.ResultObject!.Id, new UpdateDiscountParameters
        {
            StartsAt = DateTime.UtcNow.AddDays(2)
        });

        update.Success.ShouldBeTrue();
        update.ResultObject.ShouldNotBeNull();
        update.ResultObject!.Status.ShouldBe(DiscountStatus.Scheduled);
    }

    [Fact]
    public async Task UpdateAsync_WithPastEndDate_SetsExpiredStatus()
    {
        var created = await _discountService.CreateAsync(CreateValidParameters("EXPIRED-TEST"));
        created.Success.ShouldBeTrue();

        var update = await _discountService.UpdateAsync(created.ResultObject!.Id, new UpdateDiscountParameters
        {
            EndsAt = DateTime.UtcNow.AddDays(-1)
        });

        update.Success.ShouldBeTrue();
        update.ResultObject.ShouldNotBeNull();
        update.ResultObject!.Status.ShouldBe(DiscountStatus.Expired);
    }

    [Fact]
    public async Task UpdateAsync_WhenDiscountIsDisabled_KeepsDisabledStatusOnScheduleChange()
    {
        var created = await _discountService.CreateAsync(CreateValidParameters("DISABLED-TEST"));
        created.Success.ShouldBeTrue();

        var deactivated = await _discountService.DeactivateAsync(created.ResultObject!.Id);
        deactivated.Success.ShouldBeTrue();
        deactivated.ResultObject!.Status.ShouldBe(DiscountStatus.Disabled);

        var update = await _discountService.UpdateAsync(created.ResultObject.Id, new UpdateDiscountParameters
        {
            StartsAt = DateTime.UtcNow.AddDays(3),
            EndsAt = DateTime.UtcNow.AddDays(5)
        });

        update.Success.ShouldBeTrue();
        update.ResultObject.ShouldNotBeNull();
        update.ResultObject!.Status.ShouldBe(DiscountStatus.Disabled);
    }

    private static CreateDiscountParameters CreateParametersWithTargetRule(
        DiscountTargetType targetType,
        Guid targetId)
    {
        var parameters = CreateValidParameters($"RULE-{targetType}");
        parameters.TargetRules =
        [
            new CreateDiscountTargetRuleParameters
            {
                TargetType = targetType,
                TargetIds = [targetId]
            }
        ];
        return parameters;
    }

    private static CreateDiscountParameters CreateValidParameters(string code)
    {
        return new CreateDiscountParameters
        {
            Name = $"Discount {code}",
            Category = DiscountCategory.AmountOffOrder,
            Method = DiscountMethod.Code,
            Code = code,
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            StartsAt = DateTime.UtcNow.AddMinutes(-1),
            CanCombineWithProductDiscounts = true,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true
        };
    }
}
