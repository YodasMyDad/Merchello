import { css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  ProductFeedValidationDto,
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue,
  ProductFeedValidationProductPreviewDto,
  ValidateProductFeedDto,
} from "@product-feed/types/product-feed.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-product-feed-validation-modal")
export class MerchelloProductFeedValidationModalElement extends UmbModalBaseElement<
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue
> {
  @state() private _isLoading = false;
  @state() private _validation: ProductFeedValidationDto | null = null;
  @state() private _errorMessage: string | null = null;
  @state() private _previewIdsInput = "";
  @state() private _maxIssues = 200;

  override connectedCallback(): void {
    super.connectedCallback();
    this._runValidation();
  }

  private _parsePreviewIds(): string[] {
    const raw = this._previewIdsInput
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
      previewProductIds: this._parsePreviewIds(),
    };

    const { data, error } = await MerchelloApi.validateProductFeed(feedId, request);
    this._isLoading = false;

    if (error || !data) {
      this._errorMessage = error?.message ?? "Unable to validate feed.";
      return;
    }

    this._validation = data;
  }

  private _setMaxIssues(event: Event): void {
    const next = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(next)) {
      this._maxIssues = 200;
      return;
    }

    this._maxIssues = Math.min(1000, Math.max(1, Math.round(next)));
  }

  private _setPreviewIds(event: Event): void {
    this._previewIdsInput = (event.target as HTMLTextAreaElement).value;
  }

  private _close(): void {
    this.value = { refreshed: this._validation != null };
    this.modalContext?.submit();
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

  override render() {
    return html`
      <umb-body-layout headline="Feed Validation: ${this.data?.feedName ?? "Product Feed"}">
        <div id="main">
          <div class="controls">
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

            <umb-property-layout
              label="Product Preview IDs"
              description="Optional. Comma/newline separated GUIDs (max 20).">
              <uui-textarea
                slot="editor"
                .value=${this._previewIdsInput}
                @input=${this._setPreviewIds}
                placeholder="00000000-0000-0000-0000-000000000000">
              </uui-textarea>
            </umb-property-layout>

            <uui-button look="primary" ?disabled=${this._isLoading} @click=${this._runValidation}>
              ${this._isLoading ? "Validating..." : "Validate Feed"}
            </uui-button>
          </div>

          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          ${this._isLoading
            ? html`<div class="loading"><uui-loader></uui-loader></div>`
            : nothing}

          ${!this._isLoading && this._validation
            ? html`
                <div class="summary-grid">
                  <div><strong>Products:</strong> ${this._validation.productItemCount}</div>
                  <div><strong>Promotions:</strong> ${this._validation.promotionCount}</div>
                  <div><strong>Warnings:</strong> ${this._validation.warningCount}</div>
                  <div><strong>Errors:</strong> ${this._validation.errorCount}</div>
                </div>

                <uui-box headline="Warnings">
                  ${this._validation.warnings.length === 0
                    ? html`<p class="hint">No warnings returned.</p>`
                    : html`
                        <ul class="list">
                          ${this._validation.warnings.map((warning) => html`<li>${warning}</li>`)}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Validation Issues">
                  ${this._validation.issues.length === 0
                    ? html`<p class="hint">No validation issues found.</p>`
                    : html`
                        <ul class="list mono">
                          ${this._validation.issues.map(
                            (issue) =>
                              html`<li>
                                [${issue.severity}] ${issue.code}: ${issue.message}
                                ${issue.productId ? html`(product: ${issue.productId})` : nothing}
                                ${issue.field ? html`(field: ${issue.field})` : nothing}
                              </li>`,
                          )}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Sample Product IDs">
                  ${this._validation.sampleProductIds.length === 0
                    ? html`<p class="hint">No sample IDs available.</p>`
                    : html`
                        <ul class="list mono">
                          ${this._validation.sampleProductIds.map((id) => html`<li>${id}</li>`)}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Requested Product Previews">
                  ${this._validation.productPreviews.length === 0
                    ? html`<p class="hint">No product previews returned.</p>`
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
              `
            : nothing}
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

    .controls {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
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

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
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
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
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
    }

    .preview-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--uui-size-space-1);
      font-size: var(--uui-type-small-size);
      word-break: break-word;
    }
  `;
}

export default MerchelloProductFeedValidationModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-validation-modal": MerchelloProductFeedValidationModalElement;
  }
}
