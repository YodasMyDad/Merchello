import { css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { OrderProductAutocompleteDto } from "@orders/types/order.types.js";
import type {
  ProductFeedValidationDto,
  ProductFeedValidationIssueDto,
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue,
  ProductFeedValidationProductPreviewDto,
  ValidateProductFeedDto,
} from "@product-feed/types/product-feed.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatNumber } from "@shared/utils/formatting.js";

type ValidationTab = "run" | "issues" | "previews";
type IssueFilter = "all" | "error" | "warning";

interface PreviewProductSelection {
  id: string;
  label: string;
  sku: string | null;
}

@customElement("merchello-product-feed-validation-modal")
export class MerchelloProductFeedValidationModalElement extends UmbModalBaseElement<
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue
> {
  @state() private _activeTab: ValidationTab = "run";
  @state() private _issueFilter: IssueFilter = "all";
  @state() private _isLoading = false;
  @state() private _validation: ProductFeedValidationDto | null = null;
  @state() private _errorMessage: string | null = null;
  @state() private _maxIssues = 200;

  @state() private _productQuery = "";
  @state() private _isSearchingProducts = false;
  @state() private _productResults: OrderProductAutocompleteDto[] = [];
  @state() private _showProductResults = false;

  @state() private _selectedPreviewProducts: PreviewProductSelection[] = [];
  @state() private _advancedPreviewIdsInput = "";

  private _productSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _productResultsHideTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._runValidation();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearAutocompleteTimers();
  }

  private _clearAutocompleteTimers(): void {
    if (this._productSearchDebounceTimer) {
      clearTimeout(this._productSearchDebounceTimer);
      this._productSearchDebounceTimer = null;
    }

    if (this._productResultsHideTimer) {
      clearTimeout(this._productResultsHideTimer);
      this._productResultsHideTimer = null;
    }
  }

  private _parseGuidValues(input: string): string[] {
    const raw = input
      .split(/[\s,]+/g)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const distinct = new Set<string>();
    for (const value of raw) {
      if (!guidRegex.test(value)) {
        continue;
      }

      if (distinct.size >= 20) {
        break;
      }

      distinct.add(value);
    }

    return Array.from(distinct);
  }

  private _getRequestedPreviewIds(): string[] {
    const selectedIds = this._selectedPreviewProducts.map((product) => product.id);
    const advancedIds = this._parseGuidValues(this._advancedPreviewIdsInput);

    const merged = new Set<string>([...selectedIds, ...advancedIds]);
    return Array.from(merged).slice(0, 20);
  }

  private _getIssueCountBySeverity(severity: "error" | "warning"): number {
    return this._validation?.issues.filter((issue) =>
      issue.severity.toLowerCase() === severity).length ?? 0;
  }

  private _getFilteredIssues(): ProductFeedValidationIssueDto[] {
    const issues = this._validation?.issues ?? [];
    if (this._issueFilter === "all") {
      return issues;
    }

    return issues.filter((issue) =>
      issue.severity.toLowerCase() === this._issueFilter);
  }

  private _setActiveTab(tab: ValidationTab): void {
    this._activeTab = tab;
  }

  private _setIssueFilter(filter: IssueFilter): void {
    this._issueFilter = filter;
  }

  private _setMaxIssues(event: Event): void {
    const next = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(next)) {
      this._maxIssues = 200;
      return;
    }

    this._maxIssues = Math.min(1000, Math.max(1, Math.round(next)));
  }

  private _setAdvancedPreviewIds(event: Event): void {
    this._advancedPreviewIdsInput = (event.target as HTMLTextAreaElement).value;
  }

  private _handleProductQueryInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this._productQuery = query;
    this._scheduleProductSearch(query);
  }

  private _handleProductQueryFocus(): void {
    if (this._productResultsHideTimer) {
      clearTimeout(this._productResultsHideTimer);
      this._productResultsHideTimer = null;
    }

    if (this._productResults.length > 0) {
      this._showProductResults = true;
      return;
    }

    const query = this._productQuery.trim();
    if (query.length >= 2) {
      this._scheduleProductSearch(query);
    }
  }

  private _handleProductQueryBlur(): void {
    if (this._productResultsHideTimer) {
      clearTimeout(this._productResultsHideTimer);
    }

    // Delay close so click on a dropdown option is not lost.
    this._productResultsHideTimer = setTimeout(() => {
      this._showProductResults = false;
      this._productResultsHideTimer = null;
    }, 150);
  }

  private _scheduleProductSearch(query: string): void {
    if (this._productSearchDebounceTimer) {
      clearTimeout(this._productSearchDebounceTimer);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      this._productResults = [];
      this._showProductResults = false;
      this._isSearchingProducts = false;
      return;
    }

    this._productSearchDebounceTimer = setTimeout(async () => {
      const searchTerm = trimmedQuery;
      this._isSearchingProducts = true;

      const { data, error } = await MerchelloApi.searchOrderProducts(searchTerm, 8);
      if (this._productQuery.trim() !== searchTerm) {
        this._isSearchingProducts = false;
        return;
      }

      this._isSearchingProducts = false;
      if (error) {
        this._productResults = [];
        this._showProductResults = true;
        return;
      }

      this._productResults = data ?? [];
      this._showProductResults = true;
    }, 250);
  }

  private _formatAutocompleteLabel(product: OrderProductAutocompleteDto): string {
    const rootName = product.rootName?.trim() ?? "";
    const variantName = product.name?.trim() ?? "";

    if (rootName && variantName && rootName.toLowerCase() !== variantName.toLowerCase()) {
      return `${rootName} - ${variantName}`;
    }

    return rootName || variantName || product.id;
  }

  private _addPreviewProduct(product: OrderProductAutocompleteDto): void {
    if (this._selectedPreviewProducts.some((entry) => entry.id === product.id)) {
      this._productQuery = "";
      this._productResults = [];
      this._showProductResults = false;
      return;
    }

    if (this._selectedPreviewProducts.length >= 20) {
      return;
    }

    this._selectedPreviewProducts = [
      ...this._selectedPreviewProducts,
      {
        id: product.id,
        label: this._formatAutocompleteLabel(product),
        sku: product.sku,
      },
    ];

    this._productQuery = "";
    this._productResults = [];
    this._showProductResults = false;
  }

  private _addPreviewId(id: string): void {
    if (!id || this._selectedPreviewProducts.some((entry) => entry.id === id)) {
      return;
    }

    if (this._selectedPreviewProducts.length >= 20) {
      return;
    }

    this._selectedPreviewProducts = [
      ...this._selectedPreviewProducts,
      {
        id,
        label: id,
        sku: null,
      },
    ];
  }

  private _removePreviewId(id: string): void {
    this._selectedPreviewProducts = this._selectedPreviewProducts.filter((product) => product.id !== id);
  }

  private _addSampleIds(): void {
    const sampleIds = this._validation?.sampleProductIds ?? [];
    for (const id of sampleIds) {
      if (this._selectedPreviewProducts.length >= 20) {
        break;
      }

      this._addPreviewId(id);
    }
  }

  private async _runValidation(): Promise<void> {
    const feedId = this.data?.feedId;
    if (!feedId) {
      this._errorMessage = "Feed id is missing.";
      return;
    }

    this._isLoading = true;
    this._errorMessage = null;

    const request: ValidateProductFeedDto = {
      maxIssues: Math.min(1000, Math.max(1, this._maxIssues || 200)),
      previewProductIds: this._getRequestedPreviewIds(),
    };

    const { data, error } = await MerchelloApi.validateProductFeed(feedId, request);
    this._isLoading = false;

    if (error || !data) {
      this._errorMessage = error?.message ?? "Unable to validate feed.";
      return;
    }

    this._validation = data;
  }

  private _close(): void {
    this.value = { refreshed: this._validation != null };
    this.modalContext?.submit();
  }

  private _getSeverityTagColor(issue: ProductFeedValidationIssueDto): "danger" | "warning" | "default" {
    const severity = issue.severity.toLowerCase();
    if (severity === "error") {
      return "danger";
    }

    if (severity === "warning") {
      return "warning";
    }

    return "default";
  }

  private _renderAutocompleteResults(): unknown {
    if (!this._showProductResults) {
      return nothing;
    }

    const query = this._productQuery.trim();
    if (query.length < 2) {
      return nothing;
    }

    return html`
      <div class="autocomplete-dropdown" role="listbox">
        ${this._isSearchingProducts
          ? html`
              <div class="autocomplete-status">
                <uui-loader-circle></uui-loader-circle>
                <span>Searching products...</span>
              </div>
            `
          : this._productResults.length === 0
            ? html`<div class="autocomplete-status">No products found</div>`
            : this._productResults.map((product) => html`
                <button
                  type="button"
                  class="autocomplete-option"
                  @mousedown=${(event: MouseEvent) => {
                    event.preventDefault();
                    this._addPreviewProduct(product);
                  }}>
                  <span class="autocomplete-option-name">${this._formatAutocompleteLabel(product)}</span>
                  <span class="autocomplete-option-meta">
                    ${product.sku || "No SKU"} | ${formatNumber(product.price, 2)} | ${product.id}
                  </span>
                </button>
              `)}
      </div>
    `;
  }

  private _renderSummary(): unknown {
    if (!this._validation) {
      return html`<p class="hint">Run validation to see counts and diagnostics.</p>`;
    }

    return html`
      <div class="summary-grid">
        <div><strong>Products:</strong> ${this._validation.productItemCount}</div>
        <div><strong>Promotions:</strong> ${this._validation.promotionCount}</div>
        <div><strong>Warnings:</strong> ${this._validation.warningCount}</div>
        <div><strong>Errors:</strong> ${this._validation.errorCount}</div>
      </div>
    `;
  }

  private _renderRunTab(): unknown {
    const requestedPreviewIds = this._getRequestedPreviewIds();

    return html`
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

          ${this._selectedPreviewProducts.length > 0
            ? html`
                <div class="selected-preview-list">
                  ${this._selectedPreviewProducts.map((product) => html`
                    <div class="selected-preview-item">
                      <div class="selected-preview-meta">
                        <span class="selected-preview-label">${product.label}</span>
                        <span class="selected-preview-id">${product.id}</span>
                        ${product.sku
                          ? html`<span class="selected-preview-sku">SKU: ${product.sku}</span>`
                          : nothing}
                      </div>
                      <uui-button
                        compact
                        look="secondary"
                        label="Remove preview product"
                        @click=${() => this._removePreviewId(product.id)}>
                        <uui-icon name="icon-delete"></uui-icon>
                      </uui-button>
                    </div>
                  `)}
                </div>
              `
            : html`<p class="hint">No preview products selected yet.</p>`}

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
            <span class="hint">Requested preview IDs: ${requestedPreviewIds.length}/20</span>
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

      ${this._validation
        ? html`
            <uui-box headline="Generation Warnings">
              ${this._validation.warnings.length === 0
                ? html`<p class="hint">No generation warnings returned.</p>`
                : html`
                    <ul class="list">
                      ${this._validation.warnings.map((warning) => html`<li>${warning}</li>`)}
                    </ul>
                  `}
            </uui-box>
          `
        : nothing}
    `;
  }

  private _renderIssuesTab(): unknown {
    if (!this._validation) {
      return html`
        <uui-box headline="Validation Issues">
          <p class="hint">Run validation first to inspect issue details.</p>
        </uui-box>
      `;
    }

    const filteredIssues = this._getFilteredIssues();
    const errorCount = this._getIssueCountBySeverity("error");
    const warningCount = this._getIssueCountBySeverity("warning");

    return html`
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
            Errors (${errorCount})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "warning" ? "primary" : "secondary"}
            compact
            @click=${() => this._setIssueFilter("warning")}>
            Warnings (${warningCount})
          </uui-button>
        </div>

        ${filteredIssues.length === 0
          ? html`<p class="hint">No issues found for the selected filter.</p>`
          : html`
              <div class="issues-table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Code</uui-table-head-cell>
                    <uui-table-head-cell>Product</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Message</uui-table-head-cell>
                  </uui-table-head>
                  ${filteredIssues.map((issue) => html`
                    <uui-table-row>
                      <uui-table-cell>
                        <uui-tag color=${this._getSeverityTagColor(issue)}>${issue.severity}</uui-tag>
                      </uui-table-cell>
                      <uui-table-cell><code>${issue.code}</code></uui-table-cell>
                      <uui-table-cell>
                        ${issue.productId ? html`<code>${issue.productId}</code>` : html`<span>-</span>`}
                      </uui-table-cell>
                      <uui-table-cell>
                        ${issue.field ? html`<code>${issue.field}</code>` : html`<span>-</span>`}
                      </uui-table-cell>
                      <uui-table-cell>${issue.message}</uui-table-cell>
                    </uui-table-row>
                  `)}
                </uui-table>
              </div>
            `}
      </uui-box>
    `;
  }

  private _renderPreviewCard(preview: ProductFeedValidationProductPreviewDto): unknown {
    return html`
      <div class="preview-card">
        <h5>${preview.productId}</h5>
        <div class="preview-grid">
          <span><strong>Title:</strong> ${preview.title ?? "n/a"}</span>
          <span><strong>Price:</strong> ${preview.price ?? "n/a"}</span>
          <span><strong>Availability:</strong> ${preview.availability ?? "n/a"}</span>
          <span><strong>Link:</strong> ${preview.link ?? "n/a"}</span>
          <span><strong>Image:</strong> ${preview.imageLink ?? "n/a"}</span>
          <span><strong>Brand:</strong> ${preview.brand ?? "n/a"}</span>
          <span><strong>GTIN:</strong> ${preview.gtin ?? "n/a"}</span>
          <span><strong>MPN:</strong> ${preview.mpn ?? "n/a"}</span>
          <span><strong>identifier_exists:</strong> ${preview.identifierExists ?? "n/a"}</span>
          <span><strong>shipping_label:</strong> ${preview.shippingLabel ?? "n/a"}</span>
        </div>
      </div>
    `;
  }

  private _renderPreviewsTab(): unknown {
    if (!this._validation) {
      return html`
        <uui-box headline="Product Previews">
          <p class="hint">Run validation first to inspect previews and sample IDs.</p>
        </uui-box>
      `;
    }

    return html`
      <uui-box headline="Requested Product Previews">
        ${this._validation.productPreviews.length === 0
          ? html`<p class="hint">No product previews returned for the requested IDs.</p>`
          : html`${this._validation.productPreviews.map((preview) => this._renderPreviewCard(preview))}`}

        ${this._validation.missingRequestedProductIds.length > 0
          ? html`
              <h5>Missing Requested Product IDs</h5>
              <ul class="list mono">
                ${this._validation.missingRequestedProductIds.map((id) => html`<li>${id}</li>`)}
              </ul>
            `
          : nothing}
      </uui-box>

      <uui-box headline="Sample Product IDs">
        ${this._validation.sampleProductIds.length === 0
          ? html`<p class="hint">No sample IDs available.</p>`
          : html`
              <ul class="sample-list">
                ${this._validation.sampleProductIds.map((id) => html`
                  <li>
                    <code>${id}</code>
                    <uui-button compact look="secondary" @click=${() => this._addPreviewId(id)}>
                      Add
                    </uui-button>
                  </li>
                `)}
              </ul>
            `}
      </uui-box>
    `;
  }

  private _renderActiveTab(): unknown {
    if (this._activeTab === "issues") {
      return this._renderIssuesTab();
    }

    if (this._activeTab === "previews") {
      return this._renderPreviewsTab();
    }

    return this._renderRunTab();
  }

  override render() {
    return html`
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

          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          ${this._isLoading
            ? html`
                <div class="loading">
                  <uui-loader></uui-loader>
                </div>
              `
            : this._renderActiveTab()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${this._close}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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
}

export default MerchelloProductFeedValidationModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-validation-modal": MerchelloProductFeedValidationModalElement;
  }
}
