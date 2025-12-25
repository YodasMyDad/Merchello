using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.DiscountNotifications;
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
    IMerchelloNotificationPublisher notificationPublisher,
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
                // UsageCount ordering removed - usage is now derived from line items
                // and cannot be efficiently sorted at database level
                DiscountOrderBy.UsageCount => parameters.Descending
                    ? query.OrderByDescending(d => d.DateCreated)
                    : query.OrderBy(d => d.DateCreated),
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

        // Create discount
        var discount = discountFactory.Create(parameters);

        // Publish "Before" notification - handlers can modify or cancel
        var creatingNotification = new DiscountCreatingNotification(discount);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
        {
            result.AddErrorMessage(creatingNotification.CancelReason ?? "Discount creation cancelled.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();

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

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountCreatedNotification(discount), ct);

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

        // Publish "Before" notification - handlers can modify or cancel
        var savingNotification = new DiscountSavingNotification(discount);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, ct))
        {
            result.AddErrorMessage(savingNotification.CancelReason ?? "Discount update cancelled.");
            scope.Complete();
            return result;
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

        if (parameters.ApplyAfterTax.HasValue)
            discount.ApplyAfterTax = parameters.ApplyAfterTax.Value;

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

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountSavedNotification(discount), ct);

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

        // Publish "Before" notification - handlers can cancel
        var deletingNotification = new DiscountDeletingNotification(discount);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, ct))
        {
            result.AddErrorMessage(deletingNotification.CancelReason ?? "Discount deletion cancelled.");
            scope.Complete();
            return result;
        }

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Discounts.Remove(discount);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountDeletedNotification(discount), ct);

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

        var oldStatus = discount.Status;
        var newStatus = DiscountStatus.Active;

        // Publish "Before" notification - handlers can cancel
        var statusChangingNotification = new DiscountStatusChangingNotification(discount, oldStatus, newStatus);
        if (await notificationPublisher.PublishCancelableAsync(statusChangingNotification, ct))
        {
            result.AddErrorMessage(statusChangingNotification.CancelReason ?? "Discount activation cancelled.");
            scope.Complete();
            return result;
        }

        discount.Status = newStatus;
        discount.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountStatusChangedNotification(discount, oldStatus, newStatus), ct);

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

        var oldStatus = discount.Status;
        var newStatus = DiscountStatus.Disabled;

        // Publish "Before" notification - handlers can cancel
        var statusChangingNotification = new DiscountStatusChangingNotification(discount, oldStatus, newStatus);
        if (await notificationPublisher.PublishCancelableAsync(statusChangingNotification, ct))
        {
            result.AddErrorMessage(statusChangingNotification.CancelReason ?? "Discount deactivation cancelled.");
            scope.Complete();
            return result;
        }

        discount.Status = newStatus;
        discount.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<Task>(async db => await db.SaveChangesAsync(ct));
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountStatusChangedNotification(discount, oldStatus, newStatus), ct);

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
    public async Task<int> GetUsageCountAsync(Guid discountId, CancellationToken ct = default)
    {
        var discountIdString = discountId.ToString();

        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            // Query discount line items from valid invoices
            var discountLineItems = await db.LineItems
                .Include(li => li.Order)
                    .ThenInclude(o => o!.Invoice)
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Where(li => li.Order != null && li.Order.Invoice != null)
                .Where(li => !li.Order!.Invoice!.IsDeleted && !li.Order.Invoice.IsCancelled)
                .ToListAsync(ct);

            // Filter to specific discount and count unique invoices
            return discountLineItems
                .Where(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                             && id?.ToString() == discountIdString)
                .Select(li => li.Order!.InvoiceId)
                .Distinct()
                .Count();
        });
        scope.Complete();
        return count;
    }

    /// <inheritdoc />
    public async Task<Dictionary<Guid, int>> GetUsageCountsAsync(List<Guid> discountIds, CancellationToken ct = default)
    {
        if (discountIds.Count == 0)
        {
            return [];
        }

        var discountIdStrings = discountIds.Select(id => id.ToString()).ToHashSet();

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Query discount line items from valid invoices
            var discountLineItems = await db.LineItems
                .Include(li => li.Order)
                    .ThenInclude(o => o!.Invoice)
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Where(li => li.Order != null && li.Order.Invoice != null)
                .Where(li => !li.Order!.Invoice!.IsDeleted && !li.Order.Invoice.IsCancelled)
                .ToListAsync(ct);

            // Filter to requested discounts and count unique invoices per discount
            var usageCounts = discountLineItems
                .Where(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                             && discountIdStrings.Contains(id?.ToString() ?? ""))
                .GroupBy(li => li.ExtendedData[Constants.ExtendedDataKeys.DiscountId]?.ToString() ?? "")
                .ToDictionary(
                    g => Guid.Parse(g.Key),
                    g => g.Select(li => li.Order!.InvoiceId).Distinct().Count()
                );

            // Ensure all requested IDs are in the result (with 0 if no usage)
            foreach (var id in discountIds)
            {
                usageCounts.TryAdd(id, 0);
            }

            return usageCounts;
        });
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<int> GetCustomerUsageCountAsync(Guid discountId, Guid customerId, CancellationToken ct = default)
    {
        var discountIdString = discountId.ToString();

        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            // Query discount line items from valid invoices for this customer
            var discountLineItems = await db.LineItems
                .Include(li => li.Order)
                    .ThenInclude(o => o!.Invoice)
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Where(li => li.Order != null && li.Order.Invoice != null)
                .Where(li => !li.Order!.Invoice!.IsDeleted && !li.Order.Invoice.IsCancelled)
                .Where(li => li.Order!.Invoice!.CustomerId == customerId)
                .ToListAsync(ct);

            // Filter to specific discount and count unique invoices
            return discountLineItems
                .Where(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                             && id?.ToString() == discountIdString)
                .Select(li => li.Order!.InvoiceId)
                .Distinct()
                .Count();
        });
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
        var discountIdString = discountId.ToString();

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

            // Get all discount line items from valid invoices
            var allDiscountLineItems = await db.LineItems
                .Include(li => li.Order)
                    .ThenInclude(o => o!.Invoice)
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Where(li => li.Order != null && li.Order.Invoice != null)
                .Where(li => !li.Order!.Invoice!.IsDeleted && !li.Order.Invoice.IsCancelled)
                .ToListAsync(ct);

            // Filter to this specific discount
            var usageItems = allDiscountLineItems
                .Where(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                             && id?.ToString() == discountIdString)
                .ToList();

            // Group by invoice to get unique usage instances
            var usageByInvoice = usageItems
                .GroupBy(li => li.Order!.InvoiceId)
                .Select(g => new
                {
                    InvoiceId = g.Key,
                    Invoice = g.First().Order!.Invoice!,
                    DiscountAmount = Math.Abs(g.Sum(li => (li.AmountInStoreCurrency ?? li.Amount) * li.Quantity)),
                    DateUsed = g.First().Order!.Invoice!.DateCreated
                })
                .ToList();

            var totalUsageCount = usageByInvoice.Count;
            var uniqueCustomers = usageByInvoice.Select(u => u.Invoice.CustomerId).Distinct().Count();
            var totalDiscountAmount = usageByInvoice.Sum(u => u.DiscountAmount);

            var averageDiscountPerUse = totalUsageCount > 0
                ? totalDiscountAmount / totalUsageCount
                : 0;

            // Calculate remaining uses
            int? remainingUses = null;
            if (discount.TotalUsageLimit.HasValue)
            {
                remainingUses = Math.Max(0, discount.TotalUsageLimit.Value - totalUsageCount);
            }

            // Calculate order revenue from invoices that used this discount
            var totalOrderRevenue = usageByInvoice.Sum(u => u.Invoice.TotalInStoreCurrency ?? u.Invoice.Total);
            var orderCount = usageByInvoice.Count;

            var averageOrderValue = orderCount > 0
                ? totalOrderRevenue / orderCount
                : 0;

            // Timeline data
            DateTime? firstUsed = usageByInvoice.Count > 0
                ? usageByInvoice.Min(u => u.DateUsed)
                : null;

            DateTime? lastUsed = usageByInvoice.Count > 0
                ? usageByInvoice.Max(u => u.DateUsed)
                : null;

            // Usage by date (within range)
            var usageByDate = usageByInvoice
                .Where(u => u.DateUsed >= effectiveStartDate && u.DateUsed <= effectiveEndDate)
                .GroupBy(u => u.DateUsed.Date)
                .Select(g => new Dtos.UsageByDateDto
                {
                    Date = g.Key,
                    UsageCount = g.Count(),
                    DiscountAmount = g.Sum(u => u.DiscountAmount)
                })
                .OrderBy(d => d.Date)
                .ToList();

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
            // Get all discounts matching filters
            var discountQuery = db.Discounts.AsNoTracking().AsQueryable();

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

            var discounts = await discountQuery.ToListAsync(ct);
            var discountIds = discounts.Select(d => d.Id.ToString()).ToHashSet();

            // Get all discount line items from valid invoices
            var lineItemQuery = db.LineItems
                .Include(li => li.Order)
                    .ThenInclude(o => o!.Invoice)
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Where(li => li.Order != null && li.Order.Invoice != null)
                .Where(li => !li.Order!.Invoice!.IsDeleted && !li.Order.Invoice.IsCancelled);

            // Apply date filters
            if (parameters.StartDate.HasValue)
            {
                lineItemQuery = lineItemQuery.Where(li => li.Order!.Invoice!.DateCreated >= parameters.StartDate.Value);
            }

            if (parameters.EndDate.HasValue)
            {
                lineItemQuery = lineItemQuery.Where(li => li.Order!.Invoice!.DateCreated <= parameters.EndDate.Value);
            }

            var allDiscountLineItems = await lineItemQuery.ToListAsync(ct);

            // Filter to only the discounts we care about and group by discount
            var usageByDiscount = allDiscountLineItems
                .Where(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                             && discountIds.Contains(id?.ToString() ?? ""))
                .GroupBy(li => li.ExtendedData[Constants.ExtendedDataKeys.DiscountId]?.ToString() ?? "")
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var usageByInvoice = g
                            .GroupBy(li => li.Order!.InvoiceId)
                            .Select(ig => new
                            {
                                InvoiceId = ig.Key,
                                Invoice = ig.First().Order!.Invoice!,
                                DiscountAmount = Math.Abs(ig.Sum(li => (li.AmountInStoreCurrency ?? li.Amount) * li.Quantity)),
                                DateUsed = ig.First().Order!.Invoice!.DateCreated
                            })
                            .ToList();

                        return new
                        {
                            UsageCount = usageByInvoice.Count,
                            UniqueCustomers = usageByInvoice.Select(u => u.Invoice.CustomerId).Distinct().Count(),
                            TotalAmount = usageByInvoice.Sum(u => u.DiscountAmount),
                            FirstUsed = usageByInvoice.Count > 0 ? usageByInvoice.Min(u => u.DateUsed) : (DateTime?)null,
                            LastUsed = usageByInvoice.Count > 0 ? usageByInvoice.Max(u => u.DateUsed) : (DateTime?)null
                        };
                    });

            // Build summary for all discounts (including those with no usage)
            var summaries = discounts.Select(d =>
            {
                var discountIdStr = d.Id.ToString();
                var hasUsage = usageByDiscount.TryGetValue(discountIdStr, out var usage);

                return new Dtos.DiscountUsageSummaryDto
                {
                    DiscountId = d.Id,
                    Name = d.Name,
                    Code = d.Code,
                    Status = d.Status,
                    Category = d.Category,
                    TotalUsageCount = hasUsage ? usage!.UsageCount : 0,
                    UniqueCustomersCount = hasUsage ? usage!.UniqueCustomers : 0,
                    TotalDiscountAmount = hasUsage ? usage!.TotalAmount : 0,
                    AverageDiscountPerUse = hasUsage && usage!.UsageCount > 0
                        ? usage.TotalAmount / usage.UsageCount
                        : 0,
                    FirstUsed = hasUsage ? usage!.FirstUsed : null,
                    LastUsed = hasUsage ? usage!.LastUsed : null
                };
            }).ToList();

            // Apply ordering
            summaries = parameters.OrderBy switch
            {
                DiscountReportOrderBy.TotalUsage => parameters.Descending
                    ? summaries.OrderByDescending(s => s.TotalUsageCount).ToList()
                    : summaries.OrderBy(s => s.TotalUsageCount).ToList(),
                DiscountReportOrderBy.TotalDiscountAmount => parameters.Descending
                    ? summaries.OrderByDescending(s => s.TotalDiscountAmount).ToList()
                    : summaries.OrderBy(s => s.TotalDiscountAmount).ToList(),
                DiscountReportOrderBy.UniqueCustomers => parameters.Descending
                    ? summaries.OrderByDescending(s => s.UniqueCustomersCount).ToList()
                    : summaries.OrderBy(s => s.UniqueCustomersCount).ToList(),
                DiscountReportOrderBy.Name => parameters.Descending
                    ? summaries.OrderByDescending(s => s.Name).ToList()
                    : summaries.OrderBy(s => s.Name).ToList(),
                _ => parameters.Descending
                    ? summaries.OrderByDescending(s => s.TotalUsageCount).ToList()
                    : summaries.OrderBy(s => s.TotalUsageCount).ToList()
            };

            // Apply top limit
            if (parameters.Top.HasValue)
            {
                summaries = summaries.Take(parameters.Top.Value).ToList();
            }

            return summaries;
        });

        scope.Complete();
        return result;
    }

    #endregion
}
