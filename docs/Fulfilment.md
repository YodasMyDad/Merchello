# Fulfilment Provider System (Code-Verified)

Last verified against code: 2026-02-20

This document is the source of truth for implementing fulfilment providers in Merchello. It is based on real code paths, not historical design notes.

## 1. Scope and boundaries

Fulfilment providers are not shipping providers.

- Shipping providers: checkout-time customer options and rates.
- Fulfilment providers: post-order submission to 3PL/supplier, status updates, shipment updates, and optional product/inventory sync.

Primary flow ownership:

- Submit/cancel/status/shipment: `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs`
- Trigger-aware submission policy: `src/Merchello.Core/Fulfilment/Services/FulfilmentSubmissionService.cs`
- Provider contract: `src/Merchello.Core/Fulfilment/Providers/Interfaces/IFulfilmentProvider.cs`

## 2. Real runtime flow

### 2.1 Automatic submission trigger

Auto-submission is triggered by successful payment events (not order-created).

- Handler: `src/Merchello.Core/Fulfilment/Handlers/FulfilmentOrderSubmissionHandler.cs`
- Notification: `PaymentCreatedNotification`
- Conditions:
  - `PaymentSuccess == true`
  - `PaymentType == Payment`
  - invoice payment status is `Paid`

For each order in the paid invoice, handler calls:

- `IFulfilmentSubmissionService.SubmitOrderAsync(new SubmitFulfilmentOrderParameters { Source = PaymentCreated, RequirePaidInvoice = false })`

### 2.2 Explicit release trigger

Staff can explicitly release one order via:

- `POST /api/v1/orders/{orderId}/fulfillment/release`
- Controller: `src/Merchello/Controllers/OrdersApiController.cs`

This uses:

- `Source = ExplicitRelease`
- `RequirePaidInvoice = true`

Policy: explicit release is only allowed for Supplier Direct.

### 2.3 Submission policy and notifications

`FulfilmentSubmissionService` enforces trigger policy before submission:

- Idempotency guard: if order already has `FulfilmentProviderReference`, return warning.
- Blocks `Cancelled` / `OnHold`.
- Resolves provider from warehouse/supplier configuration.
- Supplier Direct trigger policy:
  - `OnPaid` allows `PaymentCreated` only.
  - `ExplicitRelease` allows `ExplicitRelease` only.
- Optional paid-invoice requirement.
- Publishes cancelable `FulfilmentSubmittingNotification`.
- Delegates actual submit to `IFulfilmentService.SubmitOrderAsync`.
- Publishes one of:
  - `FulfilmentSubmittedNotification`
  - `FulfilmentSubmissionAttemptFailedNotification`
  - `FulfilmentSubmissionFailedNotification`

### 2.4 Submission execution details

`FulfilmentService.SubmitOrderAsync`:

1. Loads order + invoice + line items.
2. Guards duplicate/in-progress submissions.
3. Resolves provider config (warehouse override, else supplier default).
4. Treats missing/disabled/non-submitting provider as manual fulfilment (non-fatal).
5. Sets:
   - `FulfilmentProviderConfigurationId`
   - `Order.Status = Processing`
6. Builds `FulfilmentOrderRequest` with:
   - line items, addresses, customer email
   - `ShippingServiceCode` via mapping chain (see section 4)
   - supplier/warehouse extended context
7. Calls provider `SubmitOrderAsync`.
8. On success:
   - sets `FulfilmentProviderReference`
   - sets `FulfilmentSubmittedAt`
   - clears error
9. On failure:
   - sets `FulfilmentErrorMessage`
   - increments `FulfilmentRetryCount`
   - may set `OrderStatus.FulfilmentFailed`

Retryability:

- Unknown error code -> retryable.
- Known classified non-retryable error -> immediate `FulfilmentFailed` and max retry count clamp.

### 2.5 Cancellation flow

- Handler: `src/Merchello.Core/Fulfilment/Handlers/FulfilmentCancellationHandler.cs`
- Trigger: `OrderStatusChangedNotification`
- Runs for transitions to `Cancelled` when old status was `Processing` or `PartiallyShipped` and provider reference exists.
- Calls `IFulfilmentService.CancelOrderAsync`.
- Best-effort only; Merchello cancellation is not rolled back on provider failure.

