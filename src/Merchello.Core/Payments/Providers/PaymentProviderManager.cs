using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
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
public class PaymentProviderManager : IPaymentProviderManager
{
    private readonly ExtensionManager _extensionManager;
    private readonly IEFCoreScopeProvider<MerchelloDbContext> _efCoreScopeProvider;
    private readonly ILogger<PaymentProviderManager> _logger;
    private IReadOnlyCollection<RegisteredPaymentProvider>? _cachedProviders;

    public PaymentProviderManager(
        ExtensionManager extensionManager,
        IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
        ILogger<PaymentProviderManager> logger)
    {
        _extensionManager = extensionManager;
        _efCoreScopeProvider = efCoreScopeProvider;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<RegisteredPaymentProvider>> GetAvailableProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        if (_cachedProviders != null)
        {
            return _cachedProviders;
        }

        // Discover all provider implementations from assemblies
        var providerInstances = _extensionManager.GetInstances<IPaymentProvider>(useCaching: true)
            .Where(p => p != null)
            .Cast<IPaymentProvider>()
            .ToList();

        // Load all settings from database
        using var scope = _efCoreScopeProvider.CreateScope();
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
                _logger.LogWarning(
                    "Payment provider {ProviderType} has an empty alias and will be ignored.",
                    provider.GetType().FullName);
                continue;
            }

            if (!aliases.Add(metadata.Alias))
            {
                _logger.LogWarning(
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
                _logger.LogError(
                    ex,
                    "Failed to configure payment provider '{Alias}'. Provider will be skipped.",
                    metadata.Alias);
                continue;
            }

            registeredProviders.Add(new RegisteredPaymentProvider(provider, setting));
        }

        _cachedProviders = registeredProviders;
        return _cachedProviders;
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
        using var scope = _efCoreScopeProvider.CreateScope();
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
        using var scope = _efCoreScopeProvider.CreateScope();
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

        using var scope = _efCoreScopeProvider.CreateScope();
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

        using var scope = _efCoreScopeProvider.CreateScope();
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

        using var scope = _efCoreScopeProvider.CreateScope();
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

            _logger.LogInformation(
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

        using var scope = _efCoreScopeProvider.CreateScope();
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
        _cachedProviders = null;
    }
}

