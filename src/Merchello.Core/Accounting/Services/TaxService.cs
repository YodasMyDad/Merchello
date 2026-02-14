using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.ShippingTaxOverride;
using Merchello.Core.Notifications.TaxGroup;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class TaxService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IMerchelloNotificationPublisher notificationPublisher,
    TaxGroupFactory taxGroupFactory,
    ICacheService cacheService,
    ILogger<TaxService> logger) : ITaxService
{
    private const string TaxCacheTag = Constants.CacheTags.Tax;

    /// <summary>
    /// Gets all tax groups
    /// </summary>
    public async Task<List<TaxGroup>> GetTaxGroups(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroups
                .AsNoTracking()
                .OrderBy(tg => tg.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a tax group by ID
    /// </summary>
    public async Task<TaxGroup?> GetTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroups
                .AsNoTracking()
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new tax group
    /// </summary>
    public async Task<CrudResult<TaxGroup>> CreateTaxGroup(
        string name,
        decimal rate,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroup>();

        // Validate rate
        if (rate < 0 || rate > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        var taxGroup = taxGroupFactory.Create(name, rate);
        taxGroup.Id = Guid.NewGuid();

        // Publish creating notification (cancelable)
        var creatingNotification = new TaxGroupCreatingNotification(taxGroup);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
        {
            result.AddErrorMessage("Tax group creation was cancelled by a notification handler");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.TaxGroups.Add(taxGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });
        scope.Complete();

        // Publish created notification (informational)
        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(new TaxGroupCreatedNotification(taxGroup), cancellationToken);
        }

        result.ResultObject = taxGroup;
        return result;
    }

    /// <summary>
    /// Updates an existing tax group by ID
    /// </summary>
    public async Task<CrudResult<TaxGroup>> UpdateTaxGroup(
        Guid taxGroupId,
        string name,
        decimal taxPercentage,
        CancellationToken cancellationToken = default)
    {
        // Validate rate
        if (taxPercentage < 0 || taxPercentage > 100)
        {
            var invalidResult = new CrudResult<TaxGroup>();
            invalidResult.AddErrorMessage("Tax rate must be between 0 and 100");
            return invalidResult;
        }
        return await UpdateTaxGroupInternalAsync(
            taxGroupId,
            name,
            taxPercentage,
            cancellationToken);
    }

    private async Task<CrudResult<TaxGroup>> UpdateTaxGroupInternalAsync(
        Guid taxGroupId,
        string? name,
        decimal taxPercentage,
        CancellationToken cancellationToken)
    {
        var result = new CrudResult<TaxGroup>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.TaxGroups
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);

            if (existing == null)
            {
                result.AddErrorMessage("Tax group not found");
                return false;
            }

            // Publish saving notification (cancelable)
            var savingNotification = new TaxGroupSavingNotification(existing);
            if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
            {
                result.AddErrorMessage("Tax group update was cancelled by a notification handler");
                return false;
            }

            existing.Name = name;
            existing.TaxPercentage = taxPercentage;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = existing;
            return true;
        });
        scope.Complete();

        // Publish saved notification (informational)
        if (result.Success && result.ResultObject != null)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(new TaxGroupSavedNotification(result.ResultObject), cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a tax group
    /// </summary>
    public async Task<CrudResult<bool>> DeleteTaxGroup(
        Guid taxGroupId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        string taxGroupName = string.Empty;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var taxGroup = await db.TaxGroups
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);

            if (taxGroup == null)
            {
                result.AddErrorMessage("Tax group not found");
                return false;
            }

            // Check if tax group is in use
            var productsUsingTaxGroup = await db.RootProducts
                .AnyAsync(p => p.TaxGroupId == taxGroupId, cancellationToken);

            if (productsUsingTaxGroup)
            {
                result.AddErrorMessage("Cannot delete tax group - it is in use by products");
                return false;
            }

            // Publish deleting notification (cancelable)
            var deletingNotification = new TaxGroupDeletingNotification(taxGroup);
            if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
            {
                result.AddErrorMessage("Tax group deletion was cancelled by a notification handler");
                return false;
            }

            // Capture name for deleted notification (before entity is removed)
            taxGroupName = taxGroup.Name ?? string.Empty;

            db.TaxGroups.Remove(taxGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        // Publish deleted notification (informational)
        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(new TaxGroupDeletedNotification(taxGroupId, taxGroupName), cancellationToken);
        }

        return result;
    }

    #region Tax Group Rates

    /// <summary>
    /// Gets the applicable tax rate for a tax group at a specific location.
    /// Lookup priority: State-specific -> Country-level -> TaxGroup default rate
    /// </summary>
    public async Task<decimal> GetApplicableRateAsync(
        Guid taxGroupId,
        string countryCode,
        string? regionCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return 0m;

        var normalizedCountryCode = NormalizeCountryCode(countryCode);
        var normalizedRegionCode = NormalizeRegionCode(regionCode);
        var cacheKey = $"{Constants.CacheKeys.TaxRatePrefix}{taxGroupId}:{normalizedCountryCode}:{normalizedRegionCode ?? "_"}";
        return await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct =>
            {
                using var scope = efCoreScopeProvider.CreateScope();
                var rate = await scope.ExecuteWithContextAsync(async db =>
                {
                    // Priority 1: State-specific rate
                    if (!string.IsNullOrWhiteSpace(normalizedRegionCode))
                    {
                        var stateRate = await db.TaxGroupRates
                            .AsNoTracking()
                            .FirstOrDefaultAsync(r =>
                                r.TaxGroupId == taxGroupId &&
                                r.CountryCode == normalizedCountryCode &&
                                r.RegionCode == normalizedRegionCode,
                                ct);

                        if (stateRate != null)
                            return stateRate.TaxPercentage;
                    }

                    // Priority 2: Country-level rate (no state specified)
                    var countryRate = await db.TaxGroupRates
                        .AsNoTracking()
                        .FirstOrDefaultAsync(r =>
                            r.TaxGroupId == taxGroupId &&
                            r.CountryCode == normalizedCountryCode &&
                            r.RegionCode == null,
                            ct);

                    if (countryRate != null)
                        return countryRate.TaxPercentage;

                    // Priority 3: Fallback to TaxGroup's default rate
                    var taxGroup = await db.TaxGroups
                        .AsNoTracking()
                        .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, ct);

                    return taxGroup?.TaxPercentage ?? 0m;
                });

                scope.Complete();
                return rate;
            },
            TimeSpan.FromMinutes(5),
            [TaxCacheTag],
            cancellationToken);
    }

    /// <summary>
    /// Gets all rates for a tax group
    /// </summary>
    public async Task<List<TaxGroupRate>> GetRatesForTaxGroup(
        Guid taxGroupId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroupRates
                .AsNoTracking()
                .Where(r => r.TaxGroupId == taxGroupId)
                .OrderBy(r => r.CountryCode)
                .ThenBy(r => r.RegionCode)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a specific tax group rate by ID
    /// </summary>
    public async Task<TaxGroupRate?> GetTaxGroupRate(
        Guid rateId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroupRates
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == rateId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new geographic tax rate
    /// </summary>
    public async Task<CrudResult<TaxGroupRate>> CreateTaxGroupRate(
        Guid taxGroupId,
        string countryCode,
        string? regionCode,
        decimal taxPercentage,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroupRate>();

        // Validate rate
        if (taxPercentage < 0 || taxPercentage > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        if (string.IsNullOrWhiteSpace(countryCode))
        {
            result.AddErrorMessage("Country code is required");
            return result;
        }

        var normalizedCountryCode = NormalizeCountryCode(countryCode);
        var normalizedState = NormalizeRegionCode(regionCode);

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Check if tax group exists
            var taxGroupExists = await db.TaxGroups
                .AnyAsync(tg => tg.Id == taxGroupId, cancellationToken);

            if (!taxGroupExists)
            {
                result.AddErrorMessage("Tax group not found");
                return false;
            }

            // Check for duplicate rate
            var duplicateExists = await db.TaxGroupRates
                .AnyAsync(r =>
                    r.TaxGroupId == taxGroupId &&
                    r.CountryCode == normalizedCountryCode &&
                    r.RegionCode == normalizedState,
                    cancellationToken);

            if (duplicateExists)
            {
                result.AddErrorMessage("A rate for this location already exists");
                return false;
            }

            var rate = new TaxGroupRate
            {
                TaxGroupId = taxGroupId,
                CountryCode = normalizedCountryCode,
                RegionCode = normalizedState,
                TaxPercentage = taxPercentage
            };

            db.TaxGroupRates.Add(rate);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = rate;
            return true;
        });
        scope.Complete();

        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Updates an existing geographic tax rate
    /// </summary>
    public async Task<CrudResult<TaxGroupRate>> UpdateTaxGroupRate(
        Guid rateId,
        decimal taxPercentage,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroupRate>();

        // Validate rate
        if (taxPercentage < 0 || taxPercentage > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.TaxGroupRates
                .FirstOrDefaultAsync(r => r.Id == rateId, cancellationToken);

            if (existing == null)
            {
                result.AddErrorMessage("Tax rate not found");
                return false;
            }

            existing.TaxPercentage = taxPercentage;
            existing.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = existing;
            return true;
        });
        scope.Complete();

        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a geographic tax rate
    /// </summary>
    public async Task<CrudResult<bool>> DeleteTaxGroupRate(
        Guid rateId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var rate = await db.TaxGroupRates
                .FirstOrDefaultAsync(r => r.Id == rateId, cancellationToken);

            if (rate == null)
            {
                result.AddErrorMessage("Tax rate not found");
                return false;
            }

            db.TaxGroupRates.Remove(rate);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
        }

        return result;
    }

    #endregion

    #region Shipping Tax Overrides

    /// <summary>
    /// Gets a shipping tax override for a specific location.
    /// Lookup priority: State-specific -> Country-level -> null (no override)
    /// </summary>
    public async Task<ShippingTaxOverride?> GetShippingTaxOverrideAsync(
        string countryCode,
        string? regionCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return null;

        var normalizedCountryCode = NormalizeCountryCode(countryCode);
        var normalizedRegionCode = NormalizeRegionCode(regionCode);

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Priority 1: State-specific override
            if (!string.IsNullOrWhiteSpace(normalizedRegionCode))
            {
                var stateOverride = await db.ShippingTaxOverrides
                    .AsNoTracking()
                    .Include(o => o.ShippingTaxGroup)
                    .FirstOrDefaultAsync(o =>
                        o.CountryCode == normalizedCountryCode &&
                        o.RegionCode == normalizedRegionCode,
                        cancellationToken);

                if (stateOverride != null)
                    return stateOverride;
            }

            // Priority 2: Country-level override
            var countryOverride = await db.ShippingTaxOverrides
                .AsNoTracking()
                .Include(o => o.ShippingTaxGroup)
                .FirstOrDefaultAsync(o =>
                    o.CountryCode == normalizedCountryCode &&
                    o.RegionCode == null,
                    cancellationToken);

            return countryOverride;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a shipping tax override by ID
    /// </summary>
    public async Task<ShippingTaxOverride?> GetShippingTaxOverrideByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingTaxOverrides
                .AsNoTracking()
                .Include(o => o.ShippingTaxGroup)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all shipping tax overrides
    /// </summary>
    public async Task<List<ShippingTaxOverride>> GetAllShippingTaxOverridesAsync(
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingTaxOverrides
                .AsNoTracking()
                .Include(o => o.ShippingTaxGroup)
                .OrderBy(o => o.CountryCode)
                .ThenBy(o => o.RegionCode)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new shipping tax override
    /// </summary>
    public async Task<CrudResult<ShippingTaxOverride>> CreateShippingTaxOverrideAsync(
        CreateShippingTaxOverrideDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ShippingTaxOverride>();

        if (string.IsNullOrWhiteSpace(dto.CountryCode))
        {
            result.AddErrorMessage("Country code is required");
            return result;
        }

        var normalizedCountryCode = NormalizeCountryCode(dto.CountryCode);
        var normalizedState = NormalizeRegionCode(dto.RegionCode);

        var entity = new ShippingTaxOverride
        {
            CountryCode = normalizedCountryCode,
            RegionCode = normalizedState,
            ShippingTaxGroupId = dto.ShippingTaxGroupId
        };

        // Publish creating notification (cancelable)
        var creatingNotification = new ShippingTaxOverrideCreatingNotification(entity);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
        {
            result.AddErrorMessage("Shipping tax override creation was cancelled by a notification handler");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Check for duplicate
            var duplicateExists = await db.ShippingTaxOverrides
                .AnyAsync(o =>
                    o.CountryCode == entity.CountryCode &&
                    o.RegionCode == normalizedState,
                    cancellationToken);

            if (duplicateExists)
            {
                result.AddErrorMessage("A shipping tax override for this location already exists");
                return false;
            }

            // Validate tax group exists if specified
            if (entity.ShippingTaxGroupId.HasValue)
            {
                var taxGroupExists = await db.TaxGroups
                    .AnyAsync(tg => tg.Id == entity.ShippingTaxGroupId.Value, cancellationToken);

                if (!taxGroupExists)
                {
                    result.AddErrorMessage("Tax group not found");
                    return false;
                }
            }

            db.ShippingTaxOverrides.Add(entity);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = entity;
            return true;
        });
        scope.Complete();

        // Publish created notification (informational)
        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(
                new ShippingTaxOverrideCreatedNotification(entity), cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Updates an existing shipping tax override
    /// </summary>
    public async Task<CrudResult<ShippingTaxOverride>> UpdateShippingTaxOverrideAsync(
        Guid id,
        UpdateShippingTaxOverrideDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ShippingTaxOverride>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.ShippingTaxOverrides
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

            if (existing == null)
            {
                result.AddErrorMessage("Shipping tax override not found");
                return false;
            }

            // Publish saving notification (cancelable)
            var savingNotification = new ShippingTaxOverrideSavingNotification(existing);
            if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
            {
                result.AddErrorMessage("Shipping tax override update was cancelled by a notification handler");
                return false;
            }

            // Validate tax group exists if specified
            if (dto.ShippingTaxGroupId.HasValue)
            {
                var taxGroupExists = await db.TaxGroups
                    .AnyAsync(tg => tg.Id == dto.ShippingTaxGroupId.Value, cancellationToken);

                if (!taxGroupExists)
                {
                    result.AddErrorMessage("Tax group not found");
                    return false;
                }
            }

            existing.ShippingTaxGroupId = dto.ShippingTaxGroupId;
            existing.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = existing;
            return true;
        });
        scope.Complete();

        // Publish saved notification (informational)
        if (result.Success && result.ResultObject != null)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(
                new ShippingTaxOverrideSavedNotification(result.ResultObject), cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a shipping tax override
    /// </summary>
    public async Task<CrudResult<bool>> DeleteShippingTaxOverrideAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        string countryCode = string.Empty;
        string? regionCode = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var entity = await db.ShippingTaxOverrides
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

            if (entity == null)
            {
                result.AddErrorMessage("Shipping tax override not found");
                return false;
            }

            // Publish deleting notification (cancelable)
            var deletingNotification = new ShippingTaxOverrideDeletingNotification(entity);
            if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
            {
                result.AddErrorMessage("Shipping tax override deletion was cancelled by a notification handler");
                return false;
            }

            // Capture details for deleted notification
            countryCode = entity.CountryCode;
            regionCode = entity.RegionCode;

            db.ShippingTaxOverrides.Remove(entity);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        // Publish deleted notification (informational)
        if (result.Success)
        {
            await InvalidateTaxCacheAsync(cancellationToken);
            await notificationPublisher.PublishAsync(
                new ShippingTaxOverrideDeletedNotification(id, countryCode, regionCode),
                cancellationToken);
        }

        return result;
    }

    #endregion

    private static string NormalizeCountryCode(string countryCode) => countryCode.Trim().ToUpperInvariant();

    private static string? NormalizeRegionCode(string? regionCode) =>
        string.IsNullOrWhiteSpace(regionCode) ? null : regionCode.Trim().ToUpperInvariant();

    private Task InvalidateTaxCacheAsync(CancellationToken cancellationToken) =>
        cacheService.RemoveByTagAsync(TaxCacheTag, cancellationToken);
}
