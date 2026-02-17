import { html as s, nothing as n, css as c, state as l, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-B3w7Bp8a.js";
var h = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, d = (i, e, t, a) => {
  for (var o = a > 1 ? void 0 : a ? _(e, t) : e, u = i.length - 1, p; u >= 0; u--)
    (p = i[u]) && (o = (a ? p(e, t, o) : p(o)) || o);
  return a && o && h(e, t, o), o;
};
let r = class extends m {
  constructor() {
    super(...arguments), this._isLoading = !1, this._validation = null, this._errorMessage = null, this._previewIdsInput = "", this._maxIssues = 200;
  }
  connectedCallback() {
    super.connectedCallback(), this._runValidation();
  }
  _parsePreviewIds() {
    const i = this._previewIdsInput.split(/[\s,]+/g).map((a) => a.trim()).filter((a) => a.length > 0), e = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, t = /* @__PURE__ */ new Set();
    for (const a of i)
      if (e.test(a)) {
        if (t.size >= 20)
          break;
        t.add(a);
      }
    return Array.from(t);
  }
  async _runValidation() {
    const i = this.data?.feedId;
    if (!i) {
      this._errorMessage = "Feed id is missing.";
      return;
    }
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      maxIssues: Math.min(1e3, Math.max(1, this._maxIssues || 200)),
      previewProductIds: this._parsePreviewIds()
    }, { data: t, error: a } = await v.validateProductFeed(i, e);
    if (this._isLoading = !1, a || !t) {
      this._errorMessage = a?.message ?? "Unable to validate feed.";
      return;
    }
    this._validation = t;
  }
  _setMaxIssues(i) {
    const e = Number(i.target.value);
    if (!Number.isFinite(e)) {
      this._maxIssues = 200;
      return;
    }
    this._maxIssues = Math.min(1e3, Math.max(1, Math.round(e)));
  }
  _setPreviewIds(i) {
    this._previewIdsInput = i.target.value;
  }
  _close() {
    this.value = { refreshed: this._validation != null }, this.modalContext?.submit();
  }
  _renderPreviewCard(i) {
    return s`
      <div class="preview-card">
        <h5>${i.productId}</h5>
        <div class="preview-grid">
          <span><strong>Title:</strong> ${i.title ?? "n/a"}</span>
          <span><strong>Price:</strong> ${i.price ?? "n/a"}</span>
          <span><strong>Availability:</strong> ${i.availability ?? "n/a"}</span>
          <span><strong>Link:</strong> ${i.link ?? "n/a"}</span>
          <span><strong>Image:</strong> ${i.imageLink ?? "n/a"}</span>
          <span><strong>Brand:</strong> ${i.brand ?? "n/a"}</span>
          <span><strong>GTIN:</strong> ${i.gtin ?? "n/a"}</span>
          <span><strong>MPN:</strong> ${i.mpn ?? "n/a"}</span>
          <span><strong>identifier_exists:</strong> ${i.identifierExists ?? "n/a"}</span>
          <span><strong>shipping_label:</strong> ${i.shippingLabel ?? "n/a"}</span>
        </div>
      </div>
    `;
  }
  render() {
    return s`
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

          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : n}

          ${this._isLoading ? s`<div class="loading"><uui-loader></uui-loader></div>` : n}

          ${!this._isLoading && this._validation ? s`
                <div class="summary-grid">
                  <div><strong>Products:</strong> ${this._validation.productItemCount}</div>
                  <div><strong>Promotions:</strong> ${this._validation.promotionCount}</div>
                  <div><strong>Warnings:</strong> ${this._validation.warningCount}</div>
                  <div><strong>Errors:</strong> ${this._validation.errorCount}</div>
                </div>

                <uui-box headline="Warnings">
                  ${this._validation.warnings.length === 0 ? s`<p class="hint">No warnings returned.</p>` : s`
                        <ul class="list">
                          ${this._validation.warnings.map((i) => s`<li>${i}</li>`)}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Validation Issues">
                  ${this._validation.issues.length === 0 ? s`<p class="hint">No validation issues found.</p>` : s`
                        <ul class="list mono">
                          ${this._validation.issues.map(
      (i) => s`<li>
                                [${i.severity}] ${i.code}: ${i.message}
                                ${i.productId ? s`(product: ${i.productId})` : n}
                                ${i.field ? s`(field: ${i.field})` : n}
                              </li>`
    )}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Sample Product IDs">
                  ${this._validation.sampleProductIds.length === 0 ? s`<p class="hint">No sample IDs available.</p>` : s`
                        <ul class="list mono">
                          ${this._validation.sampleProductIds.map((i) => s`<li>${i}</li>`)}
                        </ul>
                      `}
                </uui-box>

                <uui-box headline="Requested Product Previews">
                  ${this._validation.productPreviews.length === 0 ? s`<p class="hint">No product previews returned.</p>` : s`${this._validation.productPreviews.map((i) => this._renderPreviewCard(i))}`}

                  ${this._validation.missingRequestedProductIds.length > 0 ? s`
                        <h5>Missing Requested Product IDs</h5>
                        <ul class="list mono">
                          ${this._validation.missingRequestedProductIds.map((i) => s`<li>${i}</li>`)}
                        </ul>
                      ` : n}
                </uui-box>
              ` : n}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${this._close}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = c`
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
d([
  l()
], r.prototype, "_isLoading", 2);
d([
  l()
], r.prototype, "_validation", 2);
d([
  l()
], r.prototype, "_errorMessage", 2);
d([
  l()
], r.prototype, "_previewIdsInput", 2);
d([
  l()
], r.prototype, "_maxIssues", 2);
r = d([
  g("merchello-product-feed-validation-modal")
], r);
const x = r;
export {
  r as MerchelloProductFeedValidationModalElement,
  x as default
};
//# sourceMappingURL=product-feed-validation-modal.element-B2k4fE8c.js.map
