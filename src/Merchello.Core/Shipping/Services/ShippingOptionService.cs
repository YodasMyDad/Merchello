using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.ShippingOptionNotifications;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingOptionService(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    IShippingProviderManager providerManager,
    ShippingOptionFactory shippingOptionFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<ShippingOptionService> logger) : IShippingOptionService
{
    #region Shipping Options

    public async Task<List<ShippingOptionListItemDto>> GetAllAsync(CancellationToken ct = default)
    {
        using var scope = scopeProvider.CreateScope();
        var options = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .Include(o => o.Warehouse)
                .AsSplitQuery()
                .OrderBy(o => o.Warehouse!.Name)
                .ThenBy(o => o.Name)
                .Select(o => new ShippingOptionListItemDto
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
                    ExclusionCount = o.ExcludedRegions.Count,
                    UpdateDate = o.UpdateDate
                })
                .ToListAsync(ct));
        scope.Complete();

        // Resolve provider display names and capabilities
        var providers = await providerManager.GetProvidersAsync(ct);
        var providerLookup = providers.ToDictionary(
            p => p.Metadata.Key,
            p => (p.Metadata.DisplayName, p.Metadata.ConfigCapabilities.UsesLiveRates),
            StringComparer.OrdinalIgnoreCase);

        foreach (var option in options)
        {
            if (providerLookup.TryGetValue(option.ProviderKey, out var providerInfo))
            {
                option.ProviderDisplayName = providerInfo.DisplayName;
                option.UsesLiveRates = providerInfo.UsesLiveRates;
            }
            else
            {
                option.ProviderDisplayName = option.ProviderKey;
                option.UsesLiveRates = false;
            }
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
                .AsSplitQuery()
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
            ExclusionCount = option.ExcludedRegions.Count,
            UpdateDate = option.UpdateDate,
            Costs = option.ShippingCosts
                .OrderBy(c => c.CountryCode)
                .ThenBy(c => c.RegionCode)
                .Select(c => new ShippingCostDto
                {
                    Id = c.Id,
                    CountryCode = c.CountryCode,
                    RegionCode = c.RegionCode,
                    Cost = c.Cost,
                    RegionDisplay = FormatRegion(c.CountryCode, c.RegionCode)
                })
                .ToList(),
            WeightTiers = option.WeightTiers
                .OrderBy(t => t.CountryCode)
                .ThenBy(t => t.RegionCode)
                .ThenBy(t => t.MinWeightKg)
                .Select(t => new ShippingWeightTierDto
                {
                    Id = t.Id,
                    CountryCode = t.CountryCode,
                    RegionCode = t.RegionCode,
                    MinWeightKg = t.MinWeightKg,
                    MaxWeightKg = t.MaxWeightKg,
                    Surcharge = t.Surcharge,
                    WeightRangeDisplay = FormatWeightRange(t.MinWeightKg, t.MaxWeightKg),
                    RegionDisplay = FormatRegion(t.CountryCode, t.RegionCode)
                })
                .ToList(),
            ExcludedRegions = option.ExcludedRegions
                .OrderBy(x => x.CountryCode)
                .ThenBy(x => x.RegionCode)
                .Select(x => new ShippingDestinationExclusionDto
                {
                    Id = x.Id,
                    CountryCode = x.CountryCode,
                    RegionCode = x.RegionCode,
                    RegionDisplay = FormatRegion(x.CountryCode, x.RegionCode)
                })
                .ToList(),
            PostcodeRules = option.PostcodeRules
                .OrderBy(r => r.CountryCode)
                .ThenBy(r => r.Pattern)
                .Select(r => new ShippingPostcodeRuleDto
                {
                    Id = r.Id,
                    CountryCode = r.CountryCode,
                    Pattern = r.Pattern,
                    MatchType = r.MatchType.ToString(),
                    Action = r.Action.ToString(),
                    Surcharge = r.Surcharge,
                    Description = r.Description,
                    MatchTypeDisplay = FormatMatchType(r.MatchType),
                    ActionDisplay = FormatRuleAction(r.Action),
                    CountryDisplay = r.CountryCode
                })
                .ToList()
        };
    }

    public async Task<CrudResult<ShippingOption>> CreateAsync(CreateShippingOptionDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingOption>();

        if (!ValidateDeliveryDays(dto, result))
            return result;

        // Serialize provider settings to JSON
        string? providerSettingsJson = null;
        if (dto.ProviderSettings != null && dto.ProviderSettings.Count > 0)
        {
            providerSettingsJson = JsonSerializer.Serialize(dto.ProviderSettings);
        }

        var option = shippingOptionFactory.Create(
            dto.Name,
            dto.WarehouseId,
            dto.ProviderKey,
            dto.ServiceType,
            providerSettingsJson,
            dto.IsEnabled,
            dto.FixedCost,
            dto.DaysFrom,
            dto.DaysTo,
            dto.IsNextDay,
            dto.NextDayCutOffTime,
            dto.AllowsDeliveryDateSelection,
            dto.MinDeliveryDays,
            dto.MaxDeliveryDays,
            dto.AllowedDaysOfWeek,
            dto.IsDeliveryDateGuaranteed);
        option.SetExcludedRegions(NormalizeExcludedRegions(dto.ExcludedRegions));

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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.ShippingOptions.Add(option);
            await db.SaveChangesAsync(ct);
            result.ResultObject = option;
            return true;
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

        if (!ValidateDeliveryDays(dto, result))
            return result;

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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var option = await db.ShippingOptions.FindAsync([id], ct);
            if (option == null) return false;

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
            if (dto.ExcludedRegions != null)
            {
                option.SetExcludedRegions(NormalizeExcludedRegions(dto.ExcludedRegions));
            }
            option.UpdateDate = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            result.ResultObject = option;
            return true;
        });
        scope.Complete();

        if (result.Success && result.ResultObject != null)
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var option = await db.ShippingOptions.FindAsync([id], ct);
            if (option == null) return false;

            db.ShippingOptions.Remove(option);
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;

            logger.LogInformation("Deleted shipping option {Name} ({Id})", option.Name, id);
            return true;
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

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var option = await db.ShippingOptions.FirstOrDefaultAsync(o => o.Id == optionId, ct);
            if (option == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping option not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var costs = option.ShippingCosts;
            var countryCode = dto.CountryCode.ToUpperInvariant();
            var stateCode = dto.RegionCode?.ToUpperInvariant();

            var exists = costs.Any(c =>
                c.CountryCode == countryCode &&
                c.RegionCode == stateCode);

            if (exists)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "A cost for this country/state already exists",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var cost = new ShippingCost
            {
                ShippingOptionId = optionId,
                CountryCode = countryCode,
                RegionCode = stateCode,
                Cost = dto.Cost
            };

            costs.Add(cost);
            option.SetShippingCosts(costs);
            option.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = cost;
            return true;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<ShippingCost>> UpdateCostAsync(Guid costId, CreateShippingCostDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingCost>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingCostAsync(db, costId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping cost not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, targetCost) = found.Value;
            var costs = targetOption.ShippingCosts;
            var updatedCost = costs.FirstOrDefault(c => c.Id == targetCost.Id);
            if (updatedCost == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping cost not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            updatedCost.CountryCode = dto.CountryCode.ToUpperInvariant();
            updatedCost.RegionCode = dto.RegionCode?.ToUpperInvariant();
            updatedCost.Cost = dto.Cost;
            updatedCost.ShippingOptionId = targetOption.Id;

            targetOption.SetShippingCosts(costs);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = updatedCost;
            return true;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<bool>> DeleteCostAsync(Guid costId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingCostAsync(db, costId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping cost not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, targetCost) = found.Value;

            var costs = targetOption.ShippingCosts;
            costs.RemoveAll(c => c.Id == costId);
            targetOption.SetShippingCosts(costs);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;
            return true;
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

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var option = await db.ShippingOptions.FirstOrDefaultAsync(o => o.Id == optionId, ct);
            if (option == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping option not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var tier = new ShippingWeightTier
            {
                ShippingOptionId = optionId,
                CountryCode = dto.CountryCode.ToUpperInvariant(),
                RegionCode = dto.RegionCode?.ToUpperInvariant(),
                MinWeightKg = dto.MinWeightKg,
                MaxWeightKg = dto.MaxWeightKg,
                Surcharge = dto.Surcharge
            };

            var tiers = option.WeightTiers;
            tiers.Add(tier);
            option.SetShippingWeightTiers(tiers);
            option.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = tier;
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingWeightTierAsync(db, tierId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Weight tier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, targetTier) = found.Value;
            var tiers = targetOption.WeightTiers;
            var updatedTier = tiers.FirstOrDefault(t => t.Id == targetTier.Id);
            if (updatedTier == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Weight tier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            updatedTier.CountryCode = dto.CountryCode.ToUpperInvariant();
            updatedTier.RegionCode = dto.RegionCode?.ToUpperInvariant();
            updatedTier.MinWeightKg = dto.MinWeightKg;
            updatedTier.MaxWeightKg = dto.MaxWeightKg;
            updatedTier.Surcharge = dto.Surcharge;
            updatedTier.UpdateDate = DateTime.UtcNow;
            updatedTier.ShippingOptionId = targetOption.Id;

            targetOption.SetShippingWeightTiers(tiers);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = updatedTier;
            return true;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<bool>> DeleteWeightTierAsync(Guid tierId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingWeightTierAsync(db, tierId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Weight tier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, targetTier) = found.Value;

            var tiers = targetOption.WeightTiers;
            tiers.RemoveAll(t => t.Id == tierId);
            targetOption.SetShippingWeightTiers(tiers);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Postcode Rules

    public async Task<CrudResult<ShippingPostcodeRuleDto>> AddPostcodeRuleAsync(Guid optionId, CreateShippingPostcodeRuleDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingPostcodeRuleDto>();

        if (!TryParseMatchType(dto.MatchType, out var matchType))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Invalid match type: {dto.MatchType}",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        if (!TryParseRuleAction(dto.Action, out var action))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Invalid action: {dto.Action}",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var option = await db.ShippingOptions.FirstOrDefaultAsync(o => o.Id == optionId, ct);
            if (option == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipping option not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var rule = new ShippingPostcodeRule
            {
                ShippingOptionId = optionId,
                CountryCode = dto.CountryCode.ToUpperInvariant(),
                Pattern = dto.Pattern.Trim(),
                MatchType = matchType,
                Action = action,
                Surcharge = dto.Surcharge,
                Description = dto.Description
            };

            var rules = option.PostcodeRules;
            rules.Add(rule);
            option.SetPostcodeRules(rules);
            option.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            result.ResultObject = new ShippingPostcodeRuleDto
            {
                Id = rule.Id,
                CountryCode = rule.CountryCode,
                Pattern = rule.Pattern,
                MatchType = rule.MatchType.ToString(),
                Action = rule.Action.ToString(),
                Surcharge = rule.Surcharge,
                Description = rule.Description,
                MatchTypeDisplay = FormatMatchType(rule.MatchType),
                ActionDisplay = FormatRuleAction(rule.Action),
                CountryDisplay = rule.CountryCode
            };
            return true;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<ShippingPostcodeRuleDto>> UpdatePostcodeRuleAsync(Guid ruleId, CreateShippingPostcodeRuleDto dto, CancellationToken ct = default)
    {
        var result = new CrudResult<ShippingPostcodeRuleDto>();

        if (!TryParseMatchType(dto.MatchType, out var matchType))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Invalid match type: {dto.MatchType}",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        if (!TryParseRuleAction(dto.Action, out var action))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Invalid action: {dto.Action}",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingPostcodeRuleAsync(db, ruleId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Postcode rule not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, targetRule) = found.Value;
            var rules = targetOption.PostcodeRules;
            var updatedRule = rules.FirstOrDefault(r => r.Id == targetRule.Id);
            if (updatedRule == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Postcode rule not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            updatedRule.CountryCode = dto.CountryCode.ToUpperInvariant();
            updatedRule.Pattern = dto.Pattern.Trim();
            updatedRule.MatchType = matchType;
            updatedRule.Action = action;
            updatedRule.Surcharge = dto.Surcharge;
            updatedRule.Description = dto.Description;
            updatedRule.UpdateDate = DateTime.UtcNow;
            updatedRule.ShippingOptionId = targetOption.Id;

            targetOption.SetPostcodeRules(rules);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            result.ResultObject = new ShippingPostcodeRuleDto
            {
                Id = updatedRule.Id,
                CountryCode = updatedRule.CountryCode,
                Pattern = updatedRule.Pattern,
                MatchType = updatedRule.MatchType.ToString(),
                Action = updatedRule.Action.ToString(),
                Surcharge = updatedRule.Surcharge,
                Description = updatedRule.Description,
                MatchTypeDisplay = FormatMatchType(updatedRule.MatchType),
                ActionDisplay = FormatRuleAction(updatedRule.Action),
                CountryDisplay = updatedRule.CountryCode
            };
            return true;
        });
        scope.Complete();

        return result;
    }

    public async Task<CrudResult<bool>> DeletePostcodeRuleAsync(Guid ruleId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var found = await FindShippingPostcodeRuleAsync(db, ruleId, ct);
            if (found == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Postcode rule not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var (targetOption, _) = found.Value;

            var rules = targetOption.PostcodeRules;
            rules.RemoveAll(r => r.Id == ruleId);
            targetOption.SetPostcodeRules(rules);
            targetOption.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Helpers

    private static async Task<(ShippingOption Option, ShippingCost Cost)?> FindShippingCostAsync(
        MerchelloDbContext db,
        Guid costId,
        CancellationToken ct)
    {
        var options = await db.ShippingOptions.ToListAsync(ct);
        foreach (var option in options)
        {
            var match = option.ShippingCosts.FirstOrDefault(c => c.Id == costId);
            if (match != null)
            {
                return (option, match);
            }
        }

        return null;
    }

    private static async Task<(ShippingOption Option, ShippingWeightTier Tier)?> FindShippingWeightTierAsync(
        MerchelloDbContext db,
        Guid tierId,
        CancellationToken ct)
    {
        var options = await db.ShippingOptions.ToListAsync(ct);
        foreach (var option in options)
        {
            var match = option.WeightTiers.FirstOrDefault(t => t.Id == tierId);
            if (match != null)
            {
                return (option, match);
            }
        }

        return null;
    }

    private static async Task<(ShippingOption Option, ShippingPostcodeRule Rule)?> FindShippingPostcodeRuleAsync(
        MerchelloDbContext db,
        Guid ruleId,
        CancellationToken ct)
    {
        var options = await db.ShippingOptions.ToListAsync(ct);
        foreach (var option in options)
        {
            var match = option.PostcodeRules.FirstOrDefault(r => r.Id == ruleId);
            if (match != null)
            {
                return (option, match);
            }
        }

        return null;
    }

    private static string FormatRegion(string countryCode, string? stateCode)
    {
        if (countryCode == "*") return "All Countries";
        return string.IsNullOrEmpty(stateCode) ? countryCode : $"{stateCode}, {countryCode}";
    }

    private static List<ShippingOptionExcludedRegion> NormalizeExcludedRegions(
        IReadOnlyCollection<CreateShippingDestinationExclusionDto>? exclusions)
    {
        if (exclusions is not { Count: > 0 })
        {
            return [];
        }

        return exclusions
            .Where(x => !string.IsNullOrWhiteSpace(x.CountryCode))
            .Select(x => new ShippingOptionExcludedRegion
            {
                CountryCode = x.CountryCode.Trim().ToUpperInvariant(),
                RegionCode = string.IsNullOrWhiteSpace(x.RegionCode)
                    ? null
                    : x.RegionCode.Trim().ToUpperInvariant()
            })
            .GroupBy(x => $"{x.CountryCode}:{x.RegionCode ?? string.Empty}", StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();
    }

    private static string FormatWeightRange(decimal min, decimal? max)
    {
        return max.HasValue ? $"{min}-{max} kg" : $"{min}+ kg";
    }

    private static string FormatMatchType(PostcodeMatchType matchType)
    {
        return matchType switch
        {
            PostcodeMatchType.Prefix => "Prefix match",
            PostcodeMatchType.OutcodeRange => "UK outcode range",
            PostcodeMatchType.NumericRange => "Numeric range",
            PostcodeMatchType.Exact => "Exact match",
            _ => matchType.ToString()
        };
    }

    private static string FormatRuleAction(PostcodeRuleAction action)
    {
        return action switch
        {
            PostcodeRuleAction.Block => "Block delivery",
            PostcodeRuleAction.Surcharge => "Add surcharge",
            _ => action.ToString()
        };
    }

    private static bool TryParseMatchType(string value, out PostcodeMatchType matchType)
    {
        return Enum.TryParse(value, ignoreCase: true, out matchType);
    }

    private static bool TryParseRuleAction(string value, out PostcodeRuleAction action)
    {
        return Enum.TryParse(value, ignoreCase: true, out action);
    }

    /// <summary>
    /// Validates DaysFrom/DaysTo for flat-rate providers (not next-day).
    /// Returns false if validation fails (error messages added to result).
    /// </summary>
    private static bool ValidateDeliveryDays(CreateShippingOptionDto dto, CrudResult<ShippingOption> result)
    {
        // Dynamic providers calculate transit time from carrier APIs - skip validation
        if (dto.ProviderKey is not null and not "flat-rate")
            return true;

        // Next-day delivery uses the IsNextDay flag, not days range
        if (dto.IsNextDay)
            return true;

        if (dto.DaysFrom < 1)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Minimum delivery days must be at least 1",
                ResultMessageType = ResultMessageType.Error
            });
            return false;
        }

        if (dto.DaysTo < 1)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Maximum delivery days must be at least 1",
                ResultMessageType = ResultMessageType.Error
            });
            return false;
        }

        if (dto.DaysTo < dto.DaysFrom)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Maximum delivery days must be greater than or equal to minimum days",
                ResultMessageType = ResultMessageType.Error
            });
            return false;
        }

        return true;
    }

    #endregion
}
