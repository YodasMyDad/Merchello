using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.ShippingOptionNotifications;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingOptionService(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    IShippingProviderManager providerManager,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<ShippingOptionService> logger) : IShippingOptionService
{
    #region Shipping Options

    public async Task<List<ShippingOptionDto>> GetAllAsync(CancellationToken ct = default)
    {
        using var scope = scopeProvider.CreateScope();
        var options = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .Include(o => o.Warehouse)
                .Include(o => o.ShippingCosts)
                .Include(o => o.WeightTiers)
                .OrderBy(o => o.Warehouse!.Name)
                .ThenBy(o => o.Name)
                .Select(o => new ShippingOptionDto
                {
                    Id = o.Id,
                    Name = o.Name,
                    WarehouseId = o.WarehouseId,
                    WarehouseName = o.Warehouse!.Name,
                    ProviderKey = o.ProviderKey,
                    ServiceType = o.ServiceType,
                    IsEnabled = o.IsEnabled,
                    FixedCost = o.FixedCost,
                    DaysFrom = o.DaysFrom,
                    DaysTo = o.DaysTo,
                    IsNextDay = o.IsNextDay,
                    AllowsDeliveryDateSelection = o.AllowsDeliveryDateSelection,
                    CostCount = o.ShippingCosts.Count,
                    WeightTierCount = o.WeightTiers.Count,
                    UpdateDate = o.UpdateDate
                })
                .ToListAsync(ct));
        scope.Complete();

        // Resolve provider display names
        var providers = await providerManager.GetProvidersAsync(ct);
        var providerLookup = providers.ToDictionary(p => p.Metadata.Key, p => p.Metadata.DisplayName);
        foreach (var option in options)
        {
            option.ProviderDisplayName = providerLookup.GetValueOrDefault(option.ProviderKey, option.ProviderKey);
        }

        return options;
    }

    public async Task<List<string>> GetConfiguredServiceTypesAsync(string providerKey, CancellationToken ct = default)
    {
        using var scope = scopeProvider.CreateScope();
        var serviceTypes = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .Where(o => o.ProviderKey == providerKey && !string.IsNullOrEmpty(o.ServiceType))
                .Select(o => o.ServiceType!)
                .Distinct()
                .ToListAsync(ct));
        scope.Complete();
        return serviceTypes;
    }

    public async Task<ShippingOptionDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = scopeProvider.CreateScope();
        var option = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .Include(o => o.Warehouse)
                .Include(o => o.ShippingCosts)
                .Include(o => o.WeightTiers)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, ct));
        scope.Complete();

        if (option == null) return null;

        // Resolve provider display name
        var provider = await providerManager.GetProviderAsync(option.ProviderKey, requireEnabled: false, ct);
        var providerDisplayName = provider?.Metadata.DisplayName ?? option.ProviderKey;

        // Deserialize provider settings
        Dictionary<string, string>? providerSettings = null;
        if (!string.IsNullOrWhiteSpace(option.ProviderSettings))
        {
            try
            {
                providerSettings = JsonSerializer.Deserialize<Dictionary<string, string>>(option.ProviderSettings);
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Failed to deserialize ProviderSettings for shipping option {Id}", id);
            }
        }

        return new ShippingOptionDetailDto
        {
            Id = option.Id,
            Name = option.Name,
            WarehouseId = option.WarehouseId,
            WarehouseName = option.Warehouse?.Name,
            ProviderKey = option.ProviderKey,
            ServiceType = option.ServiceType,
            ProviderDisplayName = providerDisplayName,
            ProviderSettings = providerSettings,
            IsEnabled = option.IsEnabled,
            FixedCost = option.FixedCost,
            DaysFrom = option.DaysFrom,
            DaysTo = option.DaysTo,
            IsNextDay = option.IsNextDay,
            NextDayCutOffTime = option.NextDayCutOffTime,
            AllowsDeliveryDateSelection = option.AllowsDeliveryDateSelection,
            MinDeliveryDays = option.MinDeliveryDays,
            MaxDeliveryDays = option.MaxDeliveryDays,
            AllowedDaysOfWeek = option.AllowedDaysOfWeek,
            IsDeliveryDateGuaranteed = option.IsDeliveryDateGuaranteed,
            CostCount = option.ShippingCosts.Count,
            WeightTierCount = option.WeightTiers.Count,
            UpdateDate = option.UpdateDate,
            Costs = option.ShippingCosts
                .OrderBy(c => c.CountryCode)
                .ThenBy(c => c.StateOrProvinceCode)
                .Select(c => new ShippingCostDto
                {
                    Id = c.Id,
                    CountryCode = c.CountryCode,
                    StateOrProvinceCode = c.StateOrProvinceCode,
                    Cost = c.Cost,
                    RegionDisplay = FormatRegion(c.CountryCode, c.StateOrProvinceCode)
                })
                .ToList(),
            WeightTiers = option.WeightTiers
                .OrderBy(t => t.CountryCode)
                .ThenBy(t => t.StateOrProvinceCode)
                .ThenBy(t => t.MinWeightKg)
                .Select(t => new ShippingWeightTierDto
                {
                    Id = t.Id,
                    CountryCode = t.CountryCode,
                    StateOrProvinceCode = t.StateOrProvinceCode,
                    MinWeightKg = t.MinWeightKg,
                    MaxWeightKg = t.MaxWeightKg,
                    Surcharge = t.Surcharge,
                    WeightRangeDisplay = FormatWeightRange(t.MinWeightKg, t.MaxWeightKg),
                    RegionDisplay = FormatRegion(t.CountryCode, t.StateOrProvinceCode)
                })
                .ToList()
        };
    }

    public async Task<CrudResult<ShippingOption>> CreateAsync(CreateShippingOptionDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingOption>();

        // Serialize provider settings to JSON
        string? providerSettingsJson = null;
        if (dto.ProviderSettings != null && dto.ProviderSettings.Count > 0)
        {
            providerSettingsJson = JsonSerializer.Serialize(dto.ProviderSettings);
        }

        var option = new ShippingOption
        {
            Name = dto.Name,
            WarehouseId = dto.WarehouseId,
            ProviderKey = dto.ProviderKey,
            ServiceType = dto.ServiceType,
            ProviderSettings = providerSettingsJson,
            IsEnabled = dto.IsEnabled,
            FixedCost = dto.FixedCost,
            DaysFrom = dto.DaysFrom,
            DaysTo = dto.DaysTo,
            IsNextDay = dto.IsNextDay,
            NextDayCutOffTime = dto.NextDayCutOffTime,
            AllowsDeliveryDateSelection = dto.AllowsDeliveryDateSelection,
            MinDeliveryDays = dto.MinDeliveryDays,
            MaxDeliveryDays = dto.MaxDeliveryDays,
            AllowedDaysOfWeek = dto.AllowedDaysOfWeek,
            IsDeliveryDateGuaranteed = dto.IsDeliveryDateGuaranteed
        };

        // Publish "Before" notification - handlers can modify or cancel
        var creatingNotification = new ShippingOptionCreatingNotification(option);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = creatingNotification.CancelReason ?? "Shipping option creation cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.ShippingOptions.Add(option);
            await db.SaveChangesAsync(ct);
            result.ResultObject = option;
        });
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new ShippingOptionCreatedNotification(option), ct);

        logger.LogInformation("Created shipping option {Name} ({Id}) with provider {Provider}", option.Name, option.Id, option.ProviderKey);
        return result;
    }

    public async Task<CrudResult<ShippingOption>> UpdateAsync(Guid id, CreateShippingOptionDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingOption>();

        // Serialize provider settings to JSON
        string? providerSettingsJson = null;
        if (dto.ProviderSettings != null && dto.ProviderSettings.Count > 0)
        {
            providerSettingsJson = JsonSerializer.Serialize(dto.ProviderSettings);
        }

        // First fetch the option to validate and publish notification
        ShippingOption? existingOption;
        using (var readScope = scopeProvider.CreateScope())
        {
            existingOption = await readScope.ExecuteWithContextAsync(async db =>
                await db.ShippingOptions.FindAsync([id], ct));
            readScope.Complete();
        }

        if (existingOption == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Shipping option not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can modify or cancel
        var savingNotification = new ShippingOptionSavingNotification(existingOption);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, ct))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = savingNotification.CancelReason ?? "Shipping option update cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var option = await db.ShippingOptions.FindAsync([id], ct);
            if (option == null) return;

            option.Name = dto.Name;
            option.WarehouseId = dto.WarehouseId;
            option.ProviderKey = dto.ProviderKey;
            option.ServiceType = dto.ServiceType;
            option.ProviderSettings = providerSettingsJson;
            option.IsEnabled = dto.IsEnabled;
            option.FixedCost = dto.FixedCost;
            option.DaysFrom = dto.DaysFrom;
            option.DaysTo = dto.DaysTo;
            option.IsNextDay = dto.IsNextDay;
            option.NextDayCutOffTime = dto.NextDayCutOffTime;
            option.AllowsDeliveryDateSelection = dto.AllowsDeliveryDateSelection;
            option.MinDeliveryDays = dto.MinDeliveryDays;
            option.MaxDeliveryDays = dto.MaxDeliveryDays;
            option.AllowedDaysOfWeek = dto.AllowedDaysOfWeek;
            option.IsDeliveryDateGuaranteed = dto.IsDeliveryDateGuaranteed;
            option.UpdateDate = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            result.ResultObject = option;
        });
        scope.Complete();

        if (result.Successful && result.ResultObject != null)
        {
            // Publish "After" notification
            await notificationPublisher.PublishAsync(new ShippingOptionSavedNotification(result.ResultObject), ct);
            logger.LogInformation("Updated shipping option {Name} ({Id})", result.ResultObject.Name, id);
        }
        return result;
    }

    public async Task<CrudResult<bool>> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        // First fetch the option to validate and publish notification
        ShippingOption? optionToDelete;
        int productCount;
        using (var readScope = scopeProvider.CreateScope())
        {
            optionToDelete = await readScope.ExecuteWithContextAsync(async db =>
                await db.ShippingOptions
                    .Include(o => o.Products)
                    .FirstOrDefaultAsync(o => o.Id == id, ct));
            readScope.Complete();
        }

        if (optionToDelete == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Shipping option not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        productCount = optionToDelete.Products.Count;
        if (productCount > 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Cannot delete: {productCount} product(s) are using this shipping option",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var deletingNotification = new ShippingOptionDeletingNotification(optionToDelete);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, ct))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = deletingNotification.CancelReason ?? "Shipping option deletion cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var option = await db.ShippingOptions.FindAsync([id], ct);
            if (option == null) return;

            db.ShippingOptions.Remove(option);
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;

            logger.LogInformation("Deleted shipping option {Name} ({Id})", option.Name, id);
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject)
        {
            await notificationPublisher.PublishAsync(new ShippingOptionDeletedNotification(optionToDelete), ct);
        }

        return result;
    }

    #endregion

    #region Shipping Costs

    public async Task<CrudResult<ShippingCost>> AddCostAsync(Guid optionId, CreateShippingCostDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingCost>();

        var cost = new ShippingCost
        {
            ShippingOptionId = optionId,
            CountryCode = dto.CountryCode.ToUpperInvariant(),
            StateOrProvinceCode = dto.StateOrProvinceCode?.ToUpperInvariant(),
            Cost = dto.Cost
        };

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Check for duplicate
            var exists = await db.Set<ShippingCost>().AnyAsync(c =>
                c.ShippingOptionId == optionId &&
                c.CountryCode == cost.CountryCode &&
                c.StateOrProvinceCode == cost.StateOrProvinceCode, ct);

            if (exists)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "A cost for this country/state already exists",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            db.Set<ShippingCost>().Add(cost);
            await db.SaveChangesAsync(ct);
            result.ResultObject = cost;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<ShippingCost>> UpdateCostAsync(Guid costId, CreateShippingCostDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingCost>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var cost = await db.Set<ShippingCost>().FindAsync([costId], ct);
            if (cost == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping cost not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            cost.CountryCode = dto.CountryCode.ToUpperInvariant();
            cost.StateOrProvinceCode = dto.StateOrProvinceCode?.ToUpperInvariant();
            cost.Cost = dto.Cost;

            await db.SaveChangesAsync(ct);
            result.ResultObject = cost;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<bool>> DeleteCostAsync(Guid costId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var cost = await db.Set<ShippingCost>().FindAsync([costId], ct);
            if (cost == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping cost not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            db.Set<ShippingCost>().Remove(cost);
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Weight Tiers

    public async Task<CrudResult<ShippingWeightTier>> AddWeightTierAsync(Guid optionId, CreateShippingWeightTierDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingWeightTier>();

        if (dto.MaxWeightKg.HasValue && dto.MaxWeightKg <= dto.MinWeightKg)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Max weight must be greater than min weight",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var tier = new ShippingWeightTier
        {
            ShippingOptionId = optionId,
            CountryCode = dto.CountryCode.ToUpperInvariant(),
            StateOrProvinceCode = dto.StateOrProvinceCode?.ToUpperInvariant(),
            MinWeightKg = dto.MinWeightKg,
            MaxWeightKg = dto.MaxWeightKg,
            Surcharge = dto.Surcharge
        };

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.ShippingWeightTiers.Add(tier);
            await db.SaveChangesAsync(ct);
            result.ResultObject = tier;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<ShippingWeightTier>> UpdateWeightTierAsync(Guid tierId, CreateShippingWeightTierDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingWeightTier>();

        if (dto.MaxWeightKg.HasValue && dto.MaxWeightKg <= dto.MinWeightKg)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Max weight must be greater than min weight",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var tier = await db.ShippingWeightTiers.FindAsync([tierId], ct);
            if (tier == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Weight tier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            tier.CountryCode = dto.CountryCode.ToUpperInvariant();
            tier.StateOrProvinceCode = dto.StateOrProvinceCode?.ToUpperInvariant();
            tier.MinWeightKg = dto.MinWeightKg;
            tier.MaxWeightKg = dto.MaxWeightKg;
            tier.Surcharge = dto.Surcharge;
            tier.UpdateDate = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            result.ResultObject = tier;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<bool>> DeleteWeightTierAsync(Guid tierId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var tier = await db.ShippingWeightTiers.FindAsync([tierId], ct);
            if (tier == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Weight tier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            db.ShippingWeightTiers.Remove(tier);
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Helpers

    private static string FormatRegion(string countryCode, string? stateCode)
    {
        if (countryCode == "*") return "All Countries";
        return string.IsNullOrEmpty(stateCode) ? countryCode : $"{stateCode}, {countryCode}";
    }

    private static string FormatWeightRange(decimal min, decimal? max)
    {
        return max.HasValue ? $"{min}-{max} kg" : $"{min}+ kg";
    }

    #endregion
}
