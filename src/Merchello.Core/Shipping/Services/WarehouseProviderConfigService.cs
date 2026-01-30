using Merchello.Core.Data;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class WarehouseProviderConfigService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IWarehouseProviderConfigService
{
    public async Task<WarehouseProviderConfig?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var config = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouses = await db.Warehouses
                .AsNoTracking()
                .Select(w => new { w.Id, w.ProviderConfigsJson })
                .ToListAsync(ct);

            foreach (var warehouse in warehouses)
            {
                var configs = string.IsNullOrEmpty(warehouse.ProviderConfigsJson)
                    ? []
                    : System.Text.Json.JsonSerializer.Deserialize<List<WarehouseProviderConfig>>(warehouse.ProviderConfigsJson) ?? [];

                var match = configs.FirstOrDefault(c => c.Id == id);
                if (match != null)
                {
                    return match;
                }
            }

            return null;
        });
        scope.Complete();
        return config;
    }

    public async Task<WarehouseProviderConfig?> GetByWarehouseAndProviderAsync(
        Guid warehouseId, string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var config = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouse = await db.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, ct);

            if (warehouse == null)
            {
                return null;
            }

            return warehouse.ProviderConfigs
                .FirstOrDefault(c => string.Equals(c.ProviderKey, providerKey, StringComparison.OrdinalIgnoreCase));
        });
        scope.Complete();
        return config;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetByWarehouseAsync(
        Guid warehouseId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouse = await db.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, ct);

            return warehouse?.ProviderConfigs ?? [];
        });
        scope.Complete();
        return configs;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetByProviderAsync(
        string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouses = await db.Warehouses
                .AsNoTracking()
                .Select(w => new { w.Id, w.ProviderConfigsJson })
                .ToListAsync(ct);

            List<WarehouseProviderConfig> results = [];
            foreach (var warehouse in warehouses)
            {
                var parsed = string.IsNullOrEmpty(warehouse.ProviderConfigsJson)
                    ? []
                    : System.Text.Json.JsonSerializer.Deserialize<List<WarehouseProviderConfig>>(warehouse.ProviderConfigsJson) ?? [];

                results.AddRange(parsed.Where(c =>
                    string.Equals(c.ProviderKey, providerKey, StringComparison.OrdinalIgnoreCase)));
            }

            return results;
        });
        scope.Complete();
        return configs;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetAllEnabledAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouses = await db.Warehouses
                .AsNoTracking()
                .Select(w => new { w.Id, w.ProviderConfigsJson })
                .ToListAsync(ct);

            List<WarehouseProviderConfig> results = [];
            foreach (var warehouse in warehouses)
            {
                var parsed = string.IsNullOrEmpty(warehouse.ProviderConfigsJson)
                    ? []
                    : System.Text.Json.JsonSerializer.Deserialize<List<WarehouseProviderConfig>>(warehouse.ProviderConfigsJson) ?? [];

                results.AddRange(parsed.Where(c => c.IsEnabled));
            }

            return results;
        });
        scope.Complete();
        return configs;
    }

    public async Task<WarehouseProviderConfig> CreateAsync(WarehouseProviderConfig config, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == config.WarehouseId, ct);

            if (warehouse == null)
            {
                return false;
            }

            var configs = warehouse.ProviderConfigs;
            config.Id = config.Id == Guid.Empty ? Guid.NewGuid() : config.Id;
            config.CreateDate = DateTime.UtcNow;
            config.UpdateDate = DateTime.UtcNow;

            configs.Add(config);
            warehouse.SetProviderConfigs(configs);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
        return config;
    }

    public async Task<WarehouseProviderConfig> UpdateAsync(WarehouseProviderConfig config, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == config.WarehouseId, ct);

            if (warehouse == null)
            {
                return false;
            }

            var configs = warehouse.ProviderConfigs;
            var existing = configs.FirstOrDefault(c => c.Id == config.Id);
            if (existing == null)
            {
                return false;
            }

            existing.ProviderKey = config.ProviderKey;
            existing.IsEnabled = config.IsEnabled;
            existing.DefaultMarkupPercent = config.DefaultMarkupPercent;
            existing.ServiceMarkupsJson = config.ServiceMarkupsJson;
            existing.ExcludedServiceTypesJson = config.ExcludedServiceTypesJson;
            existing.DefaultDaysFromOverride = config.DefaultDaysFromOverride;
            existing.DefaultDaysToOverride = config.DefaultDaysToOverride;
            existing.UpdateDate = DateTime.UtcNow;

            warehouse.SetProviderConfigs(configs);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
        return config;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouses = await db.Warehouses
                .ToListAsync(ct);

            foreach (var warehouse in warehouses)
            {
                var configs = warehouse.ProviderConfigs;
                var existing = configs.FirstOrDefault(c => c.Id == id);
                if (existing == null)
                {
                    continue;
                }

                configs.Remove(existing);
                warehouse.SetProviderConfigs(configs);
                await db.SaveChangesAsync(ct);
                break;
            }
            return true;
        });
        scope.Complete();
    }

    public async Task<bool> ExistsAsync(Guid warehouseId, string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouse = await db.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, ct);

            if (warehouse == null)
            {
                return false;
            }

            return warehouse.ProviderConfigs
                .Any(c => string.Equals(c.ProviderKey, providerKey, StringComparison.OrdinalIgnoreCase));
        });
        scope.Complete();
        return exists;
    }
}
