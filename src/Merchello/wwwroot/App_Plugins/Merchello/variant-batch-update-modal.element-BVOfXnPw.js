import { nothing as n, html as r, css as p, state as u, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-DNSJzonx.js";
var f = Object.defineProperty, k = Object.getOwnPropertyDescriptor, o = (e, s, t, i) => {
  for (var a = i > 1 ? void 0 : i ? k(s, t) : s, c = e.length - 1, d; c >= 0; c--)
    (d = e[c]) && (a = (i ? d(s, t, a) : d(a)) || a);
  return i && a && f(s, t, a), a;
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
];
let l = class extends g {
  constructor() {
    super(...arguments), this._step = "fields", this._variants = [], this._selectedFields = [], this._warehouseOptions = [], this._isSaving = !1, this._errorMessage = null, this._rowErrors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this._initializeData();
  }
  _initializeData() {
    const e = this.data?.variants ?? [], s = /* @__PURE__ */ new Map();
    for (const t of e)
      for (const i of t.warehouseStock ?? [])
        s.has(i.warehouseId) || s.set(
          i.warehouseId,
          i.warehouseName ?? "Unnamed warehouse"
        );
    this._warehouseOptions = Array.from(s.entries()).map(([t, i]) => ({ id: t, name: i })), this._variants = e.map((t) => ({
      ...t,
      warehouseStock: this._warehouseOptions.map((i) => {
        const a = t.warehouseStock.find(
          (c) => c.warehouseId === i.id
        );
        return a ? {
          ...a,
          warehouseName: a.warehouseName ?? i.name
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
  _toggleField(e, s) {
    if (s) {
      this._selectedFields.includes(e) || (this._selectedFields = [...this._selectedFields, e]);
      return;
    }
    this._selectedFields = this._selectedFields.filter((t) => t !== e);
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
  _updateVariantField(e, s, t) {
    if (this._variants = this._variants.map(
      (i) => i.id === e ? { ...i, [s]: t } : i
    ), this._rowErrors[e]) {
      const i = { ...this._rowErrors };
      delete i[e], this._rowErrors = i;
    }
  }
  _updateTrackStock(e, s, t) {
    if (this._variants = this._variants.map((i) => i.id !== e ? i : {
      ...i,
      warehouseStock: i.warehouseStock.map(
        (a) => a.warehouseId === s ? { ...a, trackStock: t } : a
      )
    }), this._rowErrors[e]) {
      const i = { ...this._rowErrors };
      delete i[e], this._rowErrors = i;
    }
  }
  _parseNumber(e, s) {
    const t = Number.parseFloat(e);
    return Number.isFinite(t) ? t : s;
  }
  _validateBeforeSave() {
    const e = {};
    for (const s of this._variants) {
      const t = [];
      this._selectedFields.includes("sku") && !s.sku?.trim() && t.push("SKU is required."), this._selectedFields.includes("price") && s.price < 0 && t.push("Price must be 0 or greater."), this._selectedFields.includes("costOfGoods") && s.costOfGoods < 0 && t.push("Cost of goods must be 0 or greater."), t.length > 0 && (e[s.id] = t.join(" "));
    }
    return this._rowErrors = e, Object.keys(e).length > 0 ? (this._errorMessage = "Please fix the highlighted rows before saving.", !1) : !0;
  }
  _buildUpdateRequest(e) {
    const s = {};
    return this._selectedFields.includes("sku") && (s.sku = e.sku ?? ""), this._selectedFields.includes("gtin") && (s.gtin = e.gtin ?? ""), this._selectedFields.includes("supplierSku") && (s.supplierSku = e.supplierSku ?? ""), this._selectedFields.includes("hsCode") && (s.hsCode = e.hsCode ?? ""), this._selectedFields.includes("price") && (s.price = e.price), this._selectedFields.includes("onSale") && (s.onSale = e.onSale), this._selectedFields.includes("costOfGoods") && (s.costOfGoods = e.costOfGoods), this._selectedFields.includes("availableForPurchase") && (s.availableForPurchase = e.availableForPurchase), this._selectedFields.includes("canPurchase") && (s.canPurchase = e.canPurchase), this._selectedFields.includes("trackStock") && (s.warehouseStock = e.warehouseStock.map((t) => ({
      warehouseId: t.warehouseId,
      stock: t.stock,
      reorderPoint: t.reorderPoint,
      trackStock: t.trackStock
    }))), s;
  }
  async _handleSave() {
    if (!(!this.data?.productRootId || this._selectedFields.length === 0 || this._variants.length === 0) && this._validateBeforeSave()) {
      this._isSaving = !0, this._errorMessage = null, this._rowErrors = {};
      try {
        const s = (await Promise.all(
          this._variants.map(async (t) => {
            const i = this._buildUpdateRequest(t), { error: a } = await b.updateVariant(this.data.productRootId, t.id, i);
            return { variant: t, error: a };
          })
        )).filter((t) => t.error);
        if (s.length > 0) {
          const t = {};
          for (const a of s)
            t[a.variant.id] = a.error?.message ?? "Failed to update variant.";
          this._rowErrors = t;
          const i = this._variants.length - s.length;
          this._errorMessage = i > 0 ? `${i} variant${i === 1 ? "" : "s"} updated. ${s.length} failed.` : `Failed to update ${s.length} variant${s.length === 1 ? "" : "s"}.`;
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
    return this._errorMessage ? r`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    ` : n;
  }
  _renderFieldSelectionStep() {
    return r`
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
      const s = this._selectedFields.includes(e.key);
      return r`
            <div class="field-card ${s ? "selected" : ""}">
              <uui-checkbox
                label=${e.label}
                ?checked=${s}
                @change=${(t) => this._toggleField(e.key, t.target.checked)}>
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
    const s = this._rowErrors[e.id];
    return r`
      <div class="variant-name-cell">
        <strong>${e.name || "Unnamed variant"}</strong>
        <span class="variant-subtext">ID: ${e.id}</span>
        ${s ? r`<span class="row-error">${s}</span>` : n}
      </div>
    `;
  }
  _renderTrackStockCell(e) {
    return this._warehouseOptions.length === 0 ? r`<span class="no-warehouses">No warehouses assigned</span>` : r`
      <div class="track-stock-list">
        ${this._warehouseOptions.map((s) => {
      const t = e.warehouseStock.find(
        (i) => i.warehouseId === s.id
      );
      return r`
            <label class="track-stock-item">
              <uui-toggle
                label=${s.name}
                .checked=${t?.trackStock ?? !1}
                @change=${(i) => this._updateTrackStock(
        e.id,
        s.id,
        i.target.checked
      )}>
              </uui-toggle>
              <span>${s.name}</span>
            </label>
          `;
    })}
      </div>
    `;
  }
  _renderEditorCell(e, s) {
    switch (s) {
      case "sku":
        return r`
          <uui-input
            class="cell-input"
            .value=${e.sku ?? ""}
            @input=${(t) => this._updateVariantField(e.id, "sku", t.target.value)}>
          </uui-input>
        `;
      case "gtin":
        return r`
          <uui-input
            class="cell-input"
            .value=${e.gtin ?? ""}
            @input=${(t) => this._updateVariantField(e.id, "gtin", t.target.value)}>
          </uui-input>
        `;
      case "supplierSku":
        return r`
          <uui-input
            class="cell-input"
            .value=${e.supplierSku ?? ""}
            @input=${(t) => this._updateVariantField(e.id, "supplierSku", t.target.value)}>
          </uui-input>
        `;
      case "hsCode":
        return r`
          <uui-input
            class="cell-input"
            .value=${e.hsCode ?? ""}
            @input=${(t) => this._updateVariantField(e.id, "hsCode", t.target.value)}>
          </uui-input>
        `;
      case "price":
        return r`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.price)}
            @input=${(t) => this._updateVariantField(
          e.id,
          "price",
          this._parseNumber(t.target.value, e.price)
        )}>
          </uui-input>
        `;
      case "costOfGoods":
        return r`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.costOfGoods)}
            @input=${(t) => this._updateVariantField(
          e.id,
          "costOfGoods",
          this._parseNumber(t.target.value, e.costOfGoods)
        )}>
          </uui-input>
        `;
      case "onSale":
        return r`
          <uui-toggle
            label="On Sale"
            .checked=${e.onSale}
            @change=${(t) => this._updateVariantField(e.id, "onSale", t.target.checked)}>
          </uui-toggle>
        `;
      case "availableForPurchase":
        return r`
          <uui-toggle
            label="Visible On Website"
            .checked=${e.availableForPurchase}
            @change=${(t) => this._updateVariantField(
          e.id,
          "availableForPurchase",
          t.target.checked
        )}>
          </uui-toggle>
        `;
      case "canPurchase":
        return r`
          <uui-toggle
            label="Allow Purchase"
            .checked=${e.canPurchase}
            @change=${(t) => this._updateVariantField(
          e.id,
          "canPurchase",
          t.target.checked
        )}>
          </uui-toggle>
        `;
      case "trackStock":
        return this._renderTrackStockCell(e);
      default:
        return n;
    }
  }
  _getFieldLabel(e) {
    return h.find((s) => s.key === e)?.label ?? e;
  }
  _renderEditorStep() {
    return r`
      <div class="intro">
        <strong>Edit selected fields for ${this._variants.length} variants</strong>
        <p>Update values per row and save once to apply all changes.</p>
      </div>

      <div class="table-container">
        <uui-table class="editor-table">
          <uui-table-head>
            <uui-table-head-cell class="variant-column">Variant</uui-table-head-cell>
            ${this._selectedFields.map(
      (e) => r`<uui-table-head-cell>${this._getFieldLabel(e)}</uui-table-head-cell>`
    )}
          </uui-table-head>
          ${this._variants.map(
      (e) => r`
              <uui-table-row class=${this._rowErrors[e.id] ? "row-has-error" : ""}>
                <uui-table-cell>${this._renderVariantName(e)}</uui-table-cell>
                ${this._selectedFields.map(
        (s) => r`<uui-table-cell>${this._renderEditorCell(e, s)}</uui-table-cell>`
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
    return r`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._renderError()}
          ${this._step === "fields" ? this._renderFieldSelectionStep() : this._renderEditorStep()}
        </div>

        <div slot="actions">
          ${this._step === "edit" ? r`
                <uui-button
                  look="secondary"
                  label="Back"
                  @click=${this._goBackToFields}
                  ?disabled=${this._isSaving}>
                  Back
                </uui-button>
              ` : n}

          <uui-button
            look="secondary"
            label="Cancel"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}>
            Cancel
          </uui-button>

          ${this._step === "fields" ? r`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Continue"
                  @click=${this._continueToEditor}
                  ?disabled=${this._selectedFields.length === 0}>
                  Continue
                </uui-button>
              ` : r`
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
l.styles = p`
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
o([
  u()
], l.prototype, "_step", 2);
o([
  u()
], l.prototype, "_variants", 2);
o([
  u()
], l.prototype, "_selectedFields", 2);
o([
  u()
], l.prototype, "_warehouseOptions", 2);
o([
  u()
], l.prototype, "_isSaving", 2);
o([
  u()
], l.prototype, "_errorMessage", 2);
o([
  u()
], l.prototype, "_rowErrors", 2);
l = o([
  _("merchello-variant-batch-update-modal")
], l);
const w = l;
export {
  l as MerchelloVariantBatchUpdateModalElement,
  w as default
};
//# sourceMappingURL=variant-batch-update-modal.element-BVOfXnPw.js.map
