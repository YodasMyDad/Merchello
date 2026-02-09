# Supplier Direct Fulfilment Provider (Built-In)

## Document Status

- Status: Audited, implementation-ready phased plan
- Last updated: 2026-02-09
- Audience: Core contributors implementing built-in fulfilment providers
- Related docs: `docs/Architecture-Diagrams.md`, `docs/Fulfilment.md`, `docs/EmailSystem.md`

## Goal

Deliver a first-party fulfilment provider that can submit supplier purchase orders via Email or FTP/SFTP, auto-create preparing shipments, and produce reliable timeline/audit telemetry with enterprise-grade failure handling.

## Audit Summary (from previous draft)

### Critical blockers

1. Per-supplier delivery method is not achievable with current fulfilment provider configuration shape (single configuration per provider key).
2. Warehouse/Supplier fulfilment provider assignment plumbing is incomplete in current API/service layer (DTO fields exist but are not persisted).
3. Fulfilment provider config UI currently cannot safely edit complex configurations (Number fields and existing value rehydration gaps).

### High-risk gaps

1. `SupplierOrderNotification` wiring was incomplete for topic registry/handler registration lifecycle.
2. Timeline requirements included per-attempt failures, but no notification currently exists for non-terminal failed attempts.
3. Auto-shipment plan used `CreateShipmentsFromOrderAsync()`, which does not publish shipment notifications and can create side-effect gaps.
4. "Email always succeeds" assumption is incorrect; queueing can fail at template/token stage.
5. FTP/SFTP security controls (host key validation, TLS mode, credential hygiene, atomic upload) were underspecified.

## Scope

- Email supplier PO dispatch
- FTP/SFTP supplier PO dispatch with CSV payload
- Auto shipment creation on successful fulfilment submission
- Invoice timeline notes for success/failure lifecycle
- Supplier-level delivery profile (Email vs FTP/SFTP) with provider-level defaults
- Enterprise test coverage, observability, and rollout runbook

## Non-goals

- Real-time supplier APIs (separate phase)
- New database tables unless a hard blocker is discovered
- Replacing existing ShipBob provider behavior

## Architecture Decisions

1. Configuration model
Use supplier-level profiles stored in `Supplier.ExtendedData` with provider-level defaults in `FulfilmentProviderConfiguration.SettingsJson`.
Rationale: keeps one-provider-key architecture intact while enabling "one method per supplier."

2. Single source of truth
All routing and data assembly stays in services:
- `IFulfilmentService` builds request context
- Provider executes delivery transport only
- Notification handlers perform side effects (shipment/timeline/webhook/email bridging)

3. Idempotency and references
Submission reference format:
- Email: `email:{outboundDeliveryId}`
- FTP/SFTP: `ftp:{remotePath}/{fileName}`
Use deterministic file names (`{OrderNumber}-{OrderId:N}.csv`) to prevent duplicate uploads on retry.

4. Security defaults
- SFTP preferred by default
- Plain FTP requires explicit opt-in setting
- Never log or timeline raw secrets
- CSV generation protects against formula injection and unsafe path/file patterns

## Phase 0: Platform Prerequisites (Blockers)

### Objectives

Unblock reliable provider configuration and assignment before implementing supplier-direct logic.

### Work items

1. Fulfilment provider assignment plumbing
- Persist `FulfilmentProviderConfigurationId` for warehouse and supplier create/update flows.
- Ensure `ResolveProviderForWarehouseAsync()` can be configured from UI/API end-to-end.

2. Fulfilment provider config UX hardening
- Fulfilment config modal supports `Number` fields and preserves configured values when editing.
- Backend returns current configuration values for configured provider detail endpoint.
- Sensitive fields support retain-on-empty semantics during update.

3. Provider config API parity
- Align fulfilment provider configuration DTO behavior with shipping provider configuration DTO behavior (including configuration payload).

### Exit criteria

- Warehouse and supplier can be assigned to a fulfilment provider from backoffice and persisted.
- Fulfilment provider edit modal can round-trip settings without data loss.
- Existing ShipBob configuration remains editable and testable after changes.

## Phase 1: Core Provider + Email Delivery

### Objectives

