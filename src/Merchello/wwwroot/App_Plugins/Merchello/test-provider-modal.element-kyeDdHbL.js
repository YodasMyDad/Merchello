import { nothing as n, html as t, css as f, state as l, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-DFeoGYDY.js";
var h = /* @__PURE__ */ ((e) => (e[e.Pending = 0] = "Pending", e[e.Running = 1] = "Running", e[e.Completed = 2] = "Completed", e[e.Failed = 3] = "Failed", e))(h || {}), S = Object.defineProperty, T = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, a = (e, i, r, s) => {
  for (var c = s > 1 ? void 0 : s ? T(i, r) : i, u = e.length - 1, p; u >= 0; u--)
    (p = e[u]) && (c = (s ? p(i, r, c) : p(c)) || c);
  return s && c && S(i, r, c), c;
}, b = (e, i, r) => i.has(e) || _("Cannot " + r), y = (e, i, r) => (b(e, i, "read from private field"), i.get(e)), C = (e, i, r) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), g = (e, i, r, s) => (b(e, i, "write to private field"), i.set(e, r), r), d;
let o = class extends $ {
  constructor() {
    super(...arguments), this._activeTab = "connection", this._isTestingConnection = !1, this._connectionError = null, this._isSyncingProducts = !1, this._productSyncError = null, this._isSyncingInventory = !1, this._inventorySyncError = null, C(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, d, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, d, !1);
  }
  async _handleTestConnection() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._connectionError = "Provider configuration not found";
      return;
    }
    this._isTestingConnection = !0, this._connectionError = null, this._connectionResult = void 0;
    const { data: i, error: r } = await v.testFulfilmentProvider(e.configurationId);
    if (y(this, d)) {
      if (r) {
        this._connectionError = r.message, this._isTestingConnection = !1;
        return;
      }
      this._connectionResult = i, this._isTestingConnection = !1;
    }
  }
  async _handleProductSync() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._productSyncError = "Provider configuration not found";
      return;
    }
    this._isSyncingProducts = !0, this._productSyncError = null, this._productSyncResult = void 0;
    const { data: i, error: r } = await v.triggerProductSync(e.configurationId);
    if (y(this, d)) {
      if (r) {
        this._productSyncError = r.message, this._isSyncingProducts = !1;
        return;
      }
      this._productSyncResult = i, this._isSyncingProducts = !1;
    }
  }
  async _handleInventorySync() {
    const e = this.data?.provider;
    if (!e?.configurationId) {
      this._inventorySyncError = "Provider configuration not found";
      return;
    }
    this._isSyncingInventory = !0, this._inventorySyncError = null, this._inventorySyncResult = void 0;
    const { data: i, error: r } = await v.triggerInventorySync(e.configurationId);
    if (y(this, d)) {
      if (r) {
        this._inventorySyncError = r.message, this._isSyncingInventory = !1;
        return;
      }
      this._inventorySyncResult = i, this._isSyncingInventory = !1;
    }
  }
  _handleClose() {
    this.value = { wasTests: !!(this._connectionResult || this._productSyncResult || this._inventorySyncResult) }, this.modalContext?.reject();
  }
  render() {
    const e = this.data?.provider;
    return t`
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
            ${this._activeTab === "connection" ? this._renderConnectionTab() : n}
            ${this._activeTab === "product-sync" ? this._renderProductSyncTab() : n}
            ${this._activeTab === "inventory-sync" ? this._renderInventorySyncTab() : n}
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
    return t`
      <div class="tab-panel">
        <p class="description">
          Test the connection to this fulfilment provider. This will verify that the API credentials
          are valid and the provider is accessible.
        </p>

        ${this._connectionError ? t`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._connectionError}
              </div>
            ` : n}

        <uui-button
          look="primary"
          ?disabled=${this._isTestingConnection}
          @click=${this._handleTestConnection}
        >
          ${this._isTestingConnection ? t`<uui-loader-circle></uui-loader-circle>` : n}
          ${this._isTestingConnection ? "Testing Connection..." : "Test Connection"}
        </uui-button>

        ${this._connectionResult ? this._renderConnectionResult() : n}
      </div>
    `;
  }
  _renderConnectionResult() {
    if (!this._connectionResult) return n;
    const { success: e, providerVersion: i, accountName: r, warehouseCount: s, errorMessage: c, errorCode: u } = this._connectionResult;
    return t`
      <div class="results-section">
        <div class="result-card ${e ? "success" : "error"}">
          <uui-icon name="${e ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${e ? "Connection successful" : "Connection failed"}</span>
        </div>

        ${!e && c ? t`
              <div class="result-errors">
                <p>${c}</p>
                ${u ? t`<p class="error-code">Error code: ${u}</p>` : n}
              </div>
            ` : n}

        ${e ? t`
              <div class="result-details">
                ${i ? t`
                      <div class="detail-row">
                        <span class="detail-label">Provider Version</span>
                        <span class="detail-value">${i}</span>
                      </div>
                    ` : n}

                ${r ? t`
                      <div class="detail-row">
                        <span class="detail-label">Account Name</span>
                        <span class="detail-value">${r}</span>
                      </div>
                    ` : n}

                ${s != null ? t`
                      <div class="detail-row">
                        <span class="detail-label">Warehouses</span>
                        <span class="detail-value">${s}</span>
                      </div>
                    ` : n}
              </div>
            ` : n}
      </div>
    `;
  }
  _renderProductSyncTab() {
    return t`
      <div class="tab-panel">
        <p class="description">
          Trigger a product sync to push product data to the fulfilment provider.
          This will sync all products marked for this provider.
        </p>

        ${this._productSyncError ? t`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._productSyncError}
              </div>
            ` : n}

        <uui-button
          look="primary"
          ?disabled=${this._isSyncingProducts}
          @click=${this._handleProductSync}
        >
          ${this._isSyncingProducts ? t`<uui-loader-circle></uui-loader-circle>` : n}
          ${this._isSyncingProducts ? "Syncing Products..." : "Sync Products"}
        </uui-button>

        ${this._productSyncResult ? this._renderSyncResult(this._productSyncResult, "Product") : n}
      </div>
    `;
  }
  _renderInventorySyncTab() {
    return t`
      <div class="tab-panel">
        <p class="description">
          Trigger an inventory sync to pull inventory levels from the fulfilment provider.
          This will update stock levels in Merchello based on the provider's data.
        </p>

        ${this._inventorySyncError ? t`
              <div class="error-message">
                <uui-icon name="icon-alert"></uui-icon>
                ${this._inventorySyncError}
              </div>
            ` : n}

        <uui-button
          look="primary"
          ?disabled=${this._isSyncingInventory}
          @click=${this._handleInventorySync}
        >
          ${this._isSyncingInventory ? t`<uui-loader-circle></uui-loader-circle>` : n}
          ${this._isSyncingInventory ? "Syncing Inventory..." : "Sync Inventory"}
        </uui-button>

        ${this._inventorySyncResult ? this._renderSyncResult(this._inventorySyncResult, "Inventory") : n}
      </div>
    `;
  }
  _renderSyncResult(e, i) {
    const r = e.status === h.Completed, s = e.status === h.Failed;
    return t`
      <div class="results-section">
        <div class="result-card ${r ? "success" : s ? "error" : "pending"}">
          <uui-icon name="${r ? "icon-check" : s ? "icon-alert" : "icon-time"}"></uui-icon>
          <span>${i} sync ${r ? "completed" : s ? "failed" : "in progress"}</span>
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

        ${e.errorMessage ? t`
              <div class="result-errors">
                <p>${e.errorMessage}</p>
              </div>
            ` : n}
      </div>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
o.styles = f`
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
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
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
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      font-weight: 500;
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
  `;
a([
  l()
], o.prototype, "_activeTab", 2);
a([
  l()
], o.prototype, "_isTestingConnection", 2);
a([
  l()
], o.prototype, "_connectionResult", 2);
a([
  l()
], o.prototype, "_connectionError", 2);
a([
  l()
], o.prototype, "_isSyncingProducts", 2);
a([
  l()
], o.prototype, "_productSyncResult", 2);
a([
  l()
], o.prototype, "_productSyncError", 2);
a([
  l()
], o.prototype, "_isSyncingInventory", 2);
a([
  l()
], o.prototype, "_inventorySyncResult", 2);
a([
  l()
], o.prototype, "_inventorySyncError", 2);
o = a([
  m("merchello-test-fulfilment-provider-modal")
], o);
const E = o;
export {
  o as MerchelloTestFulfilmentProviderModalElement,
  E as default
};
//# sourceMappingURL=test-provider-modal.element-kyeDdHbL.js.map
