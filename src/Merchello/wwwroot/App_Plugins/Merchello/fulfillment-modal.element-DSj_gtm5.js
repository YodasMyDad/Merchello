import { nothing as p, html as o, css as k, state as m, customElement as I } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { M as f } from "./merchello-api-gshzVGsw.js";
import { b as w } from "./formatting-DJ1nSxNW.js";
var $ = Object.defineProperty, z = Object.getOwnPropertyDescriptor, _ = (t) => {
  throw TypeError(t);
}, d = (t, e, i, r) => {
  for (var s = r > 1 ? void 0 : r ? z(e, i) : e, a = t.length - 1, c; a >= 0; a--)
    (c = t[a]) && (s = (r ? c(e, i, s) : c(s)) || s);
  return r && s && $(e, i, s), s;
}, b = (t, e, i) => e.has(t) || _("Cannot " + i), g = (t, e, i) => (b(t, e, "read from private field"), e.get(t)), C = (t, e, i) => e.has(t) ? _("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), y = (t, e, i, r) => (b(t, e, "write to private field"), e.set(t, i), i), h;
let l = class extends S {
  constructor() {
    super(...arguments), this._summary = null, this._isLoading = !0, this._errorMessage = null, this._isCreating = !1, this._shipmentsCreated = 0, this._selectedItems = /* @__PURE__ */ new Map(), this._orderTrackingInfo = /* @__PURE__ */ new Map(), this._expandedOrders = /* @__PURE__ */ new Set(), this._existingShipmentsExpanded = !1, C(this, h, !1);
  }
  connectedCallback() {
    super.connectedCallback(), y(this, h, !0), this._loadFulfillmentSummary();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), y(this, h, !1);
  }
  async _loadFulfillmentSummary() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await f.getFulfillmentSummary(this.data.invoiceId);
    if (g(this, h)) {
      if (e) {
        this._errorMessage = e.message, this._isLoading = !1;
        return;
      }
      if (this._summary = t ?? null, this._isLoading = !1, this._summary) {
        const i = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Map();
        for (const a of this._summary.orders)
          if (a.lineItems.some((u) => u.remainingQuantity > 0)) {
            i.set(a.orderId, {
              carrier: "",
              trackingNumber: "",
              trackingUrl: ""
            }), r.add(a.orderId);
            const u = /* @__PURE__ */ new Map();
            for (const n of a.lineItems)
              n.remainingQuantity > 0 && u.set(n.id, {
                lineItemId: n.id,
                quantity: n.remainingQuantity,
                maxQuantity: n.remainingQuantity,
                name: n.name ?? "Unknown",
                sku: n.sku
              });
            s.set(a.orderId, u);
          }
        this._orderTrackingInfo = i, this._expandedOrders = r, this._selectedItems = s;
      }
    }
  }
  _toggleOrderExpanded(t) {
    const e = new Set(this._expandedOrders);
    e.has(t) ? e.delete(t) : e.add(t), this._expandedOrders = e;
  }
  _updateOrderTracking(t, e, i) {
    const r = this._orderTrackingInfo.get(t);
    if (!r) return;
    const s = { ...r, [e]: i }, a = new Map(this._orderTrackingInfo);
    a.set(t, s), this._orderTrackingInfo = a;
  }
  _toggleItemSelection(t, e) {
    const i = this._selectedItems.get(t) ?? /* @__PURE__ */ new Map();
    i.has(e.id) ? i.delete(e.id) : i.set(e.id, {
      lineItemId: e.id,
      quantity: e.remainingQuantity,
      maxQuantity: e.remainingQuantity,
      name: e.name ?? "Unknown",
      sku: e.sku
    }), this._selectedItems.set(t, i), this._selectedItems = new Map(this._selectedItems);
  }
  _updateItemQuantity(t, e, i) {
    const r = this._selectedItems.get(t);
    if (!r) return;
    const s = r.get(e);
    if (!s) return;
    const a = Math.max(1, Math.min(i, s.maxQuantity));
    r.set(e, { ...s, quantity: a }), this._selectedItems = new Map(this._selectedItems);
  }
  _selectAllItems(t) {
    const e = this._summary?.orders.find((r) => r.orderId === t);
    if (!e) return;
    const i = /* @__PURE__ */ new Map();
    for (const r of e.lineItems)
      r.remainingQuantity > 0 && i.set(r.id, {
        lineItemId: r.id,
        quantity: r.remainingQuantity,
        maxQuantity: r.remainingQuantity,
        name: r.name ?? "Unknown",
        sku: r.sku
      });
    this._selectedItems.set(t, i), this._selectedItems = new Map(this._selectedItems);
  }
  _clearSelection(t) {
    this._selectedItems.set(t, /* @__PURE__ */ new Map()), this._selectedItems = new Map(this._selectedItems);
  }
  _getSelectedCount(t) {
    return this._selectedItems.get(t)?.size ?? 0;
  }
  _getTotalSelectedQuantity(t) {
    const e = this._selectedItems.get(t);
    return e ? Array.from(e.values()).reduce((i, r) => i + r.quantity, 0) : 0;
  }
  _getOrdersWithRemainingItems() {
    return this._summary ? this._summary.orders.filter(
      (t) => t.lineItems.some((e) => e.remainingQuantity > 0)
    ) : [];
  }
  _getOrdersWithSelections() {
    return this._getOrdersWithRemainingItems().filter(
      (t) => this._getSelectedCount(t.orderId) > 0
    );
  }
  _getTotalItemsToShip() {
    let t = 0;
    for (const e of this._getOrdersWithSelections())
      t += this._getTotalSelectedQuantity(e.orderId);
    return t;
  }
  _getAllExistingShipments() {
    if (!this._summary) return [];
    const t = [];
    for (const e of this._summary.orders)
      for (const i of e.shipments)
        t.push({ shipment: i, warehouseName: e.warehouseName });
    return t;
  }
  async _createAllShipments() {
    const t = this._getOrdersWithSelections();
    if (t.length === 0) return;
    this._isCreating = !0, this._errorMessage = null;
    let e = 0;
    const i = [];
    for (const r of t) {
      if (!g(this, h)) return;
      const s = this._orderTrackingInfo.get(r.orderId), a = this._selectedItems.get(r.orderId);
      if (!a || a.size === 0) continue;
      const c = {};
      for (const [v, x] of a)
        c[v] = x.quantity;
      const u = {
        lineItems: c,
        carrier: s?.carrier || void 0,
        trackingNumber: s?.trackingNumber || void 0,
        trackingUrl: s?.trackingUrl || void 0
      }, { error: n } = await f.createShipment(r.orderId, u);
      n ? i.push(`${r.warehouseName}: ${n.message}`) : e++;
    }
    g(this, h) && (this._isCreating = !1, this._shipmentsCreated += e, i.length > 0 && (this._errorMessage = `Some shipments failed: ${i.join("; ")}`), await this._loadFulfillmentSummary());
  }
  async _deleteShipment(t) {
    if (!confirm("Are you sure you want to delete this shipment? Items will be released back to unfulfilled."))
      return;
    const { error: e } = await f.deleteShipment(t);
    if (g(this, h)) {
      if (e) {
        this._errorMessage = e.message;
        return;
      }
      await this._loadFulfillmentSummary();
    }
  }
  _handleClose() {
    this.modalContext?.setValue({ shipmentsCreated: this._shipmentsCreated }), this.modalContext?.submit();
  }
  _renderShipmentCard(t) {
    const e = t.lineItems.filter((n) => n.remainingQuantity > 0);
    if (e.length === 0) return p;
    const i = this._expandedOrders.has(t.orderId), r = this._orderTrackingInfo.get(t.orderId), s = this._selectedItems.get(t.orderId) ?? /* @__PURE__ */ new Map(), a = this._getSelectedCount(t.orderId), c = this._getTotalSelectedQuantity(t.orderId), u = e.reduce((n, v) => n + v.remainingQuantity, 0);
    return o`
      <div class="shipment-card ${a > 0 ? "has-selection" : ""}">
        <div
          class="shipment-header"
          @click=${() => this._toggleOrderExpanded(t.orderId)}
        >
          <div class="header-info">
            <uui-icon name="${i ? "icon-navigation-down" : "icon-navigation-right"}"></uui-icon>
            <span class="warehouse-name">${t.warehouseName}</span>
            <span class="item-count">
              ${a > 0 ? `${c} of ${u} selected` : `${u} item${u !== 1 ? "s" : ""} to ship`}
            </span>
          </div>
          <div class="header-meta">
            <span class="delivery-method">${t.deliveryMethod}</span>
          </div>
        </div>

        ${i ? o`
              <div class="shipment-content">
                <div class="items-section">
                  <div class="items-header">
                    <h4>Items to ship</h4>
                    <div class="selection-actions">
                      <uui-button
                        look="secondary"
                        compact
                        label="Select All"
                        @click=${() => this._selectAllItems(t.orderId)}
                      >
                        Select All
                      </uui-button>
                      ${a > 0 ? o`
                            <uui-button
                              look="secondary"
                              compact
                              label="Clear"
                              @click=${() => this._clearSelection(t.orderId)}
                            >
                              Clear
                            </uui-button>
                          ` : p}
                    </div>
                  </div>
                  <div class="items-list">
                    ${e.map((n) => this._renderLineItem(t.orderId, n, s))}
                  </div>
                </div>

                ${a > 0 ? o`
                      <div class="tracking-section">
                        <h4>Tracking Information (optional)</h4>
                        <div class="tracking-fields">
                          <umb-property-layout label="Carrier">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="e.g., UPS, FedEx, DHL"
                              .value=${r?.carrier ?? ""}
                              @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "carrier",
      n.target.value
    )}>
                            </uui-input>
                          </umb-property-layout>
                          <umb-property-layout label="Tracking Number">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="e.g., 1Z999AA10123456784"
                              .value=${r?.trackingNumber ?? ""}
                              @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "trackingNumber",
      n.target.value
    )}>
                            </uui-input>
                          </umb-property-layout>
                          <umb-property-layout label="Tracking URL">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="https://..."
                              .value=${r?.trackingUrl ?? ""}
                              @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "trackingUrl",
      n.target.value
    )}>
                            </uui-input>
                          </umb-property-layout>
                        </div>
                      </div>
                    ` : p}
              </div>
            ` : p}
      </div>
    `;
  }
  _renderLineItem(t, e, i) {
    const r = i.has(e.id), s = i.get(e.id);
    return o`
      <div class="item-row ${r ? "selected" : ""}">
        <uui-checkbox
          ?checked=${r}
          @change=${() => this._toggleItemSelection(t, e)}
          aria-label="Select ${e.name || "item"}"
        ></uui-checkbox>
        <div class="item-image">
          ${e.imageUrl ? o`<img src="${e.imageUrl}" alt="${e.name}" />` : o`<div class="placeholder-image"></div>`}
        </div>
        <div class="item-details">
          <div class="item-name">${e.name || "Unknown item"}</div>
          <div class="item-sku">${e.sku || "No SKU"}</div>
        </div>
        <div class="item-quantity">
          ${r ? o`
                <uui-input
                  type="number"
                  min="1"
                  max="${e.remainingQuantity}"
                  .value=${String(s?.quantity ?? e.remainingQuantity)}
                  @input=${(a) => this._updateItemQuantity(
      t,
      e.id,
      parseInt(a.target.value) || 1
    )}
                  @click=${(a) => a.stopPropagation()}
                  label="Quantity"
                ></uui-input>
                <span class="qty-label">/ ${e.remainingQuantity}</span>
              ` : o`<span class="qty-available">${e.remainingQuantity} available</span>`}
        </div>
      </div>
    `;
  }
  _renderExistingShipmentsSection() {
    const t = this._getAllExistingShipments();
    return t.length === 0 ? p : o`
      <div class="existing-shipments-section">
        <div
          class="section-header"
          @click=${() => this._existingShipmentsExpanded = !this._existingShipmentsExpanded}
        >
          <uui-icon
            name="${this._existingShipmentsExpanded ? "icon-navigation-down" : "icon-navigation-right"}"
          ></uui-icon>
          <span>Existing Shipments (${t.length})</span>
        </div>

        ${this._existingShipmentsExpanded ? o`
              <div class="existing-shipments-list">
                ${t.map(
      ({ shipment: e, warehouseName: i }) => o`
                    <div class="existing-shipment-card">
                      <div class="existing-shipment-header">
                        <span class="carrier">${e.carrier || "No carrier"}</span>
                        ${e.trackingNumber ? o`<span class="tracking">${e.trackingNumber}</span>` : p}
                        <span class="date">${w(e.dateCreated)}</span>
                      </div>
                      <div class="existing-shipment-meta">
                        <span class="warehouse">${i}</span>
                        <span class="item-count">
                          ${e.lineItems.reduce((r, s) => r + s.quantity, 0)} items
                        </span>
                      </div>
                      <div class="existing-shipment-actions">
                        ${e.trackingUrl ? o`
                              <a href="${e.trackingUrl}" target="_blank" class="track-link">
                                Track
                              </a>
                            ` : p}
                        <uui-button
                          look="secondary"
                          color="danger"
                          compact
                          label="Delete"
                          @click=${() => this._deleteShipment(e.id)}
                        >
                          Delete
                        </uui-button>
                      </div>
                    </div>
                  `
    )}
              </div>
            ` : p}
      </div>
    `;
  }
  _renderLoadingState() {
    return o`
      <div class="loading">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderErrorState() {
    return o`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
        <uui-button look="secondary" @click=${this._loadFulfillmentSummary}>
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderAllFulfilledState() {
    return o`
      <div class="all-fulfilled">
        <uui-icon name="icon-check"></uui-icon>
        <h3>All items fulfilled</h3>
        <p>All items in this order have been shipped.</p>
      </div>
    `;
  }
  _renderMainContent() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (this._errorMessage)
      return this._renderErrorState();
    if (!this._summary)
      return o`<div class="empty-message">No order data available</div>`;
    const t = this._getOrdersWithRemainingItems(), e = t.length > 0;
    return o`
      <div class="status-bar">
        <span class="status-label">Overall Status:</span>
        <span class="status-badge ${this._summary.overallStatus.toLowerCase()}">
          ${this._summary.overallStatus}
        </span>
      </div>

      ${e ? o`
            <div class="shipments-to-create">
              <h3>Shipments to Create</h3>
              <p class="description">
                Select the items to include in each shipment. Items are pre-selected by default.
              </p>
              <div class="shipment-cards">
                ${t.map((i) => this._renderShipmentCard(i))}
              </div>
            </div>
          ` : this._renderAllFulfilledState()}

      ${this._renderExistingShipmentsSection()}
    `;
  }
  render() {
    const t = this._getOrdersWithSelections(), e = this._getTotalItemsToShip(), i = t.length > 0;
    return o`
      <umb-body-layout headline="Fulfil Order ${this._summary?.invoiceNumber ?? ""}">
        <div id="main">
          ${this._renderMainContent()}
        </div>

        <div slot="actions">
          ${i ? o`
                <uui-button
                  look="primary"
                  label="Create Shipments"
                  ?disabled=${this._isCreating}
                  @click=${this._createAllShipments}
                >
                  ${this._isCreating ? "Creating..." : `Create ${t.length} Shipment${t.length !== 1 ? "s" : ""} (${e} items)`}
                </uui-button>
              ` : p}
          <uui-button look="secondary" label="Close" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
l.styles = k`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
    }

    .status-label {
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.unfulfilled {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.partial {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .shipments-to-create h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1rem;
      font-weight: 600;
    }

    .shipments-to-create .description {
      margin: 0 0 var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipment-cards {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .shipment-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .shipment-card.has-selection {
      border-color: var(--uui-color-positive);
    }

    .shipment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
    }

    .shipment-header:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-name {
      font-weight: 600;
    }

    .item-count {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .delivery-method {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .shipment-content {
      padding: var(--uui-size-space-4);
    }

    .items-section {
      margin-bottom: var(--uui-size-space-4);
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
    }

    .items-header h4,
    .tracking-section h4 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .selection-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2);
    }

    .item-row {
      display: grid;
      grid-template-columns: auto 40px 1fr auto;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
    }

    .item-row.selected {
      background: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast, #fff);
    }

    .item-row.selected .item-sku {
      color: var(--uui-color-selected-contrast, #fff);
      opacity: 0.8;
    }

    .item-row.selected .qty-label {
      color: var(--uui-color-selected-contrast, #fff);
      opacity: 0.8;
    }

    .item-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .item-image img,
    .placeholder-image {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface);
    }

    .item-details {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-quantity {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .item-quantity input[type="number"] {
      width: 60px;
      padding: var(--uui-size-space-1);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      text-align: center;
    }

    .qty-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .qty-available {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .tracking-section {
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .tracking-section h4 {
      margin-bottom: var(--uui-size-space-2);
    }

    .tracking-fields {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .tracking-fields umb-property-layout {
      --umb-property-layout-label-width: 140px;
    }

    .tracking-fields umb-property-layout:first-child {
      padding-top: 0;
    }

    .tracking-fields umb-property-layout:last-child {
      padding-bottom: 0;
    }

    .tracking-fields umb-property-layout uui-input {
      width: 100%;
    }

    .all-fulfilled {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-4);
      text-align: center;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
    }

    .all-fulfilled uui-icon {
      font-size: 48px;
      color: #155724;
      margin-bottom: var(--uui-size-space-4);
    }

    .all-fulfilled h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1.25rem;
      color: #155724;
    }

    .all-fulfilled p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .existing-shipments-section {
      margin-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .existing-shipments-section .section-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      cursor: pointer;
      font-weight: 500;
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
    }

    .existing-shipments-section .section-header:hover {
      background: var(--uui-color-surface-alt);
    }

    .existing-shipments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .existing-shipment-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .existing-shipment-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .existing-shipment-header .carrier {
      font-weight: 600;
    }

    .existing-shipment-header .tracking {
      font-family: monospace;
      font-size: 0.875rem;
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: var(--uui-border-radius);
    }

    .existing-shipment-header .date {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .existing-shipment-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .existing-shipment-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .track-link {
      font-size: 0.875rem;
      color: var(--uui-color-interactive);
    }

    .empty-message {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }
  `;
d([
  m()
], l.prototype, "_summary", 2);
d([
  m()
], l.prototype, "_isLoading", 2);
d([
  m()
], l.prototype, "_errorMessage", 2);
d([
  m()
], l.prototype, "_isCreating", 2);
d([
  m()
], l.prototype, "_shipmentsCreated", 2);
d([
  m()
], l.prototype, "_selectedItems", 2);
d([
  m()
], l.prototype, "_orderTrackingInfo", 2);
d([
  m()
], l.prototype, "_expandedOrders", 2);
d([
  m()
], l.prototype, "_existingShipmentsExpanded", 2);
l = d([
  I("merchello-fulfillment-modal")
], l);
const O = l;
export {
  l as MerchelloFulfillmentModalElement,
  O as default
};
//# sourceMappingURL=fulfillment-modal.element-DSj_gtm5.js.map