Introduce built-in `supplier-direct` provider with fully functional email-based purchase order dispatch.

### Core implementation

Create `src/Merchello.Core/Fulfilment/Providers/SupplierDirect/`:
- `SupplierDirectFulfilmentProvider.cs`
- `SupplierDirectSettings.cs`
- `SupplierDirectDeliveryMethod.cs`
- `SupplierDirectProviderDefaults.cs` (optional constants/defaults)
- `SupplierDirectIcon.cs`
- `SupplierDirectExtendedDataKeys.cs`

Create notification type:
- `src/Merchello.Core/Fulfilment/Notifications/SupplierOrderNotification.cs`

Email integration:
- Add `Constants.EmailTopics.FulfilmentSupplierOrder = "fulfilment.supplier_order"`
- Register topic in `EmailTopicRegistry`
- Implement handler method in `EmailNotificationHandler`
- Register handler in `Startup.cs`
- Add sample notification in `SampleNotificationFactory`

Fulfilment context enrichment:
- Update `FulfilmentService` request build path to include supplier context in request extended data:
  - SupplierId, SupplierName, SupplierCode, SupplierContactEmail
  - Supplier delivery profile payload (if present)

Provider behavior:
- Resolve supplier delivery method (supplier profile -> provider default)
- For email method:
  - Queue via `IEmailService.QueueDeliveryAsync`
  - Return provider reference as `email:{deliveryId}`
  - Treat template/render/queue failures as submission failure

### Exit criteria

- Order submission routes to supplier-direct and queues supplier PO email.
- Provider reference stored on order.
- Fulfilment submitted notification flow remains intact.
- No controller DbContext usage introduced.

## Phase 2: FTP/SFTP Transport + CSV Delivery

### Objectives

Add robust file-based transport for suppliers requiring FTP/SFTP ingestion.

### Core implementation

Create:
- `IFtpClient.cs`
- `IFtpClientFactory.cs`
- `FtpClientWrapper.cs`
- `FtpClientFactory.cs`
- `SupplierDirectCsvGenerator.cs`
- `CsvColumnMapping.cs`

Dependencies:
- Add `FluentFTP` and `SSH.NET` package references in `Merchello.Core.csproj`

Settings support:
- Host, Port, Username, Password, RemotePath, UseSftp
- Host fingerprint (SFTP), timeout, passive mode, overwrite behavior
- FileNamePattern
- ColumnMapping JSON (validated)

CSV requirements:
- Configurable column ordering and aliases
- UTF-8 BOM
- Escaping + spreadsheet formula injection protection (`=`, `+`, `-`, `@` prefixed values sanitized)
- Deterministic file naming for idempotency

Connection testing:
- `TestConnectionAsync()` validates configured mode:
  - Email: validate topic configuration exists
  - FTP/SFTP: connect + auth + directory accessibility check

### Exit criteria

- FTP/SFTP upload works with valid credentials and fails cleanly with actionable errors.
- Retry behavior is safe against duplicate uploads (deterministic name + existence check/strategy).
- CSV output validated against supplier mapping scenarios.

## Phase 3: Fulfilment Workflow Integration (Auto-Shipment + Timeline)

### Objectives

Make supplier-direct operationally visible and fulfilment-complete.

### Auto-shipment

- Add metadata flag:
  - `FulfilmentProviderMetadata.CreatesShipmentOnSubmission`
- Set `true` for supplier-direct
- Add handler:
  - `FulfilmentAutoShipmentHandler` on `FulfilmentSubmittedNotification`
- Idempotency:
  - do not create duplicate preparing shipments for same order
- Preferred shipment creation path:
  - use service path that publishes shipment notifications
  - if current method does not publish notifications, extend service to provide a notify-safe path

### Timeline notes

Create `FulfilmentTimelineHandler`:
- Handle `FulfilmentSubmittedNotification`
- Handle `FulfilmentSubmissionFailedNotification`
- Add notes via `IInvoiceService.AddNoteAsync`

Add optional notification (recommended):
- `FulfilmentSubmissionAttemptFailedNotification`
- Publish on non-terminal submission failures to capture attempt-level timeline history

