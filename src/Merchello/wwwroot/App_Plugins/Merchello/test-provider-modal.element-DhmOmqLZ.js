import { nothing as i, html as a, css as E, state as l, customElement as L } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as F } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-BM4-Q40x.js";
import { g as I, b as z } from "./store-settings-DKmhm5Dt.js";
var g = /* @__PURE__ */ ((e) => (e[e.Redirect = 0] = "Redirect", e[e.HostedFields = 10] = "HostedFields", e[e.Widget = 20] = "Widget", e[e.DirectForm = 30] = "DirectForm", e))(g || {}), A = Object.defineProperty, V = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, n = (e, t, s, r) => {
  for (var u = r > 1 ? void 0 : r ? V(t, s) : t, d = e.length - 1, p; d >= 0; d--)
    (p = e[d]) && (u = (r ? p(t, s, u) : p(u)) || u);
  return r && u && A(t, s, u), u;
}, M = (e, t, s) => t.has(e) || T("Cannot " + s), c = (e, t, s) => (M(e, t, "read from private field"), t.get(e)), x = (e, t, s) => t.has(e) ? T("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), k = (e, t, s, r) => (M(e, t, "write to private field"), t.set(e, s), s), v, m, f;
const w = "merchello-test-payment-provider-form", P = {
  stripe: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" },
  braintree: { card: "4111 1111 1111 1111", expiry: "Any future date", cvv: "Any 3 digits" },
  default: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" }
};
let o = class extends F {
  constructor() {
    super(...arguments), this._activeTab = "session", this._amount = 100, this._isTesting = !1, this._isLoadingPaymentForm = !1, this._paymentFormLoaded = !1, this._isProcessingPayment = !1, x(this, v), this._expressMethods = [], this._isLoadingExpressMethods = !1, this._webhookTemplates = [], this._isLoadingWebhookTemplates = !1, this._customWebhookPayload = "", this._useCustomPayload = !1, this._isSimulatingWebhook = !1, this._isGeneratingPaymentLink = !1, this._supportsPaymentLinks = !1, this._supportsVaulting = !1, this._isCreatingVaultSetup = !1, this._isConfirmingVault = !1, this._isChargingVault = !1, this._vaultChargeAmount = 10, this._vaultPaymentMethodToken = "", this._errorMessage = null, x(this, m, !1), x(this, f);
  }
  connectedCallback() {
    super.connectedCallback(), k(this, m, !0), this._restoreSavedValues(), I(), this._checkPaymentLinkSupport(), this._checkVaultingSupport();
  }
  _checkPaymentLinkSupport() {
    this._supportsPaymentLinks = this.data?.setting.provider?.supportsPaymentLinks ?? !1;
  }
  _checkVaultingSupport() {
    this._supportsVaulting = this.data?.setting.provider?.supportsVaultedPayments ?? !1;
  }
  disconnectedCallback() {
    if (super.disconnectedCallback(), k(this, m, !1), c(this, v)?.teardown)
      try {
        c(this, v).teardown();
      } catch {
      }
    k(this, v, void 0), this._removeCardinalZIndexFix();
  }
  _restoreSavedValues() {
    try {
      const e = localStorage.getItem(w);
      if (e) {
        const t = JSON.parse(e);
        t.amount !== void 0 && (this._amount = t.amount), t.activeTab && (this._activeTab = t.activeTab);
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
      localStorage.setItem(w, JSON.stringify(e));
    } catch {
    }
  }
  _injectCardinalZIndexFix() {
    if (c(this, f)) return;
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
    `, document.head.appendChild(e), k(this, f, e);
  }
  _removeCardinalZIndexFix() {
    c(this, f) && (c(this, f).remove(), k(this, f, void 0));
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
    const t = { amount: this._amount }, { data: s, error: r } = await h.testPaymentProvider(e, t);
    if (c(this, m)) {
      if (r) {
        this._errorMessage = r.message, this._isTesting = !1;
        return;
      }
      this._testResult = s, this._isTesting = !1;
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
    const t = { amount: this._amount }, { data: s, error: r } = await h.testPaymentProvider(e, t);
    if (c(this, m)) {
      if (r || !s?.isSuccessful) {
        this._paymentFormError = r?.message || s?.errorMessage || "Failed to create session", this._isLoadingPaymentForm = !1;
        return;
      }
      if (this._testResult = s, s.integrationType === g.Redirect) {
        this._paymentFormError = "Redirect integrations cannot render inline forms. Use the Session tab to get the redirect URL.", this._isLoadingPaymentForm = !1;
        return;
      }
      if (s.integrationType === g.DirectForm) {
        this._paymentFormLoaded = !0, this._isLoadingPaymentForm = !1;
        return;
      }
      if (!s.javaScriptSdkUrl || !s.adapterUrl) {
        this._paymentFormError = "Provider did not return SDK or adapter URLs.", this._isLoadingPaymentForm = !1;
        return;
      }
      try {
        await this._loadScript(s.javaScriptSdkUrl), await this._loadScript(s.adapterUrl), this._injectCardinalZIndexFix(), await this._renderPaymentAdapter(s), this._paymentFormLoaded = !0;
      } catch (u) {
        this._paymentFormError = u instanceof Error ? u.message : "Failed to load payment form";
      }
      this._isLoadingPaymentForm = !1;
    }
  }
  _loadScript(e, t = 3e4) {
    return new Promise((s, r) => {
      if (document.querySelector(`script[src="${e}"]`)) {
        s();
        return;
      }
      const u = document.createElement("script");
      u.src = e;
      const d = setTimeout(() => {
        r(new Error(`Script loading timed out after ${t / 1e3} seconds: ${e}`));
      }, t);
      u.onload = () => {
        clearTimeout(d), s();
      }, u.onerror = () => {
        clearTimeout(d), r(new Error(`Failed to load script: ${e}`));
      }, document.head.appendChild(u);
    });
  }
  async _renderPaymentAdapter(e) {
    const t = window.MerchelloPaymentAdapters;
    if (!t)
      throw new Error("Payment adapters not found. SDK may not have loaded correctly.");
    const s = t[e.providerAlias];
    if (!s?.render)
      throw new Error(`Adapter for '${e.providerAlias}' not found or missing render method.`);
    await new Promise((d) => requestAnimationFrame(d));
    const r = this.shadowRoot?.querySelector("#payment-form-container");
    if (!r)
      throw new Error("Payment form container not found.");
    const u = {
      showError: (d) => {
        this._paymentFormError = d;
      },
      hideError: () => {
        this._paymentFormError = void 0;
      }
    };
    await s.render(r, e, u), k(this, v, s);
  }
  async _handleProcessTestPayment() {
    if (!c(this, v)?.tokenize) {
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
      const t = c(this, v).tokenizeWithVerification ? await c(this, v).tokenizeWithVerification({
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
      }) : await c(this, v).tokenize();
      if (!t.success) {
        t.isButtonFlow ? this._paymentFormError = t.error || "Please use the payment button to complete payment." : this._paymentFormError = t.error || "Failed to get payment details. Please check your card information.", this._isProcessingPayment = !1;
        return;
      }
      const { data: s, error: r } = await h.processTestPayment(e, {
        sessionId: this._testResult.sessionId,
        paymentMethodToken: t.nonce,
        methodAlias: this._testResult.methodAlias,
        amount: this._amount,
        testInvoiceId: this._testResult.testInvoiceId
      });
      if (!c(this, m)) return;
      r ? this._paymentResult = {
        success: !1,
        message: r.message
      } : s && (this._paymentResult = {
        success: s.success,
        message: s.success ? `Payment successful! Transaction ID: ${s.transactionId || "N/A"}` : s.errorMessage || "Payment failed.",
        transactionId: s.transactionId
      });
    } catch (t) {
      this._paymentResult = {
        success: !1,
        message: t instanceof Error ? t.message : "An unexpected error occurred."
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
    const { data: t } = await h.getPaymentProviderMethods(e);
    c(this, m) && (t && (this._expressMethods = t.filter((s) => s.isExpressCheckout && s.isEnabled)), this._isLoadingExpressMethods = !1);
  }
  async _loadExpressButton(e) {
    this._loadingExpressMethod = e.methodAlias, this._expressError = void 0;
    const t = this.data?.setting.id;
    if (!t) {
      this._expressError = "Setting ID missing.", this._loadingExpressMethod = void 0;
      return;
    }
    try {
      const { data: s, error: r } = await h.getTestExpressConfig(t, e.methodAlias, this._amount);
      if (!c(this, m)) return;
      if (r || !s) {
        this._expressError = r?.message || "Failed to get express checkout config", this._loadingExpressMethod = void 0;
        return;
      }
      const u = s.sdkConfig?.clientSdkUrl;
      u && await this._loadScript(u), s.sdkUrl && await this._loadScript(s.sdkUrl), s.customAdapterUrl && await this._loadScript(s.customAdapterUrl), await new Promise((S) => requestAnimationFrame(S));
      const d = this.shadowRoot?.querySelector(`#express-button-${e.methodAlias}`);
      if (!d) {
        this._expressError = `Container not found for ${e.methodAlias}`, this._loadingExpressMethod = void 0;
        return;
      }
      const p = window.MerchelloExpressAdapters;
      if (!p) {
        this._expressError = "Express adapters not found. SDK may not have loaded correctly.", this._loadingExpressMethod = void 0;
        return;
      }
      const _ = this.data?.setting.providerAlias || "", y = p[`${_}:${e.methodAlias}`] || p[_];
      if (!y?.render) {
        this._expressError = `Express adapter for '${_}' not found or missing render method.`, this._loadingExpressMethod = void 0;
        return;
      }
      const C = {
        isProcessing: !1,
        error: null,
        processExpressCheckout: async (S, W, R, U, D) => {
          this._expressResult = {
            success: !0,
            message: `Express checkout successful! Nonce: ${R.substring(0, 20)}...`,
            transactionId: R
          }, this._loadingExpressMethod = void 0;
        }
      }, $ = {
        methodAlias: e.methodAlias,
        sdkUrl: s.sdkUrl,
        sdkConfig: s.sdkConfig
      }, b = {
        amount: this._amount,
        currency: s.sdkConfig?.currency || "USD"
      };
      await y.render(d, $, b, C);
    } catch (s) {
      this._expressError = s instanceof Error ? s.message : "Failed to load express button";
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
    const { data: t } = await h.getWebhookEventTemplates(e);
    c(this, m) && (t && (this._webhookTemplates = t, t.length > 0 && !this._selectedWebhookEvent && (this._selectedWebhookEvent = t[0].eventType)), this._isLoadingWebhookTemplates = !1);
  }
  async _handleSimulateWebhook() {
    this._isSimulatingWebhook = !0, this._webhookResult = void 0;
    const e = this.data?.setting.id;
    if (!e) {
      this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: "Setting ID missing." }, this._isSimulatingWebhook = !1;
      return;
    }
    const t = {
      eventType: this._selectedWebhookEvent || "payment.completed",
      amount: this._amount,
      customPayload: this._useCustomPayload ? this._customWebhookPayload : void 0
    }, { data: s, error: r } = await h.simulateWebhook(e, t);
    c(this, m) && (r ? this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: r.message } : s && (this._webhookResult = s), this._isSimulatingWebhook = !1);
  }
  // ============================================
  // Payment Links Tab
  // ============================================
  async _handleGeneratePaymentLink() {
    this._isGeneratingPaymentLink = !0, this._paymentLinkResult = void 0;
    const e = this.data?.setting.id, t = this.data?.setting.providerAlias;
    if (!e || !t) {
      this._paymentLinkResult = { success: !1, errorMessage: "Provider settings missing." }, this._isGeneratingPaymentLink = !1;
      return;
    }
    const { data: s, error: r } = await h.testPaymentLink(e, { amount: this._amount });
    c(this, m) && (r ? this._paymentLinkResult = { success: !1, errorMessage: r.message } : s && (this._paymentLinkResult = {
      success: s.success,
      paymentUrl: s.paymentUrl,
      errorMessage: s.errorMessage
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
      case g.Redirect:
        return "Redirect";
      case g.HostedFields:
        return "Hosted Fields";
      case g.Widget:
        return "Widget";
      case g.DirectForm:
        return "Direct Form";
      default:
        return "Unknown";
    }
  }
  _getTestCardInfo() {
    const e = this.data?.setting.providerAlias?.toLowerCase() || "default";
    return P[e] || P.default;
  }
  _getDefaultVaultToken() {
    switch (this.data?.setting.providerAlias?.toLowerCase() || "default") {
      case "stripe":
        return "pm_card_visa";
      case "braintree":
        return "fake-valid-nonce";
      default:
        return "";
    }
  }
  _renderTabs() {
    return a`
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
        ${this._supportsPaymentLinks ? a`
          <button
            class="tab ${this._activeTab === "paymentlinks" ? "active" : ""}"
            @click=${() => this._handleTabChange("paymentlinks")}
          >
            Payment Links
          </button>
        ` : i}
        ${this._supportsVaulting ? a`
          <button
            class="tab ${this._activeTab === "vault" ? "active" : ""}"
            @click=${() => this._handleTabChange("vault")}
          >
            Vault
          </button>
        ` : i}
      </div>
    `;
  }
  _renderAmountInput() {
    const e = z();
    return a`
      <div class="form-row">
        <label>Test Amount (${e})</label>
        <uui-input
          type="number"
          min="0.01"
          step="0.01"
          .value=${String(this._amount)}
          @input=${(t) => this._amount = parseFloat(t.target.value) || 100}
        ></uui-input>
      </div>
    `;
  }
  _renderSessionTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Test your provider configuration by creating a payment session.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isTesting}
          @click=${this._handleTestSession}
        >
          ${this._isTesting ? a`<uui-loader-circle></uui-loader-circle>` : i}
          ${this._isTesting ? "Creating Session..." : "Create Test Session"}
        </uui-button>

        ${this._testResult ? this._renderSessionResults() : i}
      </div>
    `;
  }
  _renderSessionResults() {
    if (!this._testResult) return i;
    const { isSuccessful: e, integrationType: t, errorMessage: s, errorCode: r, sessionId: u, redirectUrl: d, clientToken: p, clientSecret: _, javaScriptSdkUrl: y, adapterUrl: C, formFields: $ } = this._testResult;
    return a`
      <div class="results-section">
        ${!e && s ? a`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${s}</p>
                  ${r ? a`<p class="error-code">Error code: ${r}</p>` : i}
                </div>
              </div>
            ` : i}

        ${e ? a`
              <div class="result-card success">
                <uui-icon name="icon-check"></uui-icon>
                <span>Session created successfully</span>
              </div>
            ` : i}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="badge">${this._getIntegrationTypeName(t)}</span>
          </div>

          ${u ? a`
            <div class="detail-row">
              <span class="detail-label">Session ID</span>
              <span class="detail-value monospace">${u}</span>
            </div>
          ` : i}

          ${d ? a`
            <div class="detail-row">
              <span class="detail-label">Redirect URL</span>
              <a href="${d}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${d} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : i}

          ${p ? a`
            <div class="detail-row">
              <span class="detail-label">Client Token</span>
              <span class="detail-value monospace truncate" title="${p}">${p}</span>
            </div>
          ` : i}

          ${_ ? a`
            <div class="detail-row">
              <span class="detail-label">Client Secret</span>
              <span class="detail-value monospace truncate" title="${_}">${_}</span>
            </div>
          ` : i}

          ${y ? a`
            <div class="detail-row">
              <span class="detail-label">JavaScript SDK URL</span>
              <a href="${y}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${y} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : i}

          ${C ? a`
            <div class="detail-row">
              <span class="detail-label">Adapter URL</span>
              <span class="detail-value monospace">${C}</span>
            </div>
          ` : i}

          ${$ && $.length > 0 ? a`
            <div class="detail-section">
              <span class="detail-label">Form Fields</span>
              <div class="form-fields-list">
                ${$.map((b) => a`
                  <div class="form-field-item">
                    <span class="field-label">${b.label}</span>
                    <span class="field-key">${b.key}</span>
                    <div class="field-meta">
                      <span class="field-type">${b.fieldType}</span>
                      ${b.isRequired ? a`<span class="field-required">Required</span>` : i}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          ` : i}
        </div>
      </div>
    `;
  }
  _renderPaymentFormTab() {
    const e = this._getTestCardInfo(), t = this._testResult?.integrationType === g.Widget;
    return a`
      <div class="tab-content">
        <p class="tab-description">Load and test the actual payment form with sandbox credentials.</p>

        ${this._renderAmountInput()}

        <div class="test-card-info">
          <strong>Test Card:</strong> ${e.card} | <strong>Exp:</strong> ${e.expiry} | <strong>CVV:</strong> ${e.cvv}
        </div>

        ${this._paymentFormLoaded ? i : a`
          <uui-button
            look="primary"
            ?disabled=${this._isLoadingPaymentForm}
            @click=${this._handleLoadPaymentForm}
          >
            ${this._isLoadingPaymentForm ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isLoadingPaymentForm ? "Loading..." : "Load Payment Form"}
          </uui-button>
        `}

        ${this._paymentFormError ? a`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._paymentFormError}</span>
          </div>
        ` : i}

        <div id="payment-form-container" class="${this._paymentFormLoaded ? "visible" : "hidden"}">
          <!-- Payment form will be rendered here by the adapter -->
        </div>

        ${this._paymentFormLoaded && !t ? a`
          <uui-button
            look="primary"
            ?disabled=${this._isProcessingPayment}
            @click=${this._handleProcessTestPayment}
          >
            ${this._isProcessingPayment ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isProcessingPayment ? "Processing..." : "Process Test Payment"}
          </uui-button>
        ` : i}

        ${this._paymentFormLoaded && t ? a`
          <p class="hint">Use the payment buttons above to complete the test payment.</p>
        ` : i}

        ${this._paymentResult ? a`
          <div class="result-card ${this._paymentResult.success ? "success" : "error"}">
            <uui-icon name="${this._paymentResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
            <span>${this._paymentResult.message}</span>
          </div>
        ` : i}
      </div>
    `;
  }
  _renderExpressCheckoutTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Express checkout buttons (Apple Pay, Google Pay, PayPal) require domain verification and HTTPS.</p>

        <div class="warning-box">
          <uui-icon name="icon-alert"></uui-icon>
          <span>Some express checkout buttons may not work in the backoffice due to domain restrictions. PayPal typically works in sandbox mode.</span>
        </div>

        ${this._renderAmountInput()}

        ${this._isLoadingExpressMethods ? a`
          <uui-loader-bar></uui-loader-bar>
        ` : i}

        ${!this._isLoadingExpressMethods && this._expressMethods.length === 0 ? a`
          <p class="empty-state">No express checkout methods enabled for this provider.</p>
        ` : i}

        ${this._expressError ? a`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._expressError}</span>
          </div>
        ` : i}

        ${this._expressResult ? a`
          <div class="result-card ${this._expressResult.success ? "success" : "error"}">
            <uui-icon name="${this._expressResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
            <span>${this._expressResult.message}</span>
          </div>
        ` : i}

        ${this._expressMethods.length > 0 ? a`
          <div class="express-methods-list">
            ${this._expressMethods.map((e) => a`
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
                  ${this._loadingExpressMethod === e.methodAlias ? a`<uui-loader-circle></uui-loader-circle>` : i}
                  ${this._loadingExpressMethod === e.methodAlias ? "Loading..." : "Load Button"}
                </uui-button>
              </div>
            `)}
          </div>
        ` : i}
      </div>
    `;
  }
  _renderWebhooksTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Simulate webhook events to test your provider's webhook handling.</p>

        ${this._isLoadingWebhookTemplates ? a`
          <uui-loader-bar></uui-loader-bar>
        ` : i}

        ${this._isLoadingWebhookTemplates ? i : a`
          ${this._webhookTemplates.length > 0 ? a`
            <div class="form-row">
              <label>Event Type</label>
              <uui-select
                .options=${this._webhookTemplates.map((e) => ({ name: e.displayName, value: e.eventType }))}
                .value=${this._selectedWebhookEvent || ""}
                @change=${(e) => this._selectedWebhookEvent = e.target.value}
              ></uui-select>
            </div>
          ` : i}

          <div class="form-row">
            <label>
              <uui-checkbox
                ?checked=${this._useCustomPayload}
                @change=${(e) => this._useCustomPayload = e.target.checked}
              ></uui-checkbox>
              Use custom payload
            </label>
          </div>

          ${this._useCustomPayload ? a`
            <div class="form-row">
              <label>Custom Payload (JSON)</label>
              <uui-textarea
                .value=${this._customWebhookPayload}
                @input=${(e) => this._customWebhookPayload = e.target.value}
                placeholder='{"type": "payment.completed", ...}'
              ></uui-textarea>
              <span class="hint">Enter the raw webhook JSON payload to test.</span>
            </div>
          ` : i}

          ${this._renderAmountInput()}

          <uui-button
            look="primary"
            ?disabled=${this._isSimulatingWebhook || !this._useCustomPayload && !this._selectedWebhookEvent}
            @click=${this._handleSimulateWebhook}
          >
            ${this._isSimulatingWebhook ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isSimulatingWebhook ? "Simulating..." : "Simulate Webhook"}
          </uui-button>

          ${this._webhookResult ? this._renderWebhookResult() : i}
        `}
      </div>
    `;
  }
  _renderWebhookResult() {
    if (!this._webhookResult) return i;
    const { success: e, validationSkipped: t, eventTypeDetected: s, actionsPerformed: r, payload: u, errorMessage: d } = this._webhookResult;
    return a`
      <div class="results-section">
        <div class="result-card ${e ? "success" : "error"}">
          <uui-icon name="${e ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${e ? "Webhook processed successfully" : "Webhook processing failed"}</span>
        </div>

        ${d ? a`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${d}</span>
          </div>
        ` : i}

        <div class="result-details">
          ${t ? a`
            <div class="detail-row">
              <span class="detail-label">Validation</span>
              <span class="badge">Skipped (test mode)</span>
            </div>
          ` : i}

          ${s ? a`
            <div class="detail-row">
              <span class="detail-label">Event Detected</span>
              <span class="detail-value">${s}</span>
            </div>
          ` : i}

          ${r && r.length > 0 ? a`
            <div class="detail-section">
              <span class="detail-label">Actions Performed</span>
              <ul class="actions-list">
                ${r.map((p) => a`<li>${p}</li>`)}
              </ul>
            </div>
          ` : i}

          ${u ? a`
            <details class="payload-details">
              <summary>View Payload</summary>
              <pre class="payload-content">${u}</pre>
            </details>
          ` : i}
        </div>
      </div>
    `;
  }
  _renderPaymentLinksTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Test payment link generation for this provider.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isGeneratingPaymentLink}
          @click=${this._handleGeneratePaymentLink}
        >
          ${this._isGeneratingPaymentLink ? a`<uui-loader-circle></uui-loader-circle>` : i}
          ${this._isGeneratingPaymentLink ? "Generating..." : "Generate Test Payment Link"}
        </uui-button>

        ${this._paymentLinkResult ? a`
          <div class="results-section">
            <div class="result-card ${this._paymentLinkResult.success ? "success" : "error"}">
              <uui-icon name="${this._paymentLinkResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
              <span>${this._paymentLinkResult.success ? "Payment link generated successfully" : "Failed to generate payment link"}</span>
            </div>

            ${this._paymentLinkResult.errorMessage ? a`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._paymentLinkResult.errorMessage}</span>
              </div>
            ` : i}

            ${this._paymentLinkResult.paymentUrl ? a`
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
            ` : i}
          </div>
        ` : i}
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
  // ============================================
  // Vault Tab
  // ============================================
  _renderVaultTab() {
    const e = this._getTestCardInfo(), s = (this.data?.setting.providerAlias?.toLowerCase() || "") !== "paypal", r = this._getDefaultVaultToken() || "Enter token/nonce";
    return a`
      <div class="tab-content">
        <p class="tab-description">Test vaulted payments functionality - save and charge payment methods without a real transaction.</p>

        <!-- Step 1: Create Vault Setup Session -->
        <div class="vault-section">
          <h4>1. Create Vault Setup Session</h4>
          <p class="hint">Create a setup session to save a payment method for future use.</p>

          <uui-button
            look="primary"
            ?disabled=${this._isCreatingVaultSetup}
            @click=${this._handleCreateVaultSetup}
          >
            ${this._isCreatingVaultSetup ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isCreatingVaultSetup ? "Creating..." : "Create Vault Setup Session"}
          </uui-button>

          ${this._vaultSetupResult ? a`
            <div class="result-card ${this._vaultSetupResult.success ? "success" : "error"}">
              <uui-icon name="${this._vaultSetupResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
              <span>${this._vaultSetupResult.success ? "Setup session created" : "Failed to create setup session"}</span>
            </div>

            ${this._vaultSetupResult.errorMessage ? a`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._vaultSetupResult.errorMessage}</span>
              </div>
            ` : i}

            ${this._vaultSetupResult.success ? a`
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Session ID</span>
                  <span class="detail-value monospace">${this._vaultSetupResult.setupSessionId}</span>
                </div>
                ${this._vaultSetupResult.clientSecret ? a`
                  <div class="detail-row">
                    <span class="detail-label">Client Secret</span>
                    <span class="detail-value monospace truncate">${this._vaultSetupResult.clientSecret}</span>
                  </div>
                ` : i}
                ${this._vaultSetupResult.redirectUrl ? a`
                  <div class="detail-row">
                    <span class="detail-label">Approval URL</span>
                    <a class="url-link" href="${this._vaultSetupResult.redirectUrl}" target="_blank" rel="noopener">
                      ${this._vaultSetupResult.redirectUrl}
                    </a>
                  </div>
                ` : i}
                ${this._vaultSetupResult.providerCustomerId ? a`
                  <div class="detail-row">
                    <span class="detail-label">Provider Customer ID</span>
                    <span class="detail-value monospace">${this._vaultSetupResult.providerCustomerId}</span>
                  </div>
                ` : i}
              </div>
            ` : i}
          ` : i}
        </div>

        <!-- Step 2: Confirm Vault Setup (Card Entry) -->
        ${this._vaultSetupResult?.success ? a`
          <div class="vault-section">
            <h4>2. Confirm Vault Setup</h4>
            <div class="test-card-info">
              <strong>Test Card:</strong> ${e.card} | <strong>Exp:</strong> ${e.expiry} | <strong>CVV:</strong> ${e.cvv}
            </div>

            ${s ? a`
              <div class="form-row">
                <label>Payment Method Token / Nonce</label>
                <uui-input
                  .value=${this._vaultPaymentMethodToken}
                  placeholder="${r}"
                  @input=${(u) => this._vaultPaymentMethodToken = u.target.value}
                ></uui-input>
                <p class="hint">Use a provider test token (e.g., Stripe pm_card_visa, Braintree fake-valid-nonce).</p>
              </div>
            ` : a`
              <p class="hint">No token required. Complete the approval in the provider’s window before confirming.</p>
            `}

            <div id="vault-form-container" class="payment-form-container">
              <!-- Payment form would be rendered here by the adapter -->
              <p class="hint">In a real implementation, the provider's payment form would appear here.</p>
            </div>

            <uui-button
              look="primary"
              ?disabled=${this._isConfirmingVault}
              @click=${this._handleConfirmVaultSetup}
            >
              ${this._isConfirmingVault ? a`<uui-loader-circle></uui-loader-circle>` : i}
              ${this._isConfirmingVault ? "Confirming..." : "Confirm & Save Payment Method"}
            </uui-button>

            ${this._vaultConfirmResult ? a`
              <div class="result-card ${this._vaultConfirmResult.success ? "success" : "error"}">
                <uui-icon name="${this._vaultConfirmResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
                <span>${this._vaultConfirmResult.success ? "Payment method saved" : "Failed to save payment method"}</span>
              </div>

              ${this._vaultConfirmResult.errorMessage ? a`
                <div class="result-errors">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._vaultConfirmResult.errorMessage}</span>
                </div>
              ` : i}

              ${this._vaultConfirmResult.success ? a`
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Display Label</span>
                    <span class="detail-value">${this._vaultConfirmResult.displayLabel}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Provider Method ID</span>
                    <span class="detail-value monospace">${this._vaultConfirmResult.providerMethodId}</span>
                  </div>
                  ${this._vaultConfirmResult.providerCustomerId ? a`
                    <div class="detail-row">
                      <span class="detail-label">Provider Customer ID</span>
                      <span class="detail-value monospace">${this._vaultConfirmResult.providerCustomerId}</span>
                    </div>
                  ` : i}
                  ${this._vaultConfirmResult.cardBrand ? a`
                    <div class="detail-row">
                      <span class="detail-label">Card Brand</span>
                      <span class="detail-value">${this._vaultConfirmResult.cardBrand}</span>
                    </div>
                  ` : i}
                  ${this._vaultConfirmResult.last4 ? a`
                    <div class="detail-row">
                      <span class="detail-label">Last 4</span>
                      <span class="detail-value">${this._vaultConfirmResult.last4}</span>
                    </div>
                  ` : i}
                  ${this._vaultConfirmResult.expiryMonth && this._vaultConfirmResult.expiryYear ? a`
                    <div class="detail-row">
                      <span class="detail-label">Expiry</span>
                      <span class="detail-value">${String(this._vaultConfirmResult.expiryMonth).padStart(2, "0")}/${String(this._vaultConfirmResult.expiryYear).slice(-2)}</span>
                    </div>
                  ` : i}
                </div>
              ` : i}
            ` : i}
          </div>
        ` : i}

        <!-- Step 3: Test Charge -->
        ${this._vaultConfirmResult?.success ? a`
          <div class="vault-section">
            <h4>3. Test Charge</h4>
            <p class="hint">Charge the saved payment method.</p>

            <div class="form-row">
              <label>Charge Amount</label>
              <uui-input
                type="number"
                min="0.01"
                step="0.01"
                .value=${String(this._vaultChargeAmount)}
                @input=${(u) => this._vaultChargeAmount = parseFloat(u.target.value) || 10}
              ></uui-input>
            </div>

            <div class="button-group">
              <uui-button
                look="primary"
                ?disabled=${this._isChargingVault}
                @click=${this._handleTestVaultCharge}
              >
                ${this._isChargingVault ? a`<uui-loader-circle></uui-loader-circle>` : i}
                ${this._isChargingVault ? "Charging..." : "Test Charge"}
              </uui-button>

              <uui-button
                look="secondary"
                color="danger"
                @click=${this._handleDeleteVaultedMethod}
              >
                Delete Method
              </uui-button>
            </div>

            ${this._vaultChargeResult ? a`
              <div class="result-card ${this._vaultChargeResult.success ? "success" : "error"}">
                <uui-icon name="${this._vaultChargeResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
                <span>${this._vaultChargeResult.success ? "Charge successful" : "Charge failed"}</span>
              </div>

              ${this._vaultChargeResult.errorMessage ? a`
                <div class="result-errors">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._vaultChargeResult.errorMessage}</span>
                </div>
              ` : i}

              ${this._vaultChargeResult.transactionId ? a`
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Transaction ID</span>
                    <span class="detail-value monospace">${this._vaultChargeResult.transactionId}</span>
                  </div>
                </div>
              ` : i}
            ` : i}
          </div>
        ` : i}
      </div>
    `;
  }
  async _handleCreateVaultSetup() {
    this._isCreatingVaultSetup = !0, this._vaultSetupResult = void 0, this._vaultConfirmResult = void 0, this._vaultChargeResult = void 0;
    const e = this.data?.setting.id;
    if (!e) {
      this._vaultSetupResult = { success: !1, errorMessage: "Setting ID missing." }, this._isCreatingVaultSetup = !1;
      return;
    }
    try {
      const { data: t, error: s } = await h.testVaultSetup(e, {});
      s || !t ? this._vaultSetupResult = {
        success: !1,
        errorMessage: s?.message ?? "Failed to create vault setup session."
      } : (this._vaultSetupResult = {
        success: t.success ?? !1,
        setupSessionId: t.setupSessionId,
        clientSecret: t.clientSecret,
        redirectUrl: t.redirectUrl,
        providerCustomerId: t.providerCustomerId,
        errorMessage: t.errorMessage
      }, this._vaultPaymentMethodToken || (this._vaultPaymentMethodToken = this._getDefaultVaultToken()));
    } catch (t) {
      this._vaultSetupResult = {
        success: !1,
        errorMessage: t instanceof Error ? t.message : "Unexpected error"
      };
    }
    this._isCreatingVaultSetup = !1;
  }
  async _handleConfirmVaultSetup() {
    this._isConfirmingVault = !0, this._vaultConfirmResult = void 0, this._vaultChargeResult = void 0;
    const e = this.data?.setting.id;
    if (!e || !this._vaultSetupResult?.setupSessionId) {
      this._vaultConfirmResult = { success: !1, errorMessage: "Setup session not created." }, this._isConfirmingVault = !1;
      return;
    }
    try {
      const { data: t, error: s } = await h.testVaultConfirm(e, {
        setupSessionId: this._vaultSetupResult.setupSessionId,
        // In real implementation, paymentMethodToken would come from the SDK
        paymentMethodToken: this._vaultPaymentMethodToken || void 0,
        providerCustomerId: this._vaultSetupResult.providerCustomerId
      });
      s || !t ? this._vaultConfirmResult = {
        success: !1,
        errorMessage: s?.message ?? "Failed to confirm vault setup."
      } : this._vaultConfirmResult = {
        success: t.success ?? !1,
        providerMethodId: t.providerMethodId,
        providerCustomerId: t.providerCustomerId,
        displayLabel: t.displayLabel,
        cardBrand: t.cardBrand,
        last4: t.last4,
        expiryMonth: t.expiryMonth,
        expiryYear: t.expiryYear,
        errorMessage: t.errorMessage
      };
    } catch (t) {
      this._vaultConfirmResult = {
        success: !1,
        errorMessage: t instanceof Error ? t.message : "Unexpected error"
      };
    }
    this._isConfirmingVault = !1;
  }
  async _handleTestVaultCharge() {
    this._isChargingVault = !0, this._vaultChargeResult = void 0;
    const e = this.data?.setting.id;
    if (!e || !this._vaultConfirmResult?.providerMethodId) {
      this._vaultChargeResult = { success: !1, errorMessage: "No vaulted method available." }, this._isChargingVault = !1;
      return;
    }
    try {
      const { data: t, error: s } = await h.testVaultCharge(e, {
        providerMethodId: this._vaultConfirmResult.providerMethodId,
        providerCustomerId: this._vaultConfirmResult.providerCustomerId ?? this._vaultSetupResult?.providerCustomerId,
        amount: this._vaultChargeAmount,
        currencyCode: "USD"
      });
      s || !t ? this._vaultChargeResult = {
        success: !1,
        errorMessage: s?.message ?? "Failed to charge vaulted method."
      } : this._vaultChargeResult = {
        success: t.success ?? !1,
        transactionId: t.transactionId,
        errorMessage: t.errorMessage
      };
    } catch (t) {
      this._vaultChargeResult = {
        success: !1,
        errorMessage: t instanceof Error ? t.message : "Unexpected error"
      };
    }
    this._isChargingVault = !1;
  }
  async _handleDeleteVaultedMethod() {
    const e = this.data?.setting.id;
    if (!(!e || !this._vaultConfirmResult?.providerMethodId))
      try {
        await h.testVaultDelete(e, this._vaultConfirmResult.providerMethodId), this._vaultSetupResult = void 0, this._vaultConfirmResult = void 0, this._vaultChargeResult = void 0;
      } catch (t) {
        this._errorMessage = t instanceof Error ? t.message : "Failed to delete vaulted method";
      }
  }
  render() {
    const e = this.data?.setting.displayName ?? "Provider";
    return a`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? a`
            <div class="error-banner">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._errorMessage}</span>
              <uui-button look="secondary" compact @click=${() => this._errorMessage = null}>Dismiss</uui-button>
            </div>
          ` : i}

          ${this._renderTabs()}

          ${this._activeTab === "session" ? this._renderSessionTab() : i}
          ${this._activeTab === "payment" ? this._renderPaymentFormTab() : i}
          ${this._activeTab === "express" ? this._renderExpressCheckoutTab() : i}
          ${this._activeTab === "webhooks" ? this._renderWebhooksTab() : i}
          ${this._activeTab === "paymentlinks" ? this._renderPaymentLinksTab() : i}
          ${this._activeTab === "vault" ? this._renderVaultTab() : i}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
o.styles = E`
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

    /* Vault section */
    .vault-section {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .vault-section h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.9375rem;
    }

    .vault-section .hint {
      margin-bottom: var(--uui-size-space-3);
    }

    .payment-form-container {
      min-height: 100px;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .button-group {
      display: flex;
      gap: var(--uui-size-space-2);
    }
  `;
n([
  l()
], o.prototype, "_activeTab", 2);
n([
  l()
], o.prototype, "_amount", 2);
n([
  l()
], o.prototype, "_isTesting", 2);
n([
  l()
], o.prototype, "_testResult", 2);
n([
  l()
], o.prototype, "_isLoadingPaymentForm", 2);
n([
  l()
], o.prototype, "_paymentFormLoaded", 2);
n([
  l()
], o.prototype, "_paymentFormError", 2);
n([
  l()
], o.prototype, "_isProcessingPayment", 2);
n([
  l()
], o.prototype, "_paymentResult", 2);
n([
  l()
], o.prototype, "_expressMethods", 2);
n([
  l()
], o.prototype, "_isLoadingExpressMethods", 2);
n([
  l()
], o.prototype, "_loadingExpressMethod", 2);
n([
  l()
], o.prototype, "_expressError", 2);
n([
  l()
], o.prototype, "_expressResult", 2);
n([
  l()
], o.prototype, "_webhookTemplates", 2);
n([
  l()
], o.prototype, "_isLoadingWebhookTemplates", 2);
n([
  l()
], o.prototype, "_selectedWebhookEvent", 2);
n([
  l()
], o.prototype, "_customWebhookPayload", 2);
n([
  l()
], o.prototype, "_useCustomPayload", 2);
n([
  l()
], o.prototype, "_isSimulatingWebhook", 2);
n([
  l()
], o.prototype, "_webhookResult", 2);
n([
  l()
], o.prototype, "_isGeneratingPaymentLink", 2);
n([
  l()
], o.prototype, "_paymentLinkResult", 2);
n([
  l()
], o.prototype, "_supportsPaymentLinks", 2);
n([
  l()
], o.prototype, "_supportsVaulting", 2);
n([
  l()
], o.prototype, "_isCreatingVaultSetup", 2);
n([
  l()
], o.prototype, "_vaultSetupResult", 2);
n([
  l()
], o.prototype, "_isConfirmingVault", 2);
n([
  l()
], o.prototype, "_vaultConfirmResult", 2);
n([
  l()
], o.prototype, "_isChargingVault", 2);
n([
  l()
], o.prototype, "_vaultChargeResult", 2);
n([
  l()
], o.prototype, "_vaultChargeAmount", 2);
n([
  l()
], o.prototype, "_vaultPaymentMethodToken", 2);
n([
  l()
], o.prototype, "_errorMessage", 2);
o = n([
  L("merchello-test-payment-provider-modal")
], o);
const O = o;
export {
  o as MerchelloTestPaymentProviderModalElement,
  O as default
};
//# sourceMappingURL=test-provider-modal.element-DhmOmqLZ.js.map
