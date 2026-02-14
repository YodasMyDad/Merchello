import { nothing as d, html as a, css as b, state as c, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as k } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-DNSJzonx.js";
var v = Object.defineProperty, w = Object.getOwnPropertyDescriptor, n = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? w(t, s) : t, l = e.length - 1, u; l >= 0; l--)
    (u = e[l]) && (r = (i ? u(t, s, r) : u(r)) || r);
  return i && r && v(t, s, r), r;
};
const h = [
  { key: "sku", label: "SKU", description: "Stock keeping unit." },
  { key: "gtin", label: "GTIN/Barcode", description: "Global Trade Item Number." },
  { key: "supplierSku", label: "Supplier SKU", description: "Supplier reference code." },
  { key: "hsCode", label: "HS Code", description: "Harmonized customs code." },
  { key: "price", label: "Price", description: "Customer-facing price." },
  { key: "onSale", label: "On Sale", description: "Enable or disable sale status." },
  { key: "costOfGoods", label: "Cost Of Goods", description: "Internal product cost." },
  { key: "availableForPurchase", label: "Visible On Website", description: "Show product on storefront." },
  { key: "canPurchase", label: "Allow Purchase", description: "Allow checkout for this variant." },
  { key: "trackStock", label: "Track Stock", description: "Toggle stock tracking per warehouse." }
], p = 3, S = 120, y = 3;
let o = class extends k {
  constructor() {
    super(...arguments), this._step = "fields", this._variants = [], this._selectedFields = [], this._warehouseOptions = [], this._isSaving = !1, this._errorMessage = null, this._rowErrors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this._initializeData();
  }
  _initializeData() {
    const e = this.data?.variants ?? [], t = /* @__PURE__ */ new Map();
    for (const s of e)
      for (const i of s.warehouseStock ?? [])
        t.has(i.warehouseId) || t.set(
          i.warehouseId,
          i.warehouseName ?? "Unnamed warehouse"
        );
    this._warehouseOptions = Array.from(t.entries()).map(([s, i]) => ({ id: s, name: i })), this._variants = e.map((s) => ({
      ...s,
      warehouseStock: this._warehouseOptions.map((i) => {
        const r = s.warehouseStock.find(
          (l) => l.warehouseId === i.id
        );
        return r ? {
          ...r,
          warehouseName: r.warehouseName ?? i.name
        } : {
          warehouseId: i.id,
          warehouseName: i.name,
          stock: 0,
          reservedStock: 0,
          availableStock: 0,
          reorderPoint: null,
          reorderQuantity: null,
          trackStock: !1,
          stockStatus: "Untracked",
          stockStatusLabel: "Untracked",
          stockStatusCssClass: "badge-default"
        };
      })
    }));
  }
  _toggleField(e, t) {
    if (t) {
      this._selectedFields.includes(e) || (this._selectedFields = [...this._selectedFields, e]);
      return;
    }
    this._selectedFields = this._selectedFields.filter((s) => s !== e);
  }
  _selectAllFields() {
    this._selectedFields = h.map((e) => e.key);
  }
  _clearFields() {
    this._selectedFields = [];
  }
  _continueToEditor() {
    this._selectedFields.length !== 0 && (this._errorMessage = null, this._rowErrors = {}, this._step = "edit");
  }
  _goBackToFields() {
    this._isSaving || (this._errorMessage = null, this._rowErrors = {}, this._step = "fields");
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _updateVariantField(e, t, s) {
    if (this._variants = this._variants.map(
      (i) => i.id === e ? { ...i, [t]: s } : i
    ), this._rowErrors[e]) {
      const i = { ...this._rowErrors };
      delete i[e], this._rowErrors = i;
    }
  }
  _updateTrackStock(e, t, s) {
    if (this._variants = this._variants.map((i) => i.id !== e ? i : {
      ...i,
      warehouseStock: i.warehouseStock.map(
        (r) => r.warehouseId === t ? { ...r, trackStock: s } : r
      )
    }), this._rowErrors[e]) {
      const i = { ...this._rowErrors };
      delete i[e], this._rowErrors = i;
    }
  }
  _parseNumber(e, t) {
    const s = Number.parseFloat(e);
    return Number.isFinite(s) ? s : t;
  }
  _validateBeforeSave() {
    const e = {};
    for (const t of this._variants) {
      const s = [];
      this._selectedFields.includes("sku") && !t.sku?.trim() && s.push("SKU is required."), this._selectedFields.includes("price") && t.price < 0 && s.push("Price must be 0 or greater."), this._selectedFields.includes("costOfGoods") && t.costOfGoods < 0 && s.push("Cost of goods must be 0 or greater."), s.length > 0 && (e[t.id] = s.join(" "));
    }
    return this._rowErrors = e, Object.keys(e).length > 0 ? (this._errorMessage = "Please fix the highlighted rows before saving.", !1) : !0;
  }
  _buildUpdateRequest(e) {
    const t = {};
    return this._selectedFields.includes("sku") && (t.sku = e.sku ?? ""), this._selectedFields.includes("gtin") && (t.gtin = e.gtin ?? ""), this._selectedFields.includes("supplierSku") && (t.supplierSku = e.supplierSku ?? ""), this._selectedFields.includes("hsCode") && (t.hsCode = e.hsCode ?? ""), this._selectedFields.includes("price") && (t.price = e.price), this._selectedFields.includes("onSale") && (t.onSale = e.onSale), this._selectedFields.includes("costOfGoods") && (t.costOfGoods = e.costOfGoods), this._selectedFields.includes("availableForPurchase") && (t.availableForPurchase = e.availableForPurchase), this._selectedFields.includes("canPurchase") && (t.canPurchase = e.canPurchase), this._selectedFields.includes("trackStock") && (t.warehouseStock = e.warehouseStock.map((s) => ({
      warehouseId: s.warehouseId,
      stock: s.stock,
      reorderPoint: s.reorderPoint,
      trackStock: s.trackStock
    }))), t;
  }
  _isRetryableUpdateError(e) {
    const t = e.message.toLowerCase();
    return t.includes("database table is locked") || t.includes("database is locked") || t.includes("sqlite error 5") || t.includes("sqlite error 6") || t.startsWith("http 500");
  }
  _delay(e) {
    return new Promise((t) => {
      window.setTimeout(t, e);
    });
  }
  async _updateVariantWithRetry(e, t, s) {
    let i;
    for (let r = 1; r <= p; r++) {
      const { error: l } = await m.updateVariant(e, t, s);
      if (!l)
        return {};
      if (i = l, !this._isRetryableUpdateError(l) || r === p)
        return { error: l };
      await this._delay(S * r);
    }
    return { error: i };
  }
  async _saveVariantsWithLimitedConcurrency(e) {
    const t = new Array(this._variants.length);
    let s = 0;
    const i = async () => {
      for (; s < this._variants.length; ) {
        const l = s;
        s += 1;
        const u = this._variants[l], _ = this._buildUpdateRequest(u), g = await this._updateVariantWithRetry(e, u.id, _);
        t[l] = { variant: u, error: g.error };
      }
    }, r = Math.min(y, this._variants.length);
    return await Promise.all(Array.from({ length: r }, () => i())), t;
  }
  async _handleSave() {
    if (!(!this.data?.productRootId || this._selectedFields.length === 0 || this._variants.length === 0) && this._validateBeforeSave()) {
      this._isSaving = !0, this._errorMessage = null, this._rowErrors = {};
      try {
        const t = (await this._saveVariantsWithLimitedConcurrency(this.data.productRootId)).filter((s) => s.error);
        if (t.length > 0) {
          const s = {};
          for (const r of t)
            s[r.variant.id] = r.error?.message ?? "Failed to update variant.";
          this._rowErrors = s;
          const i = this._variants.length - t.length;
          this._errorMessage = i > 0 ? `${i} variant${i === 1 ? "" : "s"} updated. ${t.length} failed.` : `Failed to update ${t.length} variant${t.length === 1 ? "" : "s"}.`;
          return;
        }
        this.value = {
          isSaved: !0,
          updatedCount: this._variants.length
        }, this.modalContext?.submit();
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred while saving variants.";
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderError() {
    return this._errorMessage ? a`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    ` : d;
  }
  _renderFieldSelectionStep() {
    return a`
      <div class="intro">
        <strong>Select fields to batch update</strong>
        <p>Choose one or more fields. Next, you will edit these values for all selected variants in a table.</p>
      </div>

      <div class="field-actions">
        <uui-button look="secondary" label="Select all fields" @click=${this._selectAllFields}>
          Select all
        </uui-button>
        <uui-button look="secondary" label="Clear fields" @click=${this._clearFields}>
          Clear
        </uui-button>
      </div>

      <div class="field-grid">
        ${h.map((e) => {
      const t = this._selectedFields.includes(e.key);
      return a`
            <div class="field-card ${t ? "selected" : ""}">
              <uui-checkbox
                label=${e.label}
                ?checked=${t}
                @change=${(s) => this._toggleField(e.key, s.target.checked)}>
                ${e.label}
              </uui-checkbox>
              <p>${e.description}</p>
            </div>
          `;
    })}
      </div>
    `;
  }
  _renderVariantName(e) {
    const t = this._rowErrors[e.id];
    return a`
      <div class="variant-name-cell">
        <strong>${e.name || "Unnamed variant"}</strong>
        <span class="variant-subtext">ID: ${e.id}</span>
        ${t ? a`<span class="row-error">${t}</span>` : d}
      </div>
    `;
  }
  _renderTrackStockCell(e) {
    return this._warehouseOptions.length === 0 ? a`<span class="no-warehouses">No warehouses assigned</span>` : a`
      <div class="track-stock-list">
        ${this._warehouseOptions.map((t) => {
      const s = e.warehouseStock.find(
        (i) => i.warehouseId === t.id
      );
      return a`
            <label class="track-stock-item">
              <uui-toggle
                label=${t.name}
                .checked=${s?.trackStock ?? !1}
                @change=${(i) => this._updateTrackStock(
        e.id,
        t.id,
        i.target.checked
      )}>
              </uui-toggle>
              <span>${t.name}</span>
            </label>
          `;
    })}
      </div>
    `;
  }
  _renderEditorCell(e, t) {
    switch (t) {
      case "sku":
        return a`
          <uui-input
            class="cell-input"
            .value=${e.sku ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "sku", s.target.value)}>
          </uui-input>
        `;
      case "gtin":
        return a`
          <uui-input
            class="cell-input"
            .value=${e.gtin ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "gtin", s.target.value)}>
          </uui-input>
        `;
      case "supplierSku":
        return a`
          <uui-input
            class="cell-input"
            .value=${e.supplierSku ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "supplierSku", s.target.value)}>
          </uui-input>
        `;
      case "hsCode":
        return a`
          <uui-input
            class="cell-input"
            .value=${e.hsCode ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "hsCode", s.target.value)}>
          </uui-input>
        `;
      case "price":
        return a`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.price)}
            @input=${(s) => this._updateVariantField(
          e.id,
          "price",
          this._parseNumber(s.target.value, e.price)
        )}>
          </uui-input>
        `;
      case "costOfGoods":
        return a`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.costOfGoods)}
            @input=${(s) => this._updateVariantField(
          e.id,
          "costOfGoods",
          this._parseNumber(s.target.value, e.costOfGoods)
        )}>
          </uui-input>
        `;
      case "onSale":
        return a`
          <uui-toggle
            label="On Sale"
            .checked=${e.onSale}
            @change=${(s) => this._updateVariantField(e.id, "onSale", s.target.checked)}>
          </uui-toggle>
        `;
      case "availableForPurchase":
        return a`
          <uui-toggle
            label="Visible On Website"
            .checked=${e.availableForPurchase}
            @change=${(s) => this._updateVariantField(
          e.id,
          "availableForPurchase",
          s.target.checked
        )}>
          </uui-toggle>
        `;
      case "canPurchase":
        return a`
          <uui-toggle
            label="Allow Purchase"
            .checked=${e.canPurchase}
            @change=${(s) => this._updateVariantField(
          e.id,
          "canPurchase",
          s.target.checked
        )}>
          </uui-toggle>
        `;
      case "trackStock":
        return this._renderTrackStockCell(e);
      default:
        return d;
    }
  }
  _getFieldLabel(e) {
    return h.find((t) => t.key === e)?.label ?? e;
  }
  _renderEditorStep() {
    return a`
      <div class="intro">
        <strong>Edit selected fields for ${this._variants.length} variants</strong>
        <p>Update values per row and save once to apply all changes.</p>
      </div>

      <div class="table-container">
        <uui-table class="editor-table">
          <uui-table-head>
            <uui-table-head-cell class="variant-column">Variant</uui-table-head-cell>
            ${this._selectedFields.map(
      (e) => a`<uui-table-head-cell>${this._getFieldLabel(e)}</uui-table-head-cell>`
    )}
          </uui-table-head>
          ${this._variants.map(
      (e) => a`
              <uui-table-row class=${this._rowErrors[e.id] ? "row-has-error" : ""}>
                <uui-table-cell>${this._renderVariantName(e)}</uui-table-cell>
                ${this._selectedFields.map(
        (t) => a`<uui-table-cell>${this._renderEditorCell(e, t)}</uui-table-cell>`
      )}
              </uui-table-row>
            `
    )}
        </uui-table>
      </div>
    `;
  }
  render() {
    const e = this._step === "fields" ? `Batch Update ${this._variants.length} Variants` : `Edit ${this._variants.length} Variants`;
    return a`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._renderError()}
          ${this._step === "fields" ? this._renderFieldSelectionStep() : this._renderEditorStep()}
        </div>

        <div slot="actions">
          ${this._step === "edit" ? a`
                <uui-button
                  look="secondary"
                  label="Back"
                  @click=${this._goBackToFields}
                  ?disabled=${this._isSaving}>
                  Back
                </uui-button>
              ` : d}

          <uui-button
            look="secondary"
            label="Cancel"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}>
            Cancel
          </uui-button>

          ${this._step === "fields" ? a`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Continue"
                  @click=${this._continueToEditor}
                  ?disabled=${this._selectedFields.length === 0}>
                  Continue
                </uui-button>
              ` : a`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Save Batch Updates"
                  @click=${this._handleSave}
                  ?disabled=${this._isSaving}
                  .state=${this._isSaving ? "waiting" : void 0}>
                  ${this._isSaving ? "Saving..." : "Save Batch Updates"}
                </uui-button>
              `}
        </div>
      </umb-body-layout>
    `;
  }
};
o.styles = b`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .intro strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .intro p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .field-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .field-grid {
      display: grid;
      gap: var(--uui-size-space-3);
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .field-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .field-card.selected {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-selected-emphasis);
    }

    .field-card p {
      margin: var(--uui-size-space-2) 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .table-container {
      overflow: auto;
      max-height: 62vh;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .editor-table {
      min-width: 1080px;
      width: 100%;
    }

    .editor-table .variant-column {
      min-width: 220px;
    }

    .variant-name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .variant-subtext {
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
        "Courier New", monospace;
    }

    .row-error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .row-has-error {
      background: var(--uui-color-danger-surface);
    }

    .cell-input {
      min-width: 140px;
      width: 100%;
    }

    .track-stock-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 220px;
    }

    .track-stock-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .no-warehouses {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
n([
  c()
], o.prototype, "_step", 2);
n([
  c()
], o.prototype, "_variants", 2);
n([
  c()
], o.prototype, "_selectedFields", 2);
n([
  c()
], o.prototype, "_warehouseOptions", 2);
n([
  c()
], o.prototype, "_isSaving", 2);
n([
  c()
], o.prototype, "_errorMessage", 2);
n([
  c()
], o.prototype, "_rowErrors", 2);
o = n([
  f("merchello-variant-batch-update-modal")
], o);
const x = o;
export {
  o as MerchelloVariantBatchUpdateModalElement,
  x as default
};
//# sourceMappingURL=variant-batch-update-modal.element-1MAFBs1H.js.map
