# Merchello Appsettings Audit

Date: 2026-02-19  
Scope: `src/Merchello.Site/appsettings.json` -> `Merchello` section

Status meanings:
- `Used`: already wired to runtime behavior.
- `Implemented`: was config-only and is now wired in this change.
- `Removed`: config-only and removed from appsettings + settings model.

| Setting | UsedInRuntime | EvidencePath | Decision | Action |
|---|---|---|---|---|
| `Merchello:EnableCheckout` | Yes | `src/Merchello/Startup.cs` | Used | None |
| `Merchello:EnableProductRendering` | Yes | `src/Merchello/Startup.cs` | Used | None |
| `Merchello:InstallSeedData` | Yes | `src/Merchello/Controllers/SeedDataApiController.cs` | Used | None |
| `Merchello:StoreCurrencyCode` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Used | None |
| `Merchello:DefaultShippingCountry` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Used | None |
| `Merchello:GoogleShoppingCategories:CacheHours` | Yes | `src/Merchello.Core/Products/Services/GoogleShoppingCategoryService.cs` | Used | None |
| `Merchello:GoogleShoppingCategories:TaxonomyUrls` (`US`,`GB`,`AU`) | Yes | `src/Merchello.Core/Products/Services/GoogleShoppingCategoryService.cs` | Used | None |
| `Merchello:DefaultRounding` | Yes | `src/Merchello.Core/Shared/Services/CurrencyService.cs` | Used | None |
| `Merchello:OrderGroupingStrategy` | Yes | `src/Merchello.Core/Checkout/Strategies/OrderGroupingStrategyResolver.cs` | Used | None |
| `Merchello:OptionTypeAliases` | Yes | `src/Merchello/Controllers/SettingsApiController.cs` | Used | None |
| `Merchello:OptionUiAliases` | Yes | `src/Merchello/Controllers/SettingsApiController.cs` | Used | None |
| `Merchello:MaxProductOptions` | Yes | `src/Merchello/Controllers/SettingsApiController.cs` | Used | None |
| `Merchello:MaxOptionValuesPerOption` | Yes | `src/Merchello/Controllers/SettingsApiController.cs` | Used | None |
| `Merchello:ProductViewLocations` | Yes | `src/Merchello.Core/Products/Services/ProductService.cs` | Used | None |
| `Merchello:DefaultMemberGroup` | Yes | `src/Merchello/Services/CheckoutMemberService.cs` | Used | None |
| `Merchello:DefaultMemberTypeAlias` | Yes | `src/Merchello/Services/CheckoutMemberService.cs` | Used | None |
| `Merchello:ShippingAutoSelectStrategy` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutService.cs` | Used | None |
| `Merchello:ProductDescriptionDataTypeKey` | Yes | `src/Merchello.Core/Data/MerchelloDataTypeInitializer.cs` | Used | None |
| `Merchello:DownloadTokenSecret` | Yes | `src/Merchello.Core/DigitalProducts/Services/DigitalProductService.cs` | Used | None |
| `Merchello:DefaultDownloadLinkExpiryDays` | Yes | `src/Merchello.Core/DigitalProducts/Factories/DownloadLinkFactory.cs` | Used | None |
| `Merchello:DefaultMaxDownloadsPerLink` | Yes | `src/Merchello.Core/Products/Services/ProductService.cs` | Used | None |
| `Merchello:Cache:DefaultTtlSeconds` | Yes | `src/Merchello.Core/Caching/Services/CacheService.cs` | Used | None |
| `Merchello:ExchangeRates:CacheTtlMinutes` | Yes | `src/Merchello.Core/ExchangeRates/Services/ExchangeRateCache.cs` | Used | None |
| `Merchello:ExchangeRates:RefreshIntervalMinutes` | Yes | `src/Merchello.Core/ExchangeRates/Services/ExchangeRateRefreshJob.cs` | Used | None |
| `Merchello:ProductFeeds:AutoRefreshEnabled` | Yes | `src/Merchello.Core/ProductFeeds/Services/ProductFeedRefreshJob.cs` | Used | None |
| `Merchello:ProductFeeds:RefreshIntervalHours` | Yes | `src/Merchello.Core/ProductFeeds/Services/ProductFeedRefreshJob.cs` | Used | None |
| `Merchello:ProductSync:WorkerIntervalSeconds` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncWorkerJob.cs` | Used | None |
| `Merchello:ProductSync:RunRetentionDays` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:ArtifactRetentionDays` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:MaxCsvBytes` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:MaxValidationIssuesReturned` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:ImageDownloadTimeoutSeconds` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:MaxImageBytes` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:ProductSync:MediaImportRootFolderName` | Yes | `src/Merchello.Core/ProductSync/Services/ProductSyncService.cs` | Used | None |
| `Merchello:Webhooks:MaxRetries` | Yes | `src/Merchello.Core/Webhooks/Services/WebhookService.cs` | Used | None |
| `Merchello:Webhooks:RetryDelaysSeconds` | Yes | `src/Merchello.Core/Webhooks/Services/WebhookService.cs` | Used | None |
| `Merchello:Webhooks:DeliveryIntervalSeconds` | Yes | `src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs` | Used | None |
| `Merchello:Webhooks:DefaultTimeoutSeconds` | Yes | `src/Merchello.Core/Webhooks/Services/WebhookService.cs` | Used | None |
| `Merchello:Webhooks:MaxPayloadSizeBytes` | Yes | `src/Merchello.Core/Webhooks/Services/WebhookService.cs` | Used | None |
| `Merchello:Webhooks:DeliveryLogRetentionDays` | Yes | `src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs` | Used | None |
| `Merchello:Email:TemplateViewLocations` | Yes | `src/Merchello/Email/Services/EmailRazorViewRenderer.cs` | Used | None |
| `Merchello:Email:MaxRetries` | Yes | `src/Merchello.Core/Email/Services/EmailService.cs` | Used | None |
| `Merchello:Email:RetryDelaysSeconds` | Yes | `src/Merchello.Core/Email/Services/EmailService.cs` | Used | None |
| `Merchello:Email:DeliveryRetentionDays` | Yes | `src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs` | Used | None |
| `Merchello:Email:MaxAttachmentSizeBytes` | Yes | `src/Merchello.Core/Email/Attachments/EmailAttachmentResolver.cs` | Used | None |
| `Merchello:Email:MaxTotalAttachmentSizeBytes` | Yes | `src/Merchello.Core/Email/Attachments/EmailAttachmentResolver.cs` | Used | None |
| `Merchello:Email:AttachmentStoragePath` | Yes | `src/Merchello.Core/Email/Services/EmailAttachmentStorageService.cs` | Used | None |
| `Merchello:Email:AttachmentRetentionHours` | Yes | `src/Merchello.Core/Email/Services/EmailAttachmentCleanupJob.cs` | Used | None |
| `Merchello:Checkout:SessionSlidingTimeoutMinutes` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutSessionService.cs` | Used | None |
| `Merchello:Checkout:SessionAbsoluteTimeoutMinutes` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutSessionService.cs` | Used | None |
| `Merchello:Checkout:LogSessionExpirations` | Yes | `src/Merchello.Core/Checkout/Services/CheckoutSessionService.cs` | Used | None |
| `Merchello:Protocols:WellKnownPath` | No | `src/Merchello.Core/Protocols/Models/ProtocolSettings.cs` | Removed | Removed from `ProtocolSettings` + `appsettings.json` |
| `Merchello:Protocols:ManifestCacheDurationMinutes` | Yes | `src/Merchello/Controllers/WellKnownController.cs` | Used | None |
| `Merchello:Protocols:RequireHttps` | Yes | `src/Merchello/Middleware/AgentAuthenticationMiddleware.cs` | Used | None |
| `Merchello:Protocols:MinimumTlsVersion` | Yes | `src/Merchello/Middleware/AgentAuthenticationMiddleware.cs` | Used | None |
| `Merchello:Protocols:Ucp:Version` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:RequireAuthentication` | No | `src/Merchello.Core/Protocols/Models/UcpSettings.cs` | Removed | Removed from `UcpSettings` + `appsettings.json` |
| `Merchello:Protocols:Ucp:AllowedAgents` | Yes | `src/Merchello/Middleware/AgentAuthenticationMiddleware.cs` | Used | None |
| `Merchello:Protocols:Ucp:SigningKeyRotationDays` | Yes | `src/Merchello.Core/Protocols/Webhooks/UcpSigningKeyRotationJob.cs` | Implemented | Added runtime rotation policy job + due-based key-store method |
| `Merchello:Protocols:Ucp:WebhookTimeoutSeconds` | Yes | `src/Merchello.Core/Protocols/UCP/Handlers/UcpOrderWebhookHandler.cs` | Used | None |
| `Merchello:Protocols:Ucp:WebhookRetryCount` | No | `src/Merchello.Core/Protocols/Models/UcpSettings.cs` | Removed | Removed from `UcpSettings` + `appsettings.json` |
| `Merchello:Protocols:Ucp:Capabilities:Checkout` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:Capabilities:Order` | Yes | `src/Merchello.Core/Protocols/UCP/Handlers/UcpOrderWebhookHandler.cs` | Used | None |
| `Merchello:Protocols:Ucp:Capabilities:IdentityLinking` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:Extensions:Discount` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:Extensions:Fulfillment` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:Extensions:BuyerConsent` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:Protocols:Ucp:Extensions:Ap2Mandates` | Yes | `src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs` | Used | None |
| `Merchello:AbandonedCheckout:RecoveryUrlBase` | Yes | `src/Merchello.Core/Checkout/Services/AbandonedCheckoutService.cs` | Used | None |
| `Merchello:Fulfilment:PollingIntervalMinutes` | Yes | `src/Merchello.Core/Fulfilment/Services/FulfilmentPollingJob.cs` | Used | None |
| `Merchello:Fulfilment:MaxRetryAttempts` | Yes | `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs` | Used | None |
| `Merchello:Fulfilment:RetryDelaysMinutes` | Yes | `src/Merchello.Core/Fulfilment/FulfilmentSettings.cs` + `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs` | Used | None |
| `Merchello:Fulfilment:InventorySyncIntervalMinutes` | No | `src/Merchello.Core/Fulfilment/FulfilmentSettings.cs` | Removed | Removed from `FulfilmentSettings` + `appsettings.json` |
| `Merchello:Fulfilment:ProductSyncOnSave` | No | `src/Merchello.Core/Fulfilment/FulfilmentSettings.cs` | Removed | Removed from `FulfilmentSettings` + `appsettings.json` |
| `Merchello:Fulfilment:SyncLogRetentionDays` | Yes | `src/Merchello.Core/Fulfilment/Services/FulfilmentCleanupJob.cs` | Used | None |
| `Merchello:Fulfilment:WebhookLogRetentionDays` | Yes | `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs` | Used | None |
| `Merchello:Fulfilment:SupplierDirect:Enabled` | Yes | `src/Merchello.Core/Fulfilment/Providers/FulfilmentProviderManager.cs` | Used | None |
| `Merchello:Upsells:MaxSuggestionsPerLocation` | Yes | `src/Merchello.Core/Upsells/Services/UpsellEngine.cs` | Used | None |
| `Merchello:Upsells:CacheDurationSeconds` | Yes | `src/Merchello.Core/Upsells/Services/UpsellService.cs` | Used | None |
| `Merchello:Upsells:EventRetentionDays` | Yes | `src/Merchello.Core/Upsells/Services/UpsellStatusJob.cs` | Used | None |
| `Merchello:Upsells:EnablePostPurchase` | Yes | `src/Merchello.Core/Upsells/Services/PostPurchaseUpsellService.cs` | Used | None |
| `Merchello:Upsells:PostPurchaseTimeoutSeconds` | No | `src/Merchello.Core/Upsells/Models/UpsellSettings.cs` | Removed | Removed from `UpsellSettings` + `appsettings.json` |
| `Merchello:Upsells:PostPurchaseFulfillmentHoldMinutes` | Yes | `src/Merchello.Core/Upsells/Services/PostPurchaseUpsellService.cs` | Used | None |
