import { nothing as r, html as s, css as g, state as a, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-B1P1cUX9.js";
var b = /* @__PURE__ */ ((e) => (e[e.Pending = 0] = "Pending", e[e.Running = 1] = "Running", e[e.Completed = 2] = "Completed", e[e.Failed = 3] = "Failed", e))(b || {}), k = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, n = (e, t, i, u) => {
  for (var l = u > 1 ? void 0 : u ? $(t, i) : t, c = e.length - 1, v; c >= 0; c--)
    (v = e[c]) && (l = (u ? v(t, i, l) : v(l)) || l);
  return u && l && k(t, i, l), l;
}, y = (e, t, i) => t.has(e) || _("Cannot " + i), h = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), w = (e, t, i) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), m = (e, t, i, u) => (y(e, t, "write to private field"), t.set(e, i), i), d;
let o = class extends f {
  constructor() {
    super(...arguments), this._activeTab = "connection", this._isTestingConnection = !1, this._connectionError = null, this._isSubmittingOrder = !1, this._orderSubmissionError = null, this._testOrderNumber = "", this._testOrderCustomerEmail = "test@example.com", this._testOrderSku = "TEST-SKU-001", this._testOrderName = "Test Product", this._testOrderQuantity = 1, this._testOrderUnitPrice = 10, this._testOrderUseRealSandbox = !0, this._isLoadingWebhookTemplates = !1, this._webhookTemplates = [], this._selectedWebhookEvent = "", this._webhookProviderReference = "", this._webhookProviderShipmentId = "", this._webhookTrackingNumber = "", this._webhookCarrier = "", this._webhookCustomPayload = "", this._isSimulatingWebhook = !1, this._webhookSimulationError = null, this._isSyncingProducts = !1, this._productSyncError = null, this._isSyncingInventory = !1, this._inventorySyncError = null, w(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), m(this, d, !0), this._loadWebhookTemplates();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, d, !1);
  }
  async _loadWebhookTemplates() {
    const e = this.data?.provider;
    if (!e?.configurationId || !e.supportsWebhooks)
      return;
    this._isLoadingWebhookTemplates = !0;
    const { data: t, error: i } = await p.getFulfilmentWebhookEventTemplates(e.configurationId);
    if (h(this, d)) {
      if (i) {
        this._webhookSimulationError = i.message, this._isLoadingWebhookTemplates = !1;
        return;
      }
      this._webhookTemplates = t ?? [], !this._selectedWebhookEvent && this._webhookTemplates.length > 0 && (this._selectedWebhookEvent = this._webhookTemplates[0].eventType), this._isLoadingWebhookTemplates = !1;
    }
  }
  async _handleTestConnection() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._connectionError = "Provider configuration not found";
      return;
    }
    this._isTestingConnection = !0, this._connectionError = null, this._connectionResult = void 0;
    const { data: t, error: i } = await p.testFulfilmentProvider(e.configurationId);
    if (h(this, d)) {
      if (i) {
        this._connectionError = i.message, this._isTestingConnection = !1;
        return;
      }
      this._connectionResult = t, this._isTestingConnection = !1;
    }
  }
  async _handleTestOrderSubmission() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._orderSubmissionError = "Provider configuration not found";
      return;
    }
    this._isSubmittingOrder = !0, this._orderSubmissionError = null, this._orderSubmissionResult = void 0;
    const { data: t, error: i } = await p.testFulfilmentOrderSubmission(e.configurationId, {
      customerEmail: this._testOrderCustomerEmail,
      orderNumber: this._testOrderNumber || void 0,
      useRealSandbox: this._testOrderUseRealSandbox,
      lineItems: [
        {
          sku: this._testOrderSku,
          name: this._testOrderName,
          quantity: Math.max(1, this._testOrderQuantity),
          unitPrice: this._testOrderUnitPrice
        }
      ],
      shippingAddress: {
        name: "Test Customer",
        addressOne: "123 Test Street",
        townCity: "Test City",
        countyState: "CA",
        postalCode: "90210",
        countryCode: "US"
      }
    });
    if (h(this, d)) {
      if (i) {
        this._orderSubmissionError = i.message, this._isSubmittingOrder = !1;
        return;
      }
      this._orderSubmissionResult = t, this._isSubmittingOrder = !1;
    }
  }
  async _handleSimulateWebhook() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._webhookSimulationError = "Provider configuration not found";
      return;
    }
    if (!this._selectedWebhookEvent && !this._webhookCustomPayload.trim()) {
      this._webhookSimulationError = "Select an event type or provide custom payload.";
      return;
    }
    this._isSimulatingWebhook = !0, this._webhookSimulationError = null, this._webhookSimulationResult = void 0;
    const { data: t, error: i } = await p.simulateFulfilmentWebhook(e.configurationId, {
      eventType: this._selectedWebhookEvent,
      providerReference: this._webhookProviderReference || void 0,
      providerShipmentId: this._webhookProviderShipmentId || void 0,
      trackingNumber: this._webhookTrackingNumber || void 0,
      carrier: this._webhookCarrier || void 0,
      customPayload: this._webhookCustomPayload.trim() || void 0
    });
    if (h(this, d)) {
      if (i) {
        this._webhookSimulationError = i.message, this._isSimulatingWebhook = !1;
        return;
      }
      this._webhookSimulationResult = t, this._isSimulatingWebhook = !1;
    }
  }
  async _handleProductSync() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._productSyncError = "Provider configuration not found";
      return;
    }
    this._isSyncingProducts = !0, this._productSyncError = null, this._productSyncResult = void 0;
    const { data: t, error: i } = await p.testFulfilmentProductSync(e.configurationId);
    if (h(this, d)) {
      if (i) {
        this._productSyncError = i.message, this._isSyncingProducts = !1;
        return;
      }
      this._productSyncResult = t, this._isSyncingProducts = !1;
    }
  }
  async _handleInventorySync() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._inventorySyncError = "Provider configuration not found";
      return;
    }
    this._isSyncingInventory = !0, this._inventorySyncError = null, this._inventorySyncResult = void 0;
    const { data: t, error: i } = await p.testFulfilmentInventorySync(e.configurationId);
    if (h(this, d)) {
      if (i) {
        this._inventorySyncError = i.message, this._isSyncingInventory = !1;
        return;
      }
      this._inventorySyncResult = t, this._isSyncingInventory = !1;
    }
  }
  _handleClose() {
    this.value = {
      wasTests: !!(this._connectionResult || this._orderSubmissionResult || this._webhookSimulationResult || this._productSyncResult || this._inventorySyncResult)
    }, this.modalContext?.reject();
  }
  render() {
    const e = this.data?.provider, t = e?.supportsOrderSubmission ?? !1, i = e?.supportsWebhooks ?? !1;
    return s`
      <umb-body-layout headline="Test ${e?.displayName ?? "Provider"}">
        <div id="main">
          <uui-box>
            <div class="provider-info">
              <div class="info-row">
                <span class="info-label">Provider</span>
                <span class="info-value">${e?.displayName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Provider Key</span>
                <span class="info-value monospace">${e?.key}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="status-badge ${e?.isEnabled ? "enabled" : "disabled"}">
                  ${e?.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </uui-box>

          <uui-tab-group>
            <uui-tab
              label="Connection"
              ?active=${this._activeTab === "connection"}
              @click=${() => this._activeTab = "connection"}
            >
              Connection
            </uui-tab>
            ${t ? s`
                  <uui-tab
                    label="Order Submission"
                    ?active=${this._activeTab === "order-submission"}
                    @click=${() => this._activeTab = "order-submission"}
                  >
                    Order Submission
                  </uui-tab>
                ` : r}
            ${i ? s`
                  <uui-tab
                    label="Webhooks"
                    ?active=${this._activeTab === "webhooks"}
                    @click=${() => this._activeTab = "webhooks"}
                  >
                    Webhooks
                  </uui-tab>
                ` : r}
            <uui-tab
              label="Product Sync"
              ?active=${this._activeTab === "product-sync"}
              @click=${() => this._activeTab = "product-sync"}
            >
              Product Sync
            </uui-tab>
            <uui-tab
              label="Inventory Sync"
              ?active=${this._activeTab === "inventory-sync"}
              @click=${() => this._activeTab = "inventory-sync"}
            >
              Inventory Sync
            </uui-tab>
          </uui-tab-group>

          <div class="tab-content">
            ${this._activeTab === "connection" ? this._renderConnectionTab() : r}
            ${this._activeTab === "order-submission" ? this._renderOrderSubmissionTab() : r}
            ${this._activeTab === "webhooks" ? this._renderWebhooksTab() : r}
            ${this._activeTab === "product-sync" ? this._renderProductSyncTab() : r}
            ${this._activeTab === "inventory-sync" ? this._renderInventorySyncTab() : r}
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
  _renderConnectionTab() {
    return s`
      <div class="tab-panel">
        <p class="description">
          Test provider connectivity and authentication using current configuration.
        </p>

        ${this._connectionError ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._connectionError}
              </div>
            ` : r}

        <uui-button
          look="primary"
          label="Test provider connection"
          ?disabled=${this._isTestingConnection}
          @click=${this._handleTestConnection}
        >
          ${this._isTestingConnection ? s`<uui-loader-circle></uui-loader-circle>` : r}
          ${this._isTestingConnection ? "Testing Connection..." : "Test Connection"}
        </uui-button>

        ${this._connectionResult ? this._renderConnectionResult() : r}
      </div>
    `;
  }
  _renderOrderSubmissionTab() {
    return s`
      <div class="tab-panel">
        <p class="description">
          Submit a test order payload to the provider using sample line item data.
        </p>

        ${this._orderSubmissionError ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._orderSubmissionError}
              </div>
            ` : r}

        <div class="form-grid">
          <uui-input
            label="Order Number"
            .value=${this._testOrderNumber}
            @input=${(e) => this._testOrderNumber = e.target.value}
          ></uui-input>
          <uui-input
            label="Customer Email"
            type="email"
            .value=${this._testOrderCustomerEmail}
            @input=${(e) => this._testOrderCustomerEmail = e.target.value}
          ></uui-input>
          <uui-input
            label="SKU"
            .value=${this._testOrderSku}
            @input=${(e) => this._testOrderSku = e.target.value}
          ></uui-input>
          <uui-input
            label="Item Name"
            .value=${this._testOrderName}
            @input=${(e) => this._testOrderName = e.target.value}
          ></uui-input>
          <uui-input
            label="Quantity"
            type="number"
            .value=${String(this._testOrderQuantity)}
            @input=${(e) => this._testOrderQuantity = parseInt(e.target.value || "1", 10)}
          ></uui-input>
          <uui-input
            label="Unit Price"
            type="number"
            .value=${String(this._testOrderUnitPrice)}
            @input=${(e) => this._testOrderUnitPrice = parseFloat(e.target.value || "0")}
          ></uui-input>
          <uui-toggle
            label="Use Real Sandbox"
            .checked=${this._testOrderUseRealSandbox}
            @change=${(e) => this._testOrderUseRealSandbox = e.target.checked}
          ></uui-toggle>
        </div>

        <uui-button
          look="primary"
          label="Submit test order"
          ?disabled=${this._isSubmittingOrder}
          @click=${this._handleTestOrderSubmission}
        >
          ${this._isSubmittingOrder ? s`<uui-loader-circle></uui-loader-circle>` : r}
          ${this._isSubmittingOrder ? "Submitting Test Order..." : "Submit Test Order"}
        </uui-button>

        ${this._orderSubmissionResult ? this._renderOrderSubmissionResult() : r}
      </div>
    `;
  }
  _renderWebhooksTab() {
    return s`
      <div class="tab-panel">
        <p class="description">
          Generate and process a simulated webhook payload through provider parser and fulfilment service handlers.
        </p>

        ${this._webhookSimulationError ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._webhookSimulationError}
              </div>
            ` : r}

        ${this._isLoadingWebhookTemplates ? s`<uui-loader></uui-loader>` : s`
              <div class="form-grid">
                <uui-select
                  label="Event Type"
                  .options=${[
      { name: "Select event", value: "", selected: !this._selectedWebhookEvent },
      ...this._webhookTemplates.map((e) => ({
        name: e.displayName,
        value: e.eventType,
        selected: e.eventType === this._selectedWebhookEvent
      }))
    ]}
                  @change=${(e) => this._selectedWebhookEvent = e.target.value}
                ></uui-select>
                <uui-input
                  label="Provider Reference"
                  .value=${this._webhookProviderReference}
                  @input=${(e) => this._webhookProviderReference = e.target.value}
                ></uui-input>
                <uui-input
                  label="Provider Shipment Id"
                  .value=${this._webhookProviderShipmentId}
                  @input=${(e) => this._webhookProviderShipmentId = e.target.value}
                ></uui-input>
                <uui-input
                  label="Tracking Number"
                  .value=${this._webhookTrackingNumber}
                  @input=${(e) => this._webhookTrackingNumber = e.target.value}
                ></uui-input>
                <uui-input
                  label="Carrier"
                  .value=${this._webhookCarrier}
                  @input=${(e) => this._webhookCarrier = e.target.value}
                ></uui-input>
              </div>
              <uui-textarea
                label="Custom Payload (optional JSON)"
                .value=${this._webhookCustomPayload}
                @input=${(e) => this._webhookCustomPayload = e.target.value}
              ></uui-textarea>
            `}

        <uui-button
          look="primary"
          label="Simulate webhook event"
          ?disabled=${this._isSimulatingWebhook || this._isLoadingWebhookTemplates}
          @click=${this._handleSimulateWebhook}
        >
          ${this._isSimulatingWebhook ? s`<uui-loader-circle></uui-loader-circle>` : r}
          ${this._isSimulatingWebhook ? "Simulating Webhook..." : "Simulate Webhook"}
        </uui-button>

        ${this._webhookSimulationResult ? this._renderWebhookSimulationResult() : r}
      </div>
    `;
  }
  _renderProductSyncTab() {
    return s`
      <div class="tab-panel">
        <p class="description">
          Trigger product sync test endpoint for the selected provider configuration.
        </p>

        ${this._productSyncError ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._productSyncError}
              </div>
            ` : r}

        <uui-button
          look="primary"
          label="Run product sync test"
          ?disabled=${this._isSyncingProducts}
          @click=${this._handleProductSync}
        >
          ${this._isSyncingProducts ? s`<uui-loader-circle></uui-loader-circle>` : r}
          ${this._isSyncingProducts ? "Syncing Products..." : "Sync Products"}
        </uui-button>

        ${this._productSyncResult ? this._renderSyncResult(this._productSyncResult, "Product") : r}
      </div>
    `;
  }
  _renderInventorySyncTab() {
    return s`
      <div class="tab-panel">
        <p class="description">
          Trigger inventory sync test endpoint to pull stock levels from provider.
        </p>

        ${this._inventorySyncError ? s`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._inventorySyncError}
              </div>
            ` : r}

        <uui-button
          look="primary"
          label="Run inventory sync test"
          ?disabled=${this._isSyncingInventory}
          @click=${this._handleInventorySync}
        >
          ${this._isSyncingInventory ? s`<uui-loader-circle></uui-loader-circle>` : r}
          ${this._isSyncingInventory ? "Syncing Inventory..." : "Sync Inventory"}
        </uui-button>

        ${this._inventorySyncResult ? this._renderSyncResult(this._inventorySyncResult, "Inventory") : r}
      </div>
    `;
  }
  _renderConnectionResult() {
    if (!this._connectionResult) return r;
    const { success: e, providerVersion: t, accountName: i, warehouseCount: u, errorMessage: l, errorCode: c } = this._connectionResult;
    return s`
      <div class="results-section">
        <div class="result-card ${e ? "success" : "error"}">
          <uui-icon name="${e ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${e ? "Connection successful" : "Connection failed"}</span>
        </div>

        ${!e && l ? s`
              <div class="result-errors">
                <p>${l}</p>
                ${c ? s`<p class="error-code">Error code: ${c}</p>` : r}
              </div>
            ` : r}

        ${e ? s`
              <div class="result-details">
                ${t ? s`
                      <div class="detail-row">
                        <span class="detail-label">Provider Version</span>
                        <span class="detail-value">${t}</span>
                      </div>
                    ` : r}
                ${i ? s`
                      <div class="detail-row">
                        <span class="detail-label">Account Name</span>
                        <span class="detail-value">${i}</span>
                      </div>
                    ` : r}
                ${u != null ? s`
                      <div class="detail-row">
                        <span class="detail-label">Warehouses</span>
                        <span class="detail-value">${u}</span>
                      </div>
                    ` : r}
              </div>
            ` : r}
      </div>
    `;
  }
  _renderOrderSubmissionResult() {
    return this._orderSubmissionResult ? s`
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

        ${this._orderSubmissionResult.errorMessage ? s`
              <div class="result-errors">
                <p>${this._orderSubmissionResult.errorMessage}</p>
              </div>
            ` : r}
      </div>
    ` : r;
  }
  _renderWebhookSimulationResult() {
    return this._webhookSimulationResult ? s`
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

        ${this._webhookSimulationResult.actionsPerformed.length > 0 ? s`
              <div class="result-details">
                <span class="detail-label">Actions Performed</span>
                <ul class="action-list">
                  ${this._webhookSimulationResult.actionsPerformed.map((e) => s`<li>${e}</li>`)}
                </ul>
              </div>
            ` : r}

        ${this._webhookSimulationResult.payload ? s`
              <uui-textarea
                readonly
                label="Payload"
                .value=${this._webhookSimulationResult.payload}
              ></uui-textarea>
            ` : r}

        ${this._webhookSimulationResult.errorMessage ? s`
              <div class="result-errors">
                <p>${this._webhookSimulationResult.errorMessage}</p>
              </div>
            ` : r}
      </div>
    ` : r;
  }
  _renderSyncResult(e, t) {
    const i = e.status === b.Completed, u = e.status === b.Failed;
    return s`
      <div class="results-section">
        <div class="result-card ${i ? "success" : u ? "error" : "pending"}">
          <uui-icon name="${i ? "icon-check" : u ? "icon-alert" : "icon-time"}"></uui-icon>
          <span>${t} sync ${i ? "completed" : u ? "failed" : "in progress"}</span>
        </div>

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Items Processed</span>
            <span class="detail-value">${e.itemsProcessed}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Succeeded</span>
            <span class="detail-value success-text">${e.itemsSucceeded}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Failed</span>
            <span class="detail-value ${e.itemsFailed > 0 ? "error-text" : ""}">${e.itemsFailed}</span>
          </div>
        </div>

        ${e.errorMessage ? s`
              <div class="result-errors">
                <p>${e.errorMessage}</p>
              </div>
            ` : r}
      </div>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
