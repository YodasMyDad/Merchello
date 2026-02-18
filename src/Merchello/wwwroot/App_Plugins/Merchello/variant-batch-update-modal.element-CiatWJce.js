import { nothing as d, html as i, css as m, state as n, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { M as F } from "./merchello-api-B1P1cUX9.js";
function _(e) {
  return e !== "trackStock";
}
function y(e, t) {
  switch (e) {
    case "price":
      return g(t, "Price");
    case "costOfGoods":
      return g(t, "Cost of goods");
    case "onSale":
      return h(t, "On Sale");
    case "availableForPurchase":
      return h(t, "Visible On Website");
    case "canPurchase":
      return h(t, "Allow Purchase");
    case "sku":
    case "gtin":
    case "supplierSku":
    case "hsCode":
      return { value: typeof t == "string" ? t : String(t) };
    default:
      return {
        error: `Bulk apply is not supported for ${e}.`
      };
  }
}
function $(e, t, s) {
  switch (t) {
    case "sku":
      return e.map((r) => ({ ...r, sku: String(s) }));
    case "gtin":
      return e.map((r) => ({ ...r, gtin: String(s) }));
    case "supplierSku":
      return e.map((r) => ({ ...r, supplierSku: String(s) }));
    case "hsCode":
      return e.map((r) => ({ ...r, hsCode: String(s) }));
    case "price":
      return e.map((r) => ({ ...r, price: Number(s) }));
    case "costOfGoods":
      return e.map((r) => ({ ...r, costOfGoods: Number(s) }));
    case "onSale":
      return e.map((r) => ({ ...r, onSale: !!s }));
    case "availableForPurchase":
      return e.map((r) => ({ ...r, availableForPurchase: !!s }));
    case "canPurchase":
      return e.map((r) => ({ ...r, canPurchase: !!s }));
    default:
      return e;
  }
}
function g(e, t) {
  const s = typeof e == "string" ? e.trim() : String(e), r = Number.parseFloat(s);
  return Number.isFinite(r) ? r < 0 ? { error: `${t} must be 0 or greater.` } : { value: r } : { error: `${t} must be a valid number.` };
}
function h(e, t) {
  if (typeof e == "boolean")
    return { value: e };
  const s = e.trim().toLowerCase();
  return s === "true" ? { value: !0 } : s === "false" ? { value: !1 } : { error: `Select true or false for ${t}.` };
}
var w = Object.defineProperty, x = Object.getOwnPropertyDescriptor, u = (e, t, s, r) => {
  for (var a = r > 1 ? void 0 : r ? x(t, s) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (a = (r ? c(t, s, a) : c(a)) || a);
  return r && a && w(t, s, a), a;
};
const p = [
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
], b = 3, E = 120, C = 3;
let o = class extends S {
  constructor() {
    super(...arguments), this._step = "fields", this._variants = [], this._selectedFields = [], this._warehouseOptions = [], this._bulkFieldValues = {}, this._isSaving = !1, this._errorMessage = null, this._rowErrors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this._initializeData();
  }
  _initializeData() {
    const e = this.data?.variants ?? [], t = /* @__PURE__ */ new Map();
    for (const s of e)
      for (const r of s.warehouseStock ?? [])
        t.has(r.warehouseId) || t.set(
          r.warehouseId,
          r.warehouseName ?? "Unnamed warehouse"
        );
    this._warehouseOptions = Array.from(t.entries()).map(([s, r]) => ({ id: s, name: r })), this._variants = e.map((s) => ({
      ...s,
      warehouseStock: this._warehouseOptions.map((r) => {
        const a = s.warehouseStock.find(
          (l) => l.warehouseId === r.id
        );
        return a ? {
          ...a,
          warehouseName: a.warehouseName ?? r.name
        } : {
          warehouseId: r.id,
          warehouseName: r.name,
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
    this._selectedFields = p.map((e) => e.key);
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
      (r) => r.id === e ? { ...r, [t]: s } : r
    ), this._rowErrors[e]) {
      const r = { ...this._rowErrors };
      delete r[e], this._rowErrors = r;
    }
  }
  _updateTrackStock(e, t, s) {
    if (this._variants = this._variants.map((r) => r.id !== e ? r : {
      ...r,
      warehouseStock: r.warehouseStock.map(
        (a) => a.warehouseId === t ? { ...a, trackStock: s } : a
      )
    }), this._rowErrors[e]) {
      const r = { ...this._rowErrors };
      delete r[e], this._rowErrors = r;
    }
  }
  _parseNumber(e, t) {
    const s = Number.parseFloat(e);
    return Number.isFinite(s) ? s : t;
  }
  _getDefaultBulkFieldValue(e) {
    const t = this._variants[0];
    if (!t)
      return "";
    switch (e) {
      case "sku":
        return t.sku ?? "";
      case "gtin":
        return t.gtin ?? "";
      case "supplierSku":
        return t.supplierSku ?? "";
      case "hsCode":
        return t.hsCode ?? "";
      case "price":
        return String(t.price);
      case "costOfGoods":
        return String(t.costOfGoods);
      case "onSale":
        return String(t.onSale);
      case "availableForPurchase":
        return String(t.availableForPurchase);
      case "canPurchase":
        return String(t.canPurchase);
      case "trackStock":
        return "";
      default:
        return "";
    }
  }
  _getBulkFieldValue(e) {
    return this._bulkFieldValues[e] ?? this._getDefaultBulkFieldValue(e);
  }
  _updateBulkFieldValue(e, t) {
    this._bulkFieldValues = {
      ...this._bulkFieldValues,
      [e]: t
    }, this._errorMessage = null;
  }
  _getBooleanBulkOptions(e) {
    const t = this._getBulkFieldValue(e);
    return [
      { name: "True", value: "true", selected: t === "true" },
      { name: "False", value: "false", selected: t === "false" }
    ];
  }
  _applyBulkFieldValue(e) {
    if (!_(e))
      return;
    const t = y(e, this._getBulkFieldValue(e));
    if (t.error || t.value === void 0) {
      this._errorMessage = t.error ?? `Unable to apply ${this._getFieldLabel(e)} to all variants.`;
      return;
    }
    this._variants = $(this._variants, e, t.value), this._rowErrors = {}, this._errorMessage = null;
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
    let r;
    for (let a = 1; a <= b; a++) {
      const { error: l } = await F.updateVariant(e, t, s);
      if (!l)
        return {};
      if (r = l, !this._isRetryableUpdateError(l) || a === b)
        return { error: l };
      await this._delay(E * a);
    }
    return { error: r };
  }
  async _saveVariantsWithLimitedConcurrency(e) {
    const t = new Array(this._variants.length);
    let s = 0;
    const r = async () => {
      for (; s < this._variants.length; ) {
        const l = s;
        s += 1;
        const c = this._variants[l], k = this._buildUpdateRequest(c), f = await this._updateVariantWithRetry(e, c.id, k);
        t[l] = { variant: c, error: f.error };
      }
    }, a = Math.min(C, this._variants.length);
    return await Promise.all(Array.from({ length: a }, () => r())), t;
  }
  async _handleSave() {
    if (!(!this.data?.productRootId || this._selectedFields.length === 0 || this._variants.length === 0) && this._validateBeforeSave()) {
      this._isSaving = !0, this._errorMessage = null, this._rowErrors = {};
      try {
        const t = (await this._saveVariantsWithLimitedConcurrency(this.data.productRootId)).filter((s) => s.error);
        if (t.length > 0) {
          const s = {};
          for (const a of t)
            s[a.variant.id] = a.error?.message ?? "Failed to update variant.";
          this._rowErrors = s;
          const r = this._variants.length - t.length;
          this._errorMessage = r > 0 ? `${r} variant${r === 1 ? "" : "s"} updated. ${t.length} failed.` : `Failed to update ${t.length} variant${t.length === 1 ? "" : "s"}.`;
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
    return this._errorMessage ? i`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    ` : d;
  }
  _renderFieldSelectionStep() {
    return i`
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
        ${p.map((e) => {
      const t = this._selectedFields.includes(e.key);
      return i`
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
    return i`
      <div class="variant-name-cell">
        <strong>${e.name || "Unnamed variant"}</strong>
        <span class="variant-subtext">ID: ${e.id}</span>
        ${t ? i`<span class="row-error">${t}</span>` : d}
      </div>
    `;
  }
  _renderTrackStockCell(e) {
    return this._warehouseOptions.length === 0 ? i`<span class="no-warehouses">No warehouses assigned</span>` : i`
      <div class="track-stock-list">
        ${this._warehouseOptions.map((t) => {
      const s = e.warehouseStock.find(
        (r) => r.warehouseId === t.id
      );
      return i`
            <label class="track-stock-item">
              <uui-toggle
                label=${t.name}
                .checked=${s?.trackStock ?? !1}
                @change=${(r) => this._updateTrackStock(
        e.id,
        t.id,
        r.target.checked
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
        return i`
          <uui-input
            class="cell-input"
            .value=${e.sku ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "sku", s.target.value)}>
          </uui-input>
        `;
      case "gtin":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.gtin ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "gtin", s.target.value)}>
          </uui-input>
        `;
      case "supplierSku":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.supplierSku ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "supplierSku", s.target.value)}>
          </uui-input>
        `;
      case "hsCode":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.hsCode ?? ""}
            @input=${(s) => this._updateVariantField(e.id, "hsCode", s.target.value)}>
          </uui-input>
        `;
      case "price":
        return i`
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
        return i`
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
        return i`
          <uui-toggle
            label="On Sale"
            .checked=${e.onSale}
            @change=${(s) => this._updateVariantField(e.id, "onSale", s.target.checked)}>
          </uui-toggle>
        `;
      case "availableForPurchase":
        return i`
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
        return i`
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
    return p.find((t) => t.key === e)?.label ?? e;
  }
  _renderBulkHeaderControl(e) {
    return _(e) ? e === "onSale" || e === "availableForPurchase" || e === "canPurchase" ? i`
        <div class="bulk-control">
          <uui-select
            class="bulk-select"
            label="Set all values"
            .options=${this._getBooleanBulkOptions(e)}
            @change=${(t) => this._updateBulkFieldValue(e, t.target.value)}
            ?disabled=${this._isSaving}>
          </uui-select>
          <uui-button
            look="secondary"
            compact
            label="Apply to all"
            @click=${() => this._applyBulkFieldValue(e)}
            ?disabled=${this._isSaving}>
            Apply to all
          </uui-button>
        </div>
      ` : e === "price" || e === "costOfGoods" ? i`
        <div class="bulk-control">
          <uui-input
            class="bulk-input"
            type="number"
            step="0.01"
            label="Set all values"
            .value=${this._getBulkFieldValue(e)}
            @input=${(t) => this._updateBulkFieldValue(e, t.target.value)}
            ?disabled=${this._isSaving}>
          </uui-input>
          <uui-button
            look="secondary"
            compact
            label="Apply to all"
            @click=${() => this._applyBulkFieldValue(e)}
            ?disabled=${this._isSaving}>
            Apply to all
          </uui-button>
        </div>
      ` : i`
      <div class="bulk-control">
        <uui-input
          class="bulk-input"
          label="Set all values"
          .value=${this._getBulkFieldValue(e)}
          @input=${(t) => this._updateBulkFieldValue(e, t.target.value)}
          ?disabled=${this._isSaving}>
        </uui-input>
        <uui-button
          look="secondary"
          compact
          label="Apply to all"
          @click=${() => this._applyBulkFieldValue(e)}
          ?disabled=${this._isSaving}>
          Apply to all
        </uui-button>
      </div>
    ` : i`<span class="bulk-hint">Per-row only</span>`;
  }
  _renderEditorHeaderCell(e) {
    return i`
      <uui-table-head-cell>
        <div class="bulk-header-cell">
          <span class="bulk-header-label">${this._getFieldLabel(e)}</span>
          ${this._renderBulkHeaderControl(e)}
        </div>
      </uui-table-head-cell>
    `;
  }
  _renderEditorStep() {
    return i`
      <div class="intro">
        <strong>Edit selected fields for ${this._variants.length} variants</strong>
        <p>Use each column header to apply values to all rows, then fine-tune individual variants if needed.</p>
      </div>

      <div class="table-container">
        <uui-table class="editor-table">
          <uui-table-head>
            <uui-table-head-cell class="variant-column">Variant</uui-table-head-cell>
            ${this._selectedFields.map((e) => this._renderEditorHeaderCell(e))}
          </uui-table-head>
          ${this._variants.map(
      (e) => i`
              <uui-table-row class=${this._rowErrors[e.id] ? "row-has-error" : ""}>
                <uui-table-cell>${this._renderVariantName(e)}</uui-table-cell>
                ${this._selectedFields.map(
        (t) => i`<uui-table-cell>${this._renderEditorCell(e, t)}</uui-table-cell>`
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
    return i`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._renderError()}
          ${this._step === "fields" ? this._renderFieldSelectionStep() : this._renderEditorStep()}
        </div>

        <div slot="actions">
          ${this._step === "edit" ? i`
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

          ${this._step === "fields" ? i`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Continue"
                  @click=${this._continueToEditor}
                  ?disabled=${this._selectedFields.length === 0}>
                  Continue
                </uui-button>
              ` : i`
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
o.styles = m`
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
      color: var(--uui-color-selected-contrast, #fff);
    }

    .field-card.selected uui-checkbox,
    .field-card.selected p {
      color: var(--uui-color-selected-contrast, #fff);
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

    .bulk-header-cell {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 190px;
    }

    .bulk-header-label {
      font-weight: 600;
    }

    .bulk-control {
      display: flex;
      align-items: flex-end;
      gap: var(--uui-size-space-2);
    }

    .bulk-input,
    .bulk-select {
      min-width: 120px;
      flex: 1;
    }

    .bulk-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
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

    @media (max-width: 960px) {
      .bulk-control {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `;
u([
  n()
], o.prototype, "_step", 2);
u([
  n()
], o.prototype, "_variants", 2);
u([
  n()
], o.prototype, "_selectedFields", 2);
u([
  n()
], o.prototype, "_warehouseOptions", 2);
u([
  n()
], o.prototype, "_bulkFieldValues", 2);
u([
  n()
], o.prototype, "_isSaving", 2);
u([
  n()
], o.prototype, "_errorMessage", 2);
u([
  n()
], o.prototype, "_rowErrors", 2);
o = u([
  v("merchello-variant-batch-update-modal")
], o);
const O = o;
export {
  o as MerchelloVariantBatchUpdateModalElement,
  O as default
};
//# sourceMappingURL=variant-batch-update-modal.element-CiatWJce.js.map
