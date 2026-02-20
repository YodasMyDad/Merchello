using System.Text.Json;
using Merchello.Core.Accounting;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Settings.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Settings.Services;

public class MerchelloStoreSettingsService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ICacheService cacheService,
    IOptionsMonitor<MerchelloSettings> merchelloOptions,
    IOptionsMonitor<CheckoutSettings> checkoutOptions,
    IOptionsMonitor<AbandonedCheckoutSettings> abandonedCheckoutOptions,
    IOptionsMonitor<InvoiceReminderSettings> invoiceReminderOptions,
    IOptionsMonitor<EmailSettings> emailOptions,
    IHttpContextAccessor httpContextAccessor,
    IMediaUrlResolver mediaUrlResolver,
    ILogger<MerchelloStoreSettingsService> logger) : IMerchelloStoreSettingsService
{
    private const string DefaultStoreKey = "default";
    private static readonly JsonSerializerOptions CloneSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public StoreConfigurationDto GetStoreConfiguration() =>
        GetStoreConfigurationAsync().GetAwaiter().GetResult();

    public async Task<StoreConfigurationDto> GetStoreConfigurationAsync(CancellationToken ct = default)
    {
        var store = await ResolveStoreAsync(DefaultStoreKey, ct);
        EnsureStoreSections(store);

        return MapToConfigurationDto(store);
    }

    public MerchelloStoreRuntimeSettings GetRuntimeSettings() =>
        GetRuntimeSettingsAsync().GetAwaiter().GetResult();

    public async Task<MerchelloStoreRuntimeSettings> GetRuntimeSettingsAsync(CancellationToken ct = default)
    {
        var store = await ResolveStoreAsync(DefaultStoreKey, ct);
        EnsureStoreSections(store);

        var merchello = CloneOptions(merchelloOptions.CurrentValue);
        merchello.Store ??= new StoreSettings();
        merchello.InvoiceNumberPrefix = store.InvoiceNumberPrefix;
        merchello.DisplayPricesIncTax = store.DisplayPricesIncTax;
        merchello.ShowStockLevels = store.ShowStockLevels;
        merchello.LowStockThreshold = store.LowStockThreshold;
        merchello.Store.Name = store.StoreName;
        merchello.Store.Email = store.StoreEmail;
        merchello.Store.SupportEmail = store.StoreEmail ?? merchello.Store.Email;
        merchello.Store.Phone = store.StorePhone;
        merchello.Store.LogoUrl = mediaUrlResolver.ResolveMediaUrl(store.StoreLogoMediaKey);
        merchello.Store.WebsiteUrl = ResolveWebsiteUrl(store.StoreWebsiteUrl, merchello.Store.WebsiteUrl);
        merchello.Store.Address = store.StoreAddress;
        merchello.Store.TermsUrl = store.Ucp?.TermsUrl;
        merchello.Store.PrivacyUrl = store.Ucp?.PrivacyUrl;

        var checkout = CloneOptions(checkoutOptions.CurrentValue);
        checkout.HeaderBackgroundImageUrl = mediaUrlResolver.ResolveMediaUrl(store.Checkout.HeaderBackgroundImageMediaKey);
        checkout.HeaderBackgroundColor = store.Checkout.HeaderBackgroundColor;
        checkout.LogoPosition = store.Checkout.LogoPosition;
        checkout.LogoMaxWidth = store.Checkout.LogoMaxWidth;
        checkout.PrimaryColor = store.Checkout.PrimaryColor;
        checkout.AccentColor = store.Checkout.AccentColor;
        checkout.BackgroundColor = store.Checkout.BackgroundColor;
        checkout.TextColor = store.Checkout.TextColor;
        checkout.ErrorColor = store.Checkout.ErrorColor;
        checkout.HeadingFontFamily = store.Checkout.HeadingFontFamily;
        checkout.BodyFontFamily = store.Checkout.BodyFontFamily;
        checkout.ShowExpressCheckout = store.Checkout.ShowExpressCheckout;
        checkout.BillingPhoneRequired = store.Checkout.BillingPhoneRequired;
        checkout.ConfirmationRedirectUrl = store.Checkout.ConfirmationRedirectUrl;
        checkout.CustomScriptUrl = store.Checkout.CustomScriptUrl;
        checkout.OrderTerms ??= new OrderTermsSettings();
        checkout.OrderTerms.ShowCheckbox = store.Checkout.OrderTerms.ShowCheckbox;
        checkout.OrderTerms.CheckboxText = store.Checkout.OrderTerms.CheckboxText;
        checkout.OrderTerms.CheckboxRequired = store.Checkout.OrderTerms.CheckboxRequired;

        var abandonedCheckout = CloneOptions(abandonedCheckoutOptions.CurrentValue);
        abandonedCheckout.AbandonmentThresholdHours = store.AbandonedCheckout.AbandonmentThresholdHours;
        abandonedCheckout.RecoveryExpiryDays = store.AbandonedCheckout.RecoveryExpiryDays;
        abandonedCheckout.CheckIntervalMinutes = store.AbandonedCheckout.CheckIntervalMinutes;
        abandonedCheckout.FirstEmailDelayHours = store.AbandonedCheckout.FirstEmailDelayHours;
        abandonedCheckout.ReminderEmailDelayHours = store.AbandonedCheckout.ReminderEmailDelayHours;
        abandonedCheckout.FinalEmailDelayHours = store.AbandonedCheckout.FinalEmailDelayHours;
        abandonedCheckout.MaxRecoveryEmails = store.AbandonedCheckout.MaxRecoveryEmails;

        var invoiceReminders = CloneOptions(invoiceReminderOptions.CurrentValue);
        invoiceReminders.ReminderDaysBeforeDue = store.InvoiceReminders.ReminderDaysBeforeDue;
        invoiceReminders.OverdueReminderIntervalDays = store.InvoiceReminders.OverdueReminderIntervalDays;
        invoiceReminders.MaxOverdueReminders = store.InvoiceReminders.MaxOverdueReminders;
        invoiceReminders.CheckIntervalHours = store.InvoiceReminders.CheckIntervalHours;

        var email = CloneOptions(emailOptions.CurrentValue);
        email.Theme ??= new EmailThemeSettings();
        email.DefaultFromAddress = store.Email.DefaultFromAddress;
        email.DefaultFromName = store.Email.DefaultFromName;
        email.Theme.PrimaryColor = store.Email.Theme.PrimaryColor;
        email.Theme.TextColor = store.Email.Theme.TextColor;
        email.Theme.BackgroundColor = store.Email.Theme.BackgroundColor;
        email.Theme.FontFamily = store.Email.Theme.FontFamily;
        email.Theme.SecondaryTextColor = store.Email.Theme.SecondaryTextColor;
        email.Theme.ContentBackgroundColor = store.Email.Theme.ContentBackgroundColor;

        return new MerchelloStoreRuntimeSettings
        {
            Merchello = merchello,
            Checkout = checkout,
            AbandonedCheckout = abandonedCheckout,
            InvoiceReminders = invoiceReminders,
            Email = email,
            Policies = CloneOptions(store.Policies),
            Ucp = store.Ucp ?? new MerchelloStoreUcpSettings()
        };
    }

    public async Task<CrudResult<StoreConfigurationDto>> SaveStoreConfigurationAsync(
        StoreConfigurationDto configuration,
        CancellationToken ct = default)
    {
        var result = new CrudResult<StoreConfigurationDto>();
        if (configuration == null)
        {
            result.AddErrorMessage("Configuration is required.");
            return result;
        }

        var normalizedStoreKey = string.IsNullOrWhiteSpace(configuration.StoreKey)
            ? DefaultStoreKey
            : configuration.StoreKey.Trim().ToLowerInvariant();

        MerchelloStore persisted;
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            persisted = await scope.ExecuteWithContextAsync(async db =>
            {
                var store = await db.MerchelloStores
                    .FirstOrDefaultAsync(x => x.StoreKey == normalizedStoreKey, ct);
                if (store == null)
                {
                    store = new MerchelloStore
                    {
                        StoreKey = normalizedStoreKey,
                        DateCreatedUtc = DateTime.UtcNow
                    };
                    db.MerchelloStores.Add(store);
                }

                ApplyConfiguration(configuration, store);
                store.StoreKey = normalizedStoreKey;
                store.DateUpdatedUtc = DateTime.UtcNow;

                await db.SaveChangesAsync(ct);
                return store;
            });
            scope.Complete();
        }

        await cacheService.RemoveByTagAsync(Constants.CacheTags.StoreSettings, ct);

        logger.LogInformation("Saved store configuration for key {StoreKey}", normalizedStoreKey);
        result.ResultObject = MapToConfigurationDto(persisted);
        return result;
    }

    private async Task<MerchelloStore?> GetCachedStoreAsync(string storeKey, CancellationToken ct)
    {
        var normalized = NormalizeStoreKey(storeKey);
        var cacheKey = $"{Constants.CacheKeys.StoreSettingsPrefix}{normalized}";

        return await cacheService.GetOrCreateAsync(
            cacheKey,
            async token =>
            {
                using var scope = efCoreScopeProvider.CreateScope();
                var store = await scope.ExecuteWithContextAsync(async db =>
                    await db.MerchelloStores
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.StoreKey == normalized, token));
                scope.Complete();
                return store;
            },
            TimeSpan.FromMinutes(30),
            [Constants.CacheTags.StoreSettings],
            ct);
    }

    private async Task<MerchelloStore> ResolveStoreAsync(string storeKey, CancellationToken ct)
    {
        var normalizedStoreKey = NormalizeStoreKey(storeKey);

        try
        {
            return await GetCachedStoreAsync(normalizedStoreKey, ct) ?? CreateDefaultStore(normalizedStoreKey);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed store settings for key {StoreKey}. Falling back to in-memory defaults.",
                normalizedStoreKey);
            return CreateDefaultStore(normalizedStoreKey);
        }
    }

    private StoreConfigurationDto MapToConfigurationDto(MerchelloStore store)
    {
        EnsureStoreSections(store);

        return new StoreConfigurationDto
        {
            StoreKey = store.StoreKey,
            Store = new StoreConfigurationStorePanelDto
            {
                InvoiceNumberPrefix = store.InvoiceNumberPrefix,
                Name = store.StoreName,
                Email = store.StoreEmail,
                Phone = store.StorePhone,
                WebsiteUrl = ResolveWebsiteUrl(store.StoreWebsiteUrl, merchelloOptions.CurrentValue.Store.WebsiteUrl),
                Address = store.StoreAddress,
                LogoMediaKey = store.StoreLogoMediaKey,
                LogoUrl = mediaUrlResolver.ResolveMediaUrl(store.StoreLogoMediaKey),
                DisplayPricesIncTax = store.DisplayPricesIncTax,
                ShowStockLevels = store.ShowStockLevels,
                LowStockThreshold = store.LowStockThreshold
            },
            InvoiceReminders = new StoreConfigurationInvoiceRemindersDto
            {
                ReminderDaysBeforeDue = store.InvoiceReminders.ReminderDaysBeforeDue,
                OverdueReminderIntervalDays = store.InvoiceReminders.OverdueReminderIntervalDays,
                MaxOverdueReminders = store.InvoiceReminders.MaxOverdueReminders,
                CheckIntervalHours = store.InvoiceReminders.CheckIntervalHours
            },
            Policies = new StoreConfigurationPoliciesDto
            {
                TermsContent = store.Policies.TermsContent,
                PrivacyContent = store.Policies.PrivacyContent
            },
            Checkout = new StoreConfigurationCheckoutDto
            {
                HeaderBackgroundImageMediaKey = store.Checkout.HeaderBackgroundImageMediaKey,
                HeaderBackgroundImageUrl = mediaUrlResolver.ResolveMediaUrl(store.Checkout.HeaderBackgroundImageMediaKey),
                HeaderBackgroundColor = store.Checkout.HeaderBackgroundColor,
                LogoPosition = store.Checkout.LogoPosition.ToString(),
                LogoMaxWidth = store.Checkout.LogoMaxWidth,
                PrimaryColor = store.Checkout.PrimaryColor,
                AccentColor = store.Checkout.AccentColor,
                BackgroundColor = store.Checkout.BackgroundColor,
                TextColor = store.Checkout.TextColor,
                ErrorColor = store.Checkout.ErrorColor,
                HeadingFontFamily = store.Checkout.HeadingFontFamily,
                BodyFontFamily = store.Checkout.BodyFontFamily,
                ShowExpressCheckout = store.Checkout.ShowExpressCheckout,
                BillingPhoneRequired = store.Checkout.BillingPhoneRequired,
                ConfirmationRedirectUrl = store.Checkout.ConfirmationRedirectUrl,
                CustomScriptUrl = store.Checkout.CustomScriptUrl,
                OrderTerms = new StoreConfigurationOrderTermsDto
                {
                    ShowCheckbox = store.Checkout.OrderTerms.ShowCheckbox,
                    CheckboxText = store.Checkout.OrderTerms.CheckboxText ?? string.Empty,
                    CheckboxRequired = store.Checkout.OrderTerms.CheckboxRequired
                }
            },
            AbandonedCheckout = new StoreConfigurationAbandonedCheckoutDto
            {
                AbandonmentThresholdHours = store.AbandonedCheckout.AbandonmentThresholdHours,
                RecoveryExpiryDays = store.AbandonedCheckout.RecoveryExpiryDays,
                CheckIntervalMinutes = store.AbandonedCheckout.CheckIntervalMinutes,
                FirstEmailDelayHours = store.AbandonedCheckout.FirstEmailDelayHours,
                ReminderEmailDelayHours = store.AbandonedCheckout.ReminderEmailDelayHours,
                FinalEmailDelayHours = store.AbandonedCheckout.FinalEmailDelayHours,
                MaxRecoveryEmails = store.AbandonedCheckout.MaxRecoveryEmails
            },
            Email = new StoreConfigurationEmailDto
            {
                DefaultFromAddress = store.Email.DefaultFromAddress,
                DefaultFromName = store.Email.DefaultFromName,
                Theme = new StoreConfigurationEmailThemeDto
                {
                    PrimaryColor = store.Email.Theme.PrimaryColor,
                    TextColor = store.Email.Theme.TextColor,
                    BackgroundColor = store.Email.Theme.BackgroundColor,
                    FontFamily = store.Email.Theme.FontFamily,
                    SecondaryTextColor = store.Email.Theme.SecondaryTextColor,
                    ContentBackgroundColor = store.Email.Theme.ContentBackgroundColor
                }
            },
            Ucp = new StoreConfigurationUcpDto
            {
                TermsUrl = store.Ucp?.TermsUrl,
                PrivacyUrl = store.Ucp?.PrivacyUrl,
                PublicBaseUrl = store.Ucp?.PublicBaseUrl,
                AllowedAgents = store.Ucp?.AllowedAgents,
                CapabilityCheckout = store.Ucp?.CapabilityCheckout,
                CapabilityOrder = store.Ucp?.CapabilityOrder,
                CapabilityIdentityLinking = store.Ucp?.CapabilityIdentityLinking,
                ExtensionDiscount = store.Ucp?.ExtensionDiscount,
                ExtensionFulfillment = store.Ucp?.ExtensionFulfillment,
                ExtensionBuyerConsent = store.Ucp?.ExtensionBuyerConsent,
                ExtensionAp2Mandates = store.Ucp?.ExtensionAp2Mandates,
                WebhookTimeoutSeconds = store.Ucp?.WebhookTimeoutSeconds
            }
        };
    }

    private static void ApplyConfiguration(StoreConfigurationDto configuration, MerchelloStore store)
    {
        var storePanel = configuration.Store ?? new StoreConfigurationStorePanelDto();
        var reminders = configuration.InvoiceReminders ?? new StoreConfigurationInvoiceRemindersDto();
        var policies = configuration.Policies ?? new StoreConfigurationPoliciesDto();
        var checkout = configuration.Checkout ?? new StoreConfigurationCheckoutDto();
        var orderTerms = checkout.OrderTerms ?? new StoreConfigurationOrderTermsDto();
        var abandoned = configuration.AbandonedCheckout ?? new StoreConfigurationAbandonedCheckoutDto();
        var email = configuration.Email ?? new StoreConfigurationEmailDto();
        var theme = email.Theme ?? new StoreConfigurationEmailThemeDto();
        var ucp = configuration.Ucp ?? new StoreConfigurationUcpDto();

        store.InvoiceNumberPrefix = string.IsNullOrWhiteSpace(storePanel.InvoiceNumberPrefix)
            ? "INV-"
            : storePanel.InvoiceNumberPrefix.Trim();
        store.DisplayPricesIncTax = storePanel.DisplayPricesIncTax;
        store.ShowStockLevels = storePanel.ShowStockLevels;
        store.LowStockThreshold = Math.Max(0, storePanel.LowStockThreshold);
        store.StoreName = string.IsNullOrWhiteSpace(storePanel.Name)
            ? "Acme Store"
            : storePanel.Name.Trim();
        store.StoreEmail = NullIfWhiteSpace(storePanel.Email);
        store.StoreSupportEmail = null;
        store.StorePhone = NullIfWhiteSpace(storePanel.Phone);
        store.StoreWebsiteUrl = NullIfWhiteSpace(storePanel.WebsiteUrl);
        store.StoreAddress = string.IsNullOrWhiteSpace(storePanel.Address)
            ? "123 Commerce Street\nNew York, NY 10001\nUnited States"
            : storePanel.Address;
        store.StoreLogoMediaKey = storePanel.LogoMediaKey;
        store.Ucp = new MerchelloStoreUcpSettings
        {
            TermsUrl = NullIfWhiteSpace(ucp.TermsUrl),
            PrivacyUrl = NullIfWhiteSpace(ucp.PrivacyUrl),
            PublicBaseUrl = NullIfWhiteSpace(ucp.PublicBaseUrl),
            AllowedAgents = ucp.AllowedAgents is { Count: > 0 } ? ucp.AllowedAgents : null,
            CapabilityCheckout = ucp.CapabilityCheckout,
            CapabilityOrder = ucp.CapabilityOrder,
            CapabilityIdentityLinking = ucp.CapabilityIdentityLinking,
            ExtensionDiscount = ucp.ExtensionDiscount,
            ExtensionFulfillment = ucp.ExtensionFulfillment,
            ExtensionBuyerConsent = ucp.ExtensionBuyerConsent,
            ExtensionAp2Mandates = ucp.ExtensionAp2Mandates,
            WebhookTimeoutSeconds = ucp.WebhookTimeoutSeconds
        };

        store.InvoiceReminders = new MerchelloStoreInvoiceRemindersSettings
        {
            ReminderDaysBeforeDue = Math.Max(0, reminders.ReminderDaysBeforeDue),
            OverdueReminderIntervalDays = Math.Max(1, reminders.OverdueReminderIntervalDays),
            MaxOverdueReminders = Math.Max(0, reminders.MaxOverdueReminders),
            CheckIntervalHours = Math.Max(1, reminders.CheckIntervalHours)
        };

        store.Policies = new MerchelloStorePoliciesSettings
        {
            TermsContent = policies.TermsContent,
            PrivacyContent = policies.PrivacyContent
        };

        store.Checkout = new MerchelloStoreCheckoutSettings
        {
            HeaderBackgroundImageMediaKey = checkout.HeaderBackgroundImageMediaKey,
            HeaderBackgroundColor = NullIfWhiteSpace(checkout.HeaderBackgroundColor),
            LogoPosition = ParseLogoPosition(checkout.LogoPosition),
            LogoMaxWidth = Math.Max(1, checkout.LogoMaxWidth),
            PrimaryColor = string.IsNullOrWhiteSpace(checkout.PrimaryColor) ? "#000000" : checkout.PrimaryColor,
            AccentColor = string.IsNullOrWhiteSpace(checkout.AccentColor) ? "#0066FF" : checkout.AccentColor,
            BackgroundColor = string.IsNullOrWhiteSpace(checkout.BackgroundColor) ? "#FFFFFF" : checkout.BackgroundColor,
            TextColor = string.IsNullOrWhiteSpace(checkout.TextColor) ? "#333333" : checkout.TextColor,
            ErrorColor = string.IsNullOrWhiteSpace(checkout.ErrorColor) ? "#DC2626" : checkout.ErrorColor,
            HeadingFontFamily = string.IsNullOrWhiteSpace(checkout.HeadingFontFamily) ? "system-ui" : checkout.HeadingFontFamily,
            BodyFontFamily = string.IsNullOrWhiteSpace(checkout.BodyFontFamily) ? "system-ui" : checkout.BodyFontFamily,
            ShowExpressCheckout = checkout.ShowExpressCheckout,
            BillingPhoneRequired = checkout.BillingPhoneRequired,
            ConfirmationRedirectUrl = NullIfWhiteSpace(checkout.ConfirmationRedirectUrl),
            CustomScriptUrl = NullIfWhiteSpace(checkout.CustomScriptUrl),
            OrderTerms = new OrderTermsSettings
            {
                ShowCheckbox = orderTerms.ShowCheckbox,
                CheckboxText = string.IsNullOrWhiteSpace(orderTerms.CheckboxText)
                    ? "I agree to the {terms:Terms & Conditions} and {privacy:Privacy Policy}"
                    : orderTerms.CheckboxText,
                CheckboxRequired = orderTerms.CheckboxRequired
            }
        };

        store.AbandonedCheckout = new MerchelloStoreAbandonedCheckoutSettings
        {
            AbandonmentThresholdHours = Math.Max(0.5, abandoned.AbandonmentThresholdHours),
            RecoveryExpiryDays = Math.Max(1, abandoned.RecoveryExpiryDays),
            CheckIntervalMinutes = Math.Max(5, abandoned.CheckIntervalMinutes),
            FirstEmailDelayHours = Math.Max(0, abandoned.FirstEmailDelayHours),
            ReminderEmailDelayHours = Math.Max(0, abandoned.ReminderEmailDelayHours),
            FinalEmailDelayHours = Math.Max(0, abandoned.FinalEmailDelayHours),
            MaxRecoveryEmails = Math.Max(0, abandoned.MaxRecoveryEmails)
        };

        store.Email = new MerchelloStoreEmailSettings
        {
            DefaultFromAddress = NullIfWhiteSpace(email.DefaultFromAddress),
            DefaultFromName = NullIfWhiteSpace(email.DefaultFromName),
            Theme = new MerchelloStoreEmailThemeSettings
            {
                PrimaryColor = string.IsNullOrWhiteSpace(theme.PrimaryColor) ? "#007bff" : theme.PrimaryColor,
                TextColor = string.IsNullOrWhiteSpace(theme.TextColor) ? "#333333" : theme.TextColor,
                BackgroundColor = string.IsNullOrWhiteSpace(theme.BackgroundColor) ? "#f4f4f4" : theme.BackgroundColor,
                FontFamily = string.IsNullOrWhiteSpace(theme.FontFamily) ? "'Helvetica Neue', Helvetica, Arial, sans-serif" : theme.FontFamily,
                SecondaryTextColor = string.IsNullOrWhiteSpace(theme.SecondaryTextColor) ? "#666666" : theme.SecondaryTextColor,
                ContentBackgroundColor = string.IsNullOrWhiteSpace(theme.ContentBackgroundColor) ? "#ffffff" : theme.ContentBackgroundColor
            }
        };
    }

    private static LogoPosition ParseLogoPosition(string? value)
    {
        return Enum.TryParse<LogoPosition>(value, true, out var parsed)
            ? parsed
            : LogoPosition.Left;
    }

    private static T CloneOptions<T>(T source) where T : class, new()
    {
        var json = JsonSerializer.Serialize(source, CloneSerializerOptions);
        return JsonSerializer.Deserialize<T>(json, CloneSerializerOptions) ?? new T();
    }

    private static void EnsureStoreSections(MerchelloStore store)
    {
        store.Ucp ??= new MerchelloStoreUcpSettings();
        store.InvoiceReminders ??= new MerchelloStoreInvoiceRemindersSettings();
        store.Policies ??= new MerchelloStorePoliciesSettings();
        store.Checkout ??= new MerchelloStoreCheckoutSettings();
        store.Checkout.OrderTerms ??= new OrderTermsSettings();
        store.AbandonedCheckout ??= new MerchelloStoreAbandonedCheckoutSettings();
        store.Email ??= new MerchelloStoreEmailSettings();
        store.Email.Theme ??= new MerchelloStoreEmailThemeSettings();
    }

    private string? ResolveWebsiteUrl(string? configuredWebsiteUrl, string? fallbackWebsiteUrl)
    {
        var normalizedConfigured = NullIfWhiteSpace(configuredWebsiteUrl);
        if (!string.IsNullOrWhiteSpace(normalizedConfigured))
        {
            return normalizedConfigured;
        }

        var request = httpContextAccessor.HttpContext?.Request;
        if (request?.Host.HasValue == true)
        {
            var pathBase = request.PathBase.HasValue
                ? request.PathBase.Value?.TrimEnd('/')
                : string.Empty;
            return $"{request.Scheme}://{request.Host.Value}{pathBase}";
        }

        return NullIfWhiteSpace(fallbackWebsiteUrl);
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeStoreKey(string? storeKey) =>
        string.IsNullOrWhiteSpace(storeKey)
            ? DefaultStoreKey
            : storeKey.Trim().ToLowerInvariant();

    private static MerchelloStore CreateDefaultStore(string storeKey) =>
        new()
        {
            StoreKey = NormalizeStoreKey(storeKey)
        };
}
