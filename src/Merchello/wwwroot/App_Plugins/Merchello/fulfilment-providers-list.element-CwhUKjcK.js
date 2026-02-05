import { LitElement as $, html as r, nothing as u, css as C, state as o, customElement as S, unsafeHTML as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as L, UMB_MODAL_MANAGER_CONTEXT as A, UMB_CONFIRM_MODAL as R } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-DkRa4ImO.js";
import { g as x } from "./formatting-DQoM1drN.js";
const D = new L("Merchello.FulfilmentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), B = new L("Merchello.TestFulfilmentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), d = {
  // Generic warehouse/fulfilment icon
  warehouse: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V8l9-5 9 5v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // Box/package icon (default)
  box: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 8V16c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-.71.38-1.37 1-1.73l6-3.46c.62-.36 1.38-.36 2 0l6 3.46c.62.36 1 1.02 1 1.73z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // ShipBob logo (simplified boat/ship icon)
  shipbob: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 17h18l-2-6H5l-2 6z" fill="#5856D6"/><path d="M12 3v8M12 11l-4-3M12 11l4-3" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19c1.5 1 3.5 2 7 2s5.5-1 7-2" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  // ShipMonk logo (monk/person icon)
  shipmonk: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="6" r="3" fill="#00C853"/><path d="M12 10c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" fill="#00C853"/><path d="M8 20l4-4 4 4" stroke="#00C853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // ShipHero logo (hero cape/shield icon)
  shiphero: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="#FF6B35"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // Helm WMS logo (ship wheel/helm icon)
  "helm-wms": '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" stroke="#1E3A5F" stroke-width="1.5" stroke-linecap="round"/></svg>',
  // Deliverr logo (fast delivery icon)
  deliverr: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#6366F1"/></svg>',
  // Flexport logo (globe with arrows)
  flexport: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#0066FF" stroke-width="1.5"/><path d="M3 12h18M12 3c-2.5 3-4 6-4 9s1.5 6 4 9c2.5-3 4-6 4-9s-1.5-6-4-9z" fill="none" stroke="#0066FF" stroke-width="1.5"/></svg>',
  // Red Stag Fulfillment (stag/deer icon)
  "red-stag": '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4c-1 2-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-3-2-5zM8 6c-2-1-4-1-5 0 1 2 3 3 5 3M16 6c2-1 4-1 5 0-1 2-3 3-5 3M12 13v8M8 17l4 4 4-4" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // Manual fulfillment (hand/person icon)
  manual: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="currentColor" stroke-width="1.5"/><path d="M6 20v-2c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  // Truck/shipping icon
  truck: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
};
function j(e) {
  const i = e.toLowerCase();
  return d[i] ? d[i] : i.includes("shipbob") ? d.shipbob : i.includes("shipmonk") ? d.shipmonk : i.includes("shiphero") ? d.shiphero : i.includes("helm") ? d["helm-wms"] : i.includes("deliverr") ? d.deliverr : i.includes("flexport") ? d.flexport : i.includes("stag") ? d["red-stag"] : i.includes("manual") ? d.manual : i.includes("warehouse") ? d.warehouse : d.box;
}
var U = Object.defineProperty, W = Object.getOwnPropertyDescriptor, I = (e) => {
  throw TypeError(e);
}, c = (e, i, t, s) => {
  for (var a = s > 1 ? void 0 : s ? W(i, t) : i, g = e.length - 1, f; g >= 0; g--)
    (f = e[g]) && (a = (s ? f(i, t, a) : f(a)) || a);
  return s && a && U(i, t, a), a;
}, F = (e, i, t) => i.has(e) || I("Cannot " + t), M = (e, i, t) => (F(e, i, "read from private field"), i.get(e)), V = (e, i, t) => i.has(e) ? I("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), P = (e, i, t, s) => (F(e, i, "write to private field"), i.set(e, t), t), b;
let n = class extends z($) {
  constructor() {
    super(...arguments), this._logs = [], this._providers = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 20, this._totalItems = 0, this._totalPages = 0, this._filterProviderConfigId = "", this._filterSyncType = "", this._filterStatus = "", V(this, b, !1);
  }
  connectedCallback() {
    super.connectedCallback(), P(this, b, !0), this._loadProviders(), this._loadLogs();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), P(this, b, !1);
  }
  async _loadProviders() {
    const { data: e } = await _.getFulfilmentProviderOptions();
    M(this, b) && e && (this._providers = e);
  }
  async _loadLogs() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._filterProviderConfigId && (e.providerConfigurationId = this._filterProviderConfigId), this._filterSyncType && (e.syncType = parseInt(this._filterSyncType, 10)), this._filterStatus && (e.status = parseInt(this._filterStatus, 10));
    const { data: i, error: t } = await _.getFulfilmentSyncLogs(e);
    if (!M(this, b)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = i;
    this._logs = s.items, this._totalItems = s.totalItems, this._totalPages = s.totalPages, this._isLoading = !1;
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
            <label>Provider</label>
            <uui-select
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
            <label>Sync Type</label>
            <uui-select
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
            <label>Status</label>
            <uui-select
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
                  ${e.itemsFailed > 0 ? r`<span class="failed-count">(${e.itemsFailed} failed)</span>` : u}
                </span>
              </uui-table-cell>
              <uui-table-cell>${e.startedAt ? x(e.startedAt) : "-"}</uui-table-cell>
              <uui-table-cell>${e.completedAt ? x(e.completedAt) : "-"}</uui-table-cell>
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
                ` : u}
          `
    )}
      </uui-table>
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? u : r`
      <div class="pagination">
        <span class="pagination-info">
          Showing ${(this._page - 1) * this._pageSize + 1} -
          ${Math.min(this._page * this._pageSize, this._totalItems)} of ${this._totalItems}
        </span>
        <div class="pagination-controls">
          <uui-button
            compact
            look="secondary"
            ?disabled=${this._page <= 1}
            @click=${() => this._handlePageChange(this._page - 1)}
          >
            Previous
          </uui-button>
          <span class="page-number">Page ${this._page} of ${this._totalPages}</span>
          <uui-button
            compact
            look="secondary"
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
b = /* @__PURE__ */ new WeakMap();
n.styles = C`
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
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
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
c([
  o()
], n.prototype, "_logs", 2);
c([
  o()
], n.prototype, "_providers", 2);
c([
  o()
], n.prototype, "_isLoading", 2);
c([
  o()
], n.prototype, "_errorMessage", 2);
c([
  o()
], n.prototype, "_page", 2);
c([
  o()
], n.prototype, "_pageSize", 2);
c([
  o()
], n.prototype, "_totalItems", 2);
c([
  o()
], n.prototype, "_totalPages", 2);
c([
  o()
], n.prototype, "_filterProviderConfigId", 2);
c([
  o()
], n.prototype, "_filterSyncType", 2);
c([
  o()
], n.prototype, "_filterStatus", 2);
n = c([
  S("merchello-sync-logs-list")
], n);
var H = Object.defineProperty, G = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, y = (e, i, t, s) => {
  for (var a = s > 1 ? void 0 : s ? G(i, t) : i, g = e.length - 1, f; g >= 0; g--)
    (f = e[g]) && (a = (s ? f(i, t, a) : f(a)) || a);
  return s && a && H(i, t, a), a;
}, E = (e, i, t) => i.has(e) || T("Cannot " + t), l = (e, i, t) => (E(e, i, "read from private field"), i.get(e)), w = (e, i, t) => i.has(e) ? T("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), k = (e, i, t, s) => (E(e, i, "write to private field"), i.set(e, t), t), v, m, p;
let h = class extends z($) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, w(this, v), w(this, m), w(this, p, !1), this.consumeContext(A, (e) => {
      k(this, v, e);
    }), this.consumeContext(N, (e) => {
      k(this, m, e);
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
        _.getAvailableFulfilmentProviders(),
        _.getFulfilmentProviderConfigurations()
      ]);
      if (!l(this, p)) return;
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
      if (!l(this, p)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.key));
    return this._availableProviders.filter((i) => !e.has(i.key));
  }
  async _openConfigModal(e, i) {
    if (!l(this, v)) return;
    (await l(this, v).open(this, D, {
      data: { provider: e, configured: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _toggleProvider(e) {
    if (!e.configurationId) return;
    const { error: i } = await _.toggleFulfilmentProvider(e.configurationId, !e.isEnabled);
    if (l(this, p)) {
      if (i) {
        l(this, m)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      l(this, m)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "disabled" : "enabled"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    if (!e.configurationId) return;
    const i = l(this, v)?.open(this, R, {
      data: {
        headline: "Remove Fulfilment Provider",
        content: `Are you sure you want to remove ${e.displayName}? This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!l(this, p)) return;
    const { error: t } = await _.deleteFulfilmentProvider(e.configurationId);
    if (l(this, p)) {
      if (t) {
        l(this, m)?.peek("danger", {
          data: { headline: "Error", message: t.message }
        });
        return;
      }
      l(this, m)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openTestModal(e) {
    l(this, v) && l(this, v).open(this, B, {
      data: { provider: e }
    });
  }
  _renderProviderIcon(e, i, t) {
    const s = i ?? j(e);
    return s ? r`<span class="provider-icon-svg">${O(s)}</span>` : r`<uui-icon name="${t ?? "icon-box"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = this._availableProviders.find((t) => t.key === e.key);
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
            <uui-button
              look="secondary"
              label="Test"
              title="Test this provider connection"
              @click=${() => this._openTestModal(e)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
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
        ${e.description ? r`<p class="provider-description">${e.description}</p>` : u}
        <div class="provider-footer">
          <div class="provider-features">
            <span class="feature-badge api-style">${e.apiStyleLabel}</span>
            <span class="feature-badge sync-mode">Sync: ${e.inventorySyncModeLabel}</span>
            ${e.supportsOrderSubmission ? r`<span class="feature-badge">Orders</span>` : u}
            ${e.supportsWebhooks ? r`<span class="feature-badge">Webhooks</span>` : u}
            ${e.supportsProductSync ? r`<span class="feature-badge">Product Sync</span>` : u}
            ${e.supportsInventorySync ? r`<span class="feature-badge">Inventory Sync</span>` : u}
          </div>
        </div>
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
        <div class="provider-footer">
          ${e.description ? r`<p class="provider-description">${e.description}</p>` : u}
          <div class="provider-features">
            <span class="feature-badge api-style">${e.apiStyleLabel}</span>
            ${e.supportsOrderSubmission ? r`<span class="feature-badge">Orders</span>` : u}
            ${e.supportsWebhooks ? r`<span class="feature-badge">Webhooks</span>` : u}
            ${e.supportsProductSync ? r`<span class="feature-badge">Product Sync</span>` : u}
            ${e.supportsInventorySync ? r`<span class="feature-badge">Inventory Sync</span>` : u}
          </div>
        </div>
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
v = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
h.styles = C`
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

    .provider-footer {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .feature-badge.api-style {
      background: var(--uui-color-default-emphasis);
      color: var(--uui-color-default-contrast);
    }

    .feature-badge.sync-mode {
      background: var(--uui-color-interactive-emphasis);
      color: var(--uui-color-interactive-contrast);
    }
  `;
y([
  o()
], h.prototype, "_availableProviders", 2);
y([
  o()
], h.prototype, "_configuredProviders", 2);
y([
  o()
], h.prototype, "_isLoading", 2);
y([
  o()
], h.prototype, "_errorMessage", 2);
h = y([
  S("merchello-fulfilment-providers-list")
], h);
const Z = h;
export {
  h as MerchelloFulfilmentProvidersListElement,
  Z as default
};
//# sourceMappingURL=fulfilment-providers-list.element-CwhUKjcK.js.map
