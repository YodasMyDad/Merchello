using Merchello.Core.Data;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Discovers and configures payment provider implementations.
/// </summary>
public class PaymentProviderManager(
    ExtensionManager extensionManager,
    IServiceScopeFactory serviceScopeFactory,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<PaymentProviderManager> logger) : IPaymentProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredPaymentProvider>? _cachedProviders;
    private IServiceScope? _providerScope;
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

            // Create a scope that lives as long as the cached providers
            _providerScope?.Dispose();
            _providerScope = serviceScopeFactory.CreateScope();

            // Discover all provider implementations from assemblies
            var providerInstances = extensionManager.GetInstances<IPaymentProvider>(
                    predicate: null,
                    useCaching: true,
                    serviceProvider: _providerScope.ServiceProvider)
                .Where(p => p != null)
                .Cast<IPaymentProvider>()
                .ToList();

            // Load all settings from database (including method settings for filtering)
            using var scope = efCoreScopeProvider.CreateScope();
            var settings = await scope.ExecuteWithContextAsync(async db =>
                await db.ProviderConfigurations
                    .OfType<PaymentProviderSetting>()
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
            await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
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
            await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == setting.Id, cancellationToken);

            if (existing != null)
            {
                // Update existing
                existing.DisplayName = setting.DisplayName;
                existing.IsEnabled = setting.IsEnabled;
                existing.IsTestMode = setting.IsTestMode;
                existing.IsVaultingEnabled = setting.IsVaultingEnabled;
                existing.Configuration = setting.Configuration;
                existing.SortOrder = setting.SortOrder;
                existing.DateUpdated = DateTime.UtcNow;
            }
            else
            {
                // Check for duplicate alias
                var duplicateAlias = await db.ProviderConfigurations
                    .OfType<PaymentProviderSetting>()
                    .AnyAsync(s => s.ProviderKey == setting.ProviderKey, cancellationToken);

                if (duplicateAlias)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"A configuration for provider '{setting.ProviderAlias}' already exists.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return false;
                }

                // Create new
                setting.DateCreated = DateTime.UtcNow;
                setting.DateUpdated = DateTime.UtcNow;
                db.ProviderConfigurations.Add(setting);
            }

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = setting;
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var setting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            if (setting == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Payment provider setting with ID '{id}' was not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            db.ProviderConfigurations.Remove(setting);
            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var setting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == settingId, cancellationToken);

            if (setting == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Payment provider setting with ID '{settingId}' was not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            setting.IsEnabled = enabled;
            setting.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;

            logger.LogInformation(
                "Payment provider '{Alias}' has been {Status}.",
                setting.ProviderAlias,
                enabled ? "enabled" : "disabled");
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var settings = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
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
            return true;
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
        _providerScope?.Dispose();
        _providerScope = null;
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
        List<PaymentMethodDto> methods = [];

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

                // Resolve checkout style - custom style takes precedence over provider default
                var styleSource = methodSetting?.CheckoutStyleOverride ?? methodDef.CheckoutStyle;
                var checkoutStyle = styleSource != null
                    ? new PaymentMethodCheckoutStyleDto
                    {
                        BackgroundColor = styleSource.BackgroundColor,
                        BorderColor = styleSource.BorderColor,
                        TextColor = styleSource.TextColor,
                        SelectedBackgroundColor = styleSource.SelectedBackgroundColor,
                        SelectedBorderColor = styleSource.SelectedBorderColor,
                        SelectedTextColor = styleSource.SelectedTextColor
                    }
                    : null;

                methods.Add(new PaymentMethodDto
                {
                    ProviderAlias = registered.Metadata.Alias,
                    MethodAlias = methodDef.Alias,
                    DisplayName = methodSetting?.DisplayNameOverride ?? methodDef.DisplayName,
                    Icon = methodDef.Icon,
                    IconHtml = methodDef.IconHtml,
                    CheckoutIconHtml = methodDef.CheckoutIconHtml,
                    IconMediaKey = methodSetting?.IconMediaKey,
                    CheckoutStyle = checkoutStyle,
                    Description = methodDef.Description,
                    IntegrationType = methodDef.IntegrationType,
                    SupportsVaulting = registered.Metadata.SupportsVaultedPayments
                        && registered.Setting?.IsVaultingEnabled == true
                        && (methodDef.IntegrationType == PaymentIntegrationType.HostedFields
                            || methodDef.IntegrationType == PaymentIntegrationType.Widget),
                    IsExpressCheckout = methodDef.IsExpressCheckout,
                    SortOrder = methodSetting?.SortOrder ?? methodDef.DefaultSortOrder,
                    ShowInCheckout = methodSetting?.ShowInCheckout ?? methodDef.ShowInCheckoutByDefault,
                    MethodType = methodDef.MethodType
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
        var expressMethods = allMethods.Where(m => m.IsExpressCheckout).ToList();
        return DeduplicateByMethodType(expressMethods);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetCheckoutPaymentMethodsAsync(
        CancellationToken cancellationToken = default)
    {
        var allMethods = await GetEnabledPaymentMethodsAsync(cancellationToken);
        // Filter to methods shown in checkout, excluding express checkout methods
        // (express methods are displayed separately via GetExpressCheckoutMethodsAsync)
        var checkoutMethods = allMethods
            .Where(m => m.ShowInCheckout && !m.IsExpressCheckout)
            .ToList();
        return DeduplicateByMethodType(checkoutMethods);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetStandardPaymentMethodsAsync(
        CancellationToken cancellationToken = default)
    {
        var allMethods = await GetEnabledPaymentMethodsAsync(cancellationToken);
        var standardMethods = allMethods.Where(m => !m.IsExpressCheckout).ToList();
        return DeduplicateByMethodType(standardMethods);
    }

    /// <inheritdoc />
    public async Task<CheckoutPaymentPreviewDto> GetCheckoutPreviewAsync(
        CancellationToken cancellationToken = default)
    {
        var enabledProviders = await GetEnabledProvidersAsync(cancellationToken);
        List<CheckoutMethodPreviewDto> allMethods = [];

        // Build list of all enabled methods with provider context
        foreach (var registered in enabledProviders)
        {
            var availableMethods = registered.Provider.GetAvailablePaymentMethods();
            var methodSettings = registered.Setting?.MethodSettings ?? [];

            foreach (var methodDef in availableMethods)
            {
                var methodSetting = methodSettings.FirstOrDefault(ms =>
                    string.Equals(ms.MethodAlias, methodDef.Alias, StringComparison.OrdinalIgnoreCase));

                // Skip disabled methods
                if (methodSetting != null && !methodSetting.IsEnabled)
                {
                    continue;
                }

                // Skip methods not shown in checkout
                var showInCheckout = methodSetting?.ShowInCheckout ?? methodDef.ShowInCheckoutByDefault;
                if (!showInCheckout)
                {
                    continue;
                }

                allMethods.Add(new CheckoutMethodPreviewDto
                {
                    ProviderAlias = registered.Metadata.Alias,
                    ProviderDisplayName = registered.DisplayName,
                    ProviderSettingId = registered.Setting?.Id ?? Guid.Empty,
                    MethodAlias = methodDef.Alias,
                    DisplayName = methodSetting?.DisplayNameOverride ?? methodDef.DisplayName,
                    Icon = methodDef.Icon,
                    IconHtml = methodDef.IconHtml,
                    MethodType = methodDef.MethodType,
                    SortOrder = methodSetting?.SortOrder ?? methodDef.DefaultSortOrder,
                    IsActive = true, // Will be updated during deduplication
                    SupportedRegions = methodDef.SupportedRegions?.Select(r => new PaymentMethodRegionDto
                    {
                        Code = r.Code,
                        Name = r.Name
                    }).ToList()
                });
            }
        }

        // Sort by SortOrder then DisplayName
        var sortedMethods = allMethods
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.DisplayName)
            .ToList();

        // Apply deduplication and track winners/losers
        List<CheckoutMethodPreviewDto> expressMethods = [];
        List<CheckoutMethodPreviewDto> standardMethods = [];
        List<CheckoutMethodPreviewDto> redirectMethods = [];
        List<CheckoutMethodPreviewDto> hiddenMethods = [];

        // Track winners per MethodType for express and standard separately
        // Redirect methods are NOT deduplicated - they go in their own "Or pay with" section
        var expressWinners = new Dictionary<string, CheckoutMethodPreviewDto>();
        var standardWinners = new Dictionary<string, CheckoutMethodPreviewDto>();

        // First pass: identify winners (methods with lowest sort order per type)
        foreach (var method in sortedMethods)
        {
            // Get the provider's available methods to check if this is express checkout
            var provider = enabledProviders.FirstOrDefault(p =>
                string.Equals(p.Metadata.Alias, method.ProviderAlias, StringComparison.OrdinalIgnoreCase));
            var methodDef = provider?.Provider.GetAvailablePaymentMethods()
                .FirstOrDefault(m => string.Equals(m.Alias, method.MethodAlias, StringComparison.OrdinalIgnoreCase));

            var isExpress = methodDef?.IsExpressCheckout ?? false;
            var isRedirect = methodDef?.IntegrationType == PaymentIntegrationType.Redirect;

            // Redirect methods go to their own section and are NOT deduplicated
            // They appear in the "Or pay with" section, similar to express checkout
            if (isRedirect && !isExpress)
            {
                redirectMethods.Add(method);
                continue;
            }

            if (string.IsNullOrEmpty(method.MethodType))
            {
                // Not deduplicated - always active
                if (isExpress)
                    expressMethods.Add(method);
                else
                    standardMethods.Add(method);
            }
            else
            {
                var winners = isExpress ? expressWinners : standardWinners;
                var targetList = isExpress ? expressMethods : standardMethods;

                if (!winners.ContainsKey(method.MethodType))
                {
                    // First one wins (lowest sort order)
                    winners[method.MethodType] = method;
                    targetList.Add(method);
                }
                else
                {
                    // This one is outranked
                    var winner = winners[method.MethodType];
                    method.IsActive = false;
                    method.OutrankedBy = winner.ProviderDisplayName;
                    hiddenMethods.Add(method);
                }
            }
        }

        return new CheckoutPaymentPreviewDto
        {
            ExpressMethods = expressMethods,
            StandardMethods = standardMethods,
            RedirectMethods = redirectMethods,
            HiddenMethods = hiddenMethods
        };
    }

    /// <summary>
    /// Deduplicates payment methods by MethodType.
    /// For form-based methods (HostedFields, DirectForm) with a defined type, only the one with lowest SortOrder is kept.
    /// This prevents duplicate card forms when multiple providers offer the same payment method
    /// (e.g., both Stripe and Braintree offering card payments).
    ///
    /// Redirect methods are NOT deduplicated - they appear individually in the "Or pay with" section,
    /// similar to express checkout methods. This allows multiple redirect options to coexist
    /// (e.g., Stripe Checkout redirect alongside PayPal redirect).
    /// </summary>
    private List<PaymentMethodDto> DeduplicateByMethodType(List<PaymentMethodDto> methods)
    {
        List<PaymentMethodDto> result = [];
        var seenMethodTypes = new Dictionary<string, PaymentMethodDto>();

        foreach (var method in methods.OrderBy(m => m.SortOrder).ThenBy(m => m.DisplayName))
        {
            // Redirect methods are NOT deduplicated - shown individually like express checkout.
            // They appear in the "Or pay with" section, not as radio options competing with form-based methods.
            if (method.IntegrationType == PaymentIntegrationType.Redirect)
            {
                result.Add(method);
                continue;
            }

            // Methods without a MethodType are not deduplicated
            if (string.IsNullOrEmpty(method.MethodType))
            {
                result.Add(method);
                continue;
            }

            // For typed form-based methods, only include the first one (lowest sort order)
            if (!seenMethodTypes.TryGetValue(method.MethodType, out var existingMethod))
            {
                seenMethodTypes[method.MethodType] = method;
                result.Add(method);
            }
            else
            {
                // Log that this method was hidden due to deduplication
                logger.LogDebug(
                    "Payment method '{MethodAlias}' from provider '{ProviderAlias}' hidden - " +
                    "same type ({MethodType}) already provided by '{ExistingProviderAlias}' with lower sort order",
                    method.MethodAlias,
                    method.ProviderAlias,
                    method.MethodType,
                    existingMethod.ProviderAlias);
            }
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<PaymentMethodSetting>> GetMethodSettingsAsync(
        Guid providerSettingId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var settings = await scope.ExecuteWithContextAsync(async db =>
        {
            var providerSetting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == providerSettingId, cancellationToken);

            return providerSetting?.MethodSettings
                .OrderBy(ms => ms.SortOrder)
                .ToList() ?? [];
        });
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var setting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == providerSettingId, cancellationToken);

            if (setting == null)
            {
                return false;
            }

            var methodSettings = setting.MethodSettings;
            var existing = methodSettings.FirstOrDefault(ms =>
                string.Equals(ms.MethodAlias, methodAlias, StringComparison.OrdinalIgnoreCase));

            if (existing != null)
            {
                existing.IsEnabled = enabled;
                existing.DateUpdated = DateTime.UtcNow;
                result.ResultObject = existing;
            }
            else
            {
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
                methodSettings.Add(newSetting);
                result.ResultObject = newSetting;
            }

            setting.SetMethodSettings(methodSettings);
            setting.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        RefreshCache();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<PaymentMethodSetting>> UpdateMethodSettingAsync(
        Guid providerSettingId,
        string methodAlias,
        UpdatePaymentMethodSettingDto request,
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var setting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == providerSettingId, cancellationToken);

            if (setting == null)
            {
                return false;
            }

            var methodSettings = setting.MethodSettings;
            var existing = methodSettings.FirstOrDefault(ms =>
                string.Equals(ms.MethodAlias, methodAlias, StringComparison.OrdinalIgnoreCase));

            if (existing != null)
            {
                if (request.IsEnabled.HasValue)
                {
                    existing.IsEnabled = request.IsEnabled.Value;
                }

                if (request.DisplayNameOverride != null)
                {
                    existing.DisplayNameOverride = string.IsNullOrWhiteSpace(request.DisplayNameOverride)
                        ? null
                        : request.DisplayNameOverride;
                }

                if (request.ClearIcon)
                {
                    existing.IconMediaKey = null;
                }
                else if (request.IconMediaKey.HasValue)
                {
                    existing.IconMediaKey = request.IconMediaKey.Value;
                }

                if (request.ClearCheckoutStyle)
                {
                    existing.CheckoutStyleOverride = null;
                }
                else if (request.CheckoutStyleOverride != null)
                {
                    existing.CheckoutStyleOverride = new PaymentMethodCheckoutStyle
                    {
                        BackgroundColor = request.CheckoutStyleOverride.BackgroundColor,
                        BorderColor = request.CheckoutStyleOverride.BorderColor,
                        TextColor = request.CheckoutStyleOverride.TextColor,
                        SelectedBackgroundColor = request.CheckoutStyleOverride.SelectedBackgroundColor,
                        SelectedBorderColor = request.CheckoutStyleOverride.SelectedBorderColor,
                        SelectedTextColor = request.CheckoutStyleOverride.SelectedTextColor
                    };

                    if (existing.CheckoutStyleOverride.IsEmpty)
                    {
                        existing.CheckoutStyleOverride = null;
                    }
                }

                existing.DateUpdated = DateTime.UtcNow;
                result.ResultObject = existing;
            }
            else
            {
                var newSetting = new PaymentMethodSetting
                {
                    Id = GuidExtensions.NewSequentialGuid,
                    PaymentProviderSettingId = providerSettingId,
                    MethodAlias = methodAlias,
                    IsEnabled = request.IsEnabled ?? true,
                    SortOrder = methodDef.DefaultSortOrder,
                    DisplayNameOverride = string.IsNullOrWhiteSpace(request.DisplayNameOverride)
                        ? null
                        : request.DisplayNameOverride,
                    IconMediaKey = request.ClearIcon ? null : request.IconMediaKey,
                    DateCreated = DateTime.UtcNow,
                    DateUpdated = DateTime.UtcNow
                };

                if (!request.ClearCheckoutStyle && request.CheckoutStyleOverride != null)
                {
                    newSetting.CheckoutStyleOverride = new PaymentMethodCheckoutStyle
                    {
                        BackgroundColor = request.CheckoutStyleOverride.BackgroundColor,
                        BorderColor = request.CheckoutStyleOverride.BorderColor,
                        TextColor = request.CheckoutStyleOverride.TextColor,
                        SelectedBackgroundColor = request.CheckoutStyleOverride.SelectedBackgroundColor,
                        SelectedBorderColor = request.CheckoutStyleOverride.SelectedBorderColor,
                        SelectedTextColor = request.CheckoutStyleOverride.SelectedTextColor
                    };

                    if (newSetting.CheckoutStyleOverride.IsEmpty)
                    {
                        newSetting.CheckoutStyleOverride = null;
                    }
                }

                methodSettings.Add(newSetting);
                result.ResultObject = newSetting;
            }

            setting.SetMethodSettings(methodSettings);
            setting.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var providerSetting = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .FirstOrDefaultAsync(s => s.Id == providerSettingId, cancellationToken);

            if (providerSetting == null)
            {
                return false;
            }

            var methodSettings = providerSetting.MethodSettings;
            for (int i = 0; i < aliasList.Count; i++)
            {
                var setting = methodSettings.FirstOrDefault(ms =>
                    string.Equals(ms.MethodAlias, aliasList[i], StringComparison.OrdinalIgnoreCase));

                if (setting != null)
                {
                    setting.SortOrder = i;
                    setting.DateUpdated = DateTime.UtcNow;
                }
            }

            providerSetting.SetMethodSettings(methodSettings);
            providerSetting.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        RefreshCache();
        return result;
    }

    /// <inheritdoc />
    public async Task EnsureBuiltInProvidersAsync(CancellationToken cancellationToken = default)
    {
        // Built-in provider aliases that should always exist
        const string manualProviderAlias = "manual";

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Check if Manual Payment provider setting exists
            var manualExists = await db.ProviderConfigurations
                .OfType<PaymentProviderSetting>()
                .AnyAsync(s => s.ProviderKey == manualProviderAlias, cancellationToken);

            if (!manualExists)
            {
                // Create the Manual Payment provider setting
                var manualSetting = new PaymentProviderSetting
                {
                    Id = GuidExtensions.NewSequentialGuid,
                    ProviderAlias = manualProviderAlias,
                    DisplayName = "Manual Payment",
                    IsEnabled = true,
                    IsTestMode = false,  // Not applicable for manual payments
                    SortOrder = 100,     // Show last
                    DateCreated = DateTime.UtcNow,
                    DateUpdated = DateTime.UtcNow
                };

                db.ProviderConfigurations.Add(manualSetting);
                await db.SaveChangesAsync(cancellationToken);

                logger.LogInformation(
                    "Created built-in payment provider '{ProviderAlias}'.",
                    manualProviderAlias);
            }
            return true;
        });
        scope.Complete();

        // Refresh cache to pick up the new provider
        RefreshCache();
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
        _providerScope?.Dispose();
        _providerScope = null;
        _cachedProviders = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}

