import { nothing as a, html as i, css as C, state as d, customElement as F } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-BAKL0aIE.js";
import { g as M, b as A } from "./store-settings-BZqgqZ5a.js";
var y = /* @__PURE__ */ ((e) => (e[e.Redirect = 0] = "Redirect", e[e.HostedFields = 10] = "HostedFields", e[e.Widget = 20] = "Widget", e[e.DirectForm = 30] = "DirectForm", e))(y || {}), W = Object.defineProperty, I = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, l = (e, s, t, r) => {
  for (var n = r > 1 ? void 0 : r ? I(s, t) : s, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (n = (r ? p(s, t, n) : p(n)) || n);
  return r && n && W(s, t, n), n;
}, R = (e, s, t) => s.has(e) || S("Cannot " + t), u = (e, s, t) => (R(e, s, "read from private field"), s.get(e)), w = (e, s, t) => s.has(e) ? S("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(e) : s.set(e, t), k = (e, s, t, r) => (R(e, s, "write to private field"), s.set(e, t), t), h, m, g;
const E = "merchello-test-payment-provider-form", L = {
  stripe: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" },
  braintree: { card: "4111 1111 1111 1111", expiry: "Any future date", cvv: "Any 3 digits" },
  default: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" }
};
let o = class extends z {
  constructor() {
    super(...arguments), this._activeTab = "session", this._amount = 100, this._isTesting = !1, this._isLoadingPaymentForm = !1, this._paymentFormLoaded = !1, this._isProcessingPayment = !1, w(this, h), this._expressMethods = [], this._isLoadingExpressMethods = !1, this._webhookTemplates = [], this._isLoadingWebhookTemplates = !1, this._customWebhookPayload = "", this._useCustomPayload = !1, this._isSimulatingWebhook = !1, this._isGeneratingPaymentLink = !1, this._supportsPaymentLinks = !1, this._errorMessage = null, w(this, m, !1), w(this, g);
  }
  connectedCallback() {
    super.connectedCallback(), k(this, m, !0), this._restoreSavedValues(), M(), this._checkPaymentLinkSupport();
  }
  _checkPaymentLinkSupport() {
    this._supportsPaymentLinks = this.data?.setting.provider?.supportsPaymentLinks ?? !1;
  }
  disconnectedCallback() {
    if (super.disconnectedCallback(), k(this, m, !1), u(this, h)?.teardown)
      try {
        u(this, h).teardown();
      } catch {
      }
    k(this, h, void 0), this._removeCardinalZIndexFix();
  }
  _restoreSavedValues() {
    try {
      const e = localStorage.getItem(E);
      if (e) {
        const s = JSON.parse(e);
        s.amount !== void 0 && (this._amount = s.amount), s.activeTab && (this._activeTab = s.activeTab);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const e = {
        amount: this._amount,
        activeTab: this._activeTab
      };
      localStorage.setItem(E, JSON.stringify(e));
    } catch {
    }
  }
  _injectCardinalZIndexFix() {
    if (u(this, g)) return;
    const e = document.createElement("style");
    e.id = "merchello-cardinal-zindex-fix", e.textContent = `
      /* Fix for Cardinal Commerce 3DS modal appearing behind Umbraco modal */
      .cardinal-modal-overlay,
      .cardinal-modal,
      [id*="Cardinal"],
      [class*="Cardinal"],
      iframe[name*="Cardinal"],
      div[style*="z-index"][style*="position: fixed"] {
        z-index: 999999 !important;
      }
    `, document.head.appendChild(e), k(this, g, e);
  }
  _removeCardinalZIndexFix() {
    u(this, g) && (u(this, g).remove(), k(this, g, void 0));
  }
  async _handleTabChange(e) {
    this._activeTab = e, this._saveFormValues(), e === "webhooks" && this._webhookTemplates.length === 0 && await this._loadWebhookTemplates(), e === "express" && this._expressMethods.length === 0 && await this._loadExpressMethods();
  }
  // ============================================
  // Session Tab
  // ============================================
  async _handleTestSession() {
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0, this._saveFormValues();
    const e = this.data?.setting.id;
    if (!e) {
      this._errorMessage = "Setting ID missing.", this._isTesting = !1;
      return;
    }
    const s = { amount: this._amount }, { data: t, error: r } = await v.testPaymentProvider(e, s);
    if (u(this, m)) {
      if (r) {
        this._errorMessage = r.message, this._isTesting = !1;
        return;
      }
      this._testResult = t, this._isTesting = !1;
    }
  }
  // ============================================
  // Payment Form Tab
  // ============================================
  async _handleLoadPaymentForm() {
    this._isLoadingPaymentForm = !0, this._paymentFormError = void 0, this._paymentFormLoaded = !1;
    const e = this.data?.setting.id;
    if (!e) {
      this._paymentFormError = "Setting ID missing.", this._isLoadingPaymentForm = !1;
      return;
    }
    const s = { amount: this._amount }, { data: t, error: r } = await v.testPaymentProvider(e, s);
    if (u(this, m)) {
      if (r || !t?.isSuccessful) {
        this._paymentFormError = r?.message || t?.errorMessage || "Failed to create session", this._isLoadingPaymentForm = !1;
        return;
      }
      if (this._testResult = t, t.integrationType === y.Redirect) {
        this._paymentFormError = "Redirect integrations cannot render inline forms. Use the Session tab to get the redirect URL.", this._isLoadingPaymentForm = !1;
        return;
      }
      if (t.integrationType === y.DirectForm) {
        this._paymentFormLoaded = !0, this._isLoadingPaymentForm = !1;
        return;
      }
      if (!t.javaScriptSdkUrl || !t.adapterUrl) {
        this._paymentFormError = "Provider did not return SDK or adapter URLs.", this._isLoadingPaymentForm = !1;
        return;
      }
      try {
        await this._loadScript(t.javaScriptSdkUrl), await this._loadScript(t.adapterUrl), this._injectCardinalZIndexFix(), await this._renderPaymentAdapter(t), this._paymentFormLoaded = !0;
      } catch (n) {
        this._paymentFormError = n instanceof Error ? n.message : "Failed to load payment form";
      }
      this._isLoadingPaymentForm = !1;
    }
  }
  _loadScript(e, s = 3e4) {
    return new Promise((t, r) => {
      if (document.querySelector(`script[src="${e}"]`)) {
        t();
        return;
      }
      const n = document.createElement("script");
      n.src = e;
      const c = setTimeout(() => {
        r(new Error(`Script loading timed out after ${s / 1e3} seconds: ${e}`));
      }, s);
      n.onload = () => {
        clearTimeout(c), t();
      }, n.onerror = () => {
        clearTimeout(c), r(new Error(`Failed to load script: ${e}`));
      }, document.head.appendChild(n);
    });
  }
  async _renderPaymentAdapter(e) {
    const s = window.MerchelloPaymentAdapters;
    if (!s)
      throw new Error("Payment adapters not found. SDK may not have loaded correctly.");
    const t = s[e.providerAlias];
    if (!t?.render)
      throw new Error(`Adapter for '${e.providerAlias}' not found or missing render method.`);
    await new Promise((c) => requestAnimationFrame(c));
    const r = this.shadowRoot?.querySelector("#payment-form-container");
    if (!r)
      throw new Error("Payment form container not found.");
    const n = {
      showError: (c) => {
        this._paymentFormError = c;
      },
      hideError: () => {
        this._paymentFormError = void 0;
      }
    };
    await t.render(r, e, n), k(this, h, t);
  }
  async _handleProcessTestPayment() {
    if (!u(this, h)?.tokenize) {
      this._paymentFormError = "Payment adapter does not support tokenization.";
      return;
    }
    if (!this._testResult?.sessionId) {
      this._paymentFormError = "No active session. Please load the payment form first.";
      return;
    }
    const e = this.data?.setting.id;
    if (!e) {
      this._paymentFormError = "Setting ID missing.";
      return;
    }
    this._isProcessingPayment = !0, this._paymentFormError = void 0, this._paymentResult = void 0;
    try {
      const s = u(this, h).tokenizeWithVerification ? await u(this, h).tokenizeWithVerification({
        email: "test@example.com",
        billingAddress: {
          firstName: "Test",
          lastName: "User",
          line1: "123 Test Street",
          city: "Test City",
          region: "CA",
          postalCode: "12345",
          countryCode: "US"
        }
      }) : await u(this, h).tokenize();
      if (!s.success) {
        s.isButtonFlow ? this._paymentFormError = s.error || "Please use the payment button to complete payment." : this._paymentFormError = s.error || "Failed to get payment details. Please check your card information.", this._isProcessingPayment = !1;
        return;
      }
      const { data: t, error: r } = await v.processTestPayment(e, {
        sessionId: this._testResult.sessionId,
        paymentMethodToken: s.nonce,
        methodAlias: this._testResult.methodAlias,
        amount: this._amount,
        testInvoiceId: this._testResult.testInvoiceId
      });
      if (!u(this, m)) return;
      r ? this._paymentResult = {
        success: !1,
        message: r.message
      } : t && (this._paymentResult = {
        success: t.success,
        message: t.success ? `Payment successful! Transaction ID: ${t.transactionId || "N/A"}` : t.errorMessage || "Payment failed.",
        transactionId: t.transactionId
      });
    } catch (s) {
      this._paymentResult = {
        success: !1,
        message: s instanceof Error ? s.message : "An unexpected error occurred."
      };
    }
    this._isProcessingPayment = !1;
  }
  // ============================================
  // Express Checkout Tab
  // ============================================
  async _loadExpressMethods() {
    this._isLoadingExpressMethods = !0;
    const e = this.data?.setting.id;
    if (!e) {
      this._isLoadingExpressMethods = !1;
      return;
    }
    const { data: s } = await v.getPaymentProviderMethods(e);
    u(this, m) && (s && (this._expressMethods = s.filter((t) => t.isExpressCheckout && t.isEnabled)), this._isLoadingExpressMethods = !1);
  }
  async _loadExpressButton(e) {
    this._loadingExpressMethod = e.methodAlias, this._expressError = void 0;
    const s = this.data?.setting.id;
    if (!s) {
      this._expressError = "Setting ID missing.", this._loadingExpressMethod = void 0;
      return;
    }
    try {
      const { data: t, error: r } = await v.getTestExpressConfig(s, e.methodAlias, this._amount);
      if (!u(this, m)) return;
      if (r || !t) {
        this._expressError = r?.message || "Failed to get express checkout config", this._loadingExpressMethod = void 0;
        return;
      }
      const n = t.sdkConfig?.clientSdkUrl;
      n && await this._loadScript(n), t.sdkUrl && await this._loadScript(t.sdkUrl), t.customAdapterUrl && await this._loadScript(t.customAdapterUrl), await new Promise((P) => requestAnimationFrame(P));
      const c = this.shadowRoot?.querySelector(`#express-button-${e.methodAlias}`);
      if (!c) {
        this._expressError = `Container not found for ${e.methodAlias}`, this._loadingExpressMethod = void 0;
        return;
      }
      const p = window.MerchelloExpressAdapters;
      if (!p) {
        this._expressError = "Express adapters not found. SDK may not have loaded correctly.", this._loadingExpressMethod = void 0;
        return;
      }
      const _ = this.data?.setting.providerAlias || "", b = p[`${_}:${e.methodAlias}`] || p[_];
      if (!b?.render) {
        this._expressError = `Express adapter for '${_}' not found or missing render method.`, this._loadingExpressMethod = void 0;
        return;
      }
      const $ = {
        isProcessing: !1,
        error: null,
        processExpressCheckout: async (P, U, T, D, N) => {
          this._expressResult = {
            success: !0,
            message: `Express checkout successful! Nonce: ${T.substring(0, 20)}...`,
            transactionId: T
          }, this._loadingExpressMethod = void 0;
        }
      }, x = {
        methodAlias: e.methodAlias,
        sdkUrl: t.sdkUrl,
        sdkConfig: t.sdkConfig
      }, f = {
        amount: this._amount,
        currency: t.sdkConfig?.currency || "USD"
      };
      await b.render(c, x, f, $);
    } catch (t) {
      this._expressError = t instanceof Error ? t.message : "Failed to load express button";
    }
    this._loadingExpressMethod = void 0;
  }
  // ============================================
  // Webhook Tab
  // ============================================
  async _loadWebhookTemplates() {
    this._isLoadingWebhookTemplates = !0;
    const e = this.data?.setting.id;
    if (!e) {
      this._isLoadingWebhookTemplates = !1;
      return;
    }
    const { data: s } = await v.getWebhookEventTemplates(e);
    u(this, m) && (s && (this._webhookTemplates = s, s.length > 0 && !this._selectedWebhookEvent && (this._selectedWebhookEvent = s[0].eventType)), this._isLoadingWebhookTemplates = !1);
  }
  async _handleSimulateWebhook() {
    this._isSimulatingWebhook = !0, this._webhookResult = void 0;
    const e = this.data?.setting.id;
    if (!e) {
      this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: "Setting ID missing." }, this._isSimulatingWebhook = !1;
      return;
    }
    const s = {
      eventType: this._selectedWebhookEvent || "payment.completed",
      amount: this._amount,
      customPayload: this._useCustomPayload ? this._customWebhookPayload : void 0
    }, { data: t, error: r } = await v.simulateWebhook(e, s);
    u(this, m) && (r ? this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: r.message } : t && (this._webhookResult = t), this._isSimulatingWebhook = !1);
  }
  // ============================================
  // Payment Links Tab
  // ============================================
  async _handleGeneratePaymentLink() {
    this._isGeneratingPaymentLink = !0, this._paymentLinkResult = void 0;
    const e = this.data?.setting.id, s = this.data?.setting.providerAlias;
    if (!e || !s) {
      this._paymentLinkResult = { success: !1, errorMessage: "Provider settings missing." }, this._isGeneratingPaymentLink = !1;
      return;
    }
    const { data: t, error: r } = await v.testPaymentLink(e, { amount: this._amount });
    u(this, m) && (r ? this._paymentLinkResult = { success: !1, errorMessage: r.message } : t && (this._paymentLinkResult = {
      success: t.success,
      paymentUrl: t.paymentUrl,
      errorMessage: t.errorMessage
    }), this._isGeneratingPaymentLink = !1);
  }
  // ============================================
  // Rendering
  // ============================================
  _handleClose() {
    this.modalContext?.reject();
  }
  _getIntegrationTypeName(e) {
    switch (e) {
      case y.Redirect:
        return "Redirect";
      case y.HostedFields:
        return "Hosted Fields";
      case y.Widget:
        return "Widget";
      case y.DirectForm:
        return "Direct Form";
      default:
        return "Unknown";
    }
  }
  _getTestCardInfo() {
    const e = this.data?.setting.providerAlias?.toLowerCase() || "default";
    return L[e] || L.default;
  }
  _renderTabs() {
    return i`
      <div class="tabs">
        <button
          class="tab ${this._activeTab === "session" ? "active" : ""}"
          @click=${() => this._handleTabChange("session")}
        >
          Session
        </button>
        <button
          class="tab ${this._activeTab === "payment" ? "active" : ""}"
          @click=${() => this._handleTabChange("payment")}
        >
          Payment Form
        </button>
        <button
          class="tab ${this._activeTab === "express" ? "active" : ""}"
          @click=${() => this._handleTabChange("express")}
        >
          Express Checkout
        </button>
        <button
          class="tab ${this._activeTab === "webhooks" ? "active" : ""}"
          @click=${() => this._handleTabChange("webhooks")}
        >
          Webhooks
        </button>
        ${this._supportsPaymentLinks ? i`
          <button
            class="tab ${this._activeTab === "paymentlinks" ? "active" : ""}"
            @click=${() => this._handleTabChange("paymentlinks")}
          >
            Payment Links
          </button>
        ` : a}
      </div>
    `;
  }
  _renderAmountInput() {
    const e = A();
    return i`
      <div class="form-row">
        <label>Test Amount (${e})</label>
        <uui-input
          type="number"
          min="0.01"
          step="0.01"
          .value=${String(this._amount)}
          @input=${(s) => this._amount = parseFloat(s.target.value) || 100}
        ></uui-input>
      </div>
    `;
  }
  _renderSessionTab() {
    return i`
      <div class="tab-content">
        <p class="tab-description">Test your provider configuration by creating a payment session.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isTesting}
          @click=${this._handleTestSession}
        >
          ${this._isTesting ? i`<uui-loader-circle></uui-loader-circle>` : a}
          ${this._isTesting ? "Creating Session..." : "Create Test Session"}
        </uui-button>

        ${this._testResult ? this._renderSessionResults() : a}
      </div>
    `;
  }
  _renderSessionResults() {
    if (!this._testResult) return a;
    const { isSuccessful: e, integrationType: s, errorMessage: t, errorCode: r, sessionId: n, redirectUrl: c, clientToken: p, clientSecret: _, javaScriptSdkUrl: b, adapterUrl: $, formFields: x } = this._testResult;
    return i`
      <div class="results-section">
        ${!e && t ? i`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${t}</p>
                  ${r ? i`<p class="error-code">Error code: ${r}</p>` : a}
                </div>
              </div>
            ` : a}

        ${e ? i`
              <div class="result-card success">
                <uui-icon name="icon-check"></uui-icon>
                <span>Session created successfully</span>
              </div>
            ` : a}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="badge">${this._getIntegrationTypeName(s)}</span>
          </div>

          ${n ? i`
            <div class="detail-row">
              <span class="detail-label">Session ID</span>
              <span class="detail-value monospace">${n}</span>
            </div>
          ` : a}

          ${c ? i`
            <div class="detail-row">
              <span class="detail-label">Redirect URL</span>
              <a href="${c}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${c} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : a}

          ${p ? i`
            <div class="detail-row">
              <span class="detail-label">Client Token</span>
              <span class="detail-value monospace truncate" title="${p}">${p}</span>
            </div>
          ` : a}

          ${_ ? i`
            <div class="detail-row">
              <span class="detail-label">Client Secret</span>
              <span class="detail-value monospace truncate" title="${_}">${_}</span>
            </div>
          ` : a}

          ${b ? i`
            <div class="detail-row">
              <span class="detail-label">JavaScript SDK URL</span>
              <a href="${b}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${b} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : a}

          ${$ ? i`
            <div class="detail-row">
              <span class="detail-label">Adapter URL</span>
              <span class="detail-value monospace">${$}</span>
            </div>
          ` : a}

          ${x && x.length > 0 ? i`
            <div class="detail-section">
              <span class="detail-label">Form Fields</span>
              <div class="form-fields-list">
                ${x.map((f) => i`
                  <div class="form-field-item">
                    <span class="field-label">${f.label}</span>
                    <span class="field-key">${f.key}</span>
                    <div class="field-meta">
                      <span class="field-type">${f.fieldType}</span>
                      ${f.isRequired ? i`<span class="field-required">Required</span>` : a}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          ` : a}
        </div>
      </div>
    `;
  }
  _renderPaymentFormTab() {
    const e = this._getTestCardInfo(), s = this._testResult?.integrationType === y.Widget;
    return i`
      <div class="tab-content">
        <p class="tab-description">Load and test the actual payment form with sandbox credentials.</p>

        ${this._renderAmountInput()}

        <div class="test-card-info">
          <strong>Test Card:</strong> ${e.card} | <strong>Exp:</strong> ${e.expiry} | <strong>CVV:</strong> ${e.cvv}
        </div>

        ${this._paymentFormLoaded ? a : i`
          <uui-button
            look="primary"
            ?disabled=${this._isLoadingPaymentForm}
            @click=${this._handleLoadPaymentForm}
          >
            ${this._isLoadingPaymentForm ? i`<uui-loader-circle></uui-loader-circle>` : a}
            ${this._isLoadingPaymentForm ? "Loading..." : "Load Payment Form"}
          </uui-button>
        `}

        ${this._paymentFormError ? i`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._paymentFormError}</span>
          </div>
        ` : a}

        <div id="payment-form-container" class="${this._paymentFormLoaded ? "visible" : "hidden"}">
          <!-- Payment form will be rendered here by the adapter -->
        </div>

        ${this._paymentFormLoaded && !s ? i`
          <uui-button
            look="primary"
            ?disabled=${this._isProcessingPayment}
            @click=${this._handleProcessTestPayment}
          >
            ${this._isProcessingPayment ? i`<uui-loader-circle></uui-loader-circle>` : a}
            ${this._isProcessingPayment ? "Processing..." : "Process Test Payment"}
          </uui-button>
        ` : a}

        ${this._paymentFormLoaded && s ? i`
          <p class="hint">Use the payment buttons above to complete the test payment.</p>
        ` : a}

        ${this._paymentResult ? i`
          <div class="result-card ${this._paymentResult.success ? "success" : "error"}">
            <uui-icon name="${this._paymentResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
            <span>${this._paymentResult.message}</span>
          </div>
        ` : a}
      </div>
    `;
  }
  _renderExpressCheckoutTab() {
    return i`
      <div class="tab-content">
        <p class="tab-description">Express checkout buttons (Apple Pay, Google Pay, PayPal) require domain verification and HTTPS.</p>

        <div class="warning-box">
          <uui-icon name="icon-alert"></uui-icon>
          <span>Some express checkout buttons may not work in the backoffice due to domain restrictions. PayPal typically works in sandbox mode.</span>
        </div>

        ${this._renderAmountInput()}

        ${this._isLoadingExpressMethods ? i`
          <uui-loader-bar></uui-loader-bar>
        ` : a}

        ${!this._isLoadingExpressMethods && this._expressMethods.length === 0 ? i`
          <p class="empty-state">No express checkout methods enabled for this provider.</p>
        ` : a}

        ${this._expressError ? i`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._expressError}</span>
          </div>
        ` : a}

        ${this._expressResult ? i`
          <div class="result-card ${this._expressResult.success ? "success" : "error"}">
            <uui-icon name="${this._expressResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
            <span>${this._expressResult.message}</span>
          </div>
        ` : a}

        ${this._expressMethods.length > 0 ? i`
          <div class="express-methods-list">
            ${this._expressMethods.map((e) => i`
              <div class="express-method-card">
                <div class="express-method-header">
                  <span class="method-name">${e.displayName}</span>
                  <span class="method-alias">${e.methodAlias}</span>
                </div>
                <div id="express-button-${e.methodAlias}" class="express-button-container">
                  <!-- Button will be rendered here -->
                </div>
                <uui-button
                  look="secondary"
                  ?disabled=${this._loadingExpressMethod === e.methodAlias}
                  @click=${() => this._loadExpressButton(e)}
                >
                  ${this._loadingExpressMethod === e.methodAlias ? i`<uui-loader-circle></uui-loader-circle>` : a}
                  ${this._loadingExpressMethod === e.methodAlias ? "Loading..." : "Load Button"}
                </uui-button>
              </div>
            `)}
          </div>
        ` : a}
      </div>
    `;
  }
  _renderWebhooksTab() {
    return i`
      <div class="tab-content">
        <p class="tab-description">Simulate webhook events to test your provider's webhook handling.</p>

        ${this._isLoadingWebhookTemplates ? i`
          <uui-loader-bar></uui-loader-bar>
        ` : a}

        ${this._isLoadingWebhookTemplates ? a : i`
          ${this._webhookTemplates.length > 0 ? i`
            <div class="form-row">
              <label>Event Type</label>
              <uui-select
                .options=${this._webhookTemplates.map((e) => ({ name: e.displayName, value: e.eventType }))}
                .value=${this._selectedWebhookEvent || ""}
                @change=${(e) => this._selectedWebhookEvent = e.target.value}
              ></uui-select>
            </div>
          ` : a}

          <div class="form-row">
            <label>
              <uui-checkbox
                ?checked=${this._useCustomPayload}
                @change=${(e) => this._useCustomPayload = e.target.checked}
              ></uui-checkbox>
              Use custom payload
            </label>
          </div>

          ${this._useCustomPayload ? i`
            <div class="form-row">
              <label>Custom Payload (JSON)</label>
              <uui-textarea
                .value=${this._customWebhookPayload}
                @input=${(e) => this._customWebhookPayload = e.target.value}
                placeholder='{"type": "payment.completed", ...}'
              ></uui-textarea>
              <span class="hint">Enter the raw webhook JSON payload to test.</span>
            </div>
          ` : a}

          ${this._renderAmountInput()}

          <uui-button
            look="primary"
            ?disabled=${this._isSimulatingWebhook || !this._useCustomPayload && !this._selectedWebhookEvent}
            @click=${this._handleSimulateWebhook}
          >
            ${this._isSimulatingWebhook ? i`<uui-loader-circle></uui-loader-circle>` : a}
            ${this._isSimulatingWebhook ? "Simulating..." : "Simulate Webhook"}
          </uui-button>

          ${this._webhookResult ? this._renderWebhookResult() : a}
        `}
      </div>
    `;
  }
  _renderWebhookResult() {
    if (!this._webhookResult) return a;
    const { success: e, validationSkipped: s, eventTypeDetected: t, actionsPerformed: r, payload: n, errorMessage: c } = this._webhookResult;
    return i`
      <div class="results-section">
        <div class="result-card ${e ? "success" : "error"}">
          <uui-icon name="${e ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${e ? "Webhook processed successfully" : "Webhook processing failed"}</span>
        </div>

        ${c ? i`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${c}</span>
          </div>
        ` : a}

        <div class="result-details">
          ${s ? i`
            <div class="detail-row">
              <span class="detail-label">Validation</span>
              <span class="badge">Skipped (test mode)</span>
            </div>
          ` : a}

          ${t ? i`
            <div class="detail-row">
              <span class="detail-label">Event Detected</span>
              <span class="detail-value">${t}</span>
            </div>
          ` : a}

          ${r && r.length > 0 ? i`
            <div class="detail-section">
              <span class="detail-label">Actions Performed</span>
              <ul class="actions-list">
                ${r.map((p) => i`<li>${p}</li>`)}
              </ul>
            </div>
          ` : a}

          ${n ? i`
            <details class="payload-details">
              <summary>View Payload</summary>
              <pre class="payload-content">${n}</pre>
            </details>
          ` : a}
        </div>
      </div>
    `;
  }
  _renderPaymentLinksTab() {
    return i`
      <div class="tab-content">
        <p class="tab-description">Test payment link generation for this provider.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isGeneratingPaymentLink}
          @click=${this._handleGeneratePaymentLink}
        >
          ${this._isGeneratingPaymentLink ? i`<uui-loader-circle></uui-loader-circle>` : a}
          ${this._isGeneratingPaymentLink ? "Generating..." : "Generate Test Payment Link"}
        </uui-button>

        ${this._paymentLinkResult ? i`
          <div class="results-section">
            <div class="result-card ${this._paymentLinkResult.success ? "success" : "error"}">
              <uui-icon name="${this._paymentLinkResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
              <span>${this._paymentLinkResult.success ? "Payment link generated successfully" : "Failed to generate payment link"}</span>
            </div>

            ${this._paymentLinkResult.errorMessage ? i`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._paymentLinkResult.errorMessage}</span>
              </div>
            ` : a}

            ${this._paymentLinkResult.paymentUrl ? i`
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Payment URL</span>
                  <a href="${this._paymentLinkResult.paymentUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                    ${this._paymentLinkResult.paymentUrl} <uui-icon name="icon-out"></uui-icon>
                  </a>
                </div>
                <div class="payment-link-actions">
                  <uui-button
                    look="secondary"
                    @click=${() => this._copyPaymentLink()}
                  >
                    <uui-icon name="icon-documents"></uui-icon> Copy Link
                  </uui-button>
                  <uui-button
                    look="primary"
                    @click=${() => window.open(this._paymentLinkResult?.paymentUrl, "_blank")}
                  >
                    <uui-icon name="icon-out"></uui-icon> Open Link
                  </uui-button>
                </div>
              </div>
            ` : a}
          </div>
        ` : a}
      </div>
    `;
  }
  async _copyPaymentLink() {
    if (this._paymentLinkResult?.paymentUrl)
      try {
        await navigator.clipboard.writeText(this._paymentLinkResult.paymentUrl);
      } catch {
        const e = document.createElement("textarea");
        e.value = this._paymentLinkResult.paymentUrl, document.body.appendChild(e), e.select(), document.execCommand("copy"), document.body.removeChild(e);
      }
  }
  render() {
    const e = this.data?.setting.displayName ?? "Provider";
    return i`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? i`
            <div class="error-banner">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._errorMessage}</span>
              <uui-button look="secondary" compact @click=${() => this._errorMessage = null}>Dismiss</uui-button>
            </div>
          ` : a}

          ${this._renderTabs()}

          ${this._activeTab === "session" ? this._renderSessionTab() : a}
          ${this._activeTab === "payment" ? this._renderPaymentFormTab() : a}
          ${this._activeTab === "express" ? this._renderExpressCheckoutTab() : a}
          ${this._activeTab === "webhooks" ? this._renderWebhooksTab() : a}
          ${this._activeTab === "paymentlinks" ? this._renderPaymentLinksTab() : a}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
o.styles = C`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-2);
    }

    .tab {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
      transition: all 0.2s ease;
    }

    .tab:hover {
      color: var(--uui-color-text);
      background: var(--uui-color-surface-alt);
    }

    .tab.active {
      color: var(--uui-color-interactive);
      border-bottom-color: var(--uui-color-interactive);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .tab-description {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    /* Form elements */
    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input, uui-select, uui-textarea {
      width: 100%;
    }

    uui-textarea {
      min-height: 100px;
      font-family: monospace;
    }

    /* Test card info */
    .test-card-info {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-family: monospace;
    }

    /* Warning box */
    .warning-box {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-emphasis);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    /* Payment form container */
    #payment-form-container {
      min-height: 200px;
      padding: var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    #payment-form-container.hidden {
      display: none;
    }

    /* Results */
    .results-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .result-card {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-weight: 600;
    }

    .result-card.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .result-card.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
    }

    .result-errors p {
      margin: 0;
    }

    .error-code {
      font-size: 0.75rem;
      margin-top: var(--uui-size-space-2) !important;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      word-break: break-all;
    }

    .detail-value.monospace {
      font-family: monospace;
      font-size: 0.8125rem;
    }

    .detail-value.truncate {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .url-link {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      color: var(--uui-color-interactive);
      text-decoration: none;
      word-break: break-all;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    /* Payment link actions */
    .payment-link-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner span {
      flex: 1;
    }

    /* Form fields list */
    .form-fields-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-field-item {
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .field-label {
      font-weight: 600;
      display: block;
    }

    .field-key {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .field-meta {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
    }

    .field-type {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-border);
      border-radius: 4px;
    }

    .field-required {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: 4px;
    }

    /* Express methods list */
    .express-methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .express-method-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .express-method-card {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .express-method-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .express-button-container {
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .express-button-container:empty {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .express-button-container:empty::before {
      content: "Click 'Load Button' to render the express checkout button";
    }

    .method-name {
      font-weight: 600;
    }

    .method-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .empty-state {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    /* Actions list */
    .actions-list {
      margin: 0;
      padding-left: var(--uui-size-space-5);
    }

    .actions-list li {
      margin: var(--uui-size-space-1) 0;
    }

    /* Payload details */
    .payload-details {
      margin-top: var(--uui-size-space-2);
    }

    .payload-details summary {
      cursor: pointer;
      color: var(--uui-color-interactive);
      font-size: 0.875rem;
    }

    .payload-content {
      margin: var(--uui-size-space-2) 0 0 0;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 0.75rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l([
  d()
], o.prototype, "_activeTab", 2);
l([
  d()
], o.prototype, "_amount", 2);
l([
  d()
], o.prototype, "_isTesting", 2);
l([
  d()
], o.prototype, "_testResult", 2);
l([
  d()
], o.prototype, "_isLoadingPaymentForm", 2);
l([
  d()
], o.prototype, "_paymentFormLoaded", 2);
l([
  d()
], o.prototype, "_paymentFormError", 2);
l([
  d()
], o.prototype, "_isProcessingPayment", 2);
l([
  d()
], o.prototype, "_paymentResult", 2);
l([
  d()
], o.prototype, "_expressMethods", 2);
l([
  d()
], o.prototype, "_isLoadingExpressMethods", 2);
l([
  d()
], o.prototype, "_loadingExpressMethod", 2);
l([
  d()
], o.prototype, "_expressError", 2);
l([
  d()
], o.prototype, "_expressResult", 2);
l([
  d()
], o.prototype, "_webhookTemplates", 2);
l([
  d()
], o.prototype, "_isLoadingWebhookTemplates", 2);
l([
  d()
], o.prototype, "_selectedWebhookEvent", 2);
l([
  d()
], o.prototype, "_customWebhookPayload", 2);
l([
  d()
], o.prototype, "_useCustomPayload", 2);
l([
  d()
], o.prototype, "_isSimulatingWebhook", 2);
l([
  d()
], o.prototype, "_webhookResult", 2);
l([
  d()
], o.prototype, "_isGeneratingPaymentLink", 2);
l([
  d()
], o.prototype, "_paymentLinkResult", 2);
l([
  d()
], o.prototype, "_supportsPaymentLinks", 2);
l([
  d()
], o.prototype, "_errorMessage", 2);
o = l([
  F("merchello-test-payment-provider-modal")
], o);
const j = o;
export {
  o as MerchelloTestPaymentProviderModalElement,
  j as default
};
//# sourceMappingURL=test-provider-modal.element-Cmoi0RHT.js.map
