using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Engine for calculating and applying discounts to orders.
/// </summary>
public class DiscountEngine(
    IDiscountService discountService,
    ICustomerSegmentService customerSegmentService,
    IBuyXGetYCalculator buyXGetYCalculator,
    ICurrencyService currencyService,
    ILogger<DiscountEngine> logger) : IDiscountEngine
{
    /// <inheritdoc />
    public async Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        DiscountContext context,
        CancellationToken ct = default)
    {
        var applicableDiscounts = new List<ApplicableDiscount>();

        // Get all active automatic discounts
        var queryParams = new Parameters.DiscountQueryParameters
        {
            Status = DiscountStatus.Active,
            Method = DiscountMethod.Automatic,
            PageSize = 100 // Get all active automatic discounts
        };

        var discounts = await discountService.QueryAsync(queryParams, ct);

        foreach (var discount in discounts.Items)
        {
            // Check if discount is applicable
            var validationResult = await ValidateDiscountAsync(discount, context, ct);
            if (!validationResult.IsValid)
            {
                continue;
            }

            // Calculate the discount amount
            var calculationResult = await CalculateAsync(discount, context, ct);
            if (calculationResult.Success && calculationResult.TotalDiscountAmount > 0)
            {
                applicableDiscounts.Add(new ApplicableDiscount
                {
                    Discount = discount,
                    CalculatedAmount = calculationResult.TotalDiscountAmount,
                    CanCombine = CanCombineWithOthers(discount)
                });
            }
        }

        // Sort by priority (lower number = higher priority)
        return applicableDiscounts.OrderBy(d => d.Discount.Priority).ToList();
    }

    /// <inheritdoc />
    public async Task<DiscountValidationResult> ValidateCodeAsync(
        string code,
        DiscountContext context,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.NotFound,
                "Discount code is required.");
        }

        var discount = await discountService.GetByCodeAsync(code, ct);
        if (discount == null)
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.NotFound,
                "Discount code not found.");
        }

        return await ValidateDiscountAsync(discount, context, ct);
    }

    /// <inheritdoc />
    public Task<DiscountCalculationResult> CalculateAsync(
        Discount discount,
        DiscountContext context,
        CancellationToken ct = default)
    {
        try
        {
            var result = discount.Category switch
            {
                DiscountCategory.AmountOffProducts => CalculateAmountOffProducts(discount, context),
                DiscountCategory.BuyXGetY => CalculateBuyXGetY(discount, context),
                DiscountCategory.AmountOffOrder => CalculateAmountOffOrder(discount, context),
                DiscountCategory.FreeShipping => CalculateFreeShipping(discount, context),
                _ => DiscountCalculationResult.Failed($"Unknown discount category: {discount.Category}")
            };
            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error calculating discount {DiscountId}", discount.Id);
            return Task.FromResult(DiscountCalculationResult.Failed("An error occurred while calculating the discount."));
        }
    }

    /// <inheritdoc />
    public async Task<ApplyDiscountsResult> ApplyDiscountsAsync(
        List<Discount> discounts,
        List<LineItem> lineItems,
        DiscountContext context,
        CancellationToken ct = default)
    {
        var result = new ApplyDiscountsResult { Success = true };
        var allDiscountedItems = new Dictionary<Guid, DiscountedLineItem>();

        // Filter and sort by combination rules (FilterCombinableDiscounts handles sorting)
        var validDiscounts = FilterCombinableDiscounts(discounts);

        foreach (var discount in validDiscounts)
        {
            var calculationResult = await CalculateAsync(discount, context, ct);
            if (!calculationResult.Success || calculationResult.TotalDiscountAmount <= 0)
            {
                continue;
            }

            result.AppliedDiscounts.Add(new AppliedDiscountInfo
            {
                DiscountId = discount.Id,
                Name = discount.Name,
                Code = discount.Code,
                Category = discount.Category,
                DiscountAmount = calculationResult.TotalDiscountAmount
            });

            result.TotalDiscountAmount += calculationResult.TotalDiscountAmount;

            // Merge discounted line items
            foreach (var item in calculationResult.DiscountedLineItems)
            {
                if (allDiscountedItems.TryGetValue(item.LineItemId, out var existing))
                {
                    // Accumulate discounts on the same line item
                    existing.TotalDiscount += item.TotalDiscount;
                    existing.DiscountedUnitPrice = existing.OriginalUnitPrice -
                        (existing.TotalDiscount / Math.Max(existing.DiscountedQuantity, 1));
                }
                else
                {
                    allDiscountedItems[item.LineItemId] = item;
                }
            }
        }

        result.DiscountedLineItems = allDiscountedItems.Values.ToList();
        return result;
    }

    /// <inheritdoc />
    public bool CanCombine(Discount discount1, Discount discount2)
    {
        // Check if discount1 allows combining with discount2's category
        var canDiscount1CombineWithDiscount2 = discount2.Category switch
        {
            DiscountCategory.AmountOffProducts or DiscountCategory.BuyXGetY =>
                discount1.CanCombineWithProductDiscounts,
            DiscountCategory.AmountOffOrder => discount1.CanCombineWithOrderDiscounts,
            DiscountCategory.FreeShipping => discount1.CanCombineWithShippingDiscounts,
            _ => false
        };

        // Check if discount2 allows combining with discount1's category
        var canDiscount2CombineWithDiscount1 = discount1.Category switch
        {
            DiscountCategory.AmountOffProducts or DiscountCategory.BuyXGetY =>
                discount2.CanCombineWithProductDiscounts,
            DiscountCategory.AmountOffOrder => discount2.CanCombineWithOrderDiscounts,
            DiscountCategory.FreeShipping => discount2.CanCombineWithShippingDiscounts,
            _ => false
        };

        return canDiscount1CombineWithDiscount2 && canDiscount2CombineWithDiscount1;
    }

    private async Task<DiscountValidationResult> ValidateDiscountAsync(
        Discount discount,
        DiscountContext context,
        CancellationToken ct)
    {
        // Check status
        if (discount.Status != DiscountStatus.Active)
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.Inactive,
                "This discount is not currently active.");
        }

        // Check date range
        var now = DateTime.UtcNow;
        if (discount.StartsAt > now)
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.NotStarted,
                "This discount has not started yet.");
        }

        if (discount.EndsAt.HasValue && discount.EndsAt.Value < now)
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.Expired,
                "This discount has expired.");
        }

        // Check total usage limit
        if (discount.TotalUsageLimit.HasValue)
        {
            var usageCount = await discountService.GetUsageCountAsync(discount.Id, ct);
            if (usageCount >= discount.TotalUsageLimit.Value)
            {
                return DiscountValidationResult.Invalid(
                    DiscountValidationErrorCode.UsageLimitReached,
                    "This discount has reached its usage limit.");
            }
        }

        // Check per-customer usage limit
        if (discount.PerCustomerUsageLimit.HasValue && context.CustomerId.HasValue)
        {
            var customerUsageCount = await discountService.GetCustomerUsageCountAsync(
                discount.Id, context.CustomerId.Value, ct);
            if (customerUsageCount >= discount.PerCustomerUsageLimit.Value)
            {
                return DiscountValidationResult.Invalid(
                    DiscountValidationErrorCode.CustomerUsageLimitReached,
                    "You have reached the usage limit for this discount.");
            }
        }

        // Check customer eligibility
        if (discount.EligibilityRules.Count > 0)
        {
            var isEligible = await CheckCustomerEligibilityAsync(discount, context, ct);
            if (!isEligible)
            {
                return DiscountValidationResult.Invalid(
                    DiscountValidationErrorCode.CustomerNotEligible,
                    "You are not eligible for this discount.");
            }
        }

        // Check minimum requirements
        if (!CheckMinimumRequirements(discount, context))
        {
            var requirementMessage = discount.RequirementType switch
            {
                DiscountRequirementType.MinimumPurchaseAmount =>
                    $"Minimum purchase of {discount.RequirementValue:C} required.",
                DiscountRequirementType.MinimumQuantity =>
                    $"Minimum quantity of {discount.RequirementValue:N0} items required.",
                _ => "Minimum requirements not met."
            };

            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.MinimumRequirementNotMet,
                requirementMessage);
        }

        // Check for applicable products (for product-level discounts)
        if (discount.Category is DiscountCategory.AmountOffProducts or DiscountCategory.BuyXGetY)
        {
            var matchingItems = DiscountTargetMatcher.GetMatchingLineItems(
                context.LineItems, discount.TargetRules.ToList());
            if (matchingItems.Count == 0)
            {
                return DiscountValidationResult.Invalid(
                    DiscountValidationErrorCode.NoApplicableProducts,
                    "No products in your cart qualify for this discount.");
            }
        }

        // Check if already applied
        if (context.AppliedDiscountIds?.Contains(discount.Id) == true)
        {
            return DiscountValidationResult.Invalid(
                DiscountValidationErrorCode.AlreadyApplied,
                "This discount has already been applied.");
        }

        return DiscountValidationResult.Valid(discount);
    }

    private async Task<bool> CheckCustomerEligibilityAsync(
        Discount discount,
        DiscountContext context,
        CancellationToken ct)
    {
        if (discount.EligibilityRules.Count == 0)
        {
            return true;
        }

        foreach (var rule in discount.EligibilityRules)
        {
            var eligibilityIds = rule.GetEligibilityIdsList();

            switch (rule.EligibilityType)
            {
                case DiscountEligibilityType.AllCustomers:
                    return true;

                case DiscountEligibilityType.CustomerSegments:
                    if (context.CustomerSegmentIds != null &&
                        eligibilityIds.Any(id => context.CustomerSegmentIds.Contains(id)))
                    {
                        return true;
                    }
                    // Check via service if segment IDs not provided in context
                    if (context.CustomerId.HasValue)
                    {
                        foreach (var segmentId in eligibilityIds)
                        {
                            var isInSegment = await customerSegmentService.IsCustomerInSegmentAsync(
                                segmentId, context.CustomerId.Value, ct);
                            if (isInSegment)
                            {
                                return true;
                            }
                        }
                    }
                    break;

                case DiscountEligibilityType.SpecificCustomers:
                    if (context.CustomerId.HasValue && eligibilityIds.Contains(context.CustomerId.Value))
                    {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    private bool CheckMinimumRequirements(Discount discount, DiscountContext context)
    {
        if (discount.RequirementType == DiscountRequirementType.None)
        {
            return true;
        }

        // Get matching items for requirement check
        var targetRules = discount.TargetRules.ToList();
        var matchingItems = DiscountTargetMatcher.GetMatchingLineItems(context.LineItems, targetRules);

        return discount.RequirementType switch
        {
            DiscountRequirementType.MinimumPurchaseAmount =>
                matchingItems.Sum(i => i.LineTotal) >= (discount.RequirementValue ?? 0),
            DiscountRequirementType.MinimumQuantity =>
                matchingItems.Sum(i => i.Quantity) >= (discount.RequirementValue ?? 0),
            _ => true
        };
    }

    private DiscountCalculationResult CalculateAmountOffProducts(Discount discount, DiscountContext context)
    {
        var result = new DiscountCalculationResult
        {
            Success = true,
            Discount = discount
        };

        var matchingItems = DiscountTargetMatcher.GetMatchingLineItems(
            context.LineItems, discount.TargetRules.ToList());

        if (matchingItems.Count == 0)
        {
            return result;
        }

        foreach (var item in matchingItems)
        {
            decimal discountPerUnit;
            if (discount.ValueType == Accounting.Models.DiscountValueType.Percentage)
            {
                discountPerUnit = currencyService.Round(item.UnitPrice * (discount.Value / 100m), context.CurrencyCode);
            }
            else if (discount.ValueType == Accounting.Models.DiscountValueType.FixedAmount)
            {
                discountPerUnit = Math.Min(discount.Value, item.UnitPrice);
            }
            else // Free
            {
                discountPerUnit = item.UnitPrice;
            }

            var totalDiscount = currencyService.Round(discountPerUnit * item.Quantity, context.CurrencyCode);

            result.DiscountedLineItems.Add(new DiscountedLineItem
            {
                LineItemId = item.LineItemId,
                ProductId = item.ProductId,
                DiscountedQuantity = item.Quantity,
                DiscountPerUnit = discountPerUnit,
                TotalDiscount = totalDiscount,
                OriginalUnitPrice = item.UnitPrice,
                DiscountedUnitPrice = item.UnitPrice - discountPerUnit
            });

            result.ProductDiscountAmount += totalDiscount;
        }

        result.TotalDiscountAmount = result.ProductDiscountAmount;
        return result;
    }

    private DiscountCalculationResult CalculateBuyXGetY(Discount discount, DiscountContext context)
    {
        if (discount.BuyXGetYConfig == null)
        {
            return DiscountCalculationResult.Failed("Buy X Get Y configuration is missing.");
        }

        return buyXGetYCalculator.Calculate(discount, context);
    }

    private DiscountCalculationResult CalculateAmountOffOrder(Discount discount, DiscountContext context)
    {
        var result = new DiscountCalculationResult
        {
            Success = true,
            Discount = discount
        };

        decimal orderDiscount;
        if (discount.ValueType == Accounting.Models.DiscountValueType.Percentage)
        {
            orderDiscount = currencyService.Round(context.SubTotal * (discount.Value / 100m), context.CurrencyCode);
        }
        else if (discount.ValueType == Accounting.Models.DiscountValueType.FixedAmount)
        {
            orderDiscount = Math.Min(discount.Value, context.SubTotal);
        }
        else // Free - not applicable for order discounts
        {
            orderDiscount = 0;
        }

        result.OrderDiscountAmount = orderDiscount;
        result.TotalDiscountAmount = orderDiscount;
        return result;
    }

    private DiscountCalculationResult CalculateFreeShipping(Discount discount, DiscountContext context)
    {
        var result = new DiscountCalculationResult
        {
            Success = true,
            Discount = discount
        };

        var config = discount.FreeShippingConfig;
        if (config == null)
        {
            // No config means free shipping applies to all
            result.ShippingDiscountAmount = context.ShippingTotal;
            result.TotalDiscountAmount = context.ShippingTotal;
            return result;
        }

        // Check country scope
        if (config.CountryScope != FreeShippingCountryScope.AllCountries && context.ShippingAddress != null)
        {
            var countryCodes = config.GetCountryCodesList();
            var addressCountry = context.ShippingAddress.CountryCode ?? string.Empty;

            if (config.CountryScope == FreeShippingCountryScope.SelectedCountries &&
                !countryCodes.Contains(addressCountry, StringComparer.OrdinalIgnoreCase))
            {
                return result; // Country not eligible
            }

            if (config.CountryScope == FreeShippingCountryScope.ExcludedCountries &&
                countryCodes.Contains(addressCountry, StringComparer.OrdinalIgnoreCase))
            {
                return result; // Country excluded
            }
        }

        // Check if shipping option is allowed
        if (context.SelectedShippingOptionId.HasValue)
        {
            var allowedOptions = config.GetAllowedShippingOptionIdsList();
            if (allowedOptions.Count > 0 && !allowedOptions.Contains(context.SelectedShippingOptionId.Value))
            {
                return result; // Shipping option not allowed
            }
        }

        // Check rate exclusion
        if (config.ExcludeRatesOverAmount && config.ExcludeRatesOverValue.HasValue)
        {
            if (context.ShippingTotal > config.ExcludeRatesOverValue.Value)
            {
                return result; // Rate too high
            }
        }

        result.ShippingDiscountAmount = context.ShippingTotal;
        result.TotalDiscountAmount = context.ShippingTotal;
        return result;
    }

    private bool CanCombineWithOthers(Discount discount)
    {
        return discount.CanCombineWithProductDiscounts ||
               discount.CanCombineWithOrderDiscounts ||
               discount.CanCombineWithShippingDiscounts;
    }

    /// <inheritdoc />
    public List<Discount> FilterCombinableDiscounts(List<Discount> discounts)
    {
        if (discounts.Count <= 1)
        {
            return discounts;
        }

        // Sort by priority (lower number = higher priority)
        var sortedDiscounts = discounts.OrderBy(d => d.Priority).ToList();

        var result = new List<Discount>();
        foreach (var discount in sortedDiscounts)
        {
            if (result.Count == 0)
            {
                result.Add(discount);
                continue;
            }

            // Check if this discount can combine with all already selected discounts
            var canCombineWithAll = result.All(existing => CanCombine(existing, discount));
            if (canCombineWithAll)
            {
                result.Add(discount);
            }
        }

        return result;
    }
}
