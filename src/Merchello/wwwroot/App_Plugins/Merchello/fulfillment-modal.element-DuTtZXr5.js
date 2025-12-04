import { nothing as m, html as o, css as v, state as p, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-DudNt7x5.js";
import { b as y } from "./formatting-B7Ourlxi.js";
var x = Object.defineProperty, k = Object.getOwnPropertyDescriptor, u = (t, e, r, i) => {
  for (var a = i > 1 ? void 0 : i ? k(e, r) : e, s = t.length - 1, c; s >= 0; s--)
    (c = t[s]) && (a = (i ? c(e, r, a) : c(a)) || a);
  return i && a && x(e, r, a), a;
};
let l = class extends _ {
  constructor() {
    super(...arguments), this._summary = null, this._isLoading = !0, this._errorMessage = null, this._isCreating = !1, this._shipmentsCreated = 0, this._selectedItems = /* @__PURE__ */ new Map(), this._orderTrackingInfo = /* @__PURE__ */ new Map(), this._expandedOrders = /* @__PURE__ */ new Set(), this._existingShipmentsExpanded = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadFulfillmentSummary();
  }
  async _loadFulfillmentSummary() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await g.getFulfillmentSummary(this.data.invoiceId);
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    if (this._summary = t ?? null, this._isLoading = !1, this._summary) {
      const r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
      for (const s of this._summary.orders)
        if (s.lineItems.some((d) => d.remainingQuantity > 0)) {
          r.set(s.orderId, {
            carrier: "",
            trackingNumber: "",
            trackingUrl: ""
          }), i.add(s.orderId);
          const d = /* @__PURE__ */ new Map();
          for (const n of s.lineItems)
            n.remainingQuantity > 0 && d.set(n.id, {
              lineItemId: n.id,
              quantity: n.remainingQuantity,
              maxQuantity: n.remainingQuantity,
              name: n.name ?? "Unknown",
              sku: n.sku
            });
          a.set(s.orderId, d);
        }
      this._orderTrackingInfo = r, this._expandedOrders = i, this._selectedItems = a;
    }
  }
  _toggleOrderExpanded(t) {
    const e = new Set(this._expandedOrders);
    e.has(t) ? e.delete(t) : e.add(t), this._expandedOrders = e;
  }
  _updateOrderTracking(t, e, r) {
    const i = this._orderTrackingInfo.get(t);
    if (!i) return;
    const a = { ...i, [e]: r }, s = new Map(this._orderTrackingInfo);
    s.set(t, a), this._orderTrackingInfo = s;
  }
  _toggleItemSelection(t, e) {
    const r = this._selectedItems.get(t) ?? /* @__PURE__ */ new Map();
    r.has(e.id) ? r.delete(e.id) : r.set(e.id, {
      lineItemId: e.id,
      quantity: e.remainingQuantity,
      maxQuantity: e.remainingQuantity,
      name: e.name ?? "Unknown",
      sku: e.sku
    }), this._selectedItems.set(t, r), this._selectedItems = new Map(this._selectedItems);
  }
  _updateItemQuantity(t, e, r) {
    const i = this._selectedItems.get(t);
    if (!i) return;
    const a = i.get(e);
    if (!a) return;
    const s = Math.max(1, Math.min(r, a.maxQuantity));
    i.set(e, { ...a, quantity: s }), this._selectedItems = new Map(this._selectedItems);
  }
  _selectAllItems(t) {
    const e = this._summary?.orders.find((i) => i.orderId === t);
    if (!e) return;
    const r = /* @__PURE__ */ new Map();
    for (const i of e.lineItems)
      i.remainingQuantity > 0 && r.set(i.id, {
        lineItemId: i.id,
        quantity: i.remainingQuantity,
        maxQuantity: i.remainingQuantity,
        name: i.name ?? "Unknown",
        sku: i.sku
      });
    this._selectedItems.set(t, r), this._selectedItems = new Map(this._selectedItems);
  }
  _clearSelection(t) {
    this._selectedItems.set(t, /* @__PURE__ */ new Map()), this._selectedItems = new Map(this._selectedItems);
  }
  _getSelectedCount(t) {
    return this._selectedItems.get(t)?.size ?? 0;
  }
  _getTotalSelectedQuantity(t) {
    const e = this._selectedItems.get(t);
    return e ? Array.from(e.values()).reduce((r, i) => r + i.quantity, 0) : 0;
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
      for (const r of e.shipments)
        t.push({ shipment: r, warehouseName: e.warehouseName });
    return t;
  }
  async _createAllShipments() {
    const t = this._getOrdersWithSelections();
    if (t.length === 0) return;
    this._isCreating = !0, this._errorMessage = null;
    let e = 0;
    const r = [];
    for (const i of t) {
      const a = this._orderTrackingInfo.get(i.orderId), s = this._selectedItems.get(i.orderId);
      if (!s || s.size === 0) continue;
      const c = {};
      for (const [h, f] of s)
        c[h] = f.quantity;
      const d = {
        lineItems: c,
        carrier: a?.carrier || void 0,
        trackingNumber: a?.trackingNumber || void 0,
        trackingUrl: a?.trackingUrl || void 0
      }, { error: n } = await g.createShipment(i.orderId, d);
      n ? r.push(`${i.warehouseName}: ${n.message}`) : e++;
    }
    this._isCreating = !1, this._shipmentsCreated += e, r.length > 0 && (this._errorMessage = `Some shipments failed: ${r.join("; ")}`), await this._loadFulfillmentSummary();
  }
  async _deleteShipment(t) {
    if (!confirm("Are you sure you want to delete this shipment? Items will be released back to unfulfilled."))
      return;
    const { error: e } = await g.deleteShipment(t);
    if (e) {
      this._errorMessage = e.message;
      return;
    }
    await this._loadFulfillmentSummary();
  }
  _handleClose() {
    this.modalContext?.setValue({ shipmentsCreated: this._shipmentsCreated }), this.modalContext?.submit();
  }
  _renderShipmentCard(t) {
    const e = t.lineItems.filter((n) => n.remainingQuantity > 0);
    if (e.length === 0) return m;
    const r = this._expandedOrders.has(t.orderId), i = this._orderTrackingInfo.get(t.orderId), a = this._selectedItems.get(t.orderId) ?? /* @__PURE__ */ new Map(), s = this._getSelectedCount(t.orderId), c = this._getTotalSelectedQuantity(t.orderId), d = e.reduce((n, h) => n + h.remainingQuantity, 0);
    return o`
      <div class="shipment-card ${s > 0 ? "has-selection" : ""}">
        <div
          class="shipment-header"
          @click=${() => this._toggleOrderExpanded(t.orderId)}
        >
          <div class="header-info">
            <uui-icon name="${r ? "icon-navigation-down" : "icon-navigation-right"}"></uui-icon>
            <span class="warehouse-name">${t.warehouseName}</span>
            <span class="item-count">
              ${s > 0 ? `${c} of ${d} selected` : `${d} item${d !== 1 ? "s" : ""} to ship`}
            </span>
          </div>
          <div class="header-meta">
            <span class="delivery-method">${t.deliveryMethod}</span>
          </div>
        </div>

        ${r ? o`
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
                      ${s > 0 ? o`
                            <uui-button
                              look="secondary"
                              compact
                              label="Clear"
                              @click=${() => this._clearSelection(t.orderId)}
                            >
                              Clear
                            </uui-button>
                          ` : m}
                    </div>
                  </div>
                  <div class="items-list">
                    ${e.map((n) => this._renderLineItem(t.orderId, n, a))}
                  </div>
                </div>

                ${s > 0 ? o`
                      <div class="tracking-section">
                        <h4>Tracking Information (optional)</h4>
                        <div class="tracking-form">
                          <div class="form-row">
                            <label>
                              Carrier
                              <input
                                type="text"
                                placeholder="e.g., UPS, FedEx, DHL"
                                .value=${i?.carrier ?? ""}
                                @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "carrier",
      n.target.value
    )}
                              />
                            </label>
                            <label>
                              Tracking Number
                              <input
                                type="text"
                                placeholder="e.g., 1Z999AA10123456784"
                                .value=${i?.trackingNumber ?? ""}
                                @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "trackingNumber",
      n.target.value
    )}
                              />
                            </label>
                          </div>
                          <div class="form-row">
                            <label class="full-width">
                              Tracking URL
                              <input
                                type="text"
                                placeholder="https://..."
                                .value=${i?.trackingUrl ?? ""}
                                @input=${(n) => this._updateOrderTracking(
      t.orderId,
      "trackingUrl",
      n.target.value
    )}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ` : m}
              </div>
            ` : m}
      </div>
    `;
  }
  _renderLineItem(t, e, r) {
    const i = r.has(e.id), a = r.get(e.id);
    return o`
      <div class="item-row ${i ? "selected" : ""}">
        <input
          type="checkbox"
          .checked=${i}
          @change=${() => this._toggleItemSelection(t, e)}
        />
        <div class="item-image">
          ${e.imageUrl ? o`<img src="${e.imageUrl}" alt="${e.name}" />` : o`<div class="placeholder-image"></div>`}
        </div>
        <div class="item-details">
          <div class="item-name">${e.name || "Unknown item"}</div>
          <div class="item-sku">${e.sku || "No SKU"}</div>
        </div>
        <div class="item-quantity">
          ${i ? o`
                <input
                  type="number"
                  min="1"
                  max="${e.remainingQuantity}"
                  .value=${String(a?.quantity ?? e.remainingQuantity)}
                  @input=${(s) => this._updateItemQuantity(
      t,
      e.id,
      parseInt(s.target.value) || 1
    )}
                  @click=${(s) => s.stopPropagation()}
                />
                <span class="qty-label">/ ${e.remainingQuantity}</span>
              ` : o`<span class="qty-available">${e.remainingQuantity} available</span>`}
        </div>
      </div>
    `;
  }
  _renderExistingShipmentsSection() {
    const t = this._getAllExistingShipments();
    return t.length === 0 ? m : o`
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
      ({ shipment: e, warehouseName: r }) => o`
                    <div class="existing-shipment-card">
                      <div class="existing-shipment-header">
                        <span class="carrier">${e.carrier || "No carrier"}</span>
                        ${e.trackingNumber ? o`<span class="tracking">${e.trackingNumber}</span>` : m}
                        <span class="date">${y(e.dateCreated)}</span>
                      </div>
                      <div class="existing-shipment-meta">
                        <span class="warehouse">${r}</span>
                        <span class="item-count">
                          ${e.lineItems.reduce((i, a) => i + a.quantity, 0)} items
                        </span>
                      </div>
                      <div class="existing-shipment-actions">
                        ${e.trackingUrl ? o`
                              <a href="${e.trackingUrl}" target="_blank" class="track-link">
                                Track
                              </a>
                            ` : m}
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
            ` : m}
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
                ${t.map((r) => this._renderShipmentCard(r))}
              </div>
            </div>
          ` : this._renderAllFulfilledState()}

      ${this._renderExistingShipmentsSection()}
    `;
  }
  render() {
    const t = this._getOrdersWithSelections(), e = this._getTotalItemsToShip(), r = t.length > 0;
    return o`
      <umb-body-layout headline="Fulfil Order ${this._summary?.invoiceNumber ?? ""}">
        <div id="main">
          ${this._renderMainContent()}
        </div>

        <div slot="actions">
          ${r ? o`
                <uui-button
                  look="primary"
                  label="Create Shipments"
                  ?disabled=${this._isCreating}
                  @click=${this._createAllShipments}
                >
                  ${this._isCreating ? "Creating..." : `Create ${t.length} Shipment${t.length !== 1 ? "s" : ""} (${e} items)`}
                </uui-button>
              ` : m}
          <uui-button look="secondary" label="Close" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l.styles = v`
    :host {
      display: block;
      height: 100%;
    }

    #main {
      padding: var(--uui-size-layout-1);
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
      background: #f8d7da;
      color: #721c24;
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
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.partial {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.fulfilled {
      background: #d4edda;
      color: #155724;
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

    .tracking-form {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .form-row {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .form-row:last-child {
      margin-bottom: 0;
    }

    .form-row label {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .form-row label.full-width {
      flex: 1;
    }

    .form-row input {
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .form-row input:focus {
      outline: none;
      border-color: var(--uui-color-interactive);
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
u([
  p()
], l.prototype, "_summary", 2);
u([
  p()
], l.prototype, "_isLoading", 2);
u([
  p()
], l.prototype, "_errorMessage", 2);
u([
  p()
], l.prototype, "_isCreating", 2);
u([
  p()
], l.prototype, "_shipmentsCreated", 2);
u([
  p()
], l.prototype, "_selectedItems", 2);
u([
  p()
], l.prototype, "_orderTrackingInfo", 2);
u([
  p()
], l.prototype, "_expandedOrders", 2);
u([
  p()
], l.prototype, "_existingShipmentsExpanded", 2);
l = u([
  b("merchello-fulfillment-modal")
], l);
const z = l;
export {
  l as MerchelloFulfillmentModalElement,
  z as default
};
//# sourceMappingURL=fulfillment-modal.element-DuTtZXr5.js.map
