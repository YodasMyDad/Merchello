using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Discounts;

/// <summary>
/// Unit tests for DiscountEngine validation and calculation logic.
/// </summary>
public class DiscountEngineTests
{
    private readonly Mock<IDiscountService> _discountServiceMock;
    private readonly Mock<ICustomerSegmentService> _customerSegmentServiceMock;
    private readonly Mock<IBuyXGetYCalculator> _buyXGetYCalculatorMock;
    private readonly ICurrencyService _currencyService;
    private readonly Mock<ILogger<DiscountEngine>> _loggerMock;
    private readonly DiscountEngine _engine;

    public DiscountEngineTests()
    {
        _discountServiceMock = new Mock<IDiscountService>();
        _customerSegmentServiceMock = new Mock<ICustomerSegmentService>();
        _buyXGetYCalculatorMock = new Mock<IBuyXGetYCalculator>();
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero });
        _currencyService = new CurrencyService(settings);
        _loggerMock = new Mock<ILogger<DiscountEngine>>();

        _engine = new DiscountEngine(
            _discountServiceMock.Object,
            _customerSegmentServiceMock.Object,
            _buyXGetYCalculatorMock.Object,
            _currencyService,
            _loggerMock.Object);
    }

    #region A. ValidateCodeAsync Tests

    [Fact]
    public async Task ValidateCodeAsync_EmptyCode_ReturnsNotFound()
    {
        // Arrange
        var context = CreateBasicContext();

        // Act
        var result = await _engine.ValidateCodeAsync("", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.NotFound);
        result.ErrorMessage!.ShouldContain("required");
    }

    [Fact]
    public async Task ValidateCodeAsync_NullCode_ReturnsNotFound()
    {
        // Arrange
        var context = CreateBasicContext();

        // Act
        var result = await _engine.ValidateCodeAsync(null!, context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.NotFound);
    }

    [Fact]
    public async Task ValidateCodeAsync_CodeNotFound_ReturnsNotFound()
    {
        // Arrange
        var context = CreateBasicContext();
        _discountServiceMock.Setup(s => s.GetByCodeAsync("INVALID", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Discount?)null);

        // Act
        var result = await _engine.ValidateCodeAsync("INVALID", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.NotFound);
        result.ErrorMessage!.ShouldContain("not found");
    }

    [Fact]
    public async Task ValidateCodeAsync_InactiveDiscount_ReturnsInactive()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(status: DiscountStatus.Draft);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("DRAFT10", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        // Act
        var result = await _engine.ValidateCodeAsync("DRAFT10", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.Inactive);
        result.ErrorMessage!.ShouldContain("not currently active");
    }

    [Fact]
    public async Task ValidateCodeAsync_FutureStartDate_ReturnsNotStarted()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(startsAt: DateTime.UtcNow.AddDays(7));
        _discountServiceMock.Setup(s => s.GetByCodeAsync("FUTURE", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        // Act
        var result = await _engine.ValidateCodeAsync("FUTURE", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.NotStarted);
        result.ErrorMessage!.ShouldContain("not started yet");
    }

    [Fact]
    public async Task ValidateCodeAsync_ExpiredDiscount_ReturnsExpired()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(endsAt: DateTime.UtcNow.AddDays(-1));
        _discountServiceMock.Setup(s => s.GetByCodeAsync("EXPIRED", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);

        // Act
        var result = await _engine.ValidateCodeAsync("EXPIRED", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.Expired);
        result.ErrorMessage!.ShouldContain("expired");
    }

    [Fact]
    public async Task ValidateCodeAsync_UsageLimitReached_ReturnsUsageLimitReached()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(totalUsageLimit: 100);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("LIMITED", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(100);

        // Act
        var result = await _engine.ValidateCodeAsync("LIMITED", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.UsageLimitReached);
        result.ErrorMessage!.ShouldContain("usage limit");
    }

    [Fact]
    public async Task ValidateCodeAsync_CustomerUsageLimitReached_ReturnsCustomerUsageLimitReached()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var context = CreateBasicContext(customerId: customerId);
        var discount = CreateDiscount(perCustomerUsageLimit: 1);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("ONCEONLY", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _discountServiceMock.Setup(s => s.GetCustomerUsageCountAsync(discount.Id, customerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _engine.ValidateCodeAsync("ONCEONLY", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.CustomerUsageLimitReached);
        result.ErrorMessage!.ShouldContain("usage limit");
    }

    [Fact]
    public async Task ValidateCodeAsync_MinimumPurchaseNotMet_ReturnsMinimumRequirementNotMet()
    {
        // Arrange
        // Set unitPrice to match subTotal so line item total is 50, below the 100 minimum
        var context = CreateBasicContext(subTotal: 50m, unitPrice: 50m);
        var discount = CreateDiscount(
            requirementType: DiscountRequirementType.MinimumPurchaseAmount,
            requirementValue: 100m,
            category: DiscountCategory.AmountOffOrder);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("MIN100", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("MIN100", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.MinimumRequirementNotMet);
        result.ErrorMessage!.ShouldContain("Minimum purchase");
    }

    [Fact]
    public async Task ValidateCodeAsync_MinimumQuantityNotMet_ReturnsMinimumRequirementNotMet()
    {
        // Arrange
        var context = CreateBasicContext(itemQuantity: 2);
        var discount = CreateDiscount(
            requirementType: DiscountRequirementType.MinimumQuantity,
            requirementValue: 5m,
            category: DiscountCategory.AmountOffOrder);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("MIN5", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("MIN5", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.MinimumRequirementNotMet);
        result.ErrorMessage!.ShouldContain("Minimum quantity");
    }

    [Fact]
    public async Task ValidateCodeAsync_NoApplicableProducts_ReturnsNoApplicableProducts()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId);
        var discount = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        // Add a target rule that doesn't match the product
        discount.TargetRules.Add(new DiscountTargetRule
        {
            TargetType = DiscountTargetType.SpecificProducts,
            TargetIds = System.Text.Json.JsonSerializer.Serialize(new List<Guid> { Guid.NewGuid() }),
            IsExclusion = false
        });
        _discountServiceMock.Setup(s => s.GetByCodeAsync("SPECIFIC", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("SPECIFIC", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.NoApplicableProducts);
        result.ErrorMessage!.ShouldContain("No products");
    }

    [Fact]
    public async Task ValidateCodeAsync_AlreadyApplied_ReturnsAlreadyApplied()
    {
        // Arrange
        var discount = CreateDiscount();
        var context = CreateBasicContext(appliedDiscountIds: new List<Guid> { discount.Id });
        _discountServiceMock.Setup(s => s.GetByCodeAsync("SAVE10", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("SAVE10", context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe(DiscountValidationErrorCode.AlreadyApplied);
        result.ErrorMessage!.ShouldContain("already been applied");
    }

    [Fact]
    public async Task ValidateCodeAsync_ValidDiscount_ReturnsValid()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(category: DiscountCategory.AmountOffOrder);
        _discountServiceMock.Setup(s => s.GetByCodeAsync("VALID10", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("VALID10", context);

        // Assert
        result.IsValid.ShouldBeTrue();
        result.Discount.ShouldNotBeNull();
        result.Discount.Id.ShouldBe(discount.Id);
        result.ErrorMessage.ShouldBeNull();
    }

    [Fact]
    public async Task ValidateCodeAsync_ValidDiscountWithNoExpiry_ReturnsValid()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(endsAt: null);
        discount.Category = DiscountCategory.AmountOffOrder;
        _discountServiceMock.Setup(s => s.GetByCodeAsync("NOEXPIRY", It.IsAny<CancellationToken>()))
            .ReturnsAsync(discount);
        _discountServiceMock.Setup(s => s.GetUsageCountAsync(discount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.ValidateCodeAsync("NOEXPIRY", context);

        // Assert
        result.IsValid.ShouldBeTrue();
    }

    #endregion

    #region B. CalculateAsync Tests - AmountOffProducts

    [Fact]
    public async Task CalculateAsync_AmountOffProducts_Percentage_CalculatesCorrectly()
    {
        // Arrange: 10% off products, 2 items at £50 each = £100 total, discount £10
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId, unitPrice: 50m, itemQuantity: 2);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffProducts,
            valueType: DiscountValueType.Percentage,
            value: 10m);
        // No target rules means all products

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m); // 10% of £100
        result.ProductDiscountAmount.ShouldBe(10m);
        result.DiscountedLineItems.Count.ShouldBe(1);
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(5m); // 10% of £50
        result.DiscountedLineItems[0].TotalDiscount.ShouldBe(10m);
    }

    [Fact]
    public async Task CalculateAsync_AmountOffProducts_FixedAmount_CalculatesCorrectly()
    {
        // Arrange: £5 off per product, 3 items at £30 each
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId, unitPrice: 30m, itemQuantity: 3);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffProducts,
            valueType: DiscountValueType.FixedAmount,
            value: 5m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(15m); // £5 x 3
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(5m);
        result.DiscountedLineItems[0].DiscountedUnitPrice.ShouldBe(25m); // 30 - 5
    }

    [Fact]
    public async Task CalculateAsync_AmountOffProducts_Free_MakesItemsFree()
    {
        // Arrange: Free items
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId, unitPrice: 100m, itemQuantity: 1);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffProducts,
            valueType: DiscountValueType.Free,
            value: 0m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(100m);
        result.DiscountedLineItems[0].DiscountedUnitPrice.ShouldBe(0m);
    }

    [Fact]
    public async Task CalculateAsync_AmountOffProducts_FixedAmountExceedsPrice_CappedAtPrice()
    {
        // Arrange: £100 discount on £50 item
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId, unitPrice: 50m, itemQuantity: 1);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffProducts,
            valueType: DiscountValueType.FixedAmount,
            value: 100m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(50m); // Capped at item price
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(50m);
    }

    [Fact]
    public async Task CalculateAsync_AmountOffProducts_NoMatchingItems_ZeroDiscount()
    {
        // Arrange: Discount targets different products
        var productId = Guid.NewGuid();
        var context = CreateBasicContext(productId: productId);
        var discount = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        discount.TargetRules.Add(new DiscountTargetRule
        {
            TargetType = DiscountTargetType.SpecificProducts,
            TargetIds = System.Text.Json.JsonSerializer.Serialize(new List<Guid> { Guid.NewGuid() }),
            IsExclusion = false
        });

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
        result.DiscountedLineItems.Count.ShouldBe(0);
    }

    #endregion

    #region C. CalculateAsync Tests - AmountOffOrder

    [Fact]
    public async Task CalculateAsync_AmountOffOrder_Percentage_CalculatesCorrectly()
    {
        // Arrange: 15% off order total of £200
        var context = CreateBasicContext(subTotal: 200m);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffOrder,
            valueType: DiscountValueType.Percentage,
            value: 15m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(30m); // 15% of 200
        result.OrderDiscountAmount.ShouldBe(30m);
        result.ProductDiscountAmount.ShouldBe(0m);
    }

    [Fact]
    public async Task CalculateAsync_AmountOffOrder_FixedAmount_CalculatesCorrectly()
    {
        // Arrange: £25 off order
        var context = CreateBasicContext(subTotal: 100m);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffOrder,
            valueType: DiscountValueType.FixedAmount,
            value: 25m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(25m);
        result.OrderDiscountAmount.ShouldBe(25m);
    }

    [Fact]
    public async Task CalculateAsync_AmountOffOrder_FixedAmountExceedsSubtotal_CappedAtSubtotal()
    {
        // Arrange: £100 discount on £50 order
        var context = CreateBasicContext(subTotal: 50m);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffOrder,
            valueType: DiscountValueType.FixedAmount,
            value: 100m);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(50m); // Capped at subtotal
    }

    [Fact]
    public async Task CalculateAsync_AmountOffOrder_Free_ReturnsZeroDiscount()
    {
        // Arrange: Free value type doesn't make sense for order discounts
        var context = CreateBasicContext(subTotal: 100m);
        var discount = CreateDiscount(
            category: DiscountCategory.AmountOffOrder,
            valueType: DiscountValueType.Free);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    #endregion

    #region D. CalculateAsync Tests - FreeShipping

    [Fact]
    public async Task CalculateAsync_FreeShipping_NoConfig_DiscountsAllShipping()
    {
        // Arrange: Free shipping with no config
        var context = CreateBasicContext(shippingTotal: 15m);
        var discount = CreateDiscount(category: DiscountCategory.FreeShipping);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(15m);
        result.ShippingDiscountAmount.ShouldBe(15m);
    }

    [Fact]
    public async Task CalculateAsync_FreeShipping_ZeroShipping_ZeroDiscount()
    {
        // Arrange
        var context = CreateBasicContext(shippingTotal: 0m);
        var discount = CreateDiscount(category: DiscountCategory.FreeShipping);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    #endregion

    #region E. CalculateAsync Tests - BuyXGetY

    [Fact]
    public async Task CalculateAsync_BuyXGetY_DelegatesToCalculator()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(category: DiscountCategory.BuyXGetY);
        discount.BuyXGetYConfig = new DiscountBuyXGetYConfig
        {
            BuyTriggerType = BuyXTriggerType.MinimumQuantity,
            BuyTriggerValue = 2,
            GetQuantity = 1,
            GetValueType = DiscountValueType.Free,
            GetValue = 100m
        };

        var expectedResult = new DiscountCalculationResult
        {
            Success = true,
            TotalDiscountAmount = 50m,
            ProductDiscountAmount = 50m
        };
        _buyXGetYCalculatorMock.Setup(c => c.Calculate(discount, context))
            .Returns(expectedResult);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.ShouldBe(expectedResult);
        _buyXGetYCalculatorMock.Verify(c => c.Calculate(discount, context), Times.Once);
    }

    [Fact]
    public async Task CalculateAsync_BuyXGetY_NoConfig_ReturnsFailed()
    {
        // Arrange
        var context = CreateBasicContext();
        var discount = CreateDiscount(category: DiscountCategory.BuyXGetY);
        discount.BuyXGetYConfig = null;

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("configuration is missing");
    }

    #endregion

    #region F. CanCombine Tests

    [Theory]
    [InlineData(true, true, true, true, true, true, true)]     // All combinable
    [InlineData(false, false, false, false, false, false, false)] // Nothing combinable
    [InlineData(true, false, false, true, false, false, true)]  // Product discounts combinable
    [InlineData(false, true, false, false, true, false, false)] // Only Order combinable - but both are Product category, so false
    [InlineData(false, false, true, false, false, true, false)] // Only Shipping combinable - but both are Product category, so false
    [InlineData(true, true, false, true, true, false, true)]    // Product & Order combinable (product flag is what matters for Product category)
    [InlineData(true, false, true, true, false, true, true)]    // Product & Shipping combinable (product flag is what matters for Product category)
    public void CanCombine_ReturnsCorrectResult(
        bool d1Product, bool d1Order, bool d1Shipping,
        bool d2Product, bool d2Order, bool d2Shipping,
        bool expectedResult)
    {
        // Arrange
        // NOTE: Both discounts are AmountOffProducts category, so CanCombine checks
        // if each discount allows combining with the OTHER discount's category (Product).
        // Therefore, only CanCombineWithProductDiscounts matters for this test.
        var discount1 = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        discount1.CanCombineWithProductDiscounts = d1Product;
        discount1.CanCombineWithOrderDiscounts = d1Order;
        discount1.CanCombineWithShippingDiscounts = d1Shipping;

        var discount2 = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        discount2.CanCombineWithProductDiscounts = d2Product;
        discount2.CanCombineWithOrderDiscounts = d2Order;
        discount2.CanCombineWithShippingDiscounts = d2Shipping;

        // Act
        var result = _engine.CanCombine(discount1, discount2);

        // Assert
        result.ShouldBe(expectedResult);
    }

    [Fact]
    public void CanCombine_ProductAndOrderDiscount_ChecksCorrectFlags()
    {
        // Arrange
        var productDiscount = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        productDiscount.CanCombineWithOrderDiscounts = true;

        var orderDiscount = CreateDiscount(category: DiscountCategory.AmountOffOrder);
        orderDiscount.CanCombineWithProductDiscounts = true;

        // Act
        var result = _engine.CanCombine(productDiscount, orderDiscount);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void CanCombine_ProductAndShippingDiscount_ChecksCorrectFlags()
    {
        // Arrange
        var productDiscount = CreateDiscount(category: DiscountCategory.AmountOffProducts);
        productDiscount.CanCombineWithShippingDiscounts = true;

        var shippingDiscount = CreateDiscount(category: DiscountCategory.FreeShipping);
        shippingDiscount.CanCombineWithProductDiscounts = true;

        // Act
        var result = _engine.CanCombine(productDiscount, shippingDiscount);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region G. ApplyDiscountsAsync Tests

    [Fact]
    public async Task ApplyDiscountsAsync_MultipleDiscounts_SortsByPriority()
    {
        // Arrange
        var context = CreateBasicContext(subTotal: 100m);
        var discount1 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 10m);
        discount1.Priority = 2;
        var discount2 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 5m);
        discount2.Priority = 1;

        var discounts = new List<Discount> { discount1, discount2 };

        // Act
        var result = await _engine.ApplyDiscountsAsync(discounts, [], context);

        // Assert
        result.Success.ShouldBeTrue();
        result.AppliedDiscounts.Count.ShouldBe(2);
        // Lower priority number should be first
        result.AppliedDiscounts[0].DiscountId.ShouldBe(discount2.Id);
        result.AppliedDiscounts[1].DiscountId.ShouldBe(discount1.Id);
    }

    [Fact]
    public async Task ApplyDiscountsAsync_NonCombinableDiscounts_OnlyAppliesFirst()
    {
        // Arrange
        var context = CreateBasicContext(subTotal: 100m);
        var discount1 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 10m);
        discount1.Priority = 1;
        discount1.CanCombineWithOrderDiscounts = false;

        var discount2 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 5m);
        discount2.Priority = 2;
        discount2.CanCombineWithOrderDiscounts = false;

        var discounts = new List<Discount> { discount1, discount2 };

        // Act
        var result = await _engine.ApplyDiscountsAsync(discounts, [], context);

        // Assert
        result.Success.ShouldBeTrue();
        result.AppliedDiscounts.Count.ShouldBe(1);
        result.AppliedDiscounts[0].DiscountId.ShouldBe(discount1.Id);
        result.TotalDiscountAmount.ShouldBe(10m);
    }

    [Fact]
    public async Task ApplyDiscountsAsync_CombinableDiscounts_AppliesAll()
    {
        // Arrange
        var context = CreateBasicContext(subTotal: 100m);
        var discount1 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 10m);
        discount1.CanCombineWithOrderDiscounts = true;

        var discount2 = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 5m);
        discount2.CanCombineWithOrderDiscounts = true;

        var discounts = new List<Discount> { discount1, discount2 };

        // Act
        var result = await _engine.ApplyDiscountsAsync(discounts, [], context);

        // Assert
        result.Success.ShouldBeTrue();
        result.AppliedDiscounts.Count.ShouldBe(2);
        result.TotalDiscountAmount.ShouldBe(15m);
    }

    [Fact]
    public async Task ApplyDiscountsAsync_ZeroDiscountAmount_NotIncludedInResult()
    {
        // Arrange: Discount that results in zero amount
        var context = CreateBasicContext(subTotal: 0m);
        var discount = CreateDiscount(category: DiscountCategory.AmountOffOrder, value: 10m);

        // Act
        var result = await _engine.ApplyDiscountsAsync([discount], [], context);

        // Assert
        result.Success.ShouldBeTrue();
        result.AppliedDiscounts.Count.ShouldBe(0);
    }

    #endregion

    #region H. GetApplicableAutomaticDiscountsAsync Tests

    [Fact]
    public async Task GetApplicableAutomaticDiscountsAsync_ReturnsOnlyAutomaticActiveDiscounts()
    {
        // Arrange
        var context = CreateBasicContext(subTotal: 100m);
        var automaticDiscount = CreateDiscount(
            category: DiscountCategory.AmountOffOrder,
            method: DiscountMethod.Automatic,
            value: 10m);

        var queryResult = new PaginatedList<Discount>([automaticDiscount], 1, 1, 100);

        _discountServiceMock.Setup(s => s.QueryAsync(
            It.Is<DiscountQueryParameters>(p =>
                p.Status == DiscountStatus.Active &&
                p.Method == DiscountMethod.Automatic),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(queryResult);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(automaticDiscount.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.GetApplicableAutomaticDiscountsAsync(context);

        // Assert
        result.Count.ShouldBe(1);
        result[0].Discount.Id.ShouldBe(automaticDiscount.Id);
        result[0].CalculatedAmount.ShouldBe(10m);
    }

    [Fact]
    public async Task GetApplicableAutomaticDiscountsAsync_SortsByPriority()
    {
        // Arrange
        var context = CreateBasicContext(subTotal: 100m);
        var discount1 = CreateDiscount(category: DiscountCategory.AmountOffOrder, method: DiscountMethod.Automatic, value: 10m);
        discount1.Priority = 2;
        var discount2 = CreateDiscount(category: DiscountCategory.AmountOffOrder, method: DiscountMethod.Automatic, value: 5m);
        discount2.Priority = 1;

        var queryResult = new PaginatedList<Discount>([discount1, discount2], 2, 1, 100);

        _discountServiceMock.Setup(s => s.QueryAsync(
            It.IsAny<DiscountQueryParameters>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(queryResult);

        _discountServiceMock.Setup(s => s.GetUsageCountAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await _engine.GetApplicableAutomaticDiscountsAsync(context);

        // Assert
        result.Count.ShouldBe(2);
        result[0].Discount.Priority.ShouldBe(1); // Lower priority first
        result[1].Discount.Priority.ShouldBe(2);
    }

    #endregion

    #region Helper Methods

    private static Discount CreateDiscount(
        DiscountStatus status = DiscountStatus.Active,
        DiscountCategory category = DiscountCategory.AmountOffProducts,
        DiscountMethod method = DiscountMethod.Code,
        DiscountValueType valueType = DiscountValueType.FixedAmount,
        decimal value = 10m,
        DateTime? startsAt = null,
        DateTime? endsAt = null,
        int? totalUsageLimit = null,
        int? perCustomerUsageLimit = null,
        DiscountRequirementType requirementType = DiscountRequirementType.None,
        decimal? requirementValue = null)
    {
        return new Discount
        {
            Id = Guid.NewGuid(),
            Name = "Test Discount",
            Code = "SAVE10",
            Status = status,
            Category = category,
            Method = method,
            ValueType = valueType,
            Value = value,
            StartsAt = startsAt ?? DateTime.UtcNow.AddDays(-1),
            EndsAt = endsAt,
            TotalUsageLimit = totalUsageLimit,
            PerCustomerUsageLimit = perCustomerUsageLimit,
            RequirementType = requirementType,
            RequirementValue = requirementValue,
            CanCombineWithProductDiscounts = true,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true
        };
    }

    private static DiscountContext CreateBasicContext(
        Guid? customerId = null,
        decimal subTotal = 100m,
        decimal shippingTotal = 0m,
        Guid? productId = null,
        decimal unitPrice = 100m,
        int itemQuantity = 1,
        List<Guid>? appliedDiscountIds = null)
    {
        var lineItemId = Guid.NewGuid();
        var actualProductId = productId ?? Guid.NewGuid();

        return new DiscountContext
        {
            CustomerId = customerId,
            SubTotal = subTotal,
            ShippingTotal = shippingTotal,
            CurrencyCode = "GBP",
            AppliedDiscountIds = appliedDiscountIds,
            LineItems =
            [
                new DiscountContextLineItem
                {
                    LineItemId = lineItemId,
                    ProductId = actualProductId,
                    ProductRootId = actualProductId,
                    Quantity = itemQuantity,
                    UnitPrice = unitPrice,
                    LineTotal = unitPrice * itemQuantity
                }
            ]
        };
    }

    #endregion
}
