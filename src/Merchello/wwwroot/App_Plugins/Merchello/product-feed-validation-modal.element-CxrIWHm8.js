import { nothing as d, html as i, css as h, state as l, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-B3w7Bp8a.js";
import { c as _ } from "./formatting-C7zDJOqJ.js";
var b = Object.defineProperty, g = Object.getOwnPropertyDescriptor, o = (e, t, r, s) => {
  for (var a = s > 1 ? void 0 : s ? g(t, r) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (a = (s ? c(t, r, a) : c(a)) || a);
  return s && a && b(t, r, a), a;
};
let u = class extends m {
  constructor() {
    super(...arguments), this._activeTab = "run", this._issueFilter = "all", this._isLoading = !1, this._validation = null, this._errorMessage = null, this._maxIssues = 200, this._productQuery = "", this._isSearchingProducts = !1, this._productResults = [], this._showProductResults = !1, this._selectedPreviewProducts = [], this._advancedPreviewIdsInput = "", this._productSearchDebounceTimer = null, this._productResultsHideTimer = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._runValidation();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._clearAutocompleteTimers();
  }
  _clearAutocompleteTimers() {
    this._productSearchDebounceTimer && (clearTimeout(this._productSearchDebounceTimer), this._productSearchDebounceTimer = null), this._productResultsHideTimer && (clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = null);
  }
  _parseGuidValues(e) {
    const t = e.split(/[\s,]+/g).map((a) => a.trim()).filter((a) => a.length > 0), r = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, s = /* @__PURE__ */ new Set();
    for (const a of t)
      if (r.test(a)) {
        if (s.size >= 20)
          break;
        s.add(a);
      }
    return Array.from(s);
  }
  _getRequestedPreviewIds() {
    const e = this._selectedPreviewProducts.map((s) => s.id), t = this._parseGuidValues(this._advancedPreviewIdsInput), r = /* @__PURE__ */ new Set([...e, ...t]);
    return Array.from(r).slice(0, 20);
  }
  _getIssueCountBySeverity(e) {
    return this._validation?.issues.filter((t) => t.severity.toLowerCase() === e).length ?? 0;
  }
  _getFilteredIssues() {
    const e = this._validation?.issues ?? [];
    return this._issueFilter === "all" ? e : e.filter((t) => t.severity.toLowerCase() === this._issueFilter);
  }
  _setActiveTab(e) {
    this._activeTab = e;
  }
  _setIssueFilter(e) {
    this._issueFilter = e;
  }
  _setMaxIssues(e) {
    const t = Number(e.target.value);
    if (!Number.isFinite(t)) {
      this._maxIssues = 200;
      return;
    }
    this._maxIssues = Math.min(1e3, Math.max(1, Math.round(t)));
  }
  _setAdvancedPreviewIds(e) {
    this._advancedPreviewIdsInput = e.target.value;
  }
  _handleProductQueryInput(e) {
    const t = e.target.value;
    this._productQuery = t, this._scheduleProductSearch(t);
  }
  _handleProductQueryFocus() {
    if (this._productResultsHideTimer && (clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = null), this._productResults.length > 0) {
      this._showProductResults = !0;
      return;
    }
    const e = this._productQuery.trim();
    e.length >= 2 && this._scheduleProductSearch(e);
  }
  _handleProductQueryBlur() {
    this._productResultsHideTimer && clearTimeout(this._productResultsHideTimer), this._productResultsHideTimer = setTimeout(() => {
      this._showProductResults = !1, this._productResultsHideTimer = null;
    }, 150);
  }
  _scheduleProductSearch(e) {
    this._productSearchDebounceTimer && clearTimeout(this._productSearchDebounceTimer);
    const t = e.trim();
    if (t.length < 2) {
      this._productResults = [], this._showProductResults = !1, this._isSearchingProducts = !1;
      return;
    }
    this._productSearchDebounceTimer = setTimeout(async () => {
      const r = t;
      this._isSearchingProducts = !0;
      const { data: s, error: a } = await p.searchOrderProducts(r, 8);
      if (this._productQuery.trim() !== r) {
        this._isSearchingProducts = !1;
        return;
      }
      if (this._isSearchingProducts = !1, a) {
        this._productResults = [], this._showProductResults = !0;
        return;
      }
      this._productResults = s ?? [], this._showProductResults = !0;
    }, 250);
  }
  _formatAutocompleteLabel(e) {
    const t = e.rootName?.trim() ?? "", r = e.name?.trim() ?? "";
    return t && r && t.toLowerCase() !== r.toLowerCase() ? `${t} - ${r}` : t || r || e.id;
  }
  _addPreviewProduct(e) {
    if (this._selectedPreviewProducts.some((t) => t.id === e.id)) {
      this._productQuery = "", this._productResults = [], this._showProductResults = !1;
      return;
    }
    this._selectedPreviewProducts.length >= 20 || (this._selectedPreviewProducts = [
      ...this._selectedPreviewProducts,
      {
        id: e.id,
        label: this._formatAutocompleteLabel(e),
        sku: e.sku
      }
    ], this._productQuery = "", this._productResults = [], this._showProductResults = !1);
  }
  _addPreviewId(e) {
    !e || this._selectedPreviewProducts.some((t) => t.id === e) || this._selectedPreviewProducts.length >= 20 || (this._selectedPreviewProducts = [
      ...this._selectedPreviewProducts,
      {
        id: e,
        label: e,
        sku: null
      }
    ]);
  }
  _removePreviewId(e) {
    this._selectedPreviewProducts = this._selectedPreviewProducts.filter((t) => t.id !== e);
  }
  _addSampleIds() {
    const e = this._validation?.sampleProductIds ?? [];
    for (const t of e) {
      if (this._selectedPreviewProducts.length >= 20)
        break;
      this._addPreviewId(t);
    }
  }
  async _runValidation() {
    const e = this.data?.feedId;
    if (!e) {
      this._errorMessage = "Feed id is missing.";
      return;
    }
    this._isLoading = !0, this._errorMessage = null;
    const t = {
      maxIssues: Math.min(1e3, Math.max(1, this._maxIssues || 200)),
      previewProductIds: this._getRequestedPreviewIds()
    }, { data: r, error: s } = await p.validateProductFeed(e, t);
    if (this._isLoading = !1, s || !r) {
      this._errorMessage = s?.message ?? "Unable to validate feed.";
      return;
    }
    this._validation = r;
  }
  _close() {
    this.value = { refreshed: this._validation != null }, this.modalContext?.submit();
  }
  _getSeverityTagColor(e) {
    const t = e.severity.toLowerCase();
    return t === "error" ? "danger" : t === "warning" ? "warning" : "default";
  }
  _renderAutocompleteResults() {
    return this._showProductResults ? this._productQuery.trim().length < 2 ? d : i`
      <div class="autocomplete-dropdown" role="listbox">
        ${this._isSearchingProducts ? i`
              <div class="autocomplete-status">
                <uui-loader-circle></uui-loader-circle>
                <span>Searching products...</span>
              </div>
            ` : this._productResults.length === 0 ? i`<div class="autocomplete-status">No products found</div>` : this._productResults.map((t) => i`
                <button
                  type="button"
                  class="autocomplete-option"
                  @mousedown=${(r) => {
      r.preventDefault(), this._addPreviewProduct(t);
    }}>
                  <span class="autocomplete-option-name">${this._formatAutocompleteLabel(t)}</span>
                  <span class="autocomplete-option-meta">
                    ${t.sku || "No SKU"} | ${_(t.price, 2)} | ${t.id}
                  </span>
                </button>
              `)}
      </div>
    ` : d;
  }
  _renderSummary() {
    return this._validation ? i`
      <div class="summary-grid">
        <div><strong>Products:</strong> ${this._validation.productItemCount}</div>
        <div><strong>Promotions:</strong> ${this._validation.promotionCount}</div>
        <div><strong>Warnings:</strong> ${this._validation.warningCount}</div>
        <div><strong>Errors:</strong> ${this._validation.errorCount}</div>
      </div>
    ` : i`<p class="hint">Run validation to see counts and diagnostics.</p>`;
  }
  _renderRunTab() {
    const e = this._getRequestedPreviewIds();
    return i`
      <uui-box headline="Validation Run">
        <div class="run-controls">
          <umb-property-layout label="Max Issues" description="1-1000 issues returned per run.">
            <uui-input
              slot="editor"
              type="number"
              min="1"
              max="1000"
              .value=${String(this._maxIssues)}
              @input=${this._setMaxIssues}>
            </uui-input>
          </umb-property-layout>

          <div class="preview-picker">
            <label for="preview-product-search">Preview Products</label>
            <div class="autocomplete-field">
              <uui-input
                id="preview-product-search"
                .value=${this._productQuery}
                @input=${this._handleProductQueryInput}
                @focus=${this._handleProductQueryFocus}
                @blur=${this._handleProductQueryBlur}
                placeholder="Search products by name or SKU"
                autocomplete="off">
              </uui-input>
              ${this._renderAutocompleteResults()}
            </div>
            <p class="hint">Select products to request detailed preview rows.</p>
          </div>

          ${this._selectedPreviewProducts.length > 0 ? i`
                <div class="selected-preview-list">
                  ${this._selectedPreviewProducts.map((t) => i`
                    <div class="selected-preview-item">
                      <div class="selected-preview-meta">
                        <span class="selected-preview-label">${t.label}</span>
                        <span class="selected-preview-id">${t.id}</span>
                        ${t.sku ? i`<span class="selected-preview-sku">SKU: ${t.sku}</span>` : d}
                      </div>
                      <uui-button
                        compact
                        look="secondary"
                        label="Remove preview product"
                        @click=${() => this._removePreviewId(t.id)}>
                        <uui-icon name="icon-delete"></uui-icon>
                      </uui-button>
                    </div>
                  `)}
                </div>
              ` : i`<p class="hint">No preview products selected yet.</p>`}

          <umb-property-layout
            label="Preview IDs (Advanced)"
            description="Optional. Paste comma/newline GUIDs (max 20 after merge with selected products).">
            <uui-textarea
              slot="editor"
              .value=${this._advancedPreviewIdsInput}
              @input=${this._setAdvancedPreviewIds}
              placeholder="00000000-0000-0000-0000-000000000000">
            </uui-textarea>
          </umb-property-layout>
        </div>

        <div class="run-actions">
          <div class="run-meta">
            <span class="hint">Requested preview IDs: ${e.length}/20</span>
            <uui-button
              look="secondary"
              ?disabled=${(this._validation?.sampleProductIds?.length ?? 0) === 0}
              @click=${this._addSampleIds}>
              Use Sample IDs
            </uui-button>
          </div>
          <uui-button look="primary" ?disabled=${this._isLoading} @click=${this._runValidation}>
            ${this._isLoading ? "Validating..." : "Validate Feed"}
          </uui-button>
        </div>
      </uui-box>

      <uui-box headline="Summary">
        ${this._renderSummary()}
      </uui-box>

      ${this._validation ? i`
            <uui-box headline="Generation Warnings">
              ${this._validation.warnings.length === 0 ? i`<p class="hint">No generation warnings returned.</p>` : i`
                    <ul class="list">
                      ${this._validation.warnings.map((t) => i`<li>${t}</li>`)}
                    </ul>
                  `}
            </uui-box>
          ` : d}
    `;
  }
  _renderIssuesTab() {
    if (!this._validation)
      return i`
        <uui-box headline="Validation Issues">
          <p class="hint">Run validation first to inspect issue details.</p>
        </uui-box>
      `;
    const e = this._getFilteredIssues(), t = this._getIssueCountBySeverity("error"), r = this._getIssueCountBySeverity("warning");
    return i`
      <uui-box headline="Validation Issues">
        <div class="issue-filters">
          <uui-button
            look=${this._issueFilter === "all" ? "primary" : "secondary"}
            compact
            @click=${() => this._setIssueFilter("all")}>
            All (${this._validation.issues.length})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "error" ? "primary" : "secondary"}
            compact
            @click=${() => this._setIssueFilter("error")}>
            Errors (${t})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "warning" ? "primary" : "secondary"}
            compact
            @click=${() => this._setIssueFilter("warning")}>
            Warnings (${r})
          </uui-button>
        </div>

        ${e.length === 0 ? i`<p class="hint">No issues found for the selected filter.</p>` : i`
              <div class="issues-table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Code</uui-table-head-cell>
                    <uui-table-head-cell>Product</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Message</uui-table-head-cell>
                  </uui-table-head>
                  ${e.map((s) => i`
                    <uui-table-row>
                      <uui-table-cell>
                        <uui-tag color=${this._getSeverityTagColor(s)}>${s.severity}</uui-tag>
                      </uui-table-cell>
                      <uui-table-cell><code>${s.code}</code></uui-table-cell>
                      <uui-table-cell>
                        ${s.productId ? i`<code>${s.productId}</code>` : i`<span>-</span>`}
                      </uui-table-cell>
                      <uui-table-cell>
                        ${s.field ? i`<code>${s.field}</code>` : i`<span>-</span>`}
                      </uui-table-cell>
                      <uui-table-cell>${s.message}</uui-table-cell>
                    </uui-table-row>
                  `)}
                </uui-table>
              </div>
            `}
      </uui-box>
    `;
  }
  _renderPreviewCard(e) {
    return i`
      <div class="preview-card">
        <h5>${e.productId}</h5>
        <div class="preview-grid">
          <span><strong>Title:</strong> ${e.title ?? "n/a"}</span>
          <span><strong>Price:</strong> ${e.price ?? "n/a"}</span>
          <span><strong>Availability:</strong> ${e.availability ?? "n/a"}</span>
          <span><strong>Link:</strong> ${e.link ?? "n/a"}</span>
          <span><strong>Image:</strong> ${e.imageLink ?? "n/a"}</span>
          <span><strong>Brand:</strong> ${e.brand ?? "n/a"}</span>
          <span><strong>GTIN:</strong> ${e.gtin ?? "n/a"}</span>
          <span><strong>MPN:</strong> ${e.mpn ?? "n/a"}</span>
          <span><strong>identifier_exists:</strong> ${e.identifierExists ?? "n/a"}</span>
          <span><strong>shipping_label:</strong> ${e.shippingLabel ?? "n/a"}</span>
        </div>
      </div>
    `;
  }
  _renderPreviewsTab() {
    return this._validation ? i`
      <uui-box headline="Requested Product Previews">
        ${this._validation.productPreviews.length === 0 ? i`<p class="hint">No product previews returned for the requested IDs.</p>` : i`${this._validation.productPreviews.map((e) => this._renderPreviewCard(e))}`}

        ${this._validation.missingRequestedProductIds.length > 0 ? i`
              <h5>Missing Requested Product IDs</h5>
              <ul class="list mono">
                ${this._validation.missingRequestedProductIds.map((e) => i`<li>${e}</li>`)}
              </ul>
            ` : d}
      </uui-box>

      <uui-box headline="Sample Product IDs">
        ${this._validation.sampleProductIds.length === 0 ? i`<p class="hint">No sample IDs available.</p>` : i`
              <ul class="sample-list">
                ${this._validation.sampleProductIds.map((e) => i`
                  <li>
                    <code>${e}</code>
                    <uui-button compact look="secondary" @click=${() => this._addPreviewId(e)}>
                      Add
                    </uui-button>
                  </li>
                `)}
              </ul>
            `}
      </uui-box>
    ` : i`
        <uui-box headline="Product Previews">
          <p class="hint">Run validation first to inspect previews and sample IDs.</p>
        </uui-box>
      `;
  }
  _renderActiveTab() {
    return this._activeTab === "issues" ? this._renderIssuesTab() : this._activeTab === "previews" ? this._renderPreviewsTab() : this._renderRunTab();
  }
  render() {
    return i`
      <umb-body-layout headline="Feed Validation: ${this.data?.feedName ?? "Product Feed"}">
        <div id="main">
          <uui-tab-group class="tabs">
            <uui-tab label="Run" ?active=${this._activeTab === "run"} @click=${() => this._setActiveTab("run")}>
              Run
            </uui-tab>
            <uui-tab label="Issues" ?active=${this._activeTab === "issues"} @click=${() => this._setActiveTab("issues")}>
              Issues
            </uui-tab>
            <uui-tab label="Previews" ?active=${this._activeTab === "previews"} @click=${() => this._setActiveTab("previews")}>
              Previews
            </uui-tab>
          </uui-tab-group>

          ${this._errorMessage ? i`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : d}

          ${this._isLoading ? i`
                <div class="loading">
                  <uui-loader></uui-loader>
                </div>
              ` : this._renderActiveTab()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${this._close}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u.styles = h`
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

    .run-controls {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
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
      font-family: var(--uui-font-monospace);
      word-break: break-all;
    }

    .autocomplete-status {
      padding: var(--uui-size-space-3);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
    }

    .selected-preview-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
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
    }

    .selected-preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      align-items: center;
      min-width: 0;
    }

    .selected-preview-label {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .selected-preview-id {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      word-break: break-all;
    }

    .selected-preview-sku {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .run-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .run-meta {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
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

    .issues-table-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    .preview-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .preview-card h5 {
      margin: 0 0 var(--uui-size-space-2);
      font-family: var(--uui-font-monospace);
      word-break: break-all;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--uui-size-space-1) var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
      word-break: break-word;
    }

    .sample-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .sample-list li {
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
    }

    .sample-list code {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
      word-break: break-all;
    }

    .list {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .mono {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
      word-break: break-all;
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
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
  `;
o([
  l()
], u.prototype, "_activeTab", 2);
o([
  l()
], u.prototype, "_issueFilter", 2);
o([
  l()
], u.prototype, "_isLoading", 2);
o([
  l()
], u.prototype, "_validation", 2);
o([
  l()
], u.prototype, "_errorMessage", 2);
o([
  l()
], u.prototype, "_maxIssues", 2);
o([
  l()
], u.prototype, "_productQuery", 2);
o([
  l()
], u.prototype, "_isSearchingProducts", 2);
o([
  l()
], u.prototype, "_productResults", 2);
o([
  l()
], u.prototype, "_showProductResults", 2);
o([
  l()
], u.prototype, "_selectedPreviewProducts", 2);
o([
  l()
], u.prototype, "_advancedPreviewIdsInput", 2);
u = o([
  v("merchello-product-feed-validation-modal")
], u);
const x = u;
export {
  u as MerchelloProductFeedValidationModalElement,
  x as default
};
//# sourceMappingURL=product-feed-validation-modal.element-CxrIWHm8.js.map