### 2.6 Webhook flow and idempotency

Public endpoint:

- `POST /umbraco/merchello/webhooks/fulfilment/{providerKey}`
- Controller: `src/Merchello/Controllers/FulfilmentWebhookController.cs`

Flow:

1. Resolve provider by `providerKey` (enabled not required).
2. Capture raw payload.
3. Build message ID from headers, fallback to deterministic `hash:{sha256(payload)}`.
4. Validate signature via provider `ValidateWebhookAsync`.
5. Atomic dedupe insert via `TryLogWebhookAsync`.
6. Process provider payload via `ProcessWebhookAsync`.
7. On failure/exception, remove webhook log (`RemoveWebhookLogAsync`) so provider retries can be processed.
8. On success, finalize webhook log (`CompleteWebhookLogAsync`).
9. Apply updates:
   - `ProcessStatusUpdateAsync`
   - `ProcessShipmentUpdateAsync`

Message ID header precedence in controller:

1. `webhook-id`
2. `X-Webhook-Id`
3. `X-Shiphero-Message-ID`
4. `X-Request-Id`
5. payload hash fallback

### 2.7 Polling flow

- Job: `src/Merchello.Core/Fulfilment/Services/FulfilmentPollingJob.cs`
- Polls enabled providers where `SupportsPolling == true`.
- Candidate orders come from `GetOrdersForPollingAsync` where status is `Processing`, `PartiallyShipped`, or `Shipped` and provider reference exists.
- Applies only status updates from polling path.

### 2.8 Shipment update behavior

`ProcessShipmentUpdateAsync`:

- Finds order by provider reference.
- Fallback: if provider reference parses as GUID and no reference match exists, it resolves by `Order.Id`.
- Matches existing shipment by `Shipment.ExtendedData["Fulfilment:ProviderShipmentId"]`.
- Creates shipment when needed via `ShipmentFactory.CreateFromWebhook`.
- Updates tracking fields (`TrackingNumber`, `TrackingUrl`, `Carrier`).
- Assigns line items for partial shipments by SKU + quantity.
- Recomputes order shipment state (`PartiallyShipped` / `Shipped`) from shipped quantities.

### 2.9 Retry and cleanup jobs

- Retry queue: `FulfilmentRetryJob`
- Polling: `FulfilmentPollingJob`
- Log cleanup: `FulfilmentCleanupJob`

Configuration source: `Merchello:Fulfilment` -> `FulfilmentSettings`.

## 3. Persistence model (actual)

## 3.1 Existing tables updated

`merchelloOrders` (already implemented):

- `FulfilmentProviderConfigurationId`
- `FulfilmentProviderReference`
- `FulfilmentSubmittedAt`
- `FulfilmentErrorMessage`
- `FulfilmentRetryCount`
- `ExtendedData` already exists and is JSON-mapped

`merchelloShipments`:

- tracking fields already exist (`TrackingNumber`, `TrackingUrl`, `Carrier`)
- `ExtendedData` already exists and is JSON-mapped

`merchelloWarehouses`:

- `FulfilmentProviderConfigurationId` (warehouse override)

`merchelloSuppliers`:

- `DefaultFulfilmentProviderConfigurationId` (supplier default)

## 3.2 Provider configuration table

Fulfilment configs are not in a dedicated fulfilment table.

- Shared table: `merchelloProviderConfigurations`
- Inheritance discriminator: `ProviderType = "fulfilment"`
- Base model: `ProviderConfiguration`
- Fulfilment subtype: `FulfilmentProviderConfiguration`

Relevant mapping:

- `src/Merchello.Core/Shared/Providers/ProviderConfigurationDbMapping.cs`

## 3.3 Fulfilment-specific tables

- `merchelloFulfilmentSyncLogs`
- `merchelloFulfilmentWebhookLogs`

Webhook dedupe constraint:

- unique index on `(ProviderConfigurationId, MessageId)`

## 4. Shipping to fulfilment bridge (DaysFrom / DaysTo / category)

This bridge is implemented and should be preserved when adding providers.

