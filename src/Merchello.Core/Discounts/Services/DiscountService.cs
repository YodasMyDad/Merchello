using Merchello.Core.Data;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Service for managing discounts.
/// </summary>
public class DiscountService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    DiscountFactory discountFactory,
    ILogger<DiscountService> logger) : IDiscountService
{
    private const string CodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    #region CRUD Operations

    /// <inheritdoc />
    public async Task<PaginatedList<Discount>> QueryAsync(DiscountQueryParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Discounts
                .AsNoTracking()
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .AsQueryable();

            // Apply filters
            if (parameters.Status.HasValue)
            {
                query = query.Where(d => d.Status == parameters.Status.Value);
            }

            if (parameters.Category.HasValue)
            {
                query = query.Where(d => d.Category == parameters.Category.Value);
            }

            if (parameters.Method.HasValue)
            {
                query = query.Where(d => d.Method == parameters.Method.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var search = parameters.SearchTerm.Trim().ToLowerInvariant();
                query = query.Where(d =>
                    d.Name.ToLower().Contains(search) ||
                    (d.Code != null && d.Code.ToLower().Contains(search)));
            }

            // Apply ordering
            query = parameters.OrderBy switch
            {
                DiscountOrderBy.Name => parameters.Descending
                    ? query.OrderByDescending(d => d.Name)
                    : query.OrderBy(d => d.Name),
                DiscountOrderBy.StartsAt => parameters.Descending
                    ? query.OrderByDescending(d => d.StartsAt)
                    : query.OrderBy(d => d.StartsAt),
                DiscountOrderBy.EndsAt => parameters.Descending
                    ? query.OrderByDescending(d => d.EndsAt)
                    : query.OrderBy(d => d.EndsAt),
                DiscountOrderBy.UsageCount => parameters.Descending
                    ? query.OrderByDescending(d => d.CurrentUsageCount)
                    : query.OrderBy(d => d.CurrentUsageCount),
                DiscountOrderBy.Priority => parameters.Descending
                    ? query.OrderByDescending(d => d.Priority)
                    : query.OrderBy(d => d.Priority),
                _ => parameters.Descending
                    ? query.OrderByDescending(d => d.DateCreated)
                    : query.OrderBy(d => d.DateCreated)
            };

            // Get total count
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            return new PaginatedList<Discount>(items, totalCount, parameters.Page, parameters.PageSize);
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<Discount?> GetByIdAsync(Guid discountId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .AsNoTracking()
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .Include(d => d.BuyXGetYConfig)
                .Include(d => d.FreeShippingConfig)
                .FirstOrDefaultAsync(d => d.Id == discountId, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<Discount?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .AsNoTracking()
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .Include(d => d.BuyXGetYConfig)
                .Include(d => d.FreeShippingConfig)
                .FirstOrDefaultAsync(d => d.Code == normalizedCode, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Discount>> CreateAsync(CreateDiscountParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<Discount>();

        // Validate name
        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.AddErrorMessage("Discount name is required.");
            return result;
        }

        // Validate code for code-based discounts
        if (parameters.Method == DiscountMethod.Code)
        {
            if (string.IsNullOrWhiteSpace(parameters.Code))
            {
                result.AddErrorMessage("Discount code is required for code-based discounts.");
                return result;
            }

            var codeAvailable = await IsCodeAvailableAsync(parameters.Code, null, ct);
            if (!codeAvailable)
            {
                result.AddErrorMessage($"Discount code '{parameters.Code}' is already in use.");
                return result;
            }
        }

        // Validate value
        if (parameters.Value <= 0)
        {
            result.AddErrorMessage("Discount value must be greater than zero.");
            return result;
        }

        // Validate percentage doesn't exceed 100
        if (parameters.ValueType == Accounting.Models.DiscountValueType.Percentage && parameters.Value > 100)
        {
            result.AddErrorMessage("Percentage discount cannot exceed 100%.");
            return result;
        }

        // Validate date range
        if (parameters.EndsAt.HasValue && parameters.StartsAt.HasValue && parameters.EndsAt < parameters.StartsAt)
        {
            result.AddErrorMessage("End date must be after start date.");
            return result;
        }

        // Validate BOGO config
        if (parameters.Category == DiscountCategory.BuyXGetY && parameters.BuyXGetYConfig == null)
        {
            result.AddErrorMessage("Buy X Get Y configuration is required for BOGO discounts.");
            return result;
        }

        // Validate Free Shipping config
        if (parameters.Category == DiscountCategory.FreeShipping && parameters.FreeShippingConfig == null)
        {
            result.AddErrorMessage("Free shipping configuration is required for free shipping discounts.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();

        // Create discount
        var discount = discountFactory.Create(parameters);

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Discounts.Add(discount);

            // Add target rules
            if (parameters.TargetRules != null)
            {
                foreach (var ruleParams in parameters.TargetRules)
                {
                    var rule = discountFactory.CreateTargetRule(discount.Id, ruleParams);
                    db.DiscountTargetRules.Add(rule);
                }
            }

            // Add eligibility rules
            if (parameters.EligibilityRules != null)
            {
                foreach (var ruleParams in parameters.EligibilityRules)
                {
                    var rule = discountFactory.CreateEligibilityRule(discount.Id, ruleParams);
                    db.DiscountEligibilityRules.Add(rule);
                }
            }

            // Add BOGO config
            if (parameters.Category == DiscountCategory.BuyXGetY && parameters.BuyXGetYConfig != null)
            {
                var bogoConfig = discountFactory.CreateBuyXGetYConfig(discount.Id, parameters.BuyXGetYConfig);
                db.DiscountBuyXGetYConfigs.Add(bogoConfig);
            }

            // Add Free Shipping config
            if (parameters.Category == DiscountCategory.FreeShipping && parameters.FreeShippingConfig != null)
            {
                var shippingConfig = discountFactory.CreateFreeShippingConfig(discount.Id, parameters.FreeShippingConfig);
                db.DiscountFreeShippingConfigs.Add(shippingConfig);
            }

            await db.SaveChangesAsync(ct);
        });

        scope.Complete();

        result.ResultObject = discount;
        result.AddSuccessMessage($"Discount '{discount.Name}' created successfully.");
        logger.LogInformation("Created discount {DiscountId} - {DiscountName}", discount.Id, discount.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Discount>> UpdateAsync(Guid discountId, UpdateDiscountParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<Discount>();

        using var scope = efCoreScopeProvider.CreateScope();
        var discount = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .Include(d => d.BuyXGetYConfig)
                .Include(d => d.FreeShippingConfig)
                .FirstOrDefaultAsync(d => d.Id == discountId, ct));

        if (discount == null)
        {
            result.AddErrorMessage("Discount not found.");
            scope.Complete();
            return result;
        }

        // Validate code uniqueness if changing
        if (parameters.Code != null && parameters.Code != discount.Code)
        {
            var codeAvailable = await IsCodeAvailableAsync(parameters.Code, discountId, ct);
            if (!codeAvailable)
            {
                result.AddErrorMessage($"Discount code '{parameters.Code}' is already in use.");
                scope.Complete();
                return result;
            }
        }

        // Update basic properties
        if (parameters.Name != null)
            discount.Name = parameters.Name.Trim();

        if (parameters.Description != null)
            discount.Description = parameters.Description.Trim();

        if (parameters.Code != null && discount.Method == DiscountMethod.Code)
            discount.Code = parameters.Code.Trim().ToUpperInvariant();

        if (parameters.ValueType.HasValue)
            discount.ValueType = parameters.ValueType.Value;

        if (parameters.Value.HasValue)
            discount.Value = parameters.Value.Value;

        if (parameters.StartsAt.HasValue)
            discount.StartsAt = parameters.StartsAt.Value;

        if (parameters.EndsAt.HasValue)
            discount.EndsAt = parameters.EndsAt.Value;
        else if (parameters.ClearEndsAt)
            discount.EndsAt = null;

        if (parameters.Timezone != null)
            discount.Timezone = parameters.Timezone;

        if (parameters.TotalUsageLimit.HasValue)
            discount.TotalUsageLimit = parameters.TotalUsageLimit.Value;
        else if (parameters.ClearTotalUsageLimit)
            discount.TotalUsageLimit = null;

        if (parameters.PerCustomerUsageLimit.HasValue)
            discount.PerCustomerUsageLimit = parameters.PerCustomerUsageLimit.Value;
        else if (parameters.ClearPerCustomerUsageLimit)
            discount.PerCustomerUsageLimit = null;

        if (parameters.PerOrderUsageLimit.HasValue)
            discount.PerOrderUsageLimit = parameters.PerOrderUsageLimit.Value;
        else if (parameters.ClearPerOrderUsageLimit)
            discount.PerOrderUsageLimit = null;

        if (parameters.RequirementType.HasValue)
            discount.RequirementType = parameters.RequirementType.Value;

        if (parameters.RequirementValue.HasValue)
            discount.RequirementValue = parameters.RequirementValue.Value;

        if (parameters.CanCombineWithProductDiscounts.HasValue)
            discount.CanCombineWithProductDiscounts = parameters.CanCombineWithProductDiscounts.Value;

        if (parameters.CanCombineWithOrderDiscounts.HasValue)
            discount.CanCombineWithOrderDiscounts = parameters.CanCombineWithOrderDiscounts.Value;

        if (parameters.CanCombineWithShippingDiscounts.HasValue)
            discount.CanCombineWithShippingDiscounts = parameters.CanCombineWithShippingDiscounts.Value;

        if (parameters.Priority.HasValue)
            discount.Priority = parameters.Priority.Value;

        discount.DateUpdated = DateTime.UtcNow;

        // Update target rules if provided
        if (parameters.TargetRules != null)
        {
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                db.DiscountTargetRules.RemoveRange(discount.TargetRules);
                foreach (var ruleParams in parameters.TargetRules)
                {
                    var rule = discountFactory.CreateTargetRule(discount.Id, ruleParams);
                    db.DiscountTargetRules.Add(rule);
                }
            });
        }

        // Update eligibility rules if provided
        if (parameters.EligibilityRules != null)
        {
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                db.DiscountEligibilityRules.RemoveRange(discount.EligibilityRules);
                foreach (var ruleParams in parameters.EligibilityRules)
                {
                    var rule = discountFactory.CreateEligibilityRule(discount.Id, ruleParams);
                    db.DiscountEligibilityRules.Add(rule);
                }
            });
        }

        // Update BOGO config if provided
        if (parameters.BuyXGetYConfig != null && discount.Category == DiscountCategory.BuyXGetY)
        {
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                if (discount.BuyXGetYConfig != null)
                {
                    db.DiscountBuyXGetYConfigs.Remove(discount.BuyXGetYConfig);
                }
                var bogoConfig = discountFactory.CreateBuyXGetYConfig(discount.Id, parameters.BuyXGetYConfig);
                db.DiscountBuyXGetYConfigs.Add(bogoConfig);
            });
        }

        // Update Free Shipping config if provided
        if (parameters.FreeShippingConfig != null && discount.Category == DiscountCategory.FreeShipping)
        {
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                if (discount.FreeShippingConfig != null)
                {
                    db.DiscountFreeShippingConfigs.Remove(discount.FreeShippingConfig);
                }
                var shippingConfig = discountFactory.CreateFreeShippingConfig(discount.Id, parameters.FreeShippingConfig);
                db.DiscountFreeShippingConfigs.Add(shippingConfig);
            });
        }

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        result.ResultObject = discount;
        result.AddSuccessMessage($"Discount '{discount.Name}' updated successfully.");
        logger.LogInformation("Updated discount {DiscountId} - {DiscountName}", discount.Id, discount.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteAsync(Guid discountId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        var discount = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts.FirstOrDefaultAsync(d => d.Id == discountId, ct));

        if (discount == null)
        {
            result.AddErrorMessage("Discount not found.");
            scope.Complete();
            return result;
        }

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Discounts.Remove(discount);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        result.ResultObject = true;
        result.AddSuccessMessage($"Discount '{discount.Name}' deleted successfully.");
        logger.LogInformation("Deleted discount {DiscountId} - {DiscountName}", discountId, discount.Name);

        return result;
    }

    #endregion

    #region Bulk Operations

    /// <inheritdoc />
    public async Task<List<Discount>> GetActiveAutomaticDiscountsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .AsNoTracking()
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .Include(d => d.BuyXGetYConfig)
                .Include(d => d.FreeShippingConfig)
                .Where(d =>
                    d.Method == DiscountMethod.Automatic &&
                    d.Status == DiscountStatus.Active &&
                    d.StartsAt <= now &&
                    (d.EndsAt == null || d.EndsAt >= now))
                .OrderBy(d => d.Priority)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<Discount>> GetByIdsAsync(List<Guid> discountIds, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts
                .AsNoTracking()
                .Include(d => d.TargetRules)
                .Include(d => d.EligibilityRules)
                .Include(d => d.BuyXGetYConfig)
                .Include(d => d.FreeShippingConfig)
                .Where(d => discountIds.Contains(d.Id))
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    #endregion

    #region Status Management

    /// <inheritdoc />
    public async Task<CrudResult<Discount>> ActivateAsync(Guid discountId, CancellationToken ct = default)
    {
        var result = new CrudResult<Discount>();

        using var scope = efCoreScopeProvider.CreateScope();
        var discount = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts.FirstOrDefaultAsync(d => d.Id == discountId, ct));

        if (discount == null)
        {
            result.AddErrorMessage("Discount not found.");
            scope.Complete();
            return result;
        }

        discount.Status = DiscountStatus.Active;
        discount.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        result.ResultObject = discount;
        result.AddSuccessMessage($"Discount '{discount.Name}' activated.");
        logger.LogInformation("Activated discount {DiscountId}", discountId);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Discount>> DeactivateAsync(Guid discountId, CancellationToken ct = default)
    {
        var result = new CrudResult<Discount>();

        using var scope = efCoreScopeProvider.CreateScope();
        var discount = await scope.ExecuteWithContextAsync(async db =>
            await db.Discounts.FirstOrDefaultAsync(d => d.Id == discountId, ct));

        if (discount == null)
        {
            result.AddErrorMessage("Discount not found.");
            scope.Complete();
            return result;
        }

        discount.Status = DiscountStatus.Disabled;
        discount.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        result.ResultObject = discount;
        result.AddSuccessMessage($"Discount '{discount.Name}' deactivated.");
        logger.LogInformation("Deactivated discount {DiscountId}", discountId);

        return result;
    }

    /// <inheritdoc />
    public async Task UpdateExpiredDiscountsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Expire discounts that have passed their end date
            var expiredDiscounts = await db.Discounts
                .Where(d =>
                    d.Status == DiscountStatus.Active &&
                    d.EndsAt.HasValue &&
                    d.EndsAt < now)
                .ToListAsync(ct);

            foreach (var discount in expiredDiscounts)
            {
                discount.Status = DiscountStatus.Expired;
                discount.DateUpdated = now;
            }

            // Activate scheduled discounts that have reached their start date
            var scheduledDiscounts = await db.Discounts
                .Where(d =>
                    d.Status == DiscountStatus.Scheduled &&
                    d.StartsAt <= now)
                .ToListAsync(ct);

            foreach (var discount in scheduledDiscounts)
            {
                discount.Status = DiscountStatus.Active;
                discount.DateUpdated = now;
            }

            if (expiredDiscounts.Count > 0 || scheduledDiscounts.Count > 0)
            {
                await db.SaveChangesAsync(ct);
                logger.LogInformation(
                    "Discount status update: {ExpiredCount} expired, {ActivatedCount} activated",
                    expiredDiscounts.Count,
                    scheduledDiscounts.Count);
            }
        });

        scope.Complete();
    }

    #endregion

    #region Code Generation & Validation

    /// <inheritdoc />
    public string GenerateUniqueCode(int length = 8)
    {
        var code = new char[length];
        for (var i = 0; i < length; i++)
        {
            code[i] = CodeChars[Random.Shared.Next(CodeChars.Length)];
        }
        return new string(code);
    }

    /// <inheritdoc />
    public async Task<bool> IsCodeAvailableAsync(string code, Guid? excludeDiscountId = null, CancellationToken ct = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Discounts.Where(d => d.Code == normalizedCode);
            if (excludeDiscountId.HasValue)
            {
                query = query.Where(d => d.Id != excludeDiscountId.Value);
            }
            return await query.AnyAsync(ct);
        });
        scope.Complete();
        return !exists;
    }

    #endregion

    #region Usage Tracking

    /// <inheritdoc />
    public async Task<DiscountUsage> RecordUsageAsync(
        Guid discountId,
        Guid invoiceId,
        Guid? customerId,
        decimal discountAmount,
        decimal discountAmountInStoreCurrency,
        string currencyCode,
        CancellationToken ct = default)
    {
        var usage = discountFactory.CreateUsage(
            discountId,
            invoiceId,
            customerId,
            discountAmount,
            discountAmountInStoreCurrency,
            currencyCode);

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.DiscountUsages.Add(usage);

            // Increment usage count
            var discount = await db.Discounts.FirstOrDefaultAsync(d => d.Id == discountId, ct);
            if (discount != null)
            {
                discount.CurrentUsageCount++;
                discount.DateUpdated = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        logger.LogInformation(
            "Recorded usage for discount {DiscountId} on invoice {InvoiceId}",
            discountId,
            invoiceId);

        return usage;
    }

    /// <inheritdoc />
    public async Task<int> GetUsageCountAsync(Guid discountId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.DiscountUsages.CountAsync(u => u.DiscountId == discountId, ct));
        scope.Complete();
        return count;
    }

    /// <inheritdoc />
    public async Task<int> GetCustomerUsageCountAsync(Guid discountId, Guid customerId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.DiscountUsages.CountAsync(u =>
                u.DiscountId == discountId &&
                u.CustomerId == customerId, ct));
        scope.Complete();
        return count;
    }

    #endregion

    #region Reporting

    /// <inheritdoc />
    public async Task<Dtos.DiscountPerformanceDto?> GetPerformanceAsync(
        Guid discountId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get discount
            var discount = await db.Discounts
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == discountId, ct);

            if (discount == null)
            {
                return null;
            }

            // Default date range: last 30 days
            var effectiveEndDate = endDate ?? DateTime.UtcNow;
            var effectiveStartDate = startDate ?? effectiveEndDate.AddDays(-30);

            // Get usage data - query at database level to avoid loading all usages into memory
            var baseQuery = db.DiscountUsages
                .AsNoTracking()
                .Where(u => u.DiscountId == discountId);

            // Calculate aggregate totals at database level
            var totalUsageCount = await baseQuery.CountAsync(ct);
            var uniqueCustomers = await baseQuery
                .Where(u => u.CustomerId.HasValue)
                .Select(u => u.CustomerId)
                .Distinct()
                .CountAsync(ct);

            var totalDiscountAmount = await baseQuery
                .SumAsync(u => (decimal?)u.DiscountAmountInStoreCurrency, ct) ?? 0m;

            var averageDiscountPerUse = totalUsageCount > 0
                ? totalDiscountAmount / totalUsageCount
                : 0;

            // Calculate remaining uses
            int? remainingUses = null;
            if (discount.TotalUsageLimit.HasValue)
            {
                remainingUses = Math.Max(0, discount.TotalUsageLimit.Value - totalUsageCount);
            }

            // Get order revenue from invoices that used this discount
            var invoiceIds = await baseQuery
                .Select(u => u.InvoiceId)
                .Distinct()
                .ToListAsync(ct);

            var totalOrderRevenue = 0m;
            var orderCount = 0;

            if (invoiceIds.Count > 0)
            {
                var invoices = await db.Invoices
                    .AsNoTracking()
                    .Where(i => invoiceIds.Contains(i.Id))
                    .Select(i => new { i.Total })
                    .ToListAsync(ct);

                totalOrderRevenue = invoices.Sum(i => i.Total);
                orderCount = invoices.Count;
            }

            var averageOrderValue = orderCount > 0
                ? totalOrderRevenue / orderCount
                : 0;

            // Timeline data - query at database level
            DateTime? firstUsed = await baseQuery
                .OrderBy(u => u.DateUsed)
                .Select(u => (DateTime?)u.DateUsed)
                .FirstOrDefaultAsync(ct);

            DateTime? lastUsed = await baseQuery
                .OrderByDescending(u => u.DateUsed)
                .Select(u => (DateTime?)u.DateUsed)
                .FirstOrDefaultAsync(ct);

            // Usage by date (within range) - query only the date range from database
            var usageByDate = await baseQuery
                .Where(u => u.DateUsed >= effectiveStartDate && u.DateUsed <= effectiveEndDate)
                .GroupBy(u => u.DateUsed.Date)
                .Select(g => new Dtos.UsageByDateDto
                {
                    Date = g.Key,
                    UsageCount = g.Count(),
                    DiscountAmount = g.Sum(u => u.DiscountAmountInStoreCurrency)
                })
                .OrderBy(d => d.Date)
                .ToListAsync(ct);

            return new Dtos.DiscountPerformanceDto
            {
                DiscountId = discountId,
                Name = discount.Name,
                Code = discount.Code,
                TotalUsageCount = totalUsageCount,
                UniqueCustomersCount = uniqueCustomers,
                RemainingUses = remainingUses,
                TotalDiscountAmount = totalDiscountAmount,
                AverageDiscountPerUse = averageDiscountPerUse,
                TotalOrderRevenue = totalOrderRevenue,
                AverageOrderValue = averageOrderValue,
                FirstUsed = firstUsed,
                LastUsed = lastUsed,
                UsageByDate = usageByDate
            };
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<Dtos.DiscountUsageSummaryDto>> GetUsageSummaryAsync(
        DiscountReportParameters parameters,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Base query for discounts
            var discountQuery = db.Discounts.AsNoTracking().AsQueryable();

            // Apply discount filters
            if (parameters.Status.HasValue)
            {
                discountQuery = discountQuery.Where(d => d.Status == parameters.Status.Value);
            }

            if (parameters.Category.HasValue)
            {
                discountQuery = discountQuery.Where(d => d.Category == parameters.Category.Value);
            }

            if (parameters.Method.HasValue)
            {
                discountQuery = discountQuery.Where(d => d.Method == parameters.Method.Value);
            }

            // Build usage summary query with left join to include discounts with no usages
            var summaryQuery = from d in discountQuery
                               join u in db.DiscountUsages on d.Id equals u.DiscountId into usages
                               from u in usages.DefaultIfEmpty()
                               where !parameters.StartDate.HasValue || u == null || u.DateUsed >= parameters.StartDate.Value
                               where !parameters.EndDate.HasValue || u == null || u.DateUsed <= parameters.EndDate.Value
                               group new { d, u } by new { d.Id, d.Name, d.Code, d.Status, d.Category } into g
                               select new Dtos.DiscountUsageSummaryDto
                               {
                                   DiscountId = g.Key.Id,
                                   Name = g.Key.Name,
                                   Code = g.Key.Code,
                                   Status = g.Key.Status,
                                   Category = g.Key.Category,
                                   TotalUsageCount = g.Count(x => x.u != null),
                                   UniqueCustomersCount = g.Where(x => x.u != null && x.u.CustomerId.HasValue)
                                       .Select(x => x.u!.CustomerId)
                                       .Distinct()
                                       .Count(),
                                   TotalDiscountAmount = g.Where(x => x.u != null)
                                       .Sum(x => x.u!.DiscountAmountInStoreCurrency),
                                   AverageDiscountPerUse = g.Count(x => x.u != null) > 0
                                       ? g.Where(x => x.u != null).Sum(x => x.u!.DiscountAmountInStoreCurrency) / g.Count(x => x.u != null)
                                       : 0,
                                   FirstUsed = g.Where(x => x.u != null).Min(x => (DateTime?)x.u!.DateUsed),
                                   LastUsed = g.Where(x => x.u != null).Max(x => (DateTime?)x.u!.DateUsed)
                               };

            // Apply ordering
            summaryQuery = parameters.OrderBy switch
            {
                DiscountReportOrderBy.TotalUsage => parameters.Descending
                    ? summaryQuery.OrderByDescending(s => s.TotalUsageCount)
                    : summaryQuery.OrderBy(s => s.TotalUsageCount),
                DiscountReportOrderBy.TotalDiscountAmount => parameters.Descending
                    ? summaryQuery.OrderByDescending(s => s.TotalDiscountAmount)
                    : summaryQuery.OrderBy(s => s.TotalDiscountAmount),
                DiscountReportOrderBy.UniqueCustomers => parameters.Descending
                    ? summaryQuery.OrderByDescending(s => s.UniqueCustomersCount)
                    : summaryQuery.OrderBy(s => s.UniqueCustomersCount),
                DiscountReportOrderBy.Name => parameters.Descending
                    ? summaryQuery.OrderByDescending(s => s.Name)
                    : summaryQuery.OrderBy(s => s.Name),
                _ => parameters.Descending
                    ? summaryQuery.OrderByDescending(s => s.TotalUsageCount)
                    : summaryQuery.OrderBy(s => s.TotalUsageCount)
            };

            // Apply top limit
            if (parameters.Top.HasValue)
            {
                summaryQuery = summaryQuery.Take(parameters.Top.Value);
            }

            return await summaryQuery.ToListAsync(ct);
        });

        scope.Complete();
        return result;
    }

    #endregion
}
