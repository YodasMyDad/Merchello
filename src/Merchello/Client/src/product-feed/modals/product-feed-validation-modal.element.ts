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

type ValidationTab = "issues" | "preview";
type IssueFilter = "all" | "error" | "warning";
type ValidationRequestContext = "issues" | "preview";

interface PreviewProductSelection {
  id: string;
  label: string;
  sku: string | null;
}

interface PreviewFieldEntry {
  field: string;
  value: string;
}

const MAX_VALIDATION_ISSUES = 200;
const PRODUCT_SEARCH_MIN_LENGTH = 2;
const PRODUCT_SEARCH_LIMIT = 8;

@customElement("merchello-product-feed-validation-modal")
export class MerchelloProductFeedValidationModalElement extends UmbModalBaseElement<
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue
> {
  @state() private _activeTab: ValidationTab = "issues";
  @state() private _issueFilter: IssueFilter = "all";
  @state() private _isLoadingIssues = false;
  @state() private _isLoadingPreview = false;
  @state() private _validation: ProductFeedValidationDto | null = null;
  @state() private _errorMessage: string | null = null;

  @state() private _productQuery = "";
  @state() private _isSearchingProducts = false;
  @state() private _productResults: OrderProductAutocompleteDto[] = [];
  @state() private _showProductResults = false;

  @state() private _selectedPreviewProduct: PreviewProductSelection | null = null;
  @state() private _selectedPreview: ProductFeedValidationProductPreviewDto | null = null;
  @state() private _isSelectedPreviewMissing = false;

  private _productSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _productResultsHideTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    void this._refreshValidation();
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

  private _setActiveTab(tab: ValidationTab): void {
    this._activeTab = tab;
  }

  private _setIssueFilter(filter: IssueFilter): void {
    this._issueFilter = filter;
  }

  private _formatAutocompleteLabel(product: OrderProductAutocompleteDto): string {
    const rootName = product.rootName?.trim() ?? "";
    const variantName = product.name?.trim() ?? "";

    if (rootName && variantName && rootName.toLowerCase() !== variantName.toLowerCase()) {
      return `${rootName} - ${variantName}`;
    }

    return rootName || variantName || "Unnamed product";
  }

  private _formatFieldName(field: string | null): string {
    if (!field) {
      return "General";
    }

    return field
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  private _resolvePreviewFields(preview: ProductFeedValidationProductPreviewDto): PreviewFieldEntry[] {
    const fields = preview.fields ?? [];
    if (fields.length > 0) {
      return fields.map((field) => ({
        field: this._formatFieldName(field.field),
        value: field.value,
      }));
    }

    // Fallback for older API payloads.
    const legacyEntries: PreviewFieldEntry[] = [];
    if (preview.title) legacyEntries.push({ field: "title", value: preview.title });
    if (preview.price) legacyEntries.push({ field: "price", value: preview.price });
    if (preview.availability) legacyEntries.push({ field: "availability", value: preview.availability });
    if (preview.link) legacyEntries.push({ field: "link", value: preview.link });
    if (preview.imageLink) legacyEntries.push({ field: "image link", value: preview.imageLink });
    if (preview.brand) legacyEntries.push({ field: "brand", value: preview.brand });
    if (preview.gtin) legacyEntries.push({ field: "gtin", value: preview.gtin });
    if (preview.mpn) legacyEntries.push({ field: "mpn", value: preview.mpn });
    if (preview.identifierExists) legacyEntries.push({ field: "identifier exists", value: preview.identifierExists });
    if (preview.shippingLabel) legacyEntries.push({ field: "shipping label", value: preview.shippingLabel });
    return legacyEntries;
  }

  private _setSelectedPreviewProduct(product: PreviewProductSelection): void {
    this._selectedPreviewProduct = product;
    this._selectedPreview = null;
    this._isSelectedPreviewMissing = false;
  }

  private _syncSelectedPreview(validation: ProductFeedValidationDto): void {
    if (!this._selectedPreviewProduct) {
      this._selectedPreview = null;
      this._isSelectedPreviewMissing = false;
      return;
    }

    const preview = validation.productPreviews
      .find((entry) => entry.productId === this._selectedPreviewProduct?.id) ?? null;

    this._selectedPreview = preview;
    this._isSelectedPreviewMissing = preview === null;
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
    if (query.length >= PRODUCT_SEARCH_MIN_LENGTH) {
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
    if (trimmedQuery.length < PRODUCT_SEARCH_MIN_LENGTH) {
      this._productResults = [];
      this._showProductResults = false;
      this._isSearchingProducts = false;
      return;
    }

    this._productSearchDebounceTimer = setTimeout(async () => {
      const searchTerm = trimmedQuery;
      this._isSearchingProducts = true;

      const { data, error } = await MerchelloApi.searchOrderProducts(searchTerm, PRODUCT_SEARCH_LIMIT);
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

  private async _refreshValidation(): Promise<void> {
    const previewIds = this._selectedPreviewProduct
      ? [this._selectedPreviewProduct.id]
      : [];

    const validation = await this._runValidation(previewIds, "issues");
    if (!validation) {
      return;
    }

    this._validation = validation;
    this._syncSelectedPreview(validation);
  }

  private async _selectPreviewProduct(product: OrderProductAutocompleteDto): Promise<void> {
    const selection: PreviewProductSelection = {
      id: product.id,
      label: this._formatAutocompleteLabel(product),
      sku: product.sku,
    };

    this._setSelectedPreviewProduct(selection);
    this._productQuery = selection.label;
    this._productResults = [];
    this._showProductResults = false;

    const productId = selection.id;
    const validation = await this._runValidation([productId], "preview");
    if (!validation) {
      return;
    }

    if (this._selectedPreviewProduct?.id !== productId) {
      return;
    }

    this._validation = validation;
    this._syncSelectedPreview(validation);
  }

  private _clearPreviewSelection(): void {
    this._selectedPreviewProduct = null;
    this._selectedPreview = null;
    this._isSelectedPreviewMissing = false;
    this._productQuery = "";
    this._productResults = [];
    this._showProductResults = false;

    void this._refreshValidation();
  }

  private async _refreshSelectedPreview(): Promise<void> {
    if (!this._selectedPreviewProduct) {
      return;
    }

    const selectedProductId = this._selectedPreviewProduct.id;
    const validation = await this._runValidation([selectedProductId], "preview");
    if (!validation) {
      return;
    }

    if (this._selectedPreviewProduct?.id !== selectedProductId) {
      return;
    }

    this._validation = validation;
    this._syncSelectedPreview(validation);
  }

  private async _runValidation(
    previewProductIds: string[],
    context: ValidationRequestContext,
  ): Promise<ProductFeedValidationDto | null> {
    const feedId = this.data?.feedId;
    if (!feedId) {
      this._errorMessage = "Feed id is missing.";
      return null;
    }

    if (context === "issues") {
      this._isLoadingIssues = true;
    } else {
      this._isLoadingPreview = true;
    }

    this._errorMessage = null;

    const request: ValidateProductFeedDto = {
      maxIssues: MAX_VALIDATION_ISSUES,
      previewProductIds: previewProductIds.slice(0, 1),
    };

    const { data, error } = await MerchelloApi.validateProductFeed(feedId, request);

    if (context === "issues") {
      this._isLoadingIssues = false;
    } else {
      this._isLoadingPreview = false;
    }

    if (error || !data) {
      this._errorMessage = error?.message ?? "Unable to validate feed.";
      return null;
    }

    return data;
  }

  private _close(): void {
    this.value = { refreshed: this._validation != null };
    this.modalContext?.submit();
  }

  private _renderSummary(): unknown {
    if (!this._validation) {
      return html`<p class="hint">Validation results will appear here.</p>`;
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

  private _renderAutocompleteResults(): unknown {
    if (!this._showProductResults) {
      return nothing;
    }

    const query = this._productQuery.trim();
    if (query.length < PRODUCT_SEARCH_MIN_LENGTH) {
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
            ? html`<div class="autocomplete-status">No matching products found</div>`
            : this._productResults.map((product) => html`
                <button
                  type="button"
                  class="autocomplete-option"
                  @mousedown=${(event: MouseEvent) => {
                    event.preventDefault();
                    void this._selectPreviewProduct(product);
                  }}>
                  <span class="autocomplete-option-name">${this._formatAutocompleteLabel(product)}</span>
                  <span class="autocomplete-option-meta">
                    SKU: ${product.sku || "Not set"} | ${formatNumber(product.price, 2)}
                  </span>
                </button>
              `)}
      </div>
    `;
  }

  private _renderIssuesTab(): unknown {
    const validation = this._validation;

    if (this._isLoadingIssues && !validation) {
      return html`
        <uui-box headline="Issues">
          <div class="loading"><uui-loader></uui-loader></div>
        </uui-box>
      `;
    }

    if (!validation) {
      return html`
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
    }

    const filteredIssues = this._getFilteredIssues();
    const errorCount = this._getIssueCountBySeverity("error");
    const warningCount = this._getIssueCountBySeverity("warning");

    return html`
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
            All (${validation.issues.length})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "error" ? "primary" : "secondary"}
            compact
            label="Show errors"
            @click=${() => this._setIssueFilter("error")}>
            Errors (${errorCount})
          </uui-button>
          <uui-button
            look=${this._issueFilter === "warning" ? "primary" : "secondary"}
            compact
            label="Show warnings"
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
                    <uui-table-head-cell>Product</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Details</uui-table-head-cell>
                  </uui-table-head>
                  ${filteredIssues.map((issue) => html`
                    <uui-table-row>
                      <uui-table-cell>
                        <uui-tag color=${this._getSeverityTagColor(issue)}>${issue.severity}</uui-tag>
                      </uui-table-cell>
                      <uui-table-cell>
                        ${issue.productName
                          ? html`<span>${issue.productName}</span>`
                          : html`<span class="hint">${issue.productId ? "Unnamed product" : "Feed-level issue"}</span>`}
                      </uui-table-cell>
                      <uui-table-cell>${this._formatFieldName(issue.field)}</uui-table-cell>
                      <uui-table-cell>
                        <div class="issue-message">${issue.message}</div>
                        <div class="issue-code"><code>${issue.code}</code></div>
                      </uui-table-cell>
                    </uui-table-row>
                  `)}
                </uui-table>
              </div>
            `}
      </uui-box>
    `;
  }

  private _renderPreviewDetails(): unknown {
    if (!this._selectedPreviewProduct) {
      return html`<p class="hint">Select a product to load and inspect its feed output.</p>`;
    }

    if (this._isLoadingPreview) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._isSelectedPreviewMissing) {
      return html`
        <div class="warning-inline">
          <uui-icon name="icon-alert"></uui-icon>
          <span>No feed row was generated for <strong>${this._selectedPreviewProduct.label}</strong>.</span>
        </div>
      `;
    }

    if (!this._selectedPreview) {
      return html`<p class="hint">Search and select a product to view feed data.</p>`;
    }

    const fields = this._resolvePreviewFields(this._selectedPreview);

    return html`
      <div class="preview-summary">
        <div>
          <strong>Product:</strong>
          <span>${this._selectedPreview.productName || this._selectedPreviewProduct.label}</span>
        </div>
        ${this._selectedPreviewProduct.sku
          ? html`
              <div>
                <strong>SKU:</strong>
                <span>${this._selectedPreviewProduct.sku}</span>
              </div>
            `
          : nothing}
      </div>

      ${fields.length === 0
        ? html`<p class="hint">No feed fields were returned for this product.</p>`
        : html`
            <div class="preview-fields-wrap">
              <uui-table>
                <uui-table-head>
                  <uui-table-head-cell>Field</uui-table-head-cell>
                  <uui-table-head-cell>Value</uui-table-head-cell>
                </uui-table-head>
                ${fields.map((entry) => html`
                  <uui-table-row>
                    <uui-table-cell>
                      <code>${entry.field}</code>
                    </uui-table-cell>
                    <uui-table-cell>
                      <span class="field-value">${entry.value || "(empty)"}</span>
                    </uui-table-cell>
                  </uui-table-row>
                `)}
              </uui-table>
            </div>
          `}
    `;
  }

  private _renderPreviewTab(): unknown {
    return html`
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

        ${this._selectedPreviewProduct
          ? html`
              <div class="selected-preview-item">
                <div class="selected-preview-meta">
                  <span class="selected-preview-label">${this._selectedPreviewProduct.label}</span>
                  ${this._selectedPreviewProduct.sku
                    ? html`<span class="selected-preview-sku">SKU: ${this._selectedPreviewProduct.sku}</span>`
                    : nothing}
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
            `
          : nothing}

        ${this._renderPreviewDetails()}
      </uui-box>
    `;
  }

  private _renderActiveTab(): unknown {
    if (this._activeTab === "preview") {
      return this._renderPreviewTab();
    }

    return this._renderIssuesTab();
  }

  override render() {
    return html`
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

          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          ${this._renderActiveTab()}
        </div>

        <uui-button slot="actions" look="secondary" label="Close" @click=${this._close}>Close</uui-button>
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
  `;
}

export default MerchelloProductFeedValidationModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-validation-modal": MerchelloProductFeedValidationModalElement;
  }
}
