using Merchello.Core.Data;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Discovers and configures payment provider implementations.
/// </summary>
public class PaymentProviderManager(
    ExtensionManager extensionManager,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<PaymentProviderManager> logger) : IPaymentProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredPaymentProvider>? _cachedProviders;
    private bool _disposed;

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<RegisteredPaymentProvider>> GetAvailableProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        // Fast path - volatile read ensures we see latest value
        var cached = _cachedProviders;
        if (cached != null)
        {
            return cached;
        }

        // Thread-safe initialization using semaphore
        await _cacheLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            cached = _cachedProviders;
            if (cached != null)
            {
                return cached;
            }

            // Discover all provider implementations from assemblies
            var providerInstances = extensionManager.GetInstances<IPaymentProvider>(useCaching: true)
                .Where(p => p != null)
                .Cast<IPaymentProvider>()
                .ToList();

            // Load all settings from database
            using var scope = efCoreScopeProvider.CreateScope();
            var settings = await scope.ExecuteWithContextAsync(async db =>
                await db.PaymentProviderSettings
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
            scope.Complete();

            List<RegisteredPaymentProvider> registeredProviders = [];
            HashSet<string> aliases = new(StringComparer.OrdinalIgnoreCase);

            foreach (var provider in providerInstances)
            {
                var metadata = provider.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Alias))
                {
                    logger.LogWarning(
                        "Payment provider {ProviderType} has an empty alias and will be ignored.",
                        provider.GetType().FullName);
                    continue;
                }

                if (!aliases.Add(metadata.Alias))
                {
                    logger.LogWarning(
                        "Duplicate payment provider alias '{Alias}' detected. Provider {ProviderType} will be skipped.",
                        metadata.Alias, provider.GetType().FullName);
                    continue;
                }

                // Find matching setting from database
                var setting = settings.FirstOrDefault(s =>
                    string.Equals(s.ProviderAlias, metadata.Alias, StringComparison.OrdinalIgnoreCase));

                // Configure the provider with its settings
                try
                {
                    PaymentProviderConfiguration? configuration = null;
                    if (setting != null)
                    {
                        configuration = new PaymentProviderConfiguration(setting.Configuration, setting.IsTestMode);
                    }

                    await provider.ConfigureAsync(configuration, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to configure payment provider '{Alias}'. Provider will be skipped.",
                        metadata.Alias);
                    continue;
                }

                registeredProviders.Add(new RegisteredPaymentProvider(provider, setting));
            }

            // Thread-safe assignment - volatile write ensures visibility
            _cachedProviders = registeredProviders;
            return registeredProviders;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<RegisteredPaymentProvider>> GetEnabledProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        var providers = await GetAvailableProvidersAsync(cancellationToken);
        return providers
            .Where(p => p.IsEnabled)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.DisplayName)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<RegisteredPaymentProvider?> GetProviderAsync(
        string alias,
        bool requireEnabled = true,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return null;
        }

        var providers = await GetAvailableProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return null;
        }

        if (requireEnabled && !provider.IsEnabled)
        {
            return null;
        }

        return provider;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<PaymentProviderSetting>> GetProviderSettingsAsync(
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var settings = await scope.ExecuteWithContextAsync(async db =>
            await db.PaymentProviderSettings
                .AsNoTracking()
                .OrderBy(s => s.SortOrder)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return settings;
    }

    /// <inheritdoc />
    public async Task<PaymentProviderSetting?> GetProviderSettingAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var setting = await scope.ExecuteWithContextAsync(async db =>
            await db.PaymentProviderSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken));
        scope.Complete();
        return setting;
    }

    /// <inheritdoc />
    public async Task<CrudResult<PaymentProviderSetting>> SaveProviderSettingAsync(
        PaymentProviderSetting setting,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<PaymentProviderSetting>();

        // Validate the provider alias exists
        var providers = await GetAvailableProvidersAsync(cancellationToken);
        var providerExists = providers.Any(p =>
            string.Equals(p.Metadata.Alias, setting.ProviderAlias, StringComparison.OrdinalIgnoreCase));

        if (!providerExists)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment provider with alias '{setting.ProviderAlias}' was not found.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var existing = await db.PaymentProviderSettings
                .FirstOrDefaultAsync(s => s.Id == setting.Id, cancellationToken);

            if (existing != null)
            {
                // Update existing
                existing.DisplayName = setting.DisplayName;
                existing.IsEnabled = setting.IsEnabled;
                existing.IsTestMode = setting.IsTestMode;
                existing.Configuration = setting.Configuration;
                existing.SortOrder = setting.SortOrder;
                existing.DateUpdated = DateTime.UtcNow;
            }
            else
            {
                // Check for duplicate alias
                var duplicateAlias = await db.PaymentProviderSettings
                    .AnyAsync(s => s.ProviderAlias == setting.ProviderAlias, cancellationToken);

                if (duplicateAlias)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"A configuration for provider '{setting.ProviderAlias}' already exists.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return;
                }

                // Create new
                setting.DateCreated = DateTime.UtcNow;
                setting.DateUpdated = DateTime.UtcNow;
                db.PaymentProviderSettings.Add(setting);
            }

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = setting;
        });
        scope.Complete();

        // Refresh cache so provider gets reconfigured
        RefreshCache();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteProviderSettingAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var setting = await db.PaymentProviderSettings
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            if (setting == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Payment provider setting with ID '{id}' was not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            db.PaymentProviderSettings.Remove(setting);
            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        // Refresh cache
        RefreshCache();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> SetProviderEnabledAsync(
        Guid settingId,
        bool enabled,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var setting = await db.PaymentProviderSettings
                .FirstOrDefaultAsync(s => s.Id == settingId, cancellationToken);

            if (setting == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Payment provider setting with ID '{settingId}' was not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            setting.IsEnabled = enabled;
            setting.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;

            logger.LogInformation(
                "Payment provider '{Alias}' has been {Status}.",
                setting.ProviderAlias,
                enabled ? "enabled" : "disabled");
        });
        scope.Complete();

        // Refresh cache
        RefreshCache();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> UpdateProviderSortOrderAsync(
        IEnumerable<Guid> orderedIds,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        var idList = orderedIds.ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var settings = await db.PaymentProviderSettings
                .Where(s => idList.Contains(s.Id))
                .ToListAsync(cancellationToken);

            for (int i = 0; i < idList.Count; i++)
            {
                var setting = settings.FirstOrDefault(s => s.Id == idList[i]);
                if (setting != null)
                {
                    setting.SortOrder = i;
                    setting.DateUpdated = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        // Refresh cache
        RefreshCache();

        return result;
    }

    /// <inheritdoc />
    public void RefreshCache()
    {
        DisposeProviders();
        _cachedProviders = null;
    }

    // =====================================================
    // Payment Methods
    // =====================================================

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetEnabledPaymentMethodsAsync(
        CancellationToken cancellationToken = default)
    {
        var enabledProviders = await GetEnabledProvidersAsync(cancellationToken);
        var methods = new List<PaymentMethodDto>();

        foreach (var registered in enabledProviders)
        {
            var availableMethods = registered.Provider.GetAvailablePaymentMethods();
            var methodSettings = registered.Setting?.MethodSettings ?? [];

            foreach (var methodDef in availableMethods)
            {
                // Find method setting - if none exists, method is enabled by default
                var methodSetting = methodSettings.FirstOrDefault(ms =>
                    string.Equals(ms.MethodAlias, methodDef.Alias, StringComparison.OrdinalIgnoreCase));

                // Skip disabled methods
                if (methodSetting != null && !methodSetting.IsEnabled)
                {
                    continue;
                }

                methods.Add(new PaymentMethodDto
                {
                    ProviderAlias = registered.Metadata.Alias,
                    MethodAlias = methodDef.Alias,
                    DisplayName = methodSetting?.DisplayNameOverride ?? methodDef.DisplayName,
                    Icon = methodDef.Icon,
                    Description = methodDef.Description,
                    IntegrationType = methodDef.IntegrationType,
                    IsExpressCheckout = methodDef.IsExpressCheckout,
                    SortOrder = methodSetting?.SortOrder ?? methodDef.DefaultSortOrder
                });
            }
        }

        return methods
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.DisplayName)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetExpressCheckoutMethodsAsync(
        CancellationToken cancellationToken = default)
    {
        var allMethods = await GetEnabledPaymentMethodsAsync(cancellationToken);
        return allMethods.Where(m => m.IsExpressCheckout).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetStandardPaymentMethodsAsync(
        CancellationToken cancellationToken = default)
    {
        var allMethods = await GetEnabledPaymentMethodsAsync(cancellationToken);
        return allMethods.Where(m => !m.IsExpressCheckout).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodSetting>> GetMethodSettingsAsync(
        Guid providerSettingId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var settings = await scope.ExecuteWithContextAsync(async db =>
            await db.PaymentMethodSettings
                .AsNoTracking()
                .Where(ms => ms.PaymentProviderSettingId == providerSettingId)
                .OrderBy(ms => ms.SortOrder)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return settings;
    }

    /// <inheritdoc />
    public async Task<CrudResult<PaymentMethodSetting>> SetMethodEnabledAsync(
        Guid providerSettingId,
        string methodAlias,
        bool enabled,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<PaymentMethodSetting>();

        // Validate provider exists and has this method
        var providerSetting = await GetProviderSettingAsync(providerSettingId, cancellationToken);
        if (providerSetting == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment provider setting with ID '{providerSettingId}' was not found.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var provider = await GetProviderAsync(providerSetting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment provider '{providerSetting.ProviderAlias}' was not found.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var methodDef = provider.Provider.GetAvailablePaymentMethods()
            .FirstOrDefault(m => string.Equals(m.Alias, methodAlias, StringComparison.OrdinalIgnoreCase));

        if (methodDef == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment method '{methodAlias}' is not available for provider '{providerSetting.ProviderAlias}'.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var existing = await db.PaymentMethodSettings
                .FirstOrDefaultAsync(ms =>
                    ms.PaymentProviderSettingId == providerSettingId &&
                    ms.MethodAlias == methodAlias,
                    cancellationToken);

            if (existing != null)
            {
                existing.IsEnabled = enabled;
                existing.DateUpdated = DateTime.UtcNow;
                result.ResultObject = existing;
            }
            else
            {
                // Create new method setting
                var newSetting = new PaymentMethodSetting
                {
                    Id = GuidExtensions.NewSequentialGuid,
                    PaymentProviderSettingId = providerSettingId,
                    MethodAlias = methodAlias,
                    IsEnabled = enabled,
                    SortOrder = methodDef.DefaultSortOrder,
                    DateCreated = DateTime.UtcNow,
                    DateUpdated = DateTime.UtcNow
                };
                db.PaymentMethodSettings.Add(newSetting);
                result.ResultObject = newSetting;
            }

            await db.SaveChangesAsync(cancellationToken);
        });
        scope.Complete();

        RefreshCache();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> UpdateMethodSortOrderAsync(
        Guid providerSettingId,
        IEnumerable<string> orderedMethodAliases,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        var aliasList = orderedMethodAliases.ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var settings = await db.PaymentMethodSettings
                .Where(ms => ms.PaymentProviderSettingId == providerSettingId)
                .ToListAsync(cancellationToken);

            for (int i = 0; i < aliasList.Count; i++)
            {
                var setting = settings.FirstOrDefault(ms =>
                    string.Equals(ms.MethodAlias, aliasList[i], StringComparison.OrdinalIgnoreCase));

                if (setting != null)
                {
                    setting.SortOrder = i;
                    setting.DateUpdated = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        RefreshCache();
        return result;
    }

    /// <summary>
    /// Disposes all cached providers that implement IDisposable.
    /// </summary>
    private void DisposeProviders()
    {
        var providers = _cachedProviders;
        if (providers == null) return;

        foreach (var registered in providers)
        {
            if (registered.Provider is IDisposable disposable)
            {
                try
                {
                    disposable.Dispose();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Error disposing payment provider {ProviderAlias}", registered.Metadata.Alias);
                }
            }
        }
    }

    /// <summary>
    /// Disposes resources used by the manager.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        DisposeProviders();
        _cachedProviders = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}