o.styles = g`
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
n([
  a()
], o.prototype, "_activeTab", 2);
n([
  a()
], o.prototype, "_isTestingConnection", 2);
n([
  a()
], o.prototype, "_connectionResult", 2);
n([
  a()
], o.prototype, "_connectionError", 2);
n([
  a()
], o.prototype, "_isSubmittingOrder", 2);
n([
  a()
], o.prototype, "_orderSubmissionResult", 2);
n([
  a()
], o.prototype, "_orderSubmissionError", 2);
n([
  a()
], o.prototype, "_testOrderNumber", 2);
n([
  a()
], o.prototype, "_testOrderCustomerEmail", 2);
n([
  a()
], o.prototype, "_testOrderSku", 2);
n([
  a()
], o.prototype, "_testOrderName", 2);
n([
  a()
], o.prototype, "_testOrderQuantity", 2);
n([
  a()
], o.prototype, "_testOrderUnitPrice", 2);
n([
  a()
], o.prototype, "_testOrderUseRealSandbox", 2);
n([
  a()
], o.prototype, "_isLoadingWebhookTemplates", 2);
n([
  a()
], o.prototype, "_webhookTemplates", 2);
n([
  a()
], o.prototype, "_selectedWebhookEvent", 2);
n([
  a()
], o.prototype, "_webhookProviderReference", 2);
n([
  a()
], o.prototype, "_webhookProviderShipmentId", 2);
n([
  a()
], o.prototype, "_webhookTrackingNumber", 2);
n([
  a()
], o.prototype, "_webhookCarrier", 2);
n([
  a()
], o.prototype, "_webhookCustomPayload", 2);
n([
  a()
], o.prototype, "_isSimulatingWebhook", 2);
n([
  a()
], o.prototype, "_webhookSimulationResult", 2);
n([
  a()
], o.prototype, "_webhookSimulationError", 2);
n([
  a()
], o.prototype, "_isSyncingProducts", 2);
n([
  a()
], o.prototype, "_productSyncResult", 2);
n([
  a()
], o.prototype, "_productSyncError", 2);
n([
  a()
], o.prototype, "_isSyncingInventory", 2);
n([
  a()
], o.prototype, "_inventorySyncResult", 2);
n([
  a()
], o.prototype, "_inventorySyncError", 2);
o = n([
  S("merchello-test-fulfilment-provider-modal")
], o);
const E = o;
export {
  o as MerchelloTestFulfilmentProviderModalElement,
  E as default
};
//# sourceMappingURL=test-provider-modal.element-B48frkm9.js.map
