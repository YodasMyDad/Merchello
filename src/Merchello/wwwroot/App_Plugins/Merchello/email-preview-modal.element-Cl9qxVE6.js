import { html as r, nothing as l, css as m, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-B76CV0sD.js";
import { m as y } from "./modal-layout.styles-C2OaUji5.js";
var x = Object.defineProperty, T = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, o = (e, i, a, d) => {
  for (var t = d > 1 ? void 0 : d ? T(i, a) : i, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (t = (d ? p(i, a, t) : p(t)) || t);
  return d && t && x(i, a, t), t;
}, _ = (e, i, a) => i.has(e) || g("Cannot " + a), h = (e, i, a) => (_(e, i, "read from private field"), i.get(e)), $ = (e, i, a) => i.has(e) ? g("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), S = (e, i, a, d) => (_(e, i, "write to private field"), i.set(e, a), a), n;
let s = class extends b {
  constructor() {
    super(), this._preview = null, this._isLoading = !0, this._errorMessage = null, this._testRecipient = "", this._isSendingTest = !1, $(this, n), this.consumeContext(w, (e) => {
      S(this, n, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadPreview();
  }
  async _loadPreview() {
    if (!this.data?.configurationId) {
      this._errorMessage = "No configuration ID provided", this._isLoading = !1;
      return;
    }
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await v.previewEmail(this.data.configurationId);
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
      return;
    }
    e && (this._preview = e, !e.success && e.errorMessage && (this._errorMessage = e.errorMessage)), this._isLoading = !1;
  }
  async _handleSendTest() {
    if (!this.data?.configurationId || !this._testRecipient.trim()) return;
    this._isSendingTest = !0;
    const { data: e, error: i } = await v.sendTestEmail(this.data.configurationId, {
      recipient: this._testRecipient.trim()
    });
    if (this._isSendingTest = !1, i) {
      h(this, n)?.peek("danger", {
        data: { headline: "Test failed", message: i.message }
      });
      return;
    }
    e?.success ? (h(this, n)?.peek("positive", {
      data: { headline: "Test sent", message: `Test email sent to ${e.recipient}` }
    }), this.value = { testSent: !0 }, this._testRecipient = "") : h(this, n)?.peek("danger", {
      data: { headline: "Test failed", message: e?.errorMessage || "Unknown error" }
    });
  }
  _handleClose() {
    this.modalContext?.submit();
  }
  _renderLoadingState() {
    return r`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading preview...</span>
      </div>
    `;
  }
  _renderErrorState() {
    return r`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderWarnings() {
    return this._preview?.warnings.length ? r`
      <div class="warnings">
        <strong>Warnings:</strong>
        <ul>
          ${this._preview.warnings.map((e) => r`<li>${e}</li>`)}
        </ul>
      </div>
    ` : l;
  }
  _renderEmailHeaders() {
    return this._preview ? r`
      <div class="email-headers">
        <div class="header-row">
          <span class="header-label">From:</span>
          <span class="header-value">${this._preview.from || "—"}</span>
        </div>
        <div class="header-row">
          <span class="header-label">To:</span>
          <span class="header-value">${this._preview.to || "—"}</span>
        </div>
        ${this._preview.cc ? r`
              <div class="header-row">
                <span class="header-label">CC:</span>
                <span class="header-value">${this._preview.cc}</span>
              </div>
            ` : l}
        ${this._preview.bcc ? r`
              <div class="header-row">
                <span class="header-label">BCC:</span>
                <span class="header-value">${this._preview.bcc}</span>
              </div>
            ` : l}
        <div class="header-row">
          <span class="header-label">Subject:</span>
          <span class="header-value subject">${this._preview.subject || "—"}</span>
        </div>
      </div>
    ` : l;
  }
  _renderEmailBody() {
    return this._preview?.body ? r`
      <div class="email-body-container">
        <iframe
          sandbox="allow-same-origin"
          .srcdoc=${this._preview.body}
          title="Email Preview">
        </iframe>
      </div>
    ` : r`
        <div class="no-body">
          <p>No email body available for preview.</p>
        </div>
      `;
  }
  _renderTestSection() {
    return r`
      <div class="test-section">
        <h4>Send Test Email</h4>
        <div class="test-row">
          <uui-input
            type="email"
            .value=${this._testRecipient}
            @input=${(e) => {
      this._testRecipient = e.target.value;
    }}
            placeholder="Enter recipient email..."
            label="Test recipient">
          </uui-input>
          <uui-button
            look="secondary"
            ?disabled=${!this._testRecipient.trim() || this._isSendingTest}
            @click=${this._handleSendTest}>
            ${this._isSendingTest ? "Sending..." : "Send Test"}
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : r`
      ${this._errorMessage ? this._renderErrorState() : l}
      ${this._renderWarnings()}
      ${this._renderEmailHeaders()}
      ${this._renderEmailBody()}
      ${this._renderTestSection()}
    `;
  }
  render() {
    return r`
      <umb-body-layout headline="Email Preview">
        <div id="main">
          ${this._renderContent()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Close" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
s.styles = [
  y,
  m`
      :host {
        display: block;
        height: 100%;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        height: 100%;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .warnings {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-radius: var(--uui-border-radius);
      }

      .warnings ul {
        margin: var(--uui-size-space-2) 0 0 0;
        padding-left: var(--uui-size-space-5);
      }

      .email-headers {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
      }

      .header-row {
        display: flex;
        gap: var(--uui-size-space-3);
      }

      .header-label {
        min-width: 60px;
        font-weight: 600;
        color: var(--uui-color-text-alt);
      }

      .header-value {
        word-break: break-all;
      }

      .header-value.subject {
        font-weight: 500;
      }

      .email-body-container {
        flex: 1;
        min-height: 300px;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .email-body-container iframe {
        width: 100%;
        height: 100%;
        min-height: 300px;
        border: none;
        background: white;
      }

      .no-body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-text-alt);
      }

      .test-section {
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
      }

      .test-section h4 {
        margin: 0 0 var(--uui-size-space-3) 0;
        font-size: var(--uui-type-default-size);
      }

      .test-row {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
      }

      .test-row uui-input {
        flex: 1;
      }
    `
];
o([
  u()
], s.prototype, "_preview", 2);
o([
  u()
], s.prototype, "_isLoading", 2);
o([
  u()
], s.prototype, "_errorMessage", 2);
o([
  u()
], s.prototype, "_testRecipient", 2);
o([
  u()
], s.prototype, "_isSendingTest", 2);
s = o([
  f("merchello-email-preview-modal")
], s);
const L = s;
export {
  s as MerchelloEmailPreviewModalElement,
  L as default
};
//# sourceMappingURL=email-preview-modal.element-Cl9qxVE6.js.map