### 4.1 Selection key contract

- Flat-rate selection: `so:{guid}`
- Dynamic selection: `dyn:{provider}:{serviceCode}`
- Parser: `src/Merchello.Core/Shipping/Extensions/SelectionKeyExtensions.cs`

### 4.2 Where delivery-time data is populated

- Flat-rate options: from `ShippingOption.DaysFrom/DaysTo/IsNextDay`.
- Dynamic carrier quotes: `DefaultOrderGroupingStrategy` populates `ShippingOptionInfo.DaysFrom/DaysTo` from transit times (with optional warehouse provider overrides).

Key file:

- `src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs`

### 4.3 Category inference and order storage

At order creation (`InvoiceService`):

- `InferServiceCategory(ShippingOptionInfo)` maps to:
  - `Overnight` (<= 1 day or `IsNextDay`)
  - `Express` (<= 3)
  - `Standard` (<= 7)
  - `Economy` (> 7)
- Stored on order as `Order.ShippingServiceCategory`.

Key file:

- `src/Merchello.Core/Accounting/Services/InvoiceService.cs`

### 4.4 Fulfilment shipping-service resolution chain

When building fulfilment request, `FulfilmentService.ResolveShippingServiceCode` uses:

1. `ServiceCategoryMapping_{Category}` from provider settings JSON
2. `DefaultShippingMethod` from provider settings JSON
3. `Order.ShippingServiceCode` fallback

Key file:

- `src/Merchello.Core/Fulfilment/Services/FulfilmentService.cs`

## 5. Provider contract

Interface: `IFulfilmentProvider`

Required implementation areas:

- Metadata (`FulfilmentProviderMetadata`)
- Configuration fields + configure
- Connection test
- Submit/cancel
- Webhook validation + parsing
- Polling
- Product sync
- Inventory sync
- Test webhook templates + test payload generation

Base class:

- `FulfilmentProviderBase`
- Provides safe defaults for optional capabilities.

Important metadata flags:

- `SupportsOrderSubmission`
- `SupportsOrderCancellation`
- `SupportsWebhooks`
- `SupportsPolling`
- `SupportsProductSync`
- `SupportsInventorySync`
- `CreatesShipmentOnSubmission` (controls auto-shipment handler)
- `ApiStyle` (`Rest`, `GraphQL`, `Sftp`)

## 6. Provider discovery and config lifecycle

Manager:

- `src/Merchello.Core/Fulfilment/Providers/FulfilmentProviderManager.cs`

Behavior:

- Discovers providers through `ExtensionManager`.
- Loads persisted fulfilment configs from `ProviderConfigurations.OfType<FulfilmentProviderConfiguration>()`.
- Calls each provider `ConfigureAsync(config)`.
- Maintains cached provider instances.

## 7. API surface for fulfilment admin

Controller: `src/Merchello/Controllers/FulfilmentProvidersApiController.cs`

Key endpoints under backoffice base route (`/api/v1/...`):

- `GET /fulfilment-providers/available`
- `GET /fulfilment-providers`
- `GET /fulfilment-providers/{id}`
- `GET /fulfilment-providers/{key}/fields`
- `POST /fulfilment-providers`
- `PUT /fulfilment-providers/{id}`
- `DELETE /fulfilment-providers/{id}`
- `PUT /fulfilment-providers/{id}/toggle`
- `POST /fulfilment-providers/{id}/test`
- `POST /fulfilment-providers/{id}/test/order`
- `GET /fulfilment-providers/{id}/test/webhook-events`
- `POST /fulfilment-providers/{id}/test/simulate-webhook`
- `POST /fulfilment-providers/{id}/sync/products`
- `POST /fulfilment-providers/{id}/sync/inventory`
- `GET /fulfilment-providers/sync-logs`
- `GET /fulfilment-providers/sync-logs/{id}`

Provider assignment is done through warehouse/supplier DTO fields, not dedicated assignment endpoints:

- `Warehouse.FulfilmentProviderConfigurationId`
- `Supplier.DefaultFulfilmentProviderConfigurationId`

## 8. Current built-in providers

Implemented provider keys:

- `shipbob`
- `supplier-direct`

