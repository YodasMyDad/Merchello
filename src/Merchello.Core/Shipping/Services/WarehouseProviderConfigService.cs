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
            await db.WarehouseProviderConfigs.FindAsync([id], ct));
        scope.Complete();
        return config;
    }

    public async Task<WarehouseProviderConfig?> GetByWarehouseAndProviderAsync(
        Guid warehouseId, string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var config = await scope.ExecuteWithContextAsync(async db =>
            await db.WarehouseProviderConfigs
                .FirstOrDefaultAsync(c => c.WarehouseId == warehouseId &&
                                          c.ProviderKey == providerKey, ct));
        scope.Complete();
        return config;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetByWarehouseAsync(
        Guid warehouseId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
            await db.WarehouseProviderConfigs
                .Where(c => c.WarehouseId == warehouseId)
                .ToListAsync(ct));
        scope.Complete();
        return configs;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetByProviderAsync(
        string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
            await db.WarehouseProviderConfigs
                .Where(c => c.ProviderKey == providerKey)
                .ToListAsync(ct));
        scope.Complete();
        return configs;
    }

    public async Task<IReadOnlyList<WarehouseProviderConfig>> GetAllEnabledAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var configs = await scope.ExecuteWithContextAsync(async db =>
            await db.WarehouseProviderConfigs
                .Where(c => c.IsEnabled)
                .ToListAsync(ct));
        scope.Complete();
        return configs;
    }

    public async Task<WarehouseProviderConfig> CreateAsync(WarehouseProviderConfig config, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            config.Id = config.Id == Guid.Empty ? Guid.NewGuid() : config.Id;
            config.CreateDate = DateTime.UtcNow;
            config.UpdateDate = DateTime.UtcNow;

            db.WarehouseProviderConfigs.Add(config);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();
        return config;
    }

    public async Task<WarehouseProviderConfig> UpdateAsync(WarehouseProviderConfig config, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            config.UpdateDate = DateTime.UtcNow;
            db.WarehouseProviderConfigs.Update(config);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();
        return config;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var config = await db.WarehouseProviderConfigs.FindAsync([id], ct);
            if (config != null)
            {
                db.WarehouseProviderConfigs.Remove(config);
                await db.SaveChangesAsync(ct);
            }
        });
        scope.Complete();
    }

    public async Task<bool> ExistsAsync(Guid warehouseId, string providerKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.WarehouseProviderConfigs
                .AnyAsync(c => c.WarehouseId == warehouseId && c.ProviderKey == providerKey, ct));
        scope.Complete();
        return exists;
    }
}
