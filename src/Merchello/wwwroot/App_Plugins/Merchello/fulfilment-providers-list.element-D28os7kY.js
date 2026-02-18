import { LitElement as $, html as r, nothing as f, css as M, state as l, customElement as S, unsafeHTML as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as L, UMB_MODAL_MANAGER_CONTEXT as O, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-B1P1cUX9.js";
import { h as P } from "./formatting-BoIk_URG.js";
const U = new L("Merchello.FulfilmentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), D = new L("Merchello.TestFulfilmentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), y = {
  warehouse: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V8l9-5 9 5v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 8V16c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-.71.38-1.37 1-1.73l6-3.46c.62-.36 1.38-.36 2 0l6 3.46c.62.36 1 1.02 1 1.73z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  manual: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="currentColor" stroke-width="1.5"/><path d="M6 20v-2c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
};
function W(e) {
  const i = e.toLowerCase();
  return i.includes("manual") ? y.manual : i.includes("warehouse") ? y.warehouse : i.includes("truck") || i.includes("ship") ? y.truck : y.box;
}
var V = Object.defineProperty, j = Object.getOwnPropertyDescriptor, I = (e) => {
  throw TypeError(e);
}, u = (e, i, t, a) => {
  for (var o = a > 1 ? void 0 : a ? j(i, t) : i, d = e.length - 1, g; d >= 0; d--)
    (g = e[d]) && (o = (a ? g(i, t, o) : g(o)) || o);
  return a && o && V(i, t, o), o;
}, T = (e, i, t) => i.has(e) || I("Cannot " + t), x = (e, i, t) => (T(e, i, "read from private field"), i.get(e)), B = (e, i, t) => i.has(e) ? I("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), C = (e, i, t, a) => (T(e, i, "write to private field"), i.set(e, t), t), m;
let n = class extends z($) {
  constructor() {
    super(...arguments), this._logs = [], this._providers = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 20, this._totalItems = 0, this._totalPages = 0, this._filterProviderConfigId = "", this._filterSyncType = "", this._filterStatus = "", B(this, m, !1);
  }
  connectedCallback() {
    super.connectedCallback(), C(this, m, !0), this._loadProviders(), this._loadLogs();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), C(this, m, !1);
  }
  async _loadProviders() {
    const { data: e } = await b.getFulfilmentProviderOptions();
    x(this, m) && e && (this._providers = e);
  }
  async _loadLogs() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._filterProviderConfigId && (e.providerConfigurationId = this._filterProviderConfigId), this._filterSyncType && (e.syncType = parseInt(this._filterSyncType, 10)), this._filterStatus && (e.status = parseInt(this._filterStatus, 10));
    const { data: i, error: t } = await b.getFulfilmentSyncLogs(e);
    if (!x(this, m)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const a = i;
    this._logs = a.items, this._totalItems = a.totalItems, this._totalPages = a.totalPages, this._isLoading = !1;
  }
  _handleFilterChange() {
    this._page = 1, this._loadLogs();
  }
  _handlePageChange(e) {
    e < 1 || e > this._totalPages || (this._page = e, this._loadLogs());
  }
  render() {
    return r`
      <uui-box headline="Sync History">
        ${this._renderFilters()}

        ${this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                  <uui-button look="secondary" label="Retry" @click=${() => this._loadLogs()}>Retry</uui-button>
                </div>
              ` : this._logs.length === 0 ? r`<p class="empty-message">No sync logs found.</p>` : r`
                  ${this._renderTable()}
                  ${this._renderPagination()}
                `}
      </uui-box>
    `;
  }
  _renderFilters() {
    return r`
      <div class="filters">
        <div class="filter-row">
          <div class="filter-item">
            <label for="sync-log-provider-filter">Provider</label>
            <uui-select
              id="sync-log-provider-filter"
              label="Provider filter"
              .options=${[
      { name: "All Providers", value: "", selected: this._filterProviderConfigId === "" },
      ...this._providers.map((e) => ({
        name: e.displayName,
        value: e.configurationId,
        selected: e.configurationId === this._filterProviderConfigId
      }))
    ]}
              @change=${(e) => {
      this._filterProviderConfigId = e.target.value, this._handleFilterChange();
    }}
            ></uui-select>
          </div>

          <div class="filter-item">
            <label for="sync-log-type-filter">Sync Type</label>
            <uui-select
              id="sync-log-type-filter"
              label="Sync type filter"
              .options=${[
      { name: "All Types", value: "", selected: this._filterSyncType === "" },
      { name: "Products Out", value: "0", selected: this._filterSyncType === "0" },
      { name: "Inventory In", value: "1", selected: this._filterSyncType === "1" }
    ]}
              @change=${(e) => {
      this._filterSyncType = e.target.value, this._handleFilterChange();
    }}
            ></uui-select>
          </div>

          <div class="filter-item">
            <label for="sync-log-status-filter">Status</label>
            <uui-select
              id="sync-log-status-filter"
              label="Sync status filter"
              .options=${[
      { name: "All Statuses", value: "", selected: this._filterStatus === "" },
      { name: "Pending", value: "0", selected: this._filterStatus === "0" },
      { name: "Running", value: "1", selected: this._filterStatus === "1" },
      { name: "Completed", value: "2", selected: this._filterStatus === "2" },
      { name: "Failed", value: "3", selected: this._filterStatus === "3" }
    ]}
              @change=${(e) => {
      this._filterStatus = e.target.value, this._handleFilterChange();
    }}
            ></uui-select>
          </div>

          <uui-button look="secondary" compact label="Refresh" @click=${() => this._loadLogs()}>
            <uui-icon name="icon-refresh"></uui-icon>
            Refresh
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderTable() {
    return r`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell>Provider</uui-table-head-cell>
          <uui-table-head-cell>Sync Type</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Items</uui-table-head-cell>
          <uui-table-head-cell>Started</uui-table-head-cell>
          <uui-table-head-cell>Completed</uui-table-head-cell>
        </uui-table-head>
        ${this._logs.map(
      (e) => r`
            <uui-table-row>
              <uui-table-cell>${e.providerDisplayName ?? "Unknown"}</uui-table-cell>
              <uui-table-cell>
                <span class="sync-type-badge">${e.syncTypeLabel}</span>
              </uui-table-cell>
              <uui-table-cell>
                <span class="status-badge ${e.statusCssClass}">
                  ${e.statusLabel}
                </span>
              </uui-table-cell>
              <uui-table-cell>
                <span class="items-summary">
                  ${e.itemsSucceeded}/${e.itemsProcessed}
                  ${e.itemsFailed > 0 ? r`<span class="failed-count">(${e.itemsFailed} failed)</span>` : f}
                </span>
              </uui-table-cell>
              <uui-table-cell>${e.startedAt ? P(e.startedAt) : "-"}</uui-table-cell>
              <uui-table-cell>${e.completedAt ? P(e.completedAt) : "-"}</uui-table-cell>
            </uui-table-row>
            ${e.errorMessage ? r`
                  <uui-table-row class="error-row">
                    <uui-table-cell colspan="6">
                      <div class="error-detail">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${e.errorMessage}
                      </div>
                    </uui-table-cell>
                  </uui-table-row>
                ` : f}
          `
    )}
      </uui-table>
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? f : r`
      <div class="pagination">
        <span class="pagination-info">
          Showing ${(this._page - 1) * this._pageSize + 1} -
          ${Math.min(this._page * this._pageSize, this._totalItems)} of ${this._totalItems}
        </span>
        <div class="pagination-controls">
          <uui-button
            compact
            look="secondary"
            label="Previous page"
            ?disabled=${this._page <= 1}
            @click=${() => this._handlePageChange(this._page - 1)}
          >
            Previous
          </uui-button>
          <span class="page-number">Page ${this._page} of ${this._totalPages}</span>
          <uui-button
            compact
            look="secondary"
            label="Next page"
            ?disabled=${this._page >= this._totalPages}
            @click=${() => this._handlePageChange(this._page + 1)}
          >
            Next
          </uui-button>
        </div>
      </div>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
n.styles = M`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin: var(--uui-size-space-4);
    }

    .empty-message {
      text-align: center;
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-5);
    }

    .filters {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .filter-row {
      display: flex;
      gap: var(--uui-size-space-4);
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .filter-item label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .filter-item uui-select {
      min-width: 160px;
    }

    uui-table {
      width: 100%;
    }

    .sync-type-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.75rem;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 12px;
    }

    .status-pending {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-running {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .status-completed {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-failed {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .items-summary {
      font-variant-numeric: tabular-nums;
    }

    .failed-count {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .error-row {
      background: var(--uui-color-danger-standalone);
    }

    .error-detail {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-danger-contrast);
      font-size: 0.875rem;
      padding: var(--uui-size-space-2);
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .page-number {
      font-size: 0.875rem;
    }
  `;
u([
  l()
], n.prototype, "_logs", 2);
u([
  l()
], n.prototype, "_providers", 2);
u([
  l()
], n.prototype, "_isLoading", 2);
u([
  l()
], n.prototype, "_errorMessage", 2);
u([
  l()
], n.prototype, "_page", 2);
u([
  l()
], n.prototype, "_pageSize", 2);
u([
  l()
], n.prototype, "_totalItems", 2);
u([
  l()
], n.prototype, "_totalPages", 2);
u([
  l()
], n.prototype, "_filterProviderConfigId", 2);
u([
  l()
], n.prototype, "_filterSyncType", 2);
u([
  l()
], n.prototype, "_filterStatus", 2);
n = u([
  S("merchello-sync-logs-list")
], n);
var H = Object.defineProperty, G = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, _ = (e, i, t, a) => {
  for (var o = a > 1 ? void 0 : a ? G(i, t) : i, d = e.length - 1, g; d >= 0; d--)
    (g = e[d]) && (o = (a ? g(i, t, o) : g(o)) || o);
  return a && o && H(i, t, o), o;
}, F = (e, i, t) => i.has(e) || E("Cannot " + t), s = (e, i, t) => (F(e, i, "read from private field"), i.get(e)), w = (e, i, t) => i.has(e) ? E("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), k = (e, i, t, a) => (F(e, i, "write to private field"), i.set(e, t), t), h, c, p;
const K = "supplier-direct";
let v = class extends z($) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, w(this, h), w(this, c), w(this, p, !1), this.consumeContext(O, (e) => {
      k(this, h, e);
    }), this.consumeContext(N, (e) => {
      k(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, p, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, p, !1);
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        b.getAvailableFulfilmentProviders(),
        b.getFulfilmentProviderConfigurations()
      ]);
      if (!s(this, p)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoading = !1;
        return;
      }
      this._availableProviders = e.data ?? [], this._configuredProviders = i.data ?? [];
    } catch (e) {
      if (!s(this, p)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.key));
    return this._availableProviders.filter((i) => !e.has(i.key));
  }
  async _openConfigModal(e, i) {
    if (!s(this, h)) return;
    (await s(this, h).open(this, U, {
      data: { provider: e, configured: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _toggleProvider(e) {
    if (!e.configurationId) return;
    const { error: i } = await b.toggleFulfilmentProvider(e.configurationId, !e.isEnabled);
    if (s(this, p)) {
      if (i) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      s(this, c)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "disabled" : "enabled"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    if (!e.configurationId) return;
    const i = s(this, h)?.open(this, A, {
      data: {
        headline: "Remove Fulfilment Provider",
        content: `Remove ${e.displayName} from fulfilment providers. This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!s(this, p)) return;
    const { error: t } = await b.deleteFulfilmentProvider(e.configurationId);
    if (s(this, p)) {
      if (t) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: t.message }
        });
        return;
      }
      s(this, c)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openTestModal(e) {
    s(this, h) && s(this, h).open(this, D, {
      data: { provider: e }
    });
  }
  async _copyToClipboard(e) {
    try {
      await navigator.clipboard.writeText(e), s(this, c)?.peek("positive", {
        data: { headline: "Copied", message: "Webhook URL copied to clipboard." }
      });
    } catch {
      s(this, c)?.peek("warning", {
        data: { headline: "Copy Failed", message: "Unable to copy webhook URL." }
      });
    }
  }
  _renderProviderIcon(e, i, t) {
    const a = i ?? W(e);
    return a ? r`<span class="provider-icon-svg">${R(a)}</span>` : r`<uui-icon name="${t ?? "icon-box"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = this._availableProviders.find((d) => d.key === e.key), t = e.key !== K, a = i?.supportsWebhooks ?? e.supportsWebhooks, o = `${window.location.origin}/umbraco/merchello/webhooks/fulfilment/${e.key}`;
    return r`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.key, e.iconSvg, e.icon)}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-key">${e.key}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${e.isEnabled}
              @change=${() => this._toggleProvider(e)}
              label="${e.isEnabled ? "Enabled" : "Disabled"}"
            ></uui-toggle>
            ${t ? r`
                  <uui-button
                    look="secondary"
                    label="Test"
                    title="Test this provider connection"
                    @click=${() => this._openTestModal(e)}
                  >
                    <uui-icon name="icon-lab"></uui-icon>
                  </uui-button>
                ` : f}
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => i && this._openConfigModal(i, e)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(e)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${e.description ? r`<p class="provider-description">${e.description}</p>` : f}
        ${a ? r`
              <div class="webhook-url-section">
                <span class="webhook-url-label">Webhook URL</span>
                <div class="webhook-url-row">
                  <uui-input readonly .value=${o} label="Webhook URL"></uui-input>
                  <uui-button
                    look="secondary"
                    compact
                    label="Copy webhook URL"
                    @click=${() => this._copyToClipboard(o)}
                  >
                    Copy
                  </uui-button>
                </div>
              </div>
            ` : f}
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return r`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.key, e.iconSvg, e.icon)}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-key">${e.key}</span>
            </div>
          </div>
          <uui-button
            look="primary"
            label="Install"
            @click=${() => this._openConfigModal(e)}
          >
            Install
          </uui-button>
        </div>
        ${e.description ? r`<p class="provider-description">${e.description}</p>` : f}
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return r`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading fulfilment providers...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    if (this._errorMessage)
      return r`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      `;
    const e = this._getUnconfiguredProviders();
    return r`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <uui-box headline="Configured Fulfilment Providers">
        <p class="section-description">
          These fulfilment providers are installed and configured. Toggle the switch to enable or disable a provider.
        </p>
        <div class="providers-list">
          ${this._configuredProviders.length === 0 ? r`<p class="no-items">No fulfilment providers configured yet.</p>` : this._configuredProviders.map(
      (i) => this._renderConfiguredProvider(i)
    )}
        </div>
      </uui-box>

      <uui-box headline="Available Fulfilment Providers">
        <p class="section-description">
          These fulfilment providers are available but not yet configured.
          Click "Install" to configure and add a provider.
        </p>
        ${e.length === 0 ? r`<p class="no-items">All available providers have been configured.</p>` : r`
              <div class="providers-list">
                ${e.map(
      (i) => this._renderAvailableProvider(i)
    )}
              </div>
            `}
      </uui-box>

      <merchello-sync-logs-list></merchello-sync-logs-list>
      </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
v.styles = M`
    :host {
      display: block;
      height: 100%;
    }

    .content {
      padding: var(--uui-size-layout-1);
    }

    uui-box {
      margin-bottom: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .providers-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .provider-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .provider-card.configured {
      border-left: 3px solid var(--uui-color-positive);
    }

    .provider-card.available {
      border-left: 3px solid var(--uui-color-border-emphasis);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .provider-info > uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
    }

    .provider-icon-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .provider-icon-svg svg {
      width: 100%;
      height: 100%;
    }

    .provider-details {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-key {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .provider-description {
      margin: var(--uui-size-space-3) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      flex: 1;
    }

    .webhook-url-section {
      margin-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .webhook-url-label {
      display: block;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .webhook-url-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

  `;
_([
  l()
], v.prototype, "_availableProviders", 2);
_([
  l()
], v.prototype, "_configuredProviders", 2);
_([
  l()
], v.prototype, "_isLoading", 2);
_([
  l()
], v.prototype, "_errorMessage", 2);
v = _([
  S("merchello-fulfilment-providers-list")
], v);
const ee = v;
export {
  v as MerchelloFulfilmentProvidersListElement,
  ee as default
};
//# sourceMappingURL=fulfilment-providers-list.element-D28os7kY.js.map