`shipbob`:

- Full capability provider (submit/cancel/webhooks/polling/product sync/inventory sync)
- `CreatesShipmentOnSubmission = false` (shipments come from webhook updates)

`supplier-direct`:

- Submit-only (email/FTP/SFTP delivery to suppliers)
- No webhook/polling/product/inventory sync
- `CreatesShipmentOnSubmission = true`

## 9. ShipBob reference implementation (recommended template)

Code:

- Provider: `src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobFulfilmentProvider.cs`
- API client: `src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobApiClient.cs`
- Settings: `src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobSettings.cs`
- Mapper: `src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobStatusMapper.cs`
- Webhook validator: `src/Merchello.Core/Fulfilment/Providers/ShipBob/ShipBobWebhookValidator.cs`

### 9.1 API style and SDK

Current implementation uses direct REST over `HttpClient` (no SDK dependency in Merchello).

### 9.2 Versioning

Default `ApiVersion` is now `2026-01` and remains configurable in provider settings.

### 9.3 Submit behavior

- Maps Merchello order to ShipBob order request.
- Persists ShipBob order ID as `FulfilmentProviderReference`.
- Stores extra provider metadata in `Order.ExtendedData` with `Fulfilment:*` prefix.

### 9.4 Cancel behavior

- Loads order by ShipBob order ID.
- Cancels each shipment.
- API client tries `shipment/{id}:cancel` first, then `shipment/{id}/cancel` fallback.

### 9.5 Webhook behavior

- Validates HMAC SHA-256 using:
  - `webhook-signature`
  - `webhook-timestamp`
  - `webhook-id`
- Signed payload format: `{messageId}.{timestamp}.{rawBody}`
- Provider-reference resolution in webhook parsing:
  1. `order_id`
  2. `reference_id`
  3. `id`

### 9.6 Polling behavior

- Polls numeric stored references (ShipBob order IDs) via `GET /{version}/order/{id}`.
- Falls back to reference-ID batch query for non-numeric references.

### 9.7 Sync behavior

- Product sync: upsert by SKU (find then update/create).
- Inventory sync: maps fulfillment-center inventory to `FulfilmentInventoryLevel`.

## 10. Provider implementation checklist (for new providers)

1. Create provider class deriving `FulfilmentProviderBase`.
2. Define metadata accurately, including capability flags and `CreatesShipmentOnSubmission`.
3. Define config fields with correct sensitive flags.
4. Add provider settings model with JSON parse/serialize.
5. Implement `SubmitOrderAsync` and return stable provider reference.
6. Implement `CancelOrderAsync` if supported.
7. Implement webhook validation and parser.
8. Emit `FulfilmentStatusUpdate` and `FulfilmentShipmentUpdate` with references that Merchello can resolve.
9. Implement polling if webhooks are unavailable/unreliable.
10. Implement product and inventory sync if supported.
11. Provide test webhook templates and payload generation for backoffice simulation.
12. Add tests under `src/Merchello.Tests/Fulfilment/Providers/{ProviderName}/`.

## 11. Test coverage references

ShipBob tests:

- `src/Merchello.Tests/Fulfilment/Providers/ShipBob/ShipBobFulfilmentProviderTests.cs`
- `src/Merchello.Tests/Fulfilment/Providers/ShipBob/ShipBobApiClientTests.cs`
- `src/Merchello.Tests/Fulfilment/Providers/ShipBob/ShipBobStatusMapperTests.cs`
- `src/Merchello.Tests/Fulfilment/Providers/ShipBob/ShipBobWebhookValidatorTests.cs`

Core fulfilment service tests:

- `src/Merchello.Tests/Fulfilment/Services/FulfilmentServiceTests.cs`
- `src/Merchello.Tests/Fulfilment/Services/FulfilmentSubmissionServiceTests.cs`
- `src/Merchello.Tests/Fulfilment/Services/FulfilmentSyncServiceTests.cs`

## 12. Alignment note with Architecture-Diagrams.md

`docs/Architecture-Diagrams.md` is broadly aligned with the current fulfilment architecture. This file is the detailed provider-authoring companion and should be preferred for implementation details.
