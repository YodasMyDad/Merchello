import { LitElement as h, nothing as p, html as a, css as v, property as g, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { e as y } from "./navigation-CvTcY6zJ.js";
function m(e) {
  const s = e.serviceRegionCount ?? 0, r = e.shippingOptionCount ?? 0, n = s > 0, i = r > 0, t = !n, o = !i, u = t || o;
  let c = null;
  return t && o ? c = "No service regions or shipping options configured" : t ? c = "No service regions configured" : o && (c = "No shipping options configured"), {
    hasServiceRegions: n,
    hasShippingOptions: i,
    isMissingRegions: t,
    isMissingShippingOptions: o,
    isConfigured: !u,
    needsSetup: u,
    warningMessage: c
  };
}
function S(e, s) {
  const r = [...new Set(s)], n = new Map(e.map((o) => [o.id, o]));
  let i = 0, t = 0;
  for (const o of r) {
    const u = n.get(o);
    if (!u) {
      t += 1;
      continue;
    }
    m(u).needsSetup && (i += 1);
  }
  return {
    selectedCount: r.length,
    selectedNeedsSetupCount: i,
    missingSelectedIdsCount: t
  };
}
var x = Object.defineProperty, C = Object.getOwnPropertyDescriptor, d = (e, s, r, n) => {
  for (var i = n > 1 ? void 0 : n ? C(s, r) : s, t = e.length - 1, o; t >= 0; t--)
    (o = e[t]) && (i = (n ? o(s, r, i) : o(i)) || i);
  return n && i && x(s, r, i), i;
};
let l = class extends f(h) {
  constructor() {
    super(...arguments), this.warehouses = [], this.selectedWarehouseIds = [], this.showConfigureLinks = !1;
  }
  _isSelected(e) {
    return this.selectedWarehouseIds.includes(e);
  }
  _emitSelectionChange(e, s) {
    this.dispatchEvent(
      new CustomEvent("warehouse-selection-change", {
        detail: { warehouseId: e, checked: s },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleToggleChange(e, s) {
    const r = s.target;
    this._emitSelectionChange(e, !!r?.checked);
  }
  _renderSummary() {
    const e = S(this.warehouses, this.selectedWarehouseIds);
    return a`
      <div class="selection-summary" role="status" aria-live="polite">
        <span><strong>${e.selectedCount}</strong> selected</span>
        ${e.selectedCount === 0 ? a`<span>Select at least one warehouse for physical products</span>` : e.selectedNeedsSetupCount > 0 ? a`<span class="summary-warning">
              <uui-icon name="icon-alert"></uui-icon>
              ${e.selectedNeedsSetupCount} selected warehouse${e.selectedNeedsSetupCount === 1 ? "" : "s"} need setup
            </span>` : a`<span class="summary-ok">
              <uui-icon name="icon-check"></uui-icon>
              Selected warehouses are configured
            </span>`}
        ${e.missingSelectedIdsCount > 0 ? a`<span class="summary-warning">
              <uui-icon name="icon-alert"></uui-icon>
              ${e.missingSelectedIdsCount} selected warehouse reference${e.missingSelectedIdsCount === 1 ? "" : "s"} no longer exist
            </span>` : p}
      </div>
    `;
  }
  _renderWarehouseRow(e) {
    const s = e.name || "Unnamed Warehouse", r = this._isSelected(e.id), n = m(e), i = e.code ? ` (${e.code})` : "", t = e.addressSummary || "No address summary", o = e.serviceRegionCount ?? 0, u = e.shippingOptionCount ?? 0;
    return a`
      <div class="warehouse-row ${r ? "selected" : ""} ${n.needsSetup ? "warning" : ""}">
        <div class="toggle-column">
          <uui-toggle
            label="Select ${s}"
            .checked=${r}
            @change=${(c) => this._handleToggleChange(e.id, c)}>
          </uui-toggle>
        </div>

        <div class="warehouse-content">
          <div class="warehouse-header">
            <div class="warehouse-title">
              <span class="name">${s}${i}</span>
            </div>
            ${this.showConfigureLinks ? a`
                  <a class="configure-link" href=${y(e.id)}>
                    Configure
                  </a>
                ` : p}
          </div>

          <div class="warehouse-meta">
            <span>Regions: <strong>${o}</strong></span>
            <span>Shipping options: <strong>${u}</strong></span>
            <span>Address: ${t}</span>
          </div>

          ${n.warningMessage ? a`
                <div class="setup-warning" role="status">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${n.warningMessage}</span>
                </div>
              ` : p}
        </div>
      </div>
    `;
  }
  render() {
    return this.warehouses.length === 0 ? a`<p class="empty-state">No warehouses available. Create a warehouse first.</p>` : a`
      <div class="warehouse-selector">
        ${this._renderSummary()}
        <div class="warehouse-list">
          ${this.warehouses.map((e) => this._renderWarehouseRow(e))}
        </div>
      </div>
    `;
  }
};
l.styles = v`
    :host {
      display: block;
    }

    .warehouse-selector {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .selection-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      font-size: 0.8125rem;
      color: var(--uui-color-text);
    }

    .summary-warning,
    .summary-ok {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
    }

    .summary-warning {
      color: var(--uui-color-warning-emphasis);
    }

    .summary-ok {
      color: var(--uui-color-positive);
    }

    .warehouse-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .warehouse-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    .warehouse-row.selected {
      border-color: var(--uui-color-selected);
    }

    .warehouse-row.warning {
      border-color: var(--uui-color-warning);
      background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
    }

    .toggle-column {
      padding-top: 2px;
    }

    .warehouse-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .warehouse-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-title {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .name {
      font-weight: 600;
      color: var(--uui-color-text);
      overflow-wrap: anywhere;
    }

    .configure-link {
      font-size: 0.8125rem;
      color: var(--uui-color-interactive);
      text-decoration: none;
      white-space: nowrap;
    }

    .configure-link:hover {
      text-decoration: underline;
    }

    .warehouse-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2) var(--uui-size-space-4);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .setup-warning {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      color: var(--uui-color-warning-emphasis);
    }

    .empty-state {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    @media (max-width: 720px) {
      .warehouse-row {
        grid-template-columns: 1fr;
      }

      .toggle-column {
        padding-top: 0;
      }
    }
  `;
d([
  g({ type: Array })
], l.prototype, "warehouses", 2);
d([
  g({ type: Array })
], l.prototype, "selectedWarehouseIds", 2);
d([
  g({ type: Boolean })
], l.prototype, "showConfigureLinks", 2);
l = d([
  w("merchello-product-warehouse-selector")
], l);
export {
  S as g
};
//# sourceMappingURL=product-warehouse-selector.element-MSKDUCmh.js.map
