import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import {
  FulfilmentSyncStatus,
  type TestFulfilmentProviderResultDto,
  type FulfilmentSyncLogDto,
} from "@fulfilment-providers/types/fulfilment-providers.types.js";
import type {
  TestFulfilmentProviderModalData,
  TestFulfilmentProviderModalValue,
} from "./test-provider-modal.token.js";

type TabId = "connection" | "product-sync" | "inventory-sync";

@customElement("merchello-test-fulfilment-provider-modal")
export class MerchelloTestFulfilmentProviderModalElement extends UmbModalBaseElement<
  TestFulfilmentProviderModalData,
  TestFulfilmentProviderModalValue
> {
  @state() private _activeTab: TabId = "connection";

  // Connection test state
  @state() private _isTestingConnection = false;
  @state() private _connectionResult?: TestFulfilmentProviderResultDto;
  @state() private _connectionError: string | null = null;

  // Product sync state
  @state() private _isSyncingProducts = false;
  @state() private _productSyncResult?: FulfilmentSyncLogDto;
  @state() private _productSyncError: string | null = null;

  // Inventory sync state
  @state() private _isSyncingInventory = false;
  @state() private _inventorySyncResult?: FulfilmentSyncLogDto;
  @state() private _inventorySyncError: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
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

  private async _handleProductSync(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider?.configurationId) {
      this._productSyncError = "Provider configuration not found";
      return;
    }

    this._isSyncingProducts = true;
    this._productSyncError = null;
    this._productSyncResult = undefined;

    const { data, error } = await MerchelloApi.triggerProductSync(provider.configurationId);

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

    const { data, error } = await MerchelloApi.triggerInventorySync(provider.configurationId);

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
    this.value = { wasTests: !!(this._connectionResult || this._productSyncResult || this._inventorySyncResult) };
    this.modalContext?.reject();
  }

  override render() {
    const provider = this.data?.provider;

    return html`
      <umb-body-layout headline="Test ${provider?.displayName ?? 'Provider'}">
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
                <span class="status-badge ${provider?.isEnabled ? 'enabled' : 'disabled'}">
                  ${provider?.isEnabled ? 'Enabled' : 'Disabled'}
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
          Test the connection to this fulfilment provider. This will verify that the API credentials
          are valid and the provider is accessible.
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

  private _renderConnectionResult(): unknown {
    if (!this._connectionResult) return nothing;

    const { success, providerVersion, accountName, warehouseCount, errorMessage, errorCode } = this._connectionResult;

    return html`
      <div class="results-section">
        <div class="result-card ${success ? 'success' : 'error'}">
          <uui-icon name="${success ? 'icon-check' : 'icon-alert'}"></uui-icon>
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

  private _renderProductSyncTab() {
    return html`
      <div class="tab-panel">
        <p class="description">
          Trigger a product sync to push product data to the fulfilment provider.
          This will sync all products marked for this provider.
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
          Trigger an inventory sync to pull inventory levels from the fulfilment provider.
          This will update stock levels in Merchello based on the provider's data.
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

  private _renderSyncResult(result: FulfilmentSyncLogDto, type: string): unknown {
    const isSuccess = result.status === FulfilmentSyncStatus.Completed;
    const isFailed = result.status === FulfilmentSyncStatus.Failed;

    return html`
      <div class="results-section">
        <div class="result-card ${isSuccess ? 'success' : isFailed ? 'error' : 'pending'}">
          <uui-icon name="${isSuccess ? 'icon-check' : isFailed ? 'icon-alert' : 'icon-time'}"></uui-icon>
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
            <span class="detail-value ${result.itemsFailed > 0 ? 'error-text' : ''}">${result.itemsFailed}</span>
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
}

export default MerchelloTestFulfilmentProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-fulfilment-provider-modal": MerchelloTestFulfilmentProviderModalElement;
  }
}
