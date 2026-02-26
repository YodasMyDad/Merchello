using System.Security.Cryptography;
using System.Text.Json;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Checkout.Services;

public class AbandonedCheckoutService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<AbandonedCheckoutSettings> settings,
    IOptions<MerchelloSettings> merchelloSettings,
    ILogger<AbandonedCheckoutService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IAbandonedCheckoutService
{
    private readonly AbandonedCheckoutSettings _settings = settings.Value;
    private readonly MerchelloSettings _merchelloSettings = merchelloSettings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    // =====================================================
    // Activity Tracking
    // =====================================================

    public async Task TrackCheckoutActivityAsync(Guid basketId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.AbandonedCheckouts
                .FirstOrDefaultAsync(ac => ac.BasketId == basketId, ct);

            if (existing == null)
            {
                return true;
            }

            var basket = await db.Baskets
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == basketId, ct);

            UpdateCheckoutFromBasket(existing, basket, email: null);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
    }

    public async Task TrackCheckoutActivityAsync(Basket basket, string? email = null, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.AbandonedCheckouts
                .FirstOrDefaultAsync(ac => ac.BasketId == basket.Id, ct);

            if (existing != null)
            {
                UpdateCheckoutFromBasket(existing, basket, email);
                await db.SaveChangesAsync(ct);
                return true;
            }

            if (string.IsNullOrWhiteSpace(email))
            {
                return true;
            }

            // Create new record only if we have an email
            var abandoned = CreateCheckoutSnapshot(basket, email);
            db.AbandonedCheckouts.Add(abandoned);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                // Another request created the row concurrently; update that row instead.
                db.ChangeTracker.Clear();

                var concurrent = await db.AbandonedCheckouts
                    .FirstOrDefaultAsync(ac => ac.BasketId == basket.Id, ct);

                if (concurrent == null)
                {
                    throw;
                }

                UpdateCheckoutFromBasket(concurrent, basket, email);
                await db.SaveChangesAsync(ct);
            }

            return true;
        });
        scope.Complete();
    }

    // =====================================================
    // Query
    // =====================================================

    public async Task<AbandonedCheckoutPageDto> GetPagedAsync(
        AbandonedCheckoutQueryParameters parameters,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.AbandonedCheckouts.AsNoTracking().AsQueryable();
            var isSqlite = db.Database.IsSqlite();

            // Apply filters
            if (parameters.Status.HasValue)
            {
                query = query.Where(ac => ac.Status == parameters.Status.Value);
            }

            if (parameters.FromDate.HasValue)
            {
                query = query.Where(ac => ac.DateCreated >= parameters.FromDate.Value);
            }

            if (parameters.ToDate.HasValue)
            {
                query = query.Where(ac => ac.DateCreated <= parameters.ToDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.Search))
            {
                var search = parameters.Search.ToLower();
                query = query.Where(ac =>
                    (ac.Email != null && ac.Email.ToLower().Contains(search)) ||
                    (ac.CustomerName != null && ac.CustomerName.ToLower().Contains(search)));
            }

            if (parameters.MinValue.HasValue)
            {
                // SQLite decimal comparisons can translate to ef_compare, which may be unavailable
                // in some runtime configurations. Cast to double for provider-safe translation.
                if (isSqlite)
                {
                    var minValue = (double)parameters.MinValue.Value;
                    query = query.Where(ac => (double)ac.BasketTotal >= minValue);
                }
                else
                {
                    query = query.Where(ac => ac.BasketTotal >= parameters.MinValue.Value);
                }
            }

            // Count before paging
            var totalItems = await query.CountAsync(ct);

            // Apply ordering
            query = parameters.OrderBy switch
            {
                AbandonedCheckoutOrderBy.LastActivity => parameters.Descending
                    ? query.OrderByDescending(ac => ac.LastActivityUtc)
                    : query.OrderBy(ac => ac.LastActivityUtc),
                AbandonedCheckoutOrderBy.Total => parameters.Descending
                    ? (isSqlite
                        ? query.OrderByDescending(ac => (double)ac.BasketTotal)
                        : query.OrderByDescending(ac => ac.BasketTotal))
                    : (isSqlite
                        ? query.OrderBy(ac => (double)ac.BasketTotal)
                        : query.OrderBy(ac => ac.BasketTotal)),
                AbandonedCheckoutOrderBy.Email => parameters.Descending
                    ? query.OrderByDescending(ac => ac.Email)
                    : query.OrderBy(ac => ac.Email),
                _ => parameters.Descending
                    ? query.OrderByDescending(ac => ac.DateAbandoned ?? ac.DateCreated)
                    : query.OrderBy(ac => ac.DateAbandoned ?? ac.DateCreated)
            };

            // Apply paging
            var skip = (parameters.Page - 1) * parameters.PageSize;
            var items = await query
                .Skip(skip)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            var dtos = items.Select(MapToListItemDto).ToList();

            return new AbandonedCheckoutPageDto
            {
                Items = dtos,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)parameters.PageSize),
                CurrentPage = parameters.Page,
                PageSize = parameters.PageSize
            };
        });
        scope.Complete();

        return result;
    }

    public async Task<AbandonedCheckout?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.AbandonedCheckouts
                .AsNoTracking()
                .FirstOrDefaultAsync(ac => ac.Id == id, ct));
        scope.Complete();
        return result;
    }

    public async Task<AbandonedCheckout?> GetDetailByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.AbandonedCheckouts
                .Include(ac => ac.Basket)
                .AsNoTracking()
                .FirstOrDefaultAsync(ac => ac.Id == id, ct));
        scope.Complete();
        return result;
    }

    public async Task<AbandonedCheckout?> GetByBasketIdAsync(Guid basketId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.AbandonedCheckouts
                .AsNoTracking()
                .FirstOrDefaultAsync(ac => ac.BasketId == basketId, ct));
        scope.Complete();
        return result;
    }

    public async Task<AbandonedCheckout?> GetByRecoveryTokenAsync(string token, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.AbandonedCheckouts
                .AsNoTracking()
                .FirstOrDefaultAsync(ac => ac.RecoveryToken == token, ct));
        scope.Complete();
        return result;
    }

    // =====================================================
    // Status Management
    // =====================================================

    public async Task MarkAsRecoveredAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var abandoned = await scope.ExecuteWithContextAsync(async db =>
        {
            var record = await db.AbandonedCheckouts.FirstOrDefaultAsync(ac => ac.Id == id, ct);
            if (record == null) return null;

            record.Status = AbandonedCheckoutStatus.Recovered;
            record.DateRecovered = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            return record;
        });
        scope.Complete();

        if (abandoned != null)
        {
            // Publish notification
            await notificationPublisher.PublishAsync(
                new CheckoutRecoveredNotification(
                    abandoned.Id,
                    abandoned.BasketId,
                    abandoned.Email,
                    abandoned.BasketTotal,
                    abandoned.DateAbandoned ?? abandoned.DateCreated),
                ct);
        }
    }

    public async Task MarkAsConvertedAsync(Guid id, Guid invoiceId, CancellationToken ct = default)
    {
        var statusChanged = false;

        using var scope = efCoreScopeProvider.CreateScope();
        var abandoned = await scope.ExecuteWithContextAsync(async db =>
        {
            var record = await db.AbandonedCheckouts.FirstOrDefaultAsync(ac => ac.Id == id, ct);
            if (record == null) return null;

            if (record.Status == AbandonedCheckoutStatus.Converted)
            {
                // Idempotent behavior: do not re-convert or emit duplicate notifications.
                if (record.RecoveredInvoiceId != invoiceId)
                {
                    logger.LogWarning(
                        "Abandoned checkout {CheckoutId} already converted to invoice {ExistingInvoiceId}. Ignoring duplicate conversion to {NewInvoiceId}.",
                        id,
                        record.RecoveredInvoiceId,
                        invoiceId);
                }

                return record;
            }

            record.Status = AbandonedCheckoutStatus.Converted;
            record.DateConverted = DateTime.UtcNow;
            record.RecoveredInvoiceId = invoiceId;

            await db.SaveChangesAsync(ct);
            statusChanged = true;
            return record;
        });
        scope.Complete();

        if (abandoned != null && statusChanged)
        {
            // Publish notification
            await notificationPublisher.PublishAsync(
                new CheckoutRecoveryConvertedNotification(
                    abandoned.Id,
                    invoiceId,
                    abandoned.Email,
                    abandoned.BasketTotal,
                    abandoned.DateAbandoned ?? abandoned.DateCreated,
                    abandoned.DateRecovered ?? DateTime.UtcNow),
                ct);
        }
    }

    public async Task<bool> MarkRecoveryEmailSentAsync(Guid id, DateTime? sentUtc = null, CancellationToken ct = default)
    {
        var when = sentUtc ?? DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        var updated = await scope.ExecuteWithContextAsync(async db =>
        {
            var record = await db.AbandonedCheckouts.FirstOrDefaultAsync(ac => ac.Id == id, ct);
            if (record == null) return false;

            record.RecoveryEmailsSent++;
            record.LastRecoveryEmailSentUtc = when;
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        return updated;
    }

    // =====================================================
    // Recovery
    // =====================================================

    public async Task<string> GenerateRecoveryLinkAsync(Guid id, CancellationToken ct = default)
    {
        var abandonedSettings = GetEffectiveAbandonedSettings();

        using var scope = efCoreScopeProvider.CreateScope();
        var token = await scope.ExecuteWithContextAsync(async db =>
        {
            var record = await db.AbandonedCheckouts.FirstOrDefaultAsync(ac => ac.Id == id, ct);
            if (record == null) return null;

            // Generate token if not exists or expired
            if (string.IsNullOrEmpty(record.RecoveryToken) ||
                record.RecoveryTokenExpiresUtc < DateTime.UtcNow)
            {
                record.RecoveryToken = GenerateRecoveryToken();
                record.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(abandonedSettings.RecoveryExpiryDays);
                await db.SaveChangesAsync(ct);
            }

            return record.RecoveryToken;
        });
        scope.Complete();

        if (string.IsNullOrEmpty(token))
        {
            throw new InvalidOperationException($"Abandoned checkout {id} not found");
        }

        return BuildRecoveryLink(token);
    }

    public async Task<CrudResult<Basket>> RestoreBasketFromRecoveryAsync(string token, CancellationToken ct = default)
    {
        var result = new CrudResult<Basket>();
        var shouldPublishRecoveredNotification = false;

        using var scope = efCoreScopeProvider.CreateScope();
        var basket = await scope.ExecuteWithContextAsync(async db =>
        {
            // Find the abandoned checkout by token
            var abandoned = await db.AbandonedCheckouts
                .FirstOrDefaultAsync(ac => ac.RecoveryToken == token, ct);

            if (abandoned == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invalid recovery link",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            // Check if token is expired
            if (abandoned.RecoveryTokenExpiresUtc < DateTime.UtcNow)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "This recovery link has expired",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            // Check if already converted
            if (abandoned.Status == AbandonedCheckoutStatus.Converted)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "This checkout has already been completed",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            if (abandoned.Status == AbandonedCheckoutStatus.Expired)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "This recovery link has expired",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            // Find the basket
            var existingBasket = await db.Baskets
                .FirstOrDefaultAsync(b => b.Id == abandoned.BasketId, ct);

            if (existingBasket == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "The basket for this checkout no longer exists",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            // Restore addresses and currency from the abandoned checkout snapshot
            // This is critical because HTTP session may have expired or user may be on a different device
            RestoreAddressAndCurrencySnapshots(abandoned, existingBasket);

            // Mark as recovered once (idempotent when link is reopened)
            if (abandoned.Status != AbandonedCheckoutStatus.Recovered)
            {
                abandoned.Status = AbandonedCheckoutStatus.Recovered;
                abandoned.DateRecovered = DateTime.UtcNow;
                shouldPublishRecoveredNotification = true;
            }

            // Save the basket with restored addresses
            db.Baskets.Update(existingBasket);
            await db.SaveChangesAsync(ct);

            return existingBasket;
        });
        scope.Complete();

        if (basket != null)
        {
            result.ResultObject = basket;

            // Publish recovered notification (outside of scope to avoid transaction issues)
            if (shouldPublishRecoveredNotification)
            {
                var abandoned = await GetByRecoveryTokenAsync(token, ct);
                if (abandoned != null)
                {
                    await notificationPublisher.PublishAsync(
                        new CheckoutRecoveredNotification(
                            abandoned.Id,
                            abandoned.BasketId,
                            abandoned.Email,
                            abandoned.BasketTotal,
                            abandoned.DateAbandoned ?? abandoned.DateCreated),
                        ct);
                }
            }
        }

        return result;
    }

    // =====================================================
    // Analytics
    // =====================================================

    public async Task<AbandonedCheckoutStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default)
    {
        var currencySymbol = _merchelloSettings.CurrencySymbol;
        var currencyCode = _merchelloSettings.StoreCurrencyCode;

        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.AbandonedCheckouts.AsNoTracking().AsQueryable();

            if (from.HasValue)
            {
                query = query.Where(ac => ac.DateCreated >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(ac => ac.DateCreated <= to.Value);
            }

            var abandoned = await query
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Abandoned ||
                            ac.Status == AbandonedCheckoutStatus.Recovered ||
                            ac.Status == AbandonedCheckoutStatus.Converted)
                .CountAsync(ct);

            var recovered = await query
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Recovered ||
                            ac.Status == AbandonedCheckoutStatus.Converted)
                .CountAsync(ct);

            var converted = await query
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Converted)
                .CountAsync(ct);

            // Cast to double for SQLite compatibility (avoids ef_sum error)
            var valueAbandoned = (decimal)await query
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Abandoned ||
                            ac.Status == AbandonedCheckoutStatus.Recovered ||
                            ac.Status == AbandonedCheckoutStatus.Converted)
                .Select(ac => (double)ac.BasketTotal)
                .SumAsync(ct);

            var valueRecovered = (decimal)await query
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Converted)
                .Select(ac => (double)ac.BasketTotal)
                .SumAsync(ct);

            return new AbandonedCheckoutStatsDto
            {
                TotalAbandoned = abandoned,
                TotalRecovered = recovered,
                TotalConverted = converted,
                RecoveryRate = abandoned > 0 ? Math.Round((decimal)recovered / abandoned * 100, 2) : 0,
                ConversionRate = abandoned > 0 ? Math.Round((decimal)converted / abandoned * 100, 2) : 0,
                TotalValueAbandoned = valueAbandoned,
                TotalValueRecovered = valueRecovered,
                FormattedValueAbandoned = $"{currencySymbol}{valueAbandoned:N2}",
                FormattedValueRecovered = $"{currencySymbol}{valueRecovered:N2}",
                CurrencyCode = currencyCode,
                CurrencySymbol = currencySymbol
            };
        });
        scope.Complete();

        return stats;
    }

    // =====================================================
    // Background Job Support
    // =====================================================

    public async Task DetectAbandonedCheckoutsAsync(TimeSpan abandonmentThreshold, CancellationToken ct = default)
    {
        var abandonedSettings = GetEffectiveAbandonedSettings();
        var cutoffTime = DateTime.UtcNow - abandonmentThreshold;
        var abandonedCheckouts = new List<AbandonedCheckout>();

        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            var checkoutsToAbandon = await db.AbandonedCheckouts
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Active)
                .Where(ac => ac.LastActivityUtc < cutoffTime)
                .ToListAsync(ct);

            foreach (var checkout in checkoutsToAbandon)
            {
                checkout.Status = AbandonedCheckoutStatus.Abandoned;
                checkout.DateAbandoned = DateTime.UtcNow;

                // Generate recovery token
                checkout.RecoveryToken = GenerateRecoveryToken();
                checkout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(abandonedSettings.RecoveryExpiryDays);
            }

            await db.SaveChangesAsync(ct);
            abandonedCheckouts.AddRange(checkoutsToAbandon);
            return checkoutsToAbandon.Count;
        });
        scope.Complete();

        // Publish notifications AFTER transaction completes for webhooks/integrations
        foreach (var checkout in abandonedCheckouts)
        {
            var recoveryLink = !string.IsNullOrEmpty(checkout.RecoveryToken)
                ? BuildRecoveryLink(checkout.RecoveryToken)
                : null;

            await notificationPublisher.PublishAsync(
                new CheckoutAbandonedNotification(
                    checkout.Id,
                    checkout.BasketId,
                    checkout.Email,
                    checkout.CustomerName,
                    checkout.BasketTotal,
                    checkout.CurrencyCode,
                    recoveryLink),
                ct);
        }

        if (count > 0)
        {
            logger.LogInformation("Detected {Count} abandoned checkouts", count);
        }
    }

    public async Task SendScheduledRecoveryEmailsAsync(CancellationToken ct = default)
    {
        var abandonedSettings = GetEffectiveAbandonedSettings();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var checkouts = await db.AbandonedCheckouts
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Abandoned)
                .Where(ac => ac.RecoveryEmailsSent < abandonedSettings.MaxRecoveryEmails)
                .ToListAsync(ct);

            foreach (var checkout in checkouts)
            {
                var (shouldSend, notification) = GetNextEmailIfDue(checkout, abandonedSettings);

                if (shouldSend && notification != null)
                {
                    try
                    {
                        await PublishRecoveryNotificationAsync(notification, ct);
                        checkout.RecoveryEmailsSent++;
                        checkout.LastRecoveryEmailSentUtc = DateTime.UtcNow;

                        logger.LogInformation(
                            "Sent recovery email {EmailNumber} for abandoned checkout {CheckoutId}",
                            checkout.RecoveryEmailsSent, checkout.Id);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex,
                            "Failed to send recovery email {EmailNumber} for abandoned checkout {CheckoutId}",
                            checkout.RecoveryEmailsSent + 1, checkout.Id);
                    }
                }
            }

            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
    }

    public async Task ExpireOldRecoveriesAsync(TimeSpan expiryThreshold, CancellationToken ct = default)
    {
        var cutoffTime = DateTime.UtcNow - expiryThreshold;

        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            var checkoutsToExpire = await db.AbandonedCheckouts
                .Where(ac => ac.Status == AbandonedCheckoutStatus.Abandoned)
                .Where(ac => ac.DateAbandoned < cutoffTime)
                .ToListAsync(ct);

            foreach (var checkout in checkoutsToExpire)
            {
                checkout.Status = AbandonedCheckoutStatus.Expired;
                checkout.DateExpired = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            return checkoutsToExpire.Count;
        });
        scope.Complete();

        if (count > 0)
        {
            logger.LogInformation("Expired {Count} old abandoned checkouts", count);
        }
    }

    // =====================================================
    // Private Helpers
    // =====================================================

    private AbandonedCheckoutSettings GetEffectiveAbandonedSettings()
    {
        if (_storeSettingsService == null)
        {
            return _settings;
        }

        try
        {
            var runtime = _storeSettingsService.GetRuntimeSettings();
            return runtime.AbandonedCheckout;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed abandoned checkout settings, falling back to appsettings defaults.");
            return _settings;
        }
    }

    private StoreSettings GetEffectiveStoreSettings()
    {
        if (_storeSettingsService == null)
        {
            return _merchelloSettings.Store ?? new StoreSettings();
        }

        try
        {
            var runtime = _storeSettingsService.GetRuntimeSettings();
            return runtime.Merchello.Store ?? _merchelloSettings.Store ?? new StoreSettings();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed store settings, falling back to appsettings defaults.");
            return _merchelloSettings.Store ?? new StoreSettings();
        }
    }

    private (bool ShouldSend, CheckoutAbandonedNotificationBase? Notification) GetNextEmailIfDue(
        AbandonedCheckout checkout,
        AbandonedCheckoutSettings settings)
    {
        var now = DateTime.UtcNow;

        return checkout.RecoveryEmailsSent switch
        {
            // First email: X hours after DateAbandoned
            0 when checkout.DateAbandoned?.AddHours(settings.FirstEmailDelayHours) <= now
                => (true, BuildNotification<CheckoutAbandonedFirstNotification>(checkout, 1)),

            // Reminder: X hours after first email was sent
            1 when checkout.LastRecoveryEmailSentUtc?.AddHours(settings.ReminderEmailDelayHours) <= now
                => (true, BuildNotification<CheckoutAbandonedReminderNotification>(checkout, 2)),

            // Final: X hours after reminder was sent
            2 when checkout.LastRecoveryEmailSentUtc?.AddHours(settings.FinalEmailDelayHours) <= now
                => (true, BuildNotification<CheckoutAbandonedFinalNotification>(checkout, 3)),

            _ => (false, null)
        };
    }

    private TNotification BuildNotification<TNotification>(AbandonedCheckout checkout, int sequenceNumber)
        where TNotification : CheckoutAbandonedNotificationBase, new()
    {
        var recoveryLink = !string.IsNullOrEmpty(checkout.RecoveryToken)
            ? BuildRecoveryLink(checkout.RecoveryToken)
            : null;

        return new TNotification
        {
            AbandonedCheckoutId = checkout.Id,
            BasketId = checkout.BasketId,
            CustomerEmail = checkout.Email,
            CustomerName = checkout.CustomerName,
            BasketTotal = checkout.BasketTotal,
            CurrencyCode = checkout.CurrencyCode,
            CurrencySymbol = checkout.CurrencySymbol,
            FormattedTotal = $"{checkout.CurrencySymbol}{checkout.BasketTotal:N2}",
            RecoveryLink = recoveryLink,
            EmailSequenceNumber = sequenceNumber,
            ItemCount = checkout.ItemCount
        };
    }

    private Task PublishRecoveryNotificationAsync(
        CheckoutAbandonedNotificationBase notification,
        CancellationToken ct)
    {
        return notification switch
        {
            CheckoutAbandonedFirstNotification first => notificationPublisher.PublishAsync(first, ct),
            CheckoutAbandonedReminderNotification reminder => notificationPublisher.PublishAsync(reminder, ct),
            CheckoutAbandonedFinalNotification final => notificationPublisher.PublishAsync(final, ct),
            _ => throw new InvalidOperationException(
                $"Unsupported recovery notification type: {notification.GetType().Name}")
        };
    }

    private static string GenerateRecoveryToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private AbandonedCheckoutListItemDto MapToListItemDto(AbandonedCheckout checkout)
    {
        return new AbandonedCheckoutListItemDto
        {
            Id = checkout.Id,
            CustomerEmail = checkout.Email,
            CustomerName = checkout.CustomerName,
            BasketTotal = checkout.BasketTotal,
            FormattedTotal = $"{checkout.CurrencySymbol}{checkout.BasketTotal:N2}",
            ItemCount = checkout.ItemCount,
            Status = checkout.Status,
            StatusDisplay = GetStatusDisplay(checkout.Status),
            StatusCssClass = GetStatusCssClass(checkout.Status),
            LastActivityUtc = checkout.LastActivityUtc,
            DateAbandoned = checkout.DateAbandoned,
            RecoveryEmailsSent = checkout.RecoveryEmailsSent,
            CurrencyCode = checkout.CurrencyCode
        };
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        var text = $"{ex.Message} {ex.InnerException?.Message}".ToLowerInvariant();
        return text.Contains("unique") || text.Contains("duplicate");
    }

    private static void ResetRecoveredOrAbandonedToActive(AbandonedCheckout checkout)
    {
        // This allows re-abandonment if the customer leaves again.
        if (checkout.Status == AbandonedCheckoutStatus.Recovered ||
            checkout.Status == AbandonedCheckoutStatus.Abandoned)
        {
            checkout.Status = AbandonedCheckoutStatus.Active;
            checkout.RecoveryEmailsSent = 0;
            checkout.DateAbandoned = null;
        }
    }

    private static AbandonedCheckout CreateCheckoutSnapshot(Basket basket, string email)
    {
        var snapshot = new AbandonedCheckout
        {
            BasketId = basket.Id,
            CustomerId = basket.CustomerId,
            Email = email,
            BasketTotal = basket.Total,
            CurrencyCode = basket.Currency,
            CurrencySymbol = basket.CurrencySymbol,
            ItemCount = basket.LineItems.Count(li => li.LineItemType == Accounting.Models.LineItemType.Product),
            CustomerName = basket.BillingAddress?.Name,
            Status = AbandonedCheckoutStatus.Active
        };

        StoreAddressSnapshots(snapshot, basket);
        return snapshot;
    }

    private static void UpdateCheckoutFromBasket(AbandonedCheckout checkout, Basket? basket, string? email)
    {
        checkout.LastActivityUtc = DateTime.UtcNow;
        ResetRecoveredOrAbandonedToActive(checkout);

        if (!string.IsNullOrWhiteSpace(email) && checkout.Email != email)
        {
            checkout.Email = email;
        }

        if (basket == null)
        {
            return;
        }

        checkout.BasketTotal = basket.Total;
        checkout.ItemCount = basket.LineItems.Count(li => li.LineItemType == Accounting.Models.LineItemType.Product);
        checkout.CurrencyCode = basket.Currency;
        checkout.CurrencySymbol = basket.CurrencySymbol;
        checkout.CustomerName = basket.BillingAddress?.Name;
        StoreAddressSnapshots(checkout, basket);
    }

    private string BuildRecoveryLink(string token)
    {
        var configured = _settings.RecoveryUrlBase;
        var baseUrl = string.IsNullOrWhiteSpace(configured)
            ? "/checkout/recover"
            : configured.Trim();

        var tokenPath = $"{baseUrl.TrimEnd('/')}/{token}";
        if (Uri.TryCreate(tokenPath, UriKind.Absolute, out var absolute)
            && absolute.Scheme is "http" or "https")
        {
            return absolute.ToString();
        }

        var storeSettings = GetEffectiveStoreSettings();
        if (Uri.TryCreate(storeSettings.WebsiteUrl, UriKind.Absolute, out var websiteUri))
        {
            var relative = tokenPath.StartsWith('/') ? tokenPath : $"/{tokenPath}";
            return new Uri(websiteUri, relative).ToString();
        }

        return tokenPath;
    }

    private static string GetStatusDisplay(AbandonedCheckoutStatus status) => status switch
    {
        AbandonedCheckoutStatus.Active => "Active",
        AbandonedCheckoutStatus.Abandoned => "Abandoned",
        AbandonedCheckoutStatus.Recovered => "Recovered",
        AbandonedCheckoutStatus.Converted => "Converted",
        AbandonedCheckoutStatus.Expired => "Expired",
        _ => "Unknown"
    };

    private static string GetStatusCssClass(AbandonedCheckoutStatus status) => status switch
    {
        AbandonedCheckoutStatus.Active => "default",
        AbandonedCheckoutStatus.Abandoned => "warning",
        AbandonedCheckoutStatus.Recovered => "positive",
        AbandonedCheckoutStatus.Converted => "positive",
        AbandonedCheckoutStatus.Expired => "cancelled",
        _ => "default"
    };

    /// <summary>
    /// Stores billing and shipping address snapshots in the abandoned checkout's ExtendedData.
    /// This ensures addresses can be recovered even if the HTTP session expires.
    /// </summary>
    private static void StoreAddressSnapshots(AbandonedCheckout abandonedCheckout, Basket basket)
    {
        // Only store addresses if they have meaningful data (at least email for billing)
        if (!string.IsNullOrWhiteSpace(basket.BillingAddress?.Email) ||
            !string.IsNullOrWhiteSpace(basket.BillingAddress?.Name))
        {
            abandonedCheckout.ExtendedData["BillingAddressJson"] = JsonSerializer.Serialize(basket.BillingAddress);
        }

        // Store shipping address if it has meaningful data
        if (!string.IsNullOrWhiteSpace(basket.ShippingAddress?.CountryCode) ||
            !string.IsNullOrWhiteSpace(basket.ShippingAddress?.Name))
        {
            abandonedCheckout.ExtendedData["ShippingAddressJson"] = JsonSerializer.Serialize(basket.ShippingAddress);
        }
    }

    /// <summary>
    /// Restores address snapshots from the abandoned checkout's ExtendedData to the basket.
    /// Also restores currency from the abandoned checkout record.
    /// </summary>
    private void RestoreAddressAndCurrencySnapshots(AbandonedCheckout abandonedCheckout, Basket basket)
    {
        // Restore currency from the abandoned checkout record
        if (!string.IsNullOrEmpty(abandonedCheckout.CurrencyCode))
        {
            basket.Currency = abandonedCheckout.CurrencyCode;
            basket.CurrencySymbol = abandonedCheckout.CurrencySymbol ?? "";
            logger.LogDebug(
                "Restored currency {CurrencyCode} for basket {BasketId} from abandoned checkout",
                abandonedCheckout.CurrencyCode, basket.Id);
        }

        // Restore billing address from snapshot
        var billingStr = GetExtendedDataString(abandonedCheckout.ExtendedData, "BillingAddressJson");
        if (!string.IsNullOrEmpty(billingStr))
        {
            try
            {
                var billingAddress = JsonSerializer.Deserialize<Address>(billingStr);
                if (billingAddress != null)
                {
                    basket.BillingAddress = billingAddress;
                    logger.LogDebug(
                        "Restored billing address for basket {BasketId} from abandoned checkout",
                        basket.Id);
                }
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex,
                    "Failed to deserialize billing address from abandoned checkout {AbandonedCheckoutId}",
                    abandonedCheckout.Id);
            }
        }

        // Restore shipping address from snapshot
        var shippingStr = GetExtendedDataString(abandonedCheckout.ExtendedData, "ShippingAddressJson");
        if (!string.IsNullOrEmpty(shippingStr))
        {
            try
            {
                var shippingAddress = JsonSerializer.Deserialize<Address>(shippingStr);
                if (shippingAddress != null)
                {
                    basket.ShippingAddress = shippingAddress;
                    logger.LogDebug(
                        "Restored shipping address for basket {BasketId} from abandoned checkout",
                        basket.Id);
                }
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex,
                    "Failed to deserialize shipping address from abandoned checkout {AbandonedCheckoutId}",
                    abandonedCheckout.Id);
            }
        }
    }

    /// <summary>
    /// Helper to get a string value from ExtendedData, handling both string and JsonElement types.
    /// When EF Core deserializes JSON columns, values may be JsonElement instead of string.
    /// </summary>
    private static string? GetExtendedDataString(Dictionary<string, object> extendedData, string key)
    {
        if (!extendedData.TryGetValue(key, out var value) || value == null)
            return null;
        return value.UnwrapJsonElement()?.ToString();
    }
}
