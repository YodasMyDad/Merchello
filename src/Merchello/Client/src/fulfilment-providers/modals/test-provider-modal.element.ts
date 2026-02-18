import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import {
  FulfilmentSyncStatus,
  type TestFulfilmentProviderResultDto,
  type TestFulfilmentOrderSubmissionResultDto,
  type FulfilmentWebhookEventTemplateDto,
  type FulfilmentWebhookSimulationResultDto,
  type FulfilmentSyncLogDto,
} from "@fulfilment-providers/types/fulfilment-providers.types.js";
import type {
  TestFulfilmentProviderModalData,
  TestFulfilmentProviderModalValue,
} from "@fulfilment-providers/modals/test-provider-modal.token.js";

type TabId = "connection" | "order-submission" | "webhooks" | "product-sync" | "inventory-sync";

@customElement("merchello-test-fulfilment-provider-modal")
export class MerchelloTestFulfilmentProviderModalElement extends UmbModalBaseElement<
  TestFulfilmentProviderModalData,
  TestFulfilmentProviderModalValue
> {
  @state() private _activeTab: TabId = "connection";

  @state() private _isTestingConnection = false;
  @state() private _connectionResult?: TestFulfilmentProviderResultDto;
  @state() private _connectionError: string | null = null;

  @state() private _isSubmittingOrder = false;
  @state() private _orderSubmissionResult?: TestFulfilmentOrderSubmissionResultDto;
  @state() private _orderSubmissionError: string | null = null;
  @state() private _testOrderNumber = "";
  @state() private _testOrderCustomerEmail = "test@example.com";
  @state() private _testOrderSku = "TEST-SKU-001";
  @state() private _testOrderName = "Test Product";
  @state() private _testOrderQuantity = 1;
  @state() private _testOrderUnitPrice = 10;
  @state() private _testOrderUseRealSandbox = true;

  @state() private _isLoadingWebhookTemplates = false;
  @state() private _webhookTemplates: FulfilmentWebhookEventTemplateDto[] = [];
  @state() private _selectedWebhookEvent = "";
  @state() private _webhookProviderReference = "";
  @state() private _webhookProviderShipmentId = "";
  @state() private _webhookTrackingNumber = "";
  @state() private _webhookCarrier = "";
  @state() private _webhookCustomPayload = "";
  @state() private _isSimulatingWebhook = false;
  @state() private _webhookSimulationResult?: FulfilmentWebhookSimulationResultDto;
  @state() private _webhookSimulationError: string | null = null;

  @state() private _isSyncingProducts = false;
  @state() private _productSyncResult?: FulfilmentSyncLogDto;
  @state() private _productSyncError: string | null = null;

  @state() private _isSyncingInventory = false;
  @state() private _inventorySyncResult?: FulfilmentSyncLogDto;
  @state() private _inventorySyncError: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadWebhookTemplates();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadWebhookTemplates(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId || !provider.supportsWebhooks) {
      return;
    }

    this._isLoadingWebhookTemplates = true;
    const { data, error } = await MerchelloApi.getFulfilmentWebhookEventTemplates(provider.configurationId);

    if (!this.#isConnected) return;

    if (error) {
      this._webhookSimulationError = error.message;
      this._isLoadingWebhookTemplates = false;
      return;
    }

    this._webhookTemplates = data ?? [];
    if (!this._selectedWebhookEvent && this._webhookTemplates.length > 0) {
      this._selectedWebhookEvent = this._webhookTemplates[0].eventType;
    }
    this._isLoadingWebhookTemplates = false;
  }

  private async _handleTestConnection(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._connectionError = "Provider configuration not found";
      return;
    }

    this._isTestingConnection = true;
    this._connectionError = null;
    this._connectionResult = undefined;

    const { data, error } = await MerchelloApi.testFulfilmentProvider(provider.configurationId);

    if (!this.#isConnected) return;

    if (error) {
      this._connectionError = error.message;
      this._isTestingConnection = false;
      return;
    }

    this._connectionResult = data;
    this._isTestingConnection = false;
  }

  private async _handleTestOrderSubmission(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._orderSubmissionError = "Provider configuration not found";
      return;
    }

    this._isSubmittingOrder = true;
    this._orderSubmissionError = null;
    this._orderSubmissionResult = undefined;

    const { data, error } = await MerchelloApi.testFulfilmentOrderSubmission(provider.configurationId, {
      customerEmail: this._testOrderCustomerEmail,
      orderNumber: this._testOrderNumber || undefined,
      useRealSandbox: this._testOrderUseRealSandbox,
      lineItems: [
        {
          sku: this._testOrderSku,
          name: this._testOrderName,
          quantity: Math.max(1, this._testOrderQuantity),
          unitPrice: this._testOrderUnitPrice,
        },
      ],
      shippingAddress: {
        name: "Test Customer",
        addressOne: "123 Test Street",
        townCity: "Test City",
        countyState: "CA",
        postalCode: "90210",
        countryCode: "US",
      },
    });

    if (!this.#isConnected) return;

    if (error) {
      this._orderSubmissionError = error.message;
      this._isSubmittingOrder = false;
      return;
    }

    this._orderSubmissionResult = data;
    this._isSubmittingOrder = false;
  }

  private async _handleSimulateWebhook(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._webhookSimulationError = "Provider configuration not found";
      return;
    }

    if (!this._selectedWebhookEvent && !this._webhookCustomPayload.trim()) {
      this._webhookSimulationError = "Select an event type or provide custom payload.";
      return;
    }

    this._isSimulatingWebhook = true;
    this._webhookSimulationError = null;
    this._webhookSimulationResult = undefined;

    const { data, error } = await MerchelloApi.simulateFulfilmentWebhook(provider.configurationId, {
      eventType: this._selectedWebhookEvent,
      providerReference: this._webhookProviderReference || undefined,
      providerShipmentId: this._webhookProviderShipmentId || undefined,
      trackingNumber: this._webhookTrackingNumber || undefined,
      carrier: this._webhookCarrier || undefined,
      customPayload: this._webhookCustomPayload.trim() || undefined,
    });

    if (!this.#isConnected) return;

    if (error) {
      this._webhookSimulationError = error.message;
      this._isSimulatingWebhook = false;
      return;
    }

    this._webhookSimulationResult = data;
    this._isSimulatingWebhook = false;
  }

  private async _handleProductSync(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._productSyncError = "Provider configuration not found";
      return;
    }

    this._isSyncingProducts = true;
    this._productSyncError = null;
    this._productSyncResult = undefined;

    const { data, error } = await MerchelloApi.testFulfilmentProductSync(provider.configurationId);

    if (!this.#isConnected) return;

    if (error) {
      this._productSyncError = error.message;
      this._isSyncingProducts = false;
      return;
    }

    this._productSyncResult = data;
    this._isSyncingProducts = false;
  }

  private async _handleInventorySync(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._inventorySyncError = "Provider configuration not found";
      return;
    }

    this._isSyncingInventory = true;
    this._inventorySyncError = null;
    this._inventorySyncResult = undefined;

    const { data, error } = await MerchelloApi.testFulfilmentInventorySync(provider.configurationId);

    if (!this.#isConnected) return;

    if (error) {
      this._inventorySyncError = error.message;
      this._isSyncingInventory = false;
      return;
    }

    this._inventorySyncResult = data;
    this._isSyncingInventory = false;
  }

  private _handleClose(): void {
    this.value = {
      wasTests: !!(
        this._connectionResult ||
        this._orderSubmissionResult ||
        this._webhookSimulationResult ||
        this._productSyncResult ||
        this._inventorySyncResult
      ),
    };
    this.modalContext?.reject();
  }

  override render() {
    const provider = this.data?.provider;
    const supportsOrderSubmission = provider?.supportsOrderSubmission ?? false;
    const supportsWebhooks = provider?.supportsWebhooks ?? false;

    return html`
      <umb-body-layout headline="Test ${provider?.displayName ?? "Provider"}">
        <div id="main">
          <uui-box>
            <div class="provider-info">
              <div class="info-row">
                <span class="info-label">Provider</span>
                <span class="info-value">${provider?.displayName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Provider Key</span>
                <span class="info-value monospace">${provider?.key}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="status-badge ${provider?.isEnabled ? "enabled" : "disabled"}">
                  ${provider?.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </uui-box>

          <uui-tab-group>
            <uui-tab
              label="Connection"
              ?active=${this._activeTab === "connection"}
              @click=${() => (this._activeTab = "connection")}
            >
              Connection
            </uui-tab>
            ${supportsOrderSubmission
              ? html`
                  <uui-tab
                    label="Order Submission"
                    ?active=${this._activeTab === "order-submission"}
                    @click=${() => (this._activeTab = "order-submission")}
                  >
                    Order Submission
                  </uui-tab>
                `
              : nothing}
            ${supportsWebhooks
              ? html`
                  <uui-tab
                    label="Webhooks"
                    ?active=${this._activeTab === "webhooks"}
                    @click=${() => (this._activeTab = "webhooks")}
                  >
                    Webhooks
                  </uui-tab>
                `
              : nothing}
            <uui-tab
              label="Product Sync"
              ?active=${this._activeTab === "product-sync"}
              @click=${() => (this._activeTab = "product-sync")}
            >
              Product Sync
            </uui-tab>
            <uui-tab
              label="Inventory Sync"
              ?active=${this._activeTab === "inventory-sync"}
              @click=${() => (this._activeTab = "inventory-sync")}
            >
              Inventory Sync
            </uui-tab>
          </uui-tab-group>

          <div class="tab-content">
            ${this._activeTab === "connection" ? this._renderConnectionTab() : nothing}
            ${this._activeTab === "order-submission" ? this._renderOrderSubmissionTab() : nothing}
            ${this._activeTab === "webhooks" ? this._renderWebhooksTab() : nothing}
            ${this._activeTab === "product-sync" ? this._renderProductSyncTab() : nothing}
            ${this._activeTab === "inventory-sync" ? this._renderInventorySyncTab() : nothing}
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderConnectionTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Test provider connectivity and authentication using current configuration.
        </p>

        ${this._connectionError
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._connectionError}
              </div>
            `
          : nothing}

        <uui-button
          look="primary"
          label="Test provider connection"
          ?disabled=${this._isTestingConnection}
          @click=${this._handleTestConnection}
        >
          ${this._isTestingConnection ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isTestingConnection ? "Testing Connection..." : "Test Connection"}
        </uui-button>

        ${this._connectionResult ? this._renderConnectionResult() : nothing}
      </div>
    `;
  }

  private _renderOrderSubmissionTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Submit a test order payload to the provider using sample line item data.
        </p>

        ${this._orderSubmissionError
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._orderSubmissionError}
              </div>
            `
          : nothing}

        <div class="form-grid">
          <uui-input
            label="Order Number"
            .value=${this._testOrderNumber}
            @input=${(e: Event) => (this._testOrderNumber = (e.target as HTMLInputElement).value)}
          ></uui-input>
          <uui-input
            label="Customer Email"
            type="email"
            .value=${this._testOrderCustomerEmail}
            @input=${(e: Event) => (this._testOrderCustomerEmail = (e.target as HTMLInputElement).value)}
          ></uui-input>
          <uui-input
            label="SKU"
            .value=${this._testOrderSku}
            @input=${(e: Event) => (this._testOrderSku = (e.target as HTMLInputElement).value)}
          ></uui-input>
          <uui-input
            label="Item Name"
            .value=${this._testOrderName}
            @input=${(e: Event) => (this._testOrderName = (e.target as HTMLInputElement).value)}
          ></uui-input>
          <uui-input
            label="Quantity"
            type="number"
            .value=${String(this._testOrderQuantity)}
            @input=${(e: Event) => (this._testOrderQuantity = parseInt((e.target as HTMLInputElement).value || "1", 10))}
          ></uui-input>
          <uui-input
            label="Unit Price"
            type="number"
            .value=${String(this._testOrderUnitPrice)}
            @input=${(e: Event) => (this._testOrderUnitPrice = parseFloat((e.target as HTMLInputElement).value || "0"))}
          ></uui-input>
          <uui-toggle
            label="Use Real Sandbox"
            .checked=${this._testOrderUseRealSandbox}
            @change=${(e: Event) => (this._testOrderUseRealSandbox = (e.target as HTMLInputElement).checked)}
          ></uui-toggle>
        </div>

        <uui-button
          look="primary"
          label="Submit test order"
          ?disabled=${this._isSubmittingOrder}
          @click=${this._handleTestOrderSubmission}
        >
          ${this._isSubmittingOrder ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isSubmittingOrder ? "Submitting Test Order..." : "Submit Test Order"}
        </uui-button>

        ${this._orderSubmissionResult ? this._renderOrderSubmissionResult() : nothing}
      </div>
    `;
  }

  private _renderWebhooksTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Generate and process a simulated webhook payload through provider parser and fulfilment service handlers.
        </p>

        ${this._webhookSimulationError
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._webhookSimulationError}
              </div>
            `
          : nothing}

        ${this._isLoadingWebhookTemplates
          ? html`<uui-loader></uui-loader>`
          : html`
              <div class="form-grid">
                <uui-select
                  label="Event Type"
                  .options=${[
                    { name: "Select event", value: "", selected: !this._selectedWebhookEvent },
                    ...this._webhookTemplates.map((t) => ({
                      name: t.displayName,
                      value: t.eventType,
                      selected: t.eventType === this._selectedWebhookEvent,
                    })),
                  ]}
                  @change=${(e: Event) => (this._selectedWebhookEvent = (e.target as HTMLSelectElement).value)}
                ></uui-select>
                <uui-input
                  label="Provider Reference"
                  .value=${this._webhookProviderReference}
                  @input=${(e: Event) => (this._webhookProviderReference = (e.target as HTMLInputElement).value)}
                ></uui-input>
                <uui-input
                  label="Provider Shipment Id"
                  .value=${this._webhookProviderShipmentId}
                  @input=${(e: Event) => (this._webhookProviderShipmentId = (e.target as HTMLInputElement).value)}
                ></uui-input>
                <uui-input
                  label="Tracking Number"
                  .value=${this._webhookTrackingNumber}
                  @input=${(e: Event) => (this._webhookTrackingNumber = (e.target as HTMLInputElement).value)}
                ></uui-input>
                <uui-input
                  label="Carrier"
                  .value=${this._webhookCarrier}
                  @input=${(e: Event) => (this._webhookCarrier = (e.target as HTMLInputElement).value)}
                ></uui-input>
              </div>
              <uui-textarea
                label="Custom Payload (optional JSON)"
                .value=${this._webhookCustomPayload}
                @input=${(e: Event) => (this._webhookCustomPayload = (e.target as HTMLTextAreaElement).value)}
              ></uui-textarea>
            `}

        <uui-button
          look="primary"
          label="Simulate webhook event"
          ?disabled=${this._isSimulatingWebhook || this._isLoadingWebhookTemplates}
          @click=${this._handleSimulateWebhook}
        >
          ${this._isSimulatingWebhook ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isSimulatingWebhook ? "Simulating Webhook..." : "Simulate Webhook"}
        </uui-button>

        ${this._webhookSimulationResult ? this._renderWebhookSimulationResult() : nothing}
      </div>
    `;
  }

  private _renderProductSyncTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Trigger product sync test endpoint for the selected provider configuration.
        </p>

        ${this._productSyncError
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._productSyncError}
              </div>
            `
          : nothing}

        <uui-button
          look="primary"
          label="Run product sync test"
          ?disabled=${this._isSyncingProducts}
          @click=${this._handleProductSync}
        >
          ${this._isSyncingProducts ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isSyncingProducts ? "Syncing Products..." : "Sync Products"}
        </uui-button>

        ${this._productSyncResult ? this._renderSyncResult(this._productSyncResult, "Product") : nothing}
      </div>
    `;
  }

  private _renderInventorySyncTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Trigger inventory sync test endpoint to pull stock levels from provider.
        </p>

        ${this._inventorySyncError
          ? html`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._inventorySyncError}
              </div>
            `
          : nothing}

        <uui-button
          look="primary"
          label="Run inventory sync test"
          ?disabled=${this._isSyncingInventory}
          @click=${this._handleInventorySync}
        >
          ${this._isSyncingInventory ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isSyncingInventory ? "Syncing Inventory..." : "Sync Inventory"}
        </uui-button>

        ${this._inventorySyncResult ? this._renderSyncResult(this._inventorySyncResult, "Inventory") : nothing}
      </div>
    `;
  }

  private _renderConnectionResult(): unknown {
    if (!this._connectionResult) return nothing;

    const { success, providerVersion, accountName, warehouseCount, errorMessage, errorCode } = this._connectionResult;

    return html`
      <div class="results-section">
        <div class="result-card ${success ? "success" : "error"}">
          <uui-icon name="${success ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${success ? "Connection successful" : "Connection failed"}</span>
        </div>

        ${!success && errorMessage
          ? html`
              <div class="result-errors">
                <p>${errorMessage}</p>
                ${errorCode ? html`<p class="error-code">Error code: ${errorCode}</p>` : nothing}
              </div>
            `
          : nothing}

        ${success
          ? html`
              <div class="result-details">
                ${providerVersion
                  ? html`
                      <div class="detail-row">
                        <span class="detail-label">Provider Version</span>
                        <span class="detail-value">${providerVersion}</span>
                      </div>
                    `
                  : nothing}
                ${accountName
                  ? html`
                      <div class="detail-row">
                        <span class="detail-label">Account Name</span>
                        <span class="detail-value">${accountName}</span>
                      </div>
                    `
                  : nothing}
                ${warehouseCount !== undefined && warehouseCount !== null
                  ? html`
                      <div class="detail-row">
                        <span class="detail-label">Warehouses</span>
                        <span class="detail-value">${warehouseCount}</span>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderOrderSubmissionResult(): unknown {
    if (!this._orderSubmissionResult) return nothing;

    return html`
      <div class="results-section">
        <div class="result-card ${this._orderSubmissionResult.success ? "success" : "error"}">
          <uui-icon name="${this._orderSubmissionResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>
            ${this._orderSubmissionResult.success ? "Test order submitted" : "Test order submission failed"}
          </span>
        </div>

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Provider Reference</span>
            <span class="detail-value monospace">${this._orderSubmissionResult.providerReference ?? "-"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Provider Status</span>
            <span class="detail-value">${this._orderSubmissionResult.providerStatus ?? "-"}</span>
          </div>
        </div>

        ${this._orderSubmissionResult.errorMessage
          ? html`
              <div class="result-errors">
                <p>${this._orderSubmissionResult.errorMessage}</p>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderWebhookSimulationResult(): unknown {
    if (!this._webhookSimulationResult) return nothing;

    return html`
      <div class="results-section">
        <div class="result-card ${this._webhookSimulationResult.success ? "success" : "error"}">
          <uui-icon name="${this._webhookSimulationResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>
            ${this._webhookSimulationResult.success ? "Webhook simulation completed" : "Webhook simulation failed"}
          </span>
        </div>

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Detected Event</span>
            <span class="detail-value">${this._webhookSimulationResult.eventTypeDetected ?? "-"}</span>
          </div>
        </div>

        ${this._webhookSimulationResult.actionsPerformed.length > 0
          ? html`
              <div class="result-details">
                <span class="detail-label">Actions Performed</span>
                <ul class="action-list">
                  ${this._webhookSimulationResult.actionsPerformed.map((action) => html`<li>${action}</li>`) }
                </ul>
              </div>
            `
          : nothing}

        ${this._webhookSimulationResult.payload
          ? html`
              <uui-textarea
                readonly
                label="Payload"
                .value=${this._webhookSimulationResult.payload}
              ></uui-textarea>
            `
          : nothing}

        ${this._webhookSimulationResult.errorMessage
          ? html`
              <div class="result-errors">
                <p>${this._webhookSimulationResult.errorMessage}</p>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderSyncResult(result: FulfilmentSyncLogDto, type: string): unknown {
    const isSuccess = result.status === FulfilmentSyncStatus.Completed;
    const isFailed = result.status === FulfilmentSyncStatus.Failed;

    return html`
      <div class="results-section">
        <div class="result-card ${isSuccess ? "success" : isFailed ? "error" : "pending"}">
          <uui-icon name="${isSuccess ? "icon-check" : isFailed ? "icon-alert" : "icon-time"}"></uui-icon>
          <span>${type} sync ${isSuccess ? "completed" : isFailed ? "failed" : "in progress"}</span>
        </div>

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Items Processed</span>
            <span class="detail-value">${result.itemsProcessed}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Succeeded</span>
            <span class="detail-value success-text">${result.itemsSucceeded}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Failed</span>
            <span class="detail-value ${result.itemsFailed > 0 ? "error-text" : ""}">${result.itemsFailed}</span>
          </div>
        </div>

        ${result.errorMessage
          ? html`
              <div class="result-errors">
                <p>${result.errorMessage}</p>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .provider-info {
      padding: 0;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .info-value {
      color: var(--uui-color-text);
    }

    .info-value.monospace {
      font-family: monospace;
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.enabled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-badge.disabled {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .tab-content {
      padding-top: var(--uui-size-space-4);
    }

    .tab-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .description {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .result-card {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-weight: 600;
    }

    .result-card.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .result-card.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .result-card.pending {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .result-errors {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
    }

    .result-errors p {
      margin: 0;
    }

    .error-code {
      font-size: 0.75rem;
      margin-top: var(--uui-size-space-2) !important;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      font-weight: 500;
      word-break: break-word;
      text-align: right;
    }

    .action-list {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .success-text {
      color: var(--uui-color-positive);
    }

    .error-text {
      color: var(--uui-color-danger);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    @media (max-width: 900px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

export default MerchelloTestFulfilmentProviderModalElement;