Timeline examples:
- Email queued: `Supplier order queued via email (Delivery: {id})`
- FTP uploaded: `Supplier order uploaded to {remotePath}/{fileName}`
- Retry failure: `Supplier order submission failed (attempt {n}/{max}): {reason}`
- Permanent failure: `Supplier order permanently failed after {n} attempts`
- Auto-shipment: `Shipment auto-created in Preparing status`

### Exit criteria

- Successful submission produces preparing shipment exactly once.
- Invoice timeline shows submission lifecycle clearly.
- Failures are observable without digging into application logs.

## Phase 4: Supplier-Level Configuration UX

### Objectives

Make per-supplier delivery profile manageable without manual JSON edits.

### Backend

- Extend supplier DTOs and API mapping to include:
  - ContactName, ContactEmail, ContactPhone
  - `SupplierDirectProfile` (or equivalent structured payload)
- Validate profile schema server-side.

### Frontend

- Extend supplier modal/form for:
  - Delivery method selector (Email or FTP/SFTP)
  - Method-specific fields
  - Validation and inline help

### Data storage

- Store profile in `Supplier.ExtendedData["Fulfilment:SupplierDirect:Profile"]`
- Provider-level settings remain as defaults/fallback

### Exit criteria

- Admin can configure different delivery methods per supplier from backoffice.
- Fulfilment request enrichment includes resolved supplier profile at runtime.
- No new DB tables introduced.

## Phase 5: Hardening, Observability, and Operations

### Objectives

Reach enterprise release quality and make this provider a reference implementation.

### Hardening

- Structured logs with correlation keys:
  - OrderId, InvoiceId, SupplierId, ProviderKey, SubmissionReference
- Secret redaction in logs and notes
- Retry classification:
  - retryable network/auth transient errors
  - non-retryable validation/config errors
- Rate limiting/backoff tuning for FTP failures

### Operational visibility

- Dashboard/reporting queries for:
  - submission success rate
  - failure reasons by supplier
  - retry counts and permanently failed orders
- Runbook:
  - how to requeue manually
  - how to inspect outbound delivery history
  - how to recover from credential rotation failures

### Exit criteria

- On-call/support can diagnose and recover common incidents without code changes.
- Security review checklist completed.

## Phase 6: API Delivery Method (Deferred)

### Scope

- Add third delivery channel: supplier REST API/webhook endpoints.
- Reuse same provider contract, timeline, and shipment lifecycle.
- Keep supplier profile delivery method extensible (`Email`, `Ftp`, `Api`).

## Test Strategy (Release Gate)

### Unit tests

- Settings parsing and validation (including stringly-typed config payloads)
- CSV mapping and escaping
- Email submission path success/failure
- FTP/SFTP upload success/failure classification
- Auto-shipment idempotency
- Timeline note formatting

### Integration tests

- End-to-end order submission with supplier-direct email mode
- End-to-end order submission with FTP/SFTP mode
- Retry path to permanent failure
- Supplier-specific routing correctness

### Regression tests

- ShipBob provider unaffected
- Existing fulfilment webhooks and email topics unaffected
- Backoffice provider config editing does not wipe secrets

### Security tests

- CSV injection payloads
- Path traversal attempts in file naming/remote paths
- Secret leakage assertions in logs and notes

## Rollout Plan

1. Feature flag
- Introduce `Merchello:Fulfilment:SupplierDirect:Enabled` (default false in production)

2. Pilot
- Enable for one supplier and one warehouse first
- Validate timeline, shipment creation, and retries under real load

3. Gradual enablement
- Roll out supplier by supplier
- Monitor failure rate and outbound queue health

4. GA criteria
- All phase exit criteria met
- 0 high-severity known defects
- Runbook and documentation published

## Definition of Done (GA)

- Per-supplier delivery method works in production without manual DB edits.
- Email and FTP/SFTP channels are both tested and operational.
- Submission lifecycle is visible in invoice timeline and logs.
- Auto-shipment creation is idempotent and notification-safe.
- Configuration UX supports safe edit/update cycles.
- Test suite includes unit + integration + regression + security coverage.
- Documentation includes setup, troubleshooting, and extension guidance for third-party provider authors.
