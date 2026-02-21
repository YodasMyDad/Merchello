using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.UpsellNotifications;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Upsells.Factories;
using Merchello.Core.Upsells.Extensions;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Service for managing upsell rules.
/// </summary>
public class UpsellService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    UpsellFactory upsellFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    IMemoryCache cache,
    IOptions<UpsellSettings> upsellSettings,
    ILogger<UpsellService> logger) : IUpsellService
{
    private static readonly string CacheKey = "merchello:upsells:active";
    private const int SqliteLockRetryAttempts = 4;
    private readonly UpsellSettings _settings = upsellSettings.Value;

    #region CRUD Operations

    /// <inheritdoc />
    public async Task<PaginatedList<UpsellRule>> QueryAsync(UpsellQueryParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.UpsellRules
                .AsNoTracking()
                .AsQueryable();

            if (parameters.Status.HasValue)
                query = query.Where(r => r.Status == parameters.Status.Value);

            if (parameters.DisplayLocation.HasValue)
                query = query.Where(r => (r.DisplayLocation & parameters.DisplayLocation.Value) != 0);

            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var search = parameters.SearchTerm.Trim().ToLowerInvariant();
                query = query.Where(r => r.Name.ToLower().Contains(search));
            }

            query = parameters.OrderBy switch
            {
                UpsellOrderBy.Name => parameters.Descending
                    ? query.OrderByDescending(r => r.Name)
                    : query.OrderBy(r => r.Name),
                UpsellOrderBy.Priority => parameters.Descending
                    ? query.OrderByDescending(r => r.Priority)
                    : query.OrderBy(r => r.Priority),
                UpsellOrderBy.Status => parameters.Descending
                    ? query.OrderByDescending(r => r.Status)
                    : query.OrderBy(r => r.Status),
                _ => parameters.Descending
                    ? query.OrderByDescending(r => r.DateCreated)
                    : query.OrderBy(r => r.DateCreated)
            };

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            return new PaginatedList<UpsellRule>(items, totalCount, parameters.Page, parameters.PageSize);
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<UpsellRule?> GetByIdAsync(Guid upsellRuleId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellRules
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == upsellRuleId, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<UpsellRule>> CreateAsync(CreateUpsellParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<UpsellRule>();

        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.AddErrorMessage("Upsell rule name is required.");
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.Heading))
        {
            result.AddErrorMessage("Upsell heading is required.");
            return result;
        }

        if (parameters.EndsAt.HasValue && parameters.StartsAt.HasValue && parameters.EndsAt < parameters.StartsAt)
        {
            result.AddErrorMessage("End date must be after start date.");
            return result;
        }

        var rule = upsellFactory.Create(parameters);

        var creatingNotification = new UpsellRuleCreatingNotification(rule);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
        {
            result.AddErrorMessage(creatingNotification.CancelReason ?? "Upsell rule creation cancelled.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.UpsellRules.Add(rule);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        InvalidateCache();

        await notificationPublisher.PublishAsync(new UpsellRuleCreatedNotification(rule), ct);

        result.ResultObject = rule;
        result.AddSuccessMessage($"Upsell rule '{rule.Name}' created successfully.");
        logger.LogInformation("Created upsell rule {UpsellRuleId} - {UpsellRuleName}", rule.Id, rule.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<UpsellRule>> UpdateAsync(Guid upsellRuleId, UpdateUpsellParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<UpsellRule>();

        using var scope = efCoreScopeProvider.CreateScope();
        var rule = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellRules.FirstOrDefaultAsync(r => r.Id == upsellRuleId, ct));

        if (rule == null)
        {
            result.AddErrorMessage("Upsell rule not found.");
            scope.Complete();
            return result;
        }

        // Publish cancelable notification
        var savingNotification = new UpsellRuleSavingNotification(rule);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, ct))
        {
            result.AddErrorMessage(savingNotification.CancelReason ?? "Upsell rule update cancelled.");
            scope.Complete();
            return result;
        }

        // Apply updates (null = keep existing)
        if (parameters.Name != null) rule.Name = parameters.Name.Trim();
        if (parameters.Description != null) rule.Description = parameters.Description.Trim();
        if (parameters.Heading != null) rule.Heading = parameters.Heading.Trim();
        if (parameters.Message != null) rule.Message = parameters.Message.Trim();
        if (parameters.Priority.HasValue) rule.Priority = parameters.Priority.Value;
        if (parameters.MaxProducts.HasValue) rule.MaxProducts = parameters.MaxProducts.Value;
        if (parameters.SortBy.HasValue) rule.SortBy = parameters.SortBy.Value;
        if (parameters.SuppressIfInCart.HasValue) rule.SuppressIfInCart = parameters.SuppressIfInCart.Value;
        if (parameters.DisplayLocation.HasValue) rule.DisplayLocation = parameters.DisplayLocation.Value;
        if (parameters.CheckoutMode.HasValue) rule.CheckoutMode = parameters.CheckoutMode.Value;
        if (parameters.DefaultChecked.HasValue) rule.DefaultChecked = parameters.DefaultChecked.Value;
        if (parameters.AutoAddToBasket.HasValue) rule.AutoAddToBasket = parameters.AutoAddToBasket.Value;
        if (parameters.StartsAt.HasValue) rule.StartsAt = parameters.StartsAt.Value;
        if (parameters.EndsAt.HasValue) rule.EndsAt = parameters.EndsAt.Value;
        if (parameters.ClearEndsAt) rule.EndsAt = null;
        if (parameters.Timezone != null) rule.Timezone = parameters.Timezone;
        if (parameters.DisplayStyles != null)
            rule.SetDisplayStyles(UpsellDisplayStylesSanitizer.Sanitize(parameters.DisplayStyles));
        if (parameters.ClearDisplayStyles)
            rule.SetDisplayStyles(null);

        if (parameters.TriggerRules != null)
        {
            var triggerRules = parameters.TriggerRules
                .Select(upsellFactory.CreateTriggerRule)
                .ToList();
            rule.SetTriggerRules(triggerRules);
        }

        if (parameters.RecommendationRules != null)
        {
            var recommendationRules = parameters.RecommendationRules
                .Select(upsellFactory.CreateRecommendationRule)
                .ToList();
            rule.SetRecommendationRules(recommendationRules);
        }

        if (parameters.EligibilityRules != null)
        {
            var eligibilityRules = parameters.EligibilityRules
                .Select(upsellFactory.CreateEligibilityRule)
                .ToList();
            rule.SetEligibilityRules(eligibilityRules);
        }

        rule.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        InvalidateCache();

        await notificationPublisher.PublishAsync(new UpsellRuleSavedNotification(rule), ct);

        result.ResultObject = rule;
        result.AddSuccessMessage($"Upsell rule '{rule.Name}' updated successfully.");
        logger.LogInformation("Updated upsell rule {UpsellRuleId} - {UpsellRuleName}", rule.Id, rule.Name);

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteAsync(Guid upsellRuleId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        var rule = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellRules.FirstOrDefaultAsync(r => r.Id == upsellRuleId, ct));

        if (rule == null)
        {
            result.AddErrorMessage("Upsell rule not found.");
            scope.Complete();
            return result;
        }

        var deletingNotification = new UpsellRuleDeletingNotification(rule);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, ct))
        {
            result.AddErrorMessage(deletingNotification.CancelReason ?? "Upsell rule deletion cancelled.");
            scope.Complete();
            return result;
        }

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.UpsellRules.Remove(rule);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        InvalidateCache();

        await notificationPublisher.PublishAsync(new UpsellRuleDeletedNotification(rule), ct);

        result.ResultObject = true;
        result.AddSuccessMessage($"Upsell rule '{rule.Name}' deleted successfully.");
        logger.LogInformation("Deleted upsell rule {UpsellRuleId} - {UpsellRuleName}", rule.Id, rule.Name);

        return result;
    }

    #endregion

    #region Status Management

    /// <inheritdoc />
    public async Task<CrudResult<UpsellRule>> ActivateAsync(Guid upsellRuleId, CancellationToken ct = default)
    {
        return await UpdateStatusAsync(
            upsellRuleId,
            (rule, now) => rule.StartsAt > now ? UpsellStatus.Scheduled : UpsellStatus.Active,
            rule => $"Upsell rule '{rule.Name}' activated.",
            (rule, previousStatus, newStatus) =>
                logger.LogInformation("Activated upsell rule {UpsellRuleId} from {OldStatus} to {NewStatus}",
                    rule.Id, previousStatus, newStatus),
            ct);
    }

    /// <inheritdoc />
    public async Task<CrudResult<UpsellRule>> DeactivateAsync(Guid upsellRuleId, CancellationToken ct = default)
    {
        return await UpdateStatusAsync(
            upsellRuleId,
            (_, _) => UpsellStatus.Disabled,
            rule => $"Upsell rule '{rule.Name}' deactivated.",
            (rule, _, _) => logger.LogInformation("Deactivated upsell rule {UpsellRuleId}", rule.Id),
            ct);
    }

    /// <inheritdoc />
    public async Task UpdateExpiredUpsellsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var changed = await ExecuteWithSqliteLockRetryAsync(async () =>
        {
            var changedInAttempt = false;
            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                // Transition Scheduled -> Active when StartsAt is reached
                var scheduledToActivate = await db.UpsellRules
                    .Where(r => r.Status == UpsellStatus.Scheduled && r.StartsAt <= now)
                    .ToListAsync(ct);

                foreach (var rule in scheduledToActivate)
                {
                    rule.Status = UpsellStatus.Active;
                    rule.DateUpdated = now;
                    changedInAttempt = true;
                    logger.LogInformation("Upsell rule {UpsellRuleId} transitioned from Scheduled to Active", rule.Id);
                }

                // Transition Active -> Expired when EndsAt is passed
                var activeToExpire = await db.UpsellRules
                    .Where(r => r.Status == UpsellStatus.Active && r.EndsAt.HasValue && r.EndsAt <= now)
                    .ToListAsync(ct);

                foreach (var rule in activeToExpire)
                {
                    rule.Status = UpsellStatus.Expired;
                    rule.DateUpdated = now;
                    changedInAttempt = true;
                    logger.LogInformation("Upsell rule {UpsellRuleId} transitioned from Active to Expired", rule.Id);
                }

                if (scheduledToActivate.Count > 0 || activeToExpire.Count > 0)
                {
                    await db.SaveChangesAsync(ct);
                }

                return true;
            });

            scope.Complete();
            return changedInAttempt;
        }, ct);

        if (changed)
            InvalidateCache();
    }

    #endregion

    #region Bulk Operations

    /// <inheritdoc />
    public async Task<List<UpsellRule>> GetActiveUpsellRulesAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out List<UpsellRule>? cached) && cached != null)
            return cached;

        using var scope = efCoreScopeProvider.CreateScope();
        var rules = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellRules
                .AsNoTracking()
                .Where(r => r.Status == UpsellStatus.Active)
                .OrderBy(r => r.Priority)
                .ToListAsync(ct));
        scope.Complete();

        cache.Set(CacheKey, rules, TimeSpan.FromSeconds(_settings.CacheDurationSeconds));
        return rules;
    }

    /// <inheritdoc />
    public async Task<List<UpsellRule>> GetActiveUpsellRulesForLocationAsync(UpsellDisplayLocation location, CancellationToken ct = default)
    {
        var activeRules = await GetActiveUpsellRulesAsync(ct);
        return activeRules
            .Where(r => (r.DisplayLocation & location) != 0)
            .ToList();
    }

    private async Task<CrudResult<UpsellRule>> UpdateStatusAsync(
        Guid upsellRuleId,
        Func<UpsellRule, DateTime, UpsellStatus> resolveStatus,
        Func<UpsellRule, string> successMessageFactory,
        Action<UpsellRule, UpsellStatus, UpsellStatus> logAction,
        CancellationToken ct)
    {
        var result = new CrudResult<UpsellRule>();

        using var scope = efCoreScopeProvider.CreateScope();
        var rule = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellRules.FirstOrDefaultAsync(r => r.Id == upsellRuleId, ct));

        if (rule == null)
        {
            result.AddErrorMessage("Upsell rule not found.");
            scope.Complete();
            return result;
        }

        var now = DateTime.UtcNow;
        var newStatus = resolveStatus(rule, now);

        var statusChangingNotification = new UpsellRuleStatusChangingNotification(rule, rule.Status, newStatus);
        if (await notificationPublisher.PublishCancelableAsync(statusChangingNotification, ct))
        {
            result.AddErrorMessage(statusChangingNotification.CancelReason ?? "Status change cancelled.");
            scope.Complete();
            return result;
        }

        var previousStatus = rule.Status;
        rule.Status = newStatus;
        rule.DateUpdated = now;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        InvalidateCache();

        await notificationPublisher.PublishAsync(
            new UpsellRuleStatusChangedNotification(rule, previousStatus, newStatus), ct);

        result.ResultObject = rule;
        result.AddSuccessMessage(successMessageFactory(rule));
        logAction(rule, previousStatus, newStatus);

        return result;
    }

    #endregion

    #region Private Helpers

    private async Task<T> ExecuteWithSqliteLockRetryAsync<T>(
        Func<Task<T>> operation,
        CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            ct.ThrowIfCancellationRequested();

            try
            {
                return await operation();
            }
            catch (Exception ex) when (IsTransientSqliteLockException(ex) && attempt < SqliteLockRetryAttempts)
            {
                var delay = GetSqliteLockRetryDelay(attempt);
                logger.LogWarning(
                    ex,
                    "SQLite lock contention during upsell status updates (attempt {Attempt}/{MaxAttempts}). Retrying in {DelayMs}ms.",
                    attempt,
                    SqliteLockRetryAttempts,
                    (int)delay.TotalMilliseconds);
                await Task.Delay(delay, ct);
            }
        }
    }

    private static bool IsTransientSqliteLockException(Exception exception)
    {
        if (exception is DbUpdateException dbUpdateException &&
            dbUpdateException.InnerException is SqliteException dbUpdateSqliteException)
        {
            return dbUpdateSqliteException.SqliteErrorCode is 5 or 6 ||
                   dbUpdateSqliteException.Message.Contains("database is locked", StringComparison.OrdinalIgnoreCase) ||
                   dbUpdateSqliteException.Message.Contains("database table is locked", StringComparison.OrdinalIgnoreCase);
        }

        if (exception is SqliteException sqliteException)
        {
            return sqliteException.SqliteErrorCode is 5 or 6 ||
                   sqliteException.Message.Contains("database is locked", StringComparison.OrdinalIgnoreCase) ||
                   sqliteException.Message.Contains("database table is locked", StringComparison.OrdinalIgnoreCase);
        }

        return exception.InnerException is not null && IsTransientSqliteLockException(exception.InnerException);
    }

    private static TimeSpan GetSqliteLockRetryDelay(int attempt)
        => TimeSpan.FromMilliseconds(Math.Min(1200, 200 * attempt));

    private void InvalidateCache()
    {
        cache.Remove(CacheKey);
    }

    #endregion
}
