import { nothing as d, html as i, css as m, state as n, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { M as y } from "./merchello-api-BtThjGiA.js";
import { m as F } from "./modal-layout.styles-C2OaUji5.js";
function g(e) {
  return e !== "trackStock";
}
function $(e, t) {
  switch (e) {
    case "price":
      return p(t, "Price");
    case "previousPrice":
      return p(t, "Previous Price");
    case "costOfGoods":
      return p(t, "Cost of goods");
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
function w(e, t, r) {
  switch (t) {
    case "sku":
      return e.map((s) => ({ ...s, sku: String(r) }));
    case "gtin":
      return e.map((s) => ({ ...s, gtin: String(r) }));
    case "supplierSku":
      return e.map((s) => ({ ...s, supplierSku: String(r) }));
    case "hsCode":
      return e.map((s) => ({ ...s, hsCode: String(r) }));
    case "price":
      return e.map((s) => ({ ...s, price: Number(r) }));
    case "previousPrice":
      return e.map((s) => ({ ...s, previousPrice: Number(r) }));
    case "costOfGoods":
      return e.map((s) => ({ ...s, costOfGoods: Number(r) }));
    case "onSale":
      return e.map((s) => ({ ...s, onSale: !!r }));
    case "availableForPurchase":
      return e.map((s) => ({ ...s, availableForPurchase: !!r }));
    case "canPurchase":
      return e.map((s) => ({ ...s, canPurchase: !!r }));
    default:
      return e;
  }
}
function p(e, t) {
  const r = typeof e == "string" ? e.trim() : String(e), s = Number.parseFloat(r);
  return Number.isFinite(s) ? s < 0 ? { error: `${t} must be 0 or greater.` } : { value: s } : { error: `${t} must be a valid number.` };
}
function h(e, t) {
  if (typeof e == "boolean")
    return { value: e };
  const r = e.trim().toLowerCase();
  return r === "true" ? { value: !0 } : r === "false" ? { value: !1 } : { error: `Select true or false for ${t}.` };
}
var P = Object.defineProperty, x = Object.getOwnPropertyDescriptor, u = (e, t, r, s) => {
  for (var a = s > 1 ? void 0 : s ? x(t, r) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (a = (s ? c(t, r, a) : c(a)) || a);
  return s && a && P(t, r, a), a;
};
const _ = [
  { key: "sku", label: "SKU", description: "Stock keeping unit." },
  { key: "gtin", label: "GTIN/Barcode", description: "Global Trade Item Number." },
  { key: "supplierSku", label: "Supplier SKU", description: "Supplier reference code." },
  { key: "hsCode", label: "HS Code", description: "Harmonized customs code." },
  { key: "price", label: "Price", description: "Customer-facing price." },
  { key: "previousPrice", label: "Previous Price", description: "Original price shown when on sale." },
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
    for (const r of e)
      for (const s of r.warehouseStock ?? [])
        t.has(s.warehouseId) || t.set(
          s.warehouseId,
          s.warehouseName ?? "Unnamed warehouse"
        );
    this._warehouseOptions = Array.from(t.entries()).map(([r, s]) => ({ id: r, name: s })), this._variants = e.map((r) => ({
      ...r,
      warehouseStock: this._warehouseOptions.map((s) => {
        const a = r.warehouseStock.find(
          (l) => l.warehouseId === s.id
        );
        return a ? {
          ...a,
          warehouseName: a.warehouseName ?? s.name
        } : {
          warehouseId: s.id,
          warehouseName: s.name,
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
    this._selectedFields = this._selectedFields.filter((r) => r !== e);
  }
  _selectAllFields() {
    this._selectedFields = _.map((e) => e.key);
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
  _updateVariantField(e, t, r) {
    if (this._variants = this._variants.map(
      (s) => s.id === e ? { ...s, [t]: r } : s
    ), this._rowErrors[e]) {
      const s = { ...this._rowErrors };
      delete s[e], this._rowErrors = s;
    }
  }
  _updateTrackStock(e, t, r) {
    if (this._variants = this._variants.map((s) => s.id !== e ? s : {
      ...s,
      warehouseStock: s.warehouseStock.map(
        (a) => a.warehouseId === t ? { ...a, trackStock: r } : a
      )
    }), this._rowErrors[e]) {
      const s = { ...this._rowErrors };
      delete s[e], this._rowErrors = s;
    }
  }
  _parseNumber(e, t) {
    const r = Number.parseFloat(e);
    return Number.isFinite(r) ? r : t;
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
      case "previousPrice":
        return String(t.previousPrice ?? "");
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
    if (!g(e))
      return;
    const t = $(e, this._getBulkFieldValue(e));
    if (t.error || t.value === void 0) {
      this._errorMessage = t.error ?? `Unable to apply ${this._getFieldLabel(e)} to all variants.`;
      return;
    }
    this._variants = w(this._variants, e, t.value), this._rowErrors = {}, this._errorMessage = null;
  }
  _validateBeforeSave() {
    const e = {};
    for (const t of this._variants) {
      const r = [];
      this._selectedFields.includes("sku") && !t.sku?.trim() && r.push("SKU is required."), this._selectedFields.includes("price") && t.price < 0 && r.push("Price must be 0 or greater."), this._selectedFields.includes("costOfGoods") && t.costOfGoods < 0 && r.push("Cost of goods must be 0 or greater."), this._selectedFields.includes("previousPrice") && t.previousPrice != null && t.previousPrice < 0 && r.push("Previous price must be 0 or greater."), r.length > 0 && (e[t.id] = r.join(" "));
    }
    return this._rowErrors = e, Object.keys(e).length > 0 ? (this._errorMessage = "Please fix the highlighted rows before saving.", !1) : !0;
  }
  _buildUpdateRequest(e) {
    const t = {};
    return this._selectedFields.includes("sku") && (t.sku = e.sku ?? ""), this._selectedFields.includes("gtin") && (t.gtin = e.gtin ?? ""), this._selectedFields.includes("supplierSku") && (t.supplierSku = e.supplierSku ?? ""), this._selectedFields.includes("hsCode") && (t.hsCode = e.hsCode ?? ""), this._selectedFields.includes("price") && (t.price = e.price), this._selectedFields.includes("previousPrice") && (t.previousPrice = e.previousPrice ?? 0), this._selectedFields.includes("onSale") && (t.onSale = e.onSale), this._selectedFields.includes("costOfGoods") && (t.costOfGoods = e.costOfGoods), this._selectedFields.includes("availableForPurchase") && (t.availableForPurchase = e.availableForPurchase), this._selectedFields.includes("canPurchase") && (t.canPurchase = e.canPurchase), this._selectedFields.includes("trackStock") && (t.warehouseStock = e.warehouseStock.map((r) => ({
      warehouseId: r.warehouseId,
      stock: r.stock,
      reorderPoint: r.reorderPoint,
      trackStock: r.trackStock
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
  async _updateVariantWithRetry(e, t, r) {
    let s;
    for (let a = 1; a <= b; a++) {
      const { error: l } = await y.updateVariant(e, t, r);
      if (!l)
        return {};
      if (s = l, !this._isRetryableUpdateError(l) || a === b)
        return { error: l };
      await this._delay(E * a);
    }
    return { error: s };
  }
  async _saveVariantsWithLimitedConcurrency(e) {
    const t = new Array(this._variants.length);
    let r = 0;
    const s = async () => {
      for (; r < this._variants.length; ) {
        const l = r;
        r += 1;
        const c = this._variants[l], k = this._buildUpdateRequest(c), f = await this._updateVariantWithRetry(e, c.id, k);
        t[l] = { variant: c, error: f.error };
      }
    }, a = Math.min(C, this._variants.length);
    return await Promise.all(Array.from({ length: a }, () => s())), t;
  }
  async _handleSave() {
    if (!(!this.data?.productRootId || this._selectedFields.length === 0 || this._variants.length === 0) && this._validateBeforeSave()) {
      this._isSaving = !0, this._errorMessage = null, this._rowErrors = {};
      try {
        const t = (await this._saveVariantsWithLimitedConcurrency(this.data.productRootId)).filter((r) => r.error);
        if (t.length > 0) {
          const r = {};
          for (const a of t)
            r[a.variant.id] = a.error?.message ?? "Failed to update variant.";
          this._rowErrors = r;
          const s = this._variants.length - t.length;
          this._errorMessage = s > 0 ? `${s} variant${s === 1 ? "" : "s"} updated. ${t.length} failed.` : `Failed to update ${t.length} variant${t.length === 1 ? "" : "s"}.`;
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
        ${_.map((e) => {
      const t = this._selectedFields.includes(e.key);
      return i`
            <div class="field-card ${t ? "selected" : ""}">
              <uui-checkbox
                label=${e.label}
                ?checked=${t}
                @change=${(r) => this._toggleField(e.key, r.target.checked)}>
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
      const r = e.warehouseStock.find(
        (s) => s.warehouseId === t.id
      );
      return i`
            <label class="track-stock-item">
              <uui-toggle
                label=${t.name}
                .checked=${r?.trackStock ?? !1}
                @change=${(s) => this._updateTrackStock(
        e.id,
        t.id,
        s.target.checked
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
            @input=${(r) => this._updateVariantField(e.id, "sku", r.target.value)}>
          </uui-input>
        `;
      case "gtin":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.gtin ?? ""}
            @input=${(r) => this._updateVariantField(e.id, "gtin", r.target.value)}>
          </uui-input>
        `;
      case "supplierSku":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.supplierSku ?? ""}
            @input=${(r) => this._updateVariantField(e.id, "supplierSku", r.target.value)}>
          </uui-input>
        `;
      case "hsCode":
        return i`
          <uui-input
            class="cell-input"
            .value=${e.hsCode ?? ""}
            @input=${(r) => this._updateVariantField(e.id, "hsCode", r.target.value)}>
          </uui-input>
        `;
      case "price":
        return i`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.price)}
            @input=${(r) => this._updateVariantField(
          e.id,
          "price",
          this._parseNumber(r.target.value, e.price)
        )}>
          </uui-input>
        `;
      case "previousPrice":
        return i`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${e.previousPrice != null ? String(e.previousPrice) : ""}
            @input=${(r) => {
          const s = r.target.value;
          this._updateVariantField(
            e.id,
            "previousPrice",
            s === "" ? null : this._parseNumber(s, e.previousPrice ?? 0)
          );
        }}>
          </uui-input>
        `;
      case "costOfGoods":
        return i`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(e.costOfGoods)}
            @input=${(r) => this._updateVariantField(
          e.id,
          "costOfGoods",
          this._parseNumber(r.target.value, e.costOfGoods)
        )}>
          </uui-input>
        `;
      case "onSale":
        return i`
          <uui-toggle
            label="On Sale"
            .checked=${e.onSale}
            @change=${(r) => this._updateVariantField(e.id, "onSale", r.target.checked)}>
          </uui-toggle>
        `;
      case "availableForPurchase":
        return i`
          <uui-toggle
            label="Visible On Website"
            .checked=${e.availableForPurchase}
            @change=${(r) => this._updateVariantField(
          e.id,
          "availableForPurchase",
          r.target.checked
        )}>
          </uui-toggle>
        `;
      case "canPurchase":
        return i`
          <uui-toggle
            label="Allow Purchase"
            .checked=${e.canPurchase}
            @change=${(r) => this._updateVariantField(
          e.id,
          "canPurchase",
          r.target.checked
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
    return _.find((t) => t.key === e)?.label ?? e;
  }
  _renderBulkHeaderControl(e) {
    return g(e) ? e === "onSale" || e === "availableForPurchase" || e === "canPurchase" ? i`
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
      ` : e === "price" || e === "previousPrice" || e === "costOfGoods" ? i`
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
o.styles = [
  F,
  m`
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
  `
];
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
const A = o;
export {
  o as MerchelloVariantBatchUpdateModalElement,
  A as default
};
//# sourceMappingURL=variant-batch-update-modal.element-dtoegfK_.js.map
