import { html as s, nothing as c, css as v, state as o, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-B76CV0sD.js";
import { b as f } from "./formatting-MfE1tvkN.js";
import { m as b } from "./modal-layout.styles-C2OaUji5.js";
var g = Object.defineProperty, w = Object.getOwnPropertyDescriptor, l = (e, i, t, a) => {
  for (var r = a > 1 ? void 0 : a ? w(i, t) : i, d = e.length - 1, n; d >= 0; d--)
    (n = e[d]) && (r = (a ? n(i, t, r) : n(r)) || r);
  return a && r && g(i, t, r), r;
};
const P = 200, p = 2, y = 8;
let u = class extends m {
  constructor() {
    super(...arguments), this._activeTab = "issues", this._issueFilter = "all", this._isLoadingIssues = !1, this._isLoadingPreview = !1, this._validation = null, this._errorMessage = null, this._productQuery = "", this._isSearchingProducts = !1, this._productResults = [], this._showProductResults = !1, this._selectedPreviewProduct = null, this._selectedPreview = null, this._isSelectedPreviewMissing = !1, this._productSearchDebounceTimer = null, this._productResultsHideTimer = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._refreshValidation();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._clearAutocompleteTimers();
  }
  _clearAutocompleteTimers() {
    this._productSearchDebounceTimer && (clearTimeout(this._productSearchDebounceTimer), this._productSearchDebounceTimer = null), this._productResultsHideTimer && (clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = null);
  }
  _setActiveTab(e) {
    this._activeTab = e;
  }
  _setIssueFilter(e) {
    this._issueFilter = e;
  }
  _formatAutocompleteLabel(e) {
    const i = e.rootName?.trim() ?? "", t = e.name?.trim() ?? "";
    return i && t && i.toLowerCase() !== t.toLowerCase() ? `${i} - ${t}` : i || t || "Unnamed product";
  }
  _formatFieldName(e) {
    return e ? e.replace(/_/g, " ").replace(/\s+/g, " ").trim() : "General";
  }
  _getIssueCountBySeverity(e) {
    return this._validation?.issues.filter((i) => i.severity.toLowerCase() === e).length ?? 0;
  }
  _getFilteredIssues() {
    const e = this._validation?.issues ?? [];
    return this._issueFilter === "all" ? e : e.filter((i) => i.severity.toLowerCase() === this._issueFilter);
  }
  _getSeverityTagColor(e) {
    const i = e.severity.toLowerCase();
    return i === "error" ? "danger" : i === "warning" ? "warning" : "default";
  }
  _resolvePreviewFields(e) {
    const i = e.fields ?? [];
    if (i.length > 0)
      return i.map((a) => ({
        field: this._formatFieldName(a.field),
        value: a.value
      }));
    const t = [];
    return e.title && t.push({ field: "title", value: e.title }), e.price && t.push({ field: "price", value: e.price }), e.availability && t.push({ field: "availability", value: e.availability }), e.link && t.push({ field: "link", value: e.link }), e.imageLink && t.push({ field: "image link", value: e.imageLink }), e.brand && t.push({ field: "brand", value: e.brand }), e.gtin && t.push({ field: "gtin", value: e.gtin }), e.mpn && t.push({ field: "mpn", value: e.mpn }), e.identifierExists && t.push({ field: "identifier exists", value: e.identifierExists }), e.shippingLabel && t.push({ field: "shipping label", value: e.shippingLabel }), t;
  }
  _setSelectedPreviewProduct(e) {
    this._selectedPreviewProduct = e, this._selectedPreview = null, this._isSelectedPreviewMissing = !1;
  }
  _syncSelectedPreview(e) {
    if (!this._selectedPreviewProduct) {
      this._selectedPreview = null, this._isSelectedPreviewMissing = !1;
      return;
    }
    const i = e.productPreviews.find((t) => t.productId === this._selectedPreviewProduct?.id) ?? null;
    this._selectedPreview = i, this._isSelectedPreviewMissing = i === null;
  }
  _handleProductQueryInput(e) {
    const i = e.target.value;
    this._productQuery = i, this._scheduleProductSearch(i);
  }
  _handleProductQueryFocus() {
    if (this._productResultsHideTimer && (clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = null), this._productResults.length > 0) {
      this._showProductResults = !0;
      return;
    }
    const e = this._productQuery.trim();
    e.length >= p && this._scheduleProductSearch(e);
  }
  _handleProductQueryBlur() {
    this._productResultsHideTimer && clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = setTimeout(() => {
      this._showProductResults = !1, this._productResultsHideTimer = null;
    }, 150);
  }
  _scheduleProductSearch(e) {
    this._productSearchDebounceTimer && clearTimeout(this._productSearchDebounceTimer);
    const i = e.trim();
    if (i.length < p) {
      this._productResults = [], this._showProductResults = !1, this._isSearchingProducts = !1;
      return;
    }
    this._productSearchDebounceTimer = setTimeout(async () => {
      const t = i;
      this._isSearchingProducts = !0;
      const { data: a, error: r } = await h.searchOrderProducts(t, y);
      if (this._productQuery.trim() !== t) {
        this._isSearchingProducts = !1;
        return;
      }
      if (this._isSearchingProducts = !1, r) {
        this._productResults = [], this._showProductResults = !0;
        return;
      }
      this._productResults = a ?? [], this._showProductResults = !0;
    }, 250);
  }
  async _refreshValidation() {
    const e = this._selectedPreviewProduct?.id ?? null, i = e ? [e] : [], t = await this._runValidation(i, "issues");
    t && (this._selectedPreviewProduct?.id ?? null) === e && (this._validation = t, this._syncSelectedPreview(t));
  }
  async _selectPreviewProduct(e) {
    const i = {
      id: e.id,
      label: this._formatAutocompleteLabel(e),
      sku: e.sku
    };
    this._setSelectedPreviewProduct(i), this._productQuery = i.label, this._productResults = [], this._showProductResults = !1;
    const t = i.id, a = await this._runValidation([t], "preview");
    a && this._selectedPreviewProduct?.id === t && (this._validation = a, this._syncSelectedPreview(a));
  }
  _clearPreviewSelection() {
    this._selectedPreviewProduct = null, this._selectedPreview = null, this._isSelectedPreviewMissing = !1, this._productQuery = "", this._productResults = [], this._showProductResults = !1, this._refreshValidation();
  }
  async _refreshSelectedPreview() {
    if (!this._selectedPreviewProduct)
      return;
    const e = this._selectedPreviewProduct.id, i = await this._runValidation([e], "preview");
    i && this._selectedPreviewProduct?.id === e && (this._validation = i, this._syncSelectedPreview(i));
  }
  async _runValidation(e, i) {
    const t = this.data?.feedId;
    if (!t)
      return this._errorMessage = "Feed id is missing.", null;
    i === "issues" ? this._isLoadingIssues = !0 : this._isLoadingPreview = !0, this._errorMessage = null;
    const a = {
      maxIssues: P,
      previewProductIds: e.slice(0, 1)
    }, { data: r, error: d } = await h.validateProductFeed(t, a);
    return i === "issues" ? this._isLoadingIssues = !1 : this._isLoadingPreview = !1, d || !r ? (this._errorMessage = d?.message ?? "Unable to validate feed.", null) : r;
  }
  _close() {
    this.value = { refreshed: this._validation != null }, this.modalContext?.submit();
  }
  _renderSummary() {
    return this._validation ? s`
      <div class="summary-grid">
        <div><strong>Products:</strong> ${this._validation.productItemCount}</div>
        <div><strong>Promotions:</strong> ${this._validation.promotionCount}</div>
        <div><strong>Warnings:</strong> ${this._validation.warningCount}</div>
        <div><strong>Errors:</strong> ${this._validation.errorCount}</div>
      </div>
    ` : s`<p class="hint">Validation results will appear here.</p>`;
  }
  _renderAutocompleteResults() {
    return this._showProductResults ? this._productQuery.trim().length < p ? c : s`
      <div class="autocomplete-dropdown" role="listbox">
        ${this._isSearchingProducts ? s`
              <div class="autocomplete-status">
                <uui-loader-circle></uui-loader-circle>
                <span>Searching products...</span>
              </div>
            ` : this._productResults.length === 0 ? s`<div class="autocomplete-status">No matching products found</div>` : this._productResults.map((i) => s`
                <button
                  type="button"
                  class="autocomplete-option"
                  @mousedown=${(t) => {
      t.preventDefault(), this._selectPreviewProduct(i);
    }}>
                  <span class="autocomplete-option-name">${this._formatAutocompleteLabel(i)}</span>
                  <span class="autocomplete-option-meta">
                    SKU: ${i.sku || "Not set"} | ${f(i.price, 2)}
                  </span>
                </button>
              `)}
      </div>
    ` : c;
  }
  _renderIssuesTab() {
    const e = this._validation;
    if (this._isLoadingIssues && !e)
      return s`
        <uui-box headline="Issues">
          <div class="loading"><uui-loader></uui-loader></div>
        </uui-box>
      `;
    if (!e)
      return s`
        <uui-box headline="Issues">
          <p class="hint">Run validation to inspect feed issues.</p>
          <div class="tab-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Refresh validation"
              ?disabled=${this._isLoadingIssues}
              @click=${this._refreshValidation}>
              Refresh Validation
            </uui-button>
          </div>
        </uui-box>
      `;
    const i = this._getFilteredIssues(), t = this._getIssueCountBySeverity("error"), a = this._getIssueCountBySeverity("warning");
    return s`
      <uui-box headline="Issues">
        ${this._renderSummary()}

        <div class="tab-actions">
          <uui-button
            look="primary"
            color="positive"
            label="Refresh validation"
            ?disabled=${this._isLoadingIssues}
            @click=${this._refreshValidation}>
            ${this._isLoadingIssues ? "Refreshing..." : "Refresh Validation"}
          </uui-button>
        </div>

        <div class="issue-filters">
          <uui-button
            look=${this._issueFilter === "all" ? "primary" : "secondary"}
            compact
            label="Show all issues"
            @click=${() => this._setIssueFilter("all")}>
            All (${e.issues.length})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "error" ? "primary" : "secondary"}
            compact
            label="Show errors"
            @click=${() => this._setIssueFilter("error")}>
            Errors (${t})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "warning" ? "primary" : "secondary"}
            compact
            label="Show warnings"
            @click=${() => this._setIssueFilter("warning")}>
            Warnings (${a})
          </uui-button>
        </div>

        ${i.length === 0 ? s`<p class="hint">No issues found for the selected filter.</p>` : s`
              <div class="issues-table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Product</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Details</uui-table-head-cell>
                  </uui-table-head>
                  ${i.map((r) => s`
                    <uui-table-row>
                      <uui-table-cell>
                        <uui-tag color=${this._getSeverityTagColor(r)}>${r.severity}</uui-tag>
                      </uui-table-cell>
                      <uui-table-cell>
                        ${r.productName ? s`<span>${r.productName}</span>` : s`<span class="hint">${r.productId ? "Unnamed product" : "Feed-level issue"}</span>`}
                      </uui-table-cell>
                      <uui-table-cell>${this._formatFieldName(r.field)}</uui-table-cell>
                      <uui-table-cell>
                        <div class="issue-message">${r.message}</div>
                        <div class="issue-code"><code>${r.code}</code></div>
                      </uui-table-cell>
                    </uui-table-row>
                  `)}
                </uui-table>
              </div>
            `}
      </uui-box>
    `;
  }
  _renderPreviewDetails() {
    if (!this._selectedPreviewProduct)
      return s`<p class="hint">Select a product to load and inspect its feed output.</p>`;
    if (this._isLoadingPreview)
      return s`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._isSelectedPreviewMissing)
      return s`
        <div class="warning-inline">
          <uui-icon name="icon-alert"></uui-icon>
          <span>No feed row was generated for <strong>${this._selectedPreviewProduct.label}</strong>.</span>
        </div>
      `;
    if (!this._selectedPreview)
      return s`<p class="hint">Search and select a product to view feed data.</p>`;
    const e = this._resolvePreviewFields(this._selectedPreview);
    return s`
      <div class="preview-summary">
        <div>
          <strong>Product:</strong>
          <span>${this._selectedPreview.productName || this._selectedPreviewProduct.label}</span>
        </div>
        ${this._selectedPreviewProduct.sku ? s`
              <div>
                <strong>SKU:</strong>
                <span>${this._selectedPreviewProduct.sku}</span>
              </div>
            ` : c}
      </div>

      ${e.length === 0 ? s`<p class="hint">No feed fields were returned for this product.</p>` : s`
            <div class="preview-fields-wrap">
              <uui-table>
                <uui-table-head>
                  <uui-table-head-cell>Field</uui-table-head-cell>
                  <uui-table-head-cell>Value</uui-table-head-cell>
                </uui-table-head>
                ${e.map((i) => s`
                  <uui-table-row>
                    <uui-table-cell>
                      <code>${i.field}</code>
                    </uui-table-cell>
                    <uui-table-cell>
                      <span class="field-value">${i.value || "(empty)"}</span>
                    </uui-table-cell>
                  </uui-table-row>
                `)}
              </uui-table>
            </div>
          `}
    `;
  }
  _renderPreviewTab() {
    return s`
      <uui-box headline="Preview">
        <umb-property-layout
          label="Product"
          description="Search by product name, then select one to inspect all feed fields.">
          <div slot="editor" class="preview-picker">
            <div class="autocomplete-field">
              <uui-input
                id="preview-product-search"
                label="Search products"
                .value=${this._productQuery}
                @input=${this._handleProductQueryInput}
                @focus=${this._handleProductQueryFocus}
                @blur=${this._handleProductQueryBlur}
                placeholder="Search by product name"
                autocomplete="off">
              </uui-input>
              ${this._renderAutocompleteResults()}
            </div>
          </div>
        </umb-property-layout>

        ${this._selectedPreviewProduct ? s`
              <div class="selected-preview-item">
                <div class="selected-preview-meta">
                  <span class="selected-preview-label">${this._selectedPreviewProduct.label}</span>
                  ${this._selectedPreviewProduct.sku ? s`<span class="selected-preview-sku">SKU: ${this._selectedPreviewProduct.sku}</span>` : c}
                </div>
                <div class="selected-preview-actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Refresh selected preview"
                    ?disabled=${this._isLoadingPreview}
                    @click=${this._refreshSelectedPreview}>
                    ${this._isLoadingPreview ? "Refreshing..." : "Refresh"}
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear selected product"
                    @click=${this._clearPreviewSelection}>
                    Clear
                  </uui-button>
                </div>
              </div>
            ` : c}

        ${this._renderPreviewDetails()}
      </uui-box>
    `;
  }
  _renderActiveTab() {
    return this._activeTab === "preview" ? this._renderPreviewTab() : this._renderIssuesTab();
  }
  render() {
    return s`
      <umb-body-layout headline="Feed Validation: ${this.data?.feedName ?? "Product Feed"}">
        <div id="main">
          <uui-tab-group class="tabs">
            <uui-tab label="Issues" ?active=${this._activeTab === "issues"} @click=${() => this._setActiveTab("issues")}>
              Issues
            </uui-tab>
            <uui-tab label="Preview" ?active=${this._activeTab === "preview"} @click=${() => this._setActiveTab("preview")}>
              Preview
            </uui-tab>
          </uui-tab-group>

          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : c}

          ${this._renderActiveTab()}
        </div>

        <uui-button slot="actions" look="secondary" label="Close" @click=${this._close}>Close</uui-button>
      </umb-body-layout>
    `;
  }
};
u.styles = [
  b,
  v`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .tabs {
      margin-bottom: var(--uui-size-space-2);
    }

    .tab-actions {
      margin: var(--uui-size-space-3) 0;
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .issue-filters {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-3);
    }

    .issues-table-wrap,
    .preview-fields-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    .issue-message {
      color: var(--uui-color-text);
      word-break: break-word;
    }

    .issue-code {
      margin-top: 4px;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .issue-code code {
      font-family: var(--uui-font-monospace);
    }

    .preview-picker {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .autocomplete-field {
      position: relative;
    }

    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 10;
      max-height: 260px;
      overflow-y: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-1);
    }

    .autocomplete-option {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      cursor: pointer;
    }

    .autocomplete-option:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .autocomplete-option-name {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .autocomplete-option-meta {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .autocomplete-status {
      padding: var(--uui-size-space-3);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
    }

    .selected-preview-item {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-surface) 97%, var(--uui-color-border) 3%);
      margin-bottom: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .selected-preview-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .selected-preview-label {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .selected-preview-sku {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .selected-preview-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .preview-summary {
      display: flex;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-3);
    }

    .preview-summary div {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: baseline;
    }

    .field-value {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .warning-inline {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      padding: var(--uui-size-space-3);
      border: 1px solid color-mix(in srgb, var(--uui-color-warning) 35%, var(--uui-color-surface));
      border-radius: var(--uui-border-radius);
      background: color-mix(in srgb, var(--uui-color-warning) 8%, var(--uui-color-surface));
      color: var(--uui-color-warning-emphasis);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    uui-input {
      width: 100%;
    }

    @media (max-width: 900px) {
      .selected-preview-item {
        align-items: flex-start;
      }
    }
  `
];
l([
  o()
], u.prototype, "_activeTab", 2);
l([
  o()
], u.prototype, "_issueFilter", 2);
l([
  o()
], u.prototype, "_isLoadingIssues", 2);
l([
  o()
], u.prototype, "_isLoadingPreview", 2);
l([
  o()
], u.prototype, "_validation", 2);
l([
  o()
], u.prototype, "_errorMessage", 2);
l([
  o()
], u.prototype, "_productQuery", 2);
l([
  o()
], u.prototype, "_isSearchingProducts", 2);
l([
  o()
], u.prototype, "_productResults", 2);
l([
  o()
], u.prototype, "_showProductResults", 2);
l([
  o()
], u.prototype, "_selectedPreviewProduct", 2);
l([
  o()
], u.prototype, "_selectedPreview", 2);
l([
  o()
], u.prototype, "_isSelectedPreviewMissing", 2);
u = l([
  _("merchello-product-feed-validation-modal")
], u);
const R = u;
export {
  u as MerchelloProductFeedValidationModalElement,
  R as default
};
//# sourceMappingURL=product-feed-validation-modal.element-QAEwax68.js.map
