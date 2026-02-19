import { LitElement as S, html as o, nothing as h, css as I, state as s, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { M as c } from "./merchello-api-OYuQK4Mu.js";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { UmbDataTypeDetailRepository as K } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as D } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
import { UMB_MODAL_MANAGER_CONTEXT as W } from "@umbraco-cms/backoffice/modal";
import { M as j } from "./product-picker-modal.token-BfbHsSHl.js";
import { c as J } from "./formatting-CuYSKks5.js";
var Y = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, C = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? Q(t, i) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (a ? d(t, i, r) : d(r)) || r);
  return a && r && Y(t, i, r), r;
};
let g = class extends T(S) {
  constructor() {
    super(...arguments), this._isInstalling = !1, this._isInstallComplete = !1, this._message = "", this._hasError = !1;
  }
  async _installSeedData() {
    if (this._isInstalling || this._isInstallComplete) return;
    this._isInstalling = !0, this._hasError = !1, this._message = "";
    const { data: e, error: t } = await c.installSeedData();
    if (this._isInstalling = !1, t || !e) {
      this._hasError = !0, this._message = t?.message ?? "Seed data installation failed.";
      return;
    }
    this._applyInstallResult(e);
  }
  _applyInstallResult(e) {
    this._hasError = !e.success, this._message = e.message, e.success && (this._isInstallComplete = !0, this.dispatchEvent(
      new CustomEvent("seed-data-installed", { bubbles: !0, composed: !0 })
    ));
  }
  render() {
    return this._isInstallComplete ? this._renderComplete() : this._isInstalling ? this._renderInstalling() : this._renderReady();
  }
  _renderReady() {
    return o`
      <uui-box>
        <div class="header">
          <uui-icon name="icon-wand"></uui-icon>
          <div>
            <h3>Install Sample Data</h3>
            <p>
              Populate your store with sample products, warehouses, customers,
              and invoices to explore Merchello's features.
            </p>
          </div>
        </div>

        ${this._hasError ? o`
              <uui-alert color="danger">${this._message}</uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Retry"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            ` : o`
              <uui-alert color="default">
                Installation typically takes about a minute. Please don't
                navigate away during installation.
              </uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Install Sample Data"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            `}
      </uui-box>
    `;
  }
  _renderInstalling() {
    return o`
      <uui-box>
        <div class="installing">
          <uui-loader-bar></uui-loader-bar>
          <h3>Installing Sample Data...</h3>
          <p>
            Creating products, warehouses, customers, and invoices. This may
            take up to a minute.
          </p>
        </div>
      </uui-box>
    `;
  }
  _renderComplete() {
    return o`
      <uui-box>
        <div class="complete">
          <uui-icon name="icon-check" class="success-icon"></uui-icon>
          <h3>Sample Data Installed</h3>
          ${this._message ? o`<p>${this._message}</p>` : h}
          <p class="next-steps">
            Explore your store by navigating to
            <strong>Products</strong>, <strong>Orders</strong>, or
            <strong>Customers</strong> in the sidebar.
          </p>
        </div>
      </uui-box>
    `;
  }
};
g.styles = I`
    :host {
      display: block;
    }

    h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    p {
      margin: 0;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .header {
      display: flex;
      gap: var(--uui-size-space-5);
      align-items: flex-start;
      margin-bottom: var(--uui-size-space-4);
    }

    .header > uui-icon {
      font-size: 2rem;
      color: var(--uui-color-interactive);
      flex-shrink: 0;
      margin-top: var(--uui-size-space-1);
    }

    .actions {
      margin-top: var(--uui-size-space-5);
    }

    uui-alert {
      margin-top: var(--uui-size-space-4);
    }

    .installing {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .installing uui-loader-bar {
      margin-bottom: var(--uui-size-space-5);
    }

    .complete {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .success-icon {
      font-size: 2.5rem;
      color: var(--uui-color-positive);
      margin-bottom: var(--uui-size-space-4);
    }

    .next-steps {
      margin-top: var(--uui-size-space-4);
      font-size: 0.875rem;
    }
  `;
C([
  s()
], g.prototype, "_isInstalling", 2);
C([
  s()
], g.prototype, "_isInstallComplete", 2);
C([
  s()
], g.prototype, "_message", 2);
C([
  s()
], g.prototype, "_hasError", 2);
g = C([
  $("merchello-seed-data-workspace")
], g);
var X = Object.defineProperty, Z = Object.getOwnPropertyDescriptor, M = (e) => {
  throw TypeError(e);
}, u = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? Z(t, i) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (a ? d(t, i, r) : d(r)) || r);
  return a && r && X(t, i, r), r;
}, V = (e, t, i) => t.has(e) || M("Cannot " + i), U = (e, t, i) => (V(e, t, "read from private field"), t.get(e)), A = (e, t, i) => t.has(e) ? M("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), B = (e, t, i, a) => (V(e, t, "write to private field"), t.set(e, i), i), f, P;
let l = class extends T(S) {
  constructor() {
    super(), this._isLoadingDiagnostics = !0, this._diagnosticsError = null, this._diagnostics = null, this._modeRequested = "adapter", this._templatePreset = "physical", this._agentId = "", this._dryRun = !0, this._realOrderConfirmed = !1, this._paymentHandlerId = "manual:manual", this._availablePaymentHandlerIds = [], this._selectedProducts = [], this._buyerEmail = "buyer@example.com", this._buyerPhone = "+14155550100", this._buyerGivenName = "Alex", this._buyerFamilyName = "Taylor", this._buyerAddressLine1 = "1 Test Street", this._buyerAddressLine2 = "", this._buyerLocality = "New York", this._buyerAdministrativeArea = "NY", this._buyerPostalCode = "10001", this._buyerCountryCode = "US", this._discountCodesInput = "", this._sessionId = null, this._sessionStatus = null, this._orderId = null, this._fulfillmentGroups = [], this._selectedFulfillmentOptionIds = {}, this._transcripts = [], this._activeStep = null, A(this, f), A(this, P), this.consumeContext(W, (e) => {
      B(this, f, e);
    }), this.consumeContext(N, (e) => {
      B(this, P, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadDiagnostics();
  }
  async _loadDiagnostics() {
    this._isLoadingDiagnostics = !0, this._diagnosticsError = null;
    const { data: e, error: t } = await c.getUcpFlowDiagnostics();
    if (t || !e) {
      this._diagnosticsError = t?.message ?? "Unable to load UCP flow diagnostics.", this._isLoadingDiagnostics = !1;
      return;
    }
    this._diagnostics = e, this._agentId || (this._agentId = e.simulatedAgentId ?? ""), this._isLoadingDiagnostics = !1;
  }
  _handleModeChange(e) {
    const t = this._readInputValue(e);
    this._modeRequested = t === "strict" ? "strict" : "adapter";
  }
  _handleTemplatePresetChange(e) {
    const t = this._readInputValue(e);
    t === "digital" || t === "incomplete" || t === "multi-item" || t === "physical" ? this._templatePreset = t : this._templatePreset = "physical";
  }
  _handleAgentIdChange(e) {
    this._agentId = this._readInputValue(e);
  }
  _handlePaymentHandlerIdChange(e) {
    this._paymentHandlerId = this._readInputValue(e);
  }
  _handleDryRunChange(e) {
    const t = this._readChecked(e);
    this._dryRun = t, t && (this._realOrderConfirmed = !1);
  }
  _handleRealOrderConfirmedChange(e) {
    this._realOrderConfirmed = this._readChecked(e);
  }
  _handleDiscountCodesChange(e) {
    this._discountCodesInput = this._readInputValue(e);
  }
  _handleBuyerEmailChange(e) {
    this._buyerEmail = this._readInputValue(e);
  }
  _handleBuyerPhoneChange(e) {
    this._buyerPhone = this._readInputValue(e);
  }
  _handleBuyerGivenNameChange(e) {
    this._buyerGivenName = this._readInputValue(e);
  }
  _handleBuyerFamilyNameChange(e) {
    this._buyerFamilyName = this._readInputValue(e);
  }
  _handleBuyerAddressLine1Change(e) {
    this._buyerAddressLine1 = this._readInputValue(e);
  }
  _handleBuyerAddressLine2Change(e) {
    this._buyerAddressLine2 = this._readInputValue(e);
  }
  _handleBuyerLocalityChange(e) {
    this._buyerLocality = this._readInputValue(e);
  }
  _handleBuyerAdministrativeAreaChange(e) {
    this._buyerAdministrativeArea = this._readInputValue(e);
  }
  _handleBuyerPostalCodeChange(e) {
    this._buyerPostalCode = this._readInputValue(e);
  }
  _handleBuyerCountryCodeChange(e) {
    this._buyerCountryCode = this._readInputValue(e).toUpperCase();
  }
  _readInputValue(e) {
    return e.target.value?.toString() ?? "";
  }
  _readChecked(e) {
    return e.target.checked === !0;
  }
  _isStrictModeBlocked() {
    return this._modeRequested === "strict" && this._diagnostics != null && !this._diagnostics.strictModeAvailable;
  }
  _switchToAdapterMode() {
    this._modeRequested = "adapter";
  }
  _startNewRun() {
    this._sessionId = null, this._sessionStatus = null, this._orderId = null, this._fulfillmentGroups = [], this._selectedFulfillmentOptionIds = {}, this._availablePaymentHandlerIds = [], this._paymentHandlerId = "manual:manual", this._transcripts = [], this._activeStep = null, this._realOrderConfirmed = !1;
  }
  async _openProductPicker() {
    if (!U(this, f))
      return;
    const e = this._templatePreset === "digital" ? null : {
      countryCode: this._buyerCountryCode || "US",
      regionCode: this._buyerAdministrativeArea || void 0
    }, i = await U(this, f).open(this, j, {
      data: {
        config: {
          currencySymbol: "$",
          shippingAddress: e,
          excludeProductIds: this._selectedProducts.map((a) => a.productId)
        }
      }
    }).onSubmit().catch(() => {
    });
    i?.selections?.length && this._mergeSelectedProducts(i.selections);
  }
  _mergeSelectedProducts(e) {
    const t = [...this._selectedProducts];
    for (const i of e) {
      const a = this._normalizeSelectedProduct(i);
      if (a == null)
        continue;
      const r = t.findIndex((n) => n.key === a.key);
      if (r >= 0) {
        const n = t[r];
        t[r] = {
          ...n,
          quantity: n.quantity + 1
        };
      } else
        t.push(a);
    }
    this._selectedProducts = t;
  }
  _normalizeSelectedProduct(e) {
    if (!e.productId || !e.name)
      return null;
    const t = e.selectedAddons ?? [], i = t.map((a) => `${a.optionId}:${a.valueId}`).sort().join("|");
    return {
      key: `${e.productId}::${i}`,
      productId: e.productId,
      productRootId: e.productRootId,
      name: e.name,
      sku: e.sku ?? null,
      price: Number.isFinite(e.price) ? e.price : 0,
      imageUrl: e.imageUrl ?? null,
      quantity: 1,
      selectedAddons: t
    };
  }
  _updateProductQuantity(e, t) {
    const i = this._readInputValue(t), a = Number(i), r = Number.isFinite(a) ? Math.max(1, Math.round(a)) : 1;
    this._selectedProducts = this._selectedProducts.map(
      (n) => n.key === e ? {
        ...n,
        quantity: r
      } : n
    );
  }
  _removeProduct(e) {
    this._selectedProducts = this._selectedProducts.filter((t) => t.key !== e);
  }
  _updateFulfillmentGroupSelection(e, t) {
    const i = this._readInputValue(t);
    this._selectedFulfillmentOptionIds = {
      ...this._selectedFulfillmentOptionIds,
      [e]: i
    };
  }
  async _executeManifestStep() {
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest()
    };
    await this._executeStep("manifest", () => c.ucpTestManifest(e));
  }
  async _executeCreateSessionStep() {
    if (this._selectedProducts.length === 0) {
      this._notify("warning", "Select at least one product before creating a session.");
      return;
    }
    const e = {
      lineItems: this._buildLineItemsPayload(),
      currency: "USD",
      buyer: this._buildBuyerPayload(),
      discounts: this._buildDiscountPayload(),
      fulfillment: this._buildCreateFulfillmentPayload()
    }, t = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      request: e
    };
    await this._executeStep("create_session", () => c.ucpTestCreateSession(t));
  }
  async _executeGetSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId
    };
    await this._executeStep("get_session", () => c.ucpTestGetSession(e));
  }
  async _executeUpdateSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }
    const e = {
      lineItems: this._buildLineItemsPayload(),
      buyer: this._buildBuyerPayload(),
      discounts: this._buildDiscountPayload(),
      fulfillment: this._buildUpdateFulfillmentPayload()
    }, t = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
      request: e
    };
    await this._executeStep("update_session", () => c.ucpTestUpdateSession(t));
  }
  async _executeCompleteSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }
    if (!this._dryRun && !this._realOrderConfirmed) {
      this._notify("warning", "Confirm real order creation before running complete.");
      return;
    }
    const e = {
      paymentHandlerId: this._paymentHandlerId
    }, t = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
      dryRun: this._dryRun,
      request: e
    };
    await this._executeStep("complete_session", () => c.ucpTestCompleteSession(t));
  }
  async _executeGetOrderStep() {
    if (!this._orderId) {
      this._notify("warning", "No order ID is available yet.");
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      orderId: this._orderId
    };
    await this._executeStep("get_order", () => c.ucpTestGetOrder(e));
  }
  async _executeCancelSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", "No session is active.");
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId
    };
    await this._executeStep("cancel_session", () => c.ucpTestCancelSession(e));
  }
  async _executeStep(e, t) {
    if (this._activeStep)
      return;
    this._activeStep = e;
    const { data: i, error: a } = await t();
    if (a || !i) {
      this._notify("danger", a?.message ?? `Step ${e} failed.`), this._activeStep = null;
      return;
    }
    this._applyStepResult(i), this._activeStep = null;
  }
  _applyStepResult(e) {
    this._transcripts = [...this._transcripts, e], e.sessionId && (this._sessionId = e.sessionId), e.status && (this._sessionStatus = e.status), e.orderId && (this._orderId = e.orderId), this._syncPaymentHandlers(e.responseData), this._syncFulfillmentGroups(e.responseData);
  }
  _syncPaymentHandlers(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const i = this._asObject(t.ucp), r = this._asArray(i?.payment_handlers).map((n) => this._asObject(n)).map((n) => this._asString(n?.handler_id)).filter((n) => !!n);
    r.length !== 0 && (this._availablePaymentHandlerIds = Array.from(new Set(r)), this._availablePaymentHandlerIds.includes(this._paymentHandlerId) || (this._paymentHandlerId = this._availablePaymentHandlerIds[0]));
  }
  _syncFulfillmentGroups(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const i = this._asObject(t.fulfillment);
    if (!i)
      return;
    const a = this._asArray(i.methods), r = [];
    for (const d of a) {
      const R = this._asObject(d);
      if (R)
        for (const q of this._asArray(R.groups)) {
          const b = this._asObject(q), w = this._asString(b?.id);
          if (!b || !w)
            continue;
          const H = this._asArray(b.options).map((p) => this._asObject(p)).filter((p) => p != null).map((p) => {
            const G = this._asArray(p.totals), F = this._asObject(G[0]);
            return {
              id: this._asString(p.id) ?? "",
              title: this._asString(p.title) ?? "Option",
              amount: this._asNumber(F?.amount),
              currency: this._asString(F?.currency)
            };
          }).filter((p) => p.id.length > 0);
          r.push({
            id: w,
            name: this._asString(b.name) ?? w,
            selectedOptionId: this._asString(b.selected_option_id),
            options: H
          });
        }
    }
    if (r.length === 0)
      return;
    const n = { ...this._selectedFulfillmentOptionIds };
    for (const d of r)
      n[d.id] || (d.selectedOptionId ? n[d.id] = d.selectedOptionId : d.options.length === 1 && (n[d.id] = d.options[0].id));
    this._fulfillmentGroups = r, this._selectedFulfillmentOptionIds = n;
  }
  _buildLineItemsPayload() {
    const e = [...this._selectedProducts];
    return this._templatePreset === "multi-item" && e.length === 1 && e.push({
      ...e[0],
      key: `${e[0].key}::copy`
    }), e.map((t, i) => ({
      id: `li-${i + 1}`,
      quantity: Math.max(1, t.quantity),
      item: {
        id: t.productId,
        title: t.name,
        price: this._toMinorUnits(t.price),
        imageUrl: t.imageUrl ?? void 0,
        options: t.selectedAddons.map((a) => ({
          name: a.optionName,
          value: a.valueName
        }))
      }
    }));
  }
  _buildBuyerPayload() {
    if (this._templatePreset === "incomplete")
      return {
        billingAddress: {
          countryCode: this._buyerCountryCode || "US"
        }
      };
    const e = this._buildAddressPayload();
    return this._templatePreset === "digital" ? {
      email: this._normalizeOrNull(this._buyerEmail) ?? "buyer@example.com",
      phone: this._normalizeOrNull(this._buyerPhone),
      billingAddress: e,
      shippingSameAsBilling: !0
    } : {
      email: this._normalizeOrNull(this._buyerEmail) ?? "buyer@example.com",
      phone: this._normalizeOrNull(this._buyerPhone),
      billingAddress: e,
      shippingAddress: e,
      shippingSameAsBilling: !0
    };
  }
  _buildAddressPayload() {
    return {
      givenName: this._normalizeOrNull(this._buyerGivenName) ?? "Alex",
      familyName: this._normalizeOrNull(this._buyerFamilyName) ?? "Taylor",
      addressLine1: this._normalizeOrNull(this._buyerAddressLine1) ?? "1 Test Street",
      addressLine2: this._normalizeOrNull(this._buyerAddressLine2),
      locality: this._normalizeOrNull(this._buyerLocality) ?? "New York",
      administrativeArea: this._normalizeOrNull(this._buyerAdministrativeArea) ?? "NY",
      postalCode: this._normalizeOrNull(this._buyerPostalCode) ?? "10001",
      countryCode: this._normalizeOrNull(this._buyerCountryCode) ?? "US",
      phone: this._normalizeOrNull(this._buyerPhone)
    };
  }
  _buildDiscountPayload() {
    const e = this._discountCodesInput.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    if (e.length !== 0)
      return {
        codes: e
      };
  }
  _buildCreateFulfillmentPayload() {
    return this._templatePreset === "digital" ? void 0 : {
      methods: [{
        type: "shipping",
        destinations: [
          {
            type: "postal_address",
            address: this._buildAddressPayload()
          }
        ]
      }]
    };
  }
  _buildUpdateFulfillmentPayload() {
    if (this._templatePreset === "digital" && this._fulfillmentGroups.length === 0)
      return;
    const e = this._buildFulfillmentGroupSelections(), t = this._templatePreset === "digital" ? [] : [
      {
        type: "shipping",
        destinations: [
          {
            type: "postal_address",
            address: this._buildAddressPayload()
          }
        ],
        groups: e
      }
    ];
    return {
      methods: t.length > 0 ? t : void 0,
      groups: e.length > 0 ? e : void 0
    };
  }
  _buildFulfillmentGroupSelections() {
    return Object.entries(this._selectedFulfillmentOptionIds).map(([e, t]) => ({
      id: e,
      selectedOptionId: t
    })).filter((e) => !!e.id && !!e.selectedOptionId);
  }
  _toMinorUnits(e) {
    return Number.isFinite(e) ? Math.round(e * 100) : 0;
  }
  _normalizeOrNull(e) {
    const t = e.trim();
    return t.length > 0 ? t : null;
  }
  _getAgentIdForRequest() {
    const e = this._agentId.trim();
    return e.length > 0 ? e : void 0;
  }
  _asObject(e) {
    return e && typeof e == "object" && !Array.isArray(e) ? e : null;
  }
  _asArray(e) {
    return Array.isArray(e) ? e : [];
  }
  _asString(e) {
    if (typeof e == "string") {
      const t = e.trim();
      return t.length > 0 ? t : null;
    }
    return typeof e == "number" || typeof e == "boolean" ? String(e) : null;
  }
  _asNumber(e) {
    if (typeof e == "number" && Number.isFinite(e))
      return e;
    if (typeof e == "string") {
      const t = Number(e);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }
  _formatSnapshotBody(e) {
    const t = e?.trim();
    if (!t)
      return "(empty)";
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return t;
    }
  }
  async _copyText(e, t) {
    try {
      await navigator.clipboard.writeText(e), this._notify("positive", `${t} copied.`);
    } catch {
      this._notify("warning", "Clipboard write failed.");
    }
  }
  _notify(e, t) {
    U(this, P)?.peek(e, {
      data: {
        headline: "UCP Flow Tester",
        message: t
      }
    });
  }
  _renderDiagnosticsPanel() {
    return this._isLoadingDiagnostics ? o`<div class="loading-row"><uui-loader></uui-loader><span>Loading diagnostics...</span></div>` : this._diagnosticsError ? o`
        <div class="error-banner">
          <span>${this._diagnosticsError}</span>
          <uui-button label="Retry diagnostics" look="secondary" @click=${this._loadDiagnostics}>Retry</uui-button>
        </div>
      ` : this._diagnostics ? o`
      <div class="diagnostics-grid">
        <div><span class="label">Protocol Version</span><span class="value">${this._diagnostics.protocolVersion}</span></div>
        <div><span class="label">Strict Mode</span><span class="value">${this._diagnostics.strictModeAvailable ? "Available" : "Blocked"}</span></div>
        <div><span class="label">Public Base URL</span><span class="value">${this._diagnostics.publicBaseUrl || "-"}</span></div>
        <div><span class="label">Effective Base URL</span><span class="value">${this._diagnostics.effectiveBaseUrl || "-"}</span></div>
        <div><span class="label">Require HTTPS</span><span class="value">${this._diagnostics.requireHttps ? "Yes" : "No"}</span></div>
        <div><span class="label">Minimum TLS</span><span class="value">${this._diagnostics.minimumTlsVersion}</span></div>
        <div><span class="label">Agent Profile URL</span><span class="value">${this._diagnostics.simulatedAgentProfileUrl || "-"}</span></div>
        <div><span class="label">Fallback Mode</span><span class="value">${this._diagnostics.strictFallbackMode}</span></div>
      </div>

      <div class="token-row">
        <span class="label">Capabilities</span>
        ${this._diagnostics.capabilities.length === 0 ? o`<span class="value">None</span>` : this._diagnostics.capabilities.map((e) => o`<uui-tag>${e}</uui-tag>`)}
      </div>

      <div class="token-row">
        <span class="label">Extensions</span>
        ${this._diagnostics.extensions.length === 0 ? o`<span class="value">None</span>` : this._diagnostics.extensions.map((e) => o`<uui-tag>${e}</uui-tag>`)}
      </div>
    ` : h;
  }
  _renderStrictBlockedBanner() {
    return this._isStrictModeBlocked() ? o`
      <div class="warning-banner">
        <div>
          <strong>Strict mode is blocked.</strong>
          <div>${this._diagnostics?.strictModeBlockReason || "Strict mode is unavailable in this runtime."}</div>
        </div>
        <uui-button
          label="Switch to adapter mode"
          look="primary"
          color="positive"
          @click=${this._switchToAdapterMode}>
          Switch to Adapter
        </uui-button>
      </div>
    ` : h;
  }
  _renderSetupPanel() {
    return o`
      ${this._renderStrictBlockedBanner()}

      <div class="setup-grid">
        <umb-property-layout label="Execution Mode" description="Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.">
          <uui-select slot="editor" label="Execution Mode" .value=${this._modeRequested} @change=${this._handleModeChange}>
            <option value="adapter">Adapter Mode</option>
            <option value="strict">Strict HTTP Mode</option>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout label="Template" description="Guided setup presets for common UCP scenarios.">
          <uui-select slot="editor" label="Template" .value=${this._templatePreset} @change=${this._handleTemplatePresetChange}>
            <option value="physical">Physical Product</option>
            <option value="digital">Digital Product</option>
            <option value="incomplete">Incomplete Buyer</option>
            <option value="multi-item">Multi-item</option>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout label="Agent ID" description="Used to build the simulated test agent profile URL.">
          <uui-input slot="editor" label="Agent ID" .value=${this._agentId} @input=${this._handleAgentIdChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Dry Run Complete" description="When enabled, complete returns a preview and does not create an order.">
          <uui-toggle slot="editor" label="Dry Run Complete" ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Real Order Confirmation" description="Required before running complete with dry-run disabled.">
          <uui-toggle
            slot="editor"
            label="Real Order Confirmation"
            ?disabled=${this._dryRun}
            ?checked=${this._realOrderConfirmed}
            @change=${this._handleRealOrderConfirmedChange}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Payment Handler ID" description="Used for complete session requests in real mode.">
          ${this._availablePaymentHandlerIds.length > 0 ? o`
                <uui-select slot="editor" label="Payment Handler ID" .value=${this._paymentHandlerId} @change=${this._handlePaymentHandlerIdChange}>
                  ${this._availablePaymentHandlerIds.map((e) => o`<option value=${e}>${e}</option>`)}
                </uui-select>
              ` : o`
                <uui-input slot="editor" label="Payment Handler ID" .value=${this._paymentHandlerId} @input=${this._handlePaymentHandlerIdChange}></uui-input>
              `}
        </umb-property-layout>
      </div>

      <div class="section-toolbar">
        <uui-button label="Add products" look="primary" color="positive" @click=${this._openProductPicker}>Pick Products</uui-button>
        <uui-button label="Start a new run" look="secondary" @click=${this._startNewRun}>Start New Run</uui-button>
      </div>

      ${this._renderSelectedProducts()}
      ${this._renderBuyerAndDiscountSetup()}
      ${this._renderFulfillmentSelections()}
    `;
  }
  _renderSelectedProducts() {
    return this._selectedProducts.length === 0 ? o`<div class="empty-note">No products selected yet.</div>` : o`
      <div class="product-list">
        ${this._selectedProducts.map((e) => o`
          <div class="product-row">
            <div class="product-main">
              <strong>${e.name}</strong>
              <span>${e.sku || "No SKU"} · $${J(e.price, 2)}</span>
            </div>
            <uui-input
              class="qty-input"
              type="number"
              min="1"
              label="Quantity"
              .value=${String(e.quantity)}
              @input=${(t) => this._updateProductQuantity(e.key, t)}>
            </uui-input>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove product"
              @click=${() => this._removeProduct(e.key)}>
              Remove
            </uui-button>
          </div>
        `)}
      </div>
    `;
  }
  _renderBuyerAndDiscountSetup() {
    return o`
      <div class="setup-grid">
        <umb-property-layout label="Buyer Email">
          <uui-input slot="editor" label="Buyer Email" .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Buyer Phone">
          <uui-input slot="editor" label="Buyer Phone" .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Given Name">
          <uui-input slot="editor" label="Given Name" .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Family Name">
          <uui-input slot="editor" label="Family Name" .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Address Line 1">
          <uui-input slot="editor" label="Address Line 1" .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Address Line 2">
          <uui-input slot="editor" label="Address Line 2" .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Town/City">
          <uui-input slot="editor" label="Town/City" .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Region">
          <uui-input slot="editor" label="Region" .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Postal Code">
          <uui-input slot="editor" label="Postal Code" .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Country Code">
          <uui-input slot="editor" label="Country Code" maxlength="2" .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Discount Codes" description="Comma-separated promotional codes.">
          <uui-input slot="editor" label="Discount Codes" .value=${this._discountCodesInput} @input=${this._handleDiscountCodesChange}></uui-input>
        </umb-property-layout>
      </div>
    `;
  }
  _renderFulfillmentSelections() {
    return this._fulfillmentGroups.length === 0 ? o`<div class="empty-note">No fulfillment groups available yet. Run create/get/update first.</div>` : o`
      <div class="group-list">
        ${this._fulfillmentGroups.map((e) => o`
          <div class="group-row">
            <div class="group-main">
              <strong>${e.name}</strong>
              <span>${e.id}</span>
            </div>
            <uui-select
              label="Fulfillment option"
              .value=${this._selectedFulfillmentOptionIds[e.id] ?? ""}
              @change=${(t) => this._updateFulfillmentGroupSelection(e.id, t)}>
              <option value="">Select option</option>
              ${e.options.map((t) => o`
                <option value=${t.id}>
                  ${t.title}${t.amount != null ? ` (${t.currency || ""} ${t.amount})` : ""}
                </option>
              `)}
            </uui-select>
          </div>
        `)}
      </div>
    `;
  }
  _renderWizardSteps() {
    const e = !!this._sessionId, t = !!this._orderId, i = !e || !this._dryRun && !this._realOrderConfirmed;
    return o`
      <div class="steps">
        ${this._renderStep("Manifest", "manifest", this._executeManifestStep, !1)}
        ${this._renderStep("Create Session", "create_session", this._executeCreateSessionStep, this._selectedProducts.length === 0)}
        ${this._renderStep("Get Session", "get_session", this._executeGetSessionStep, !e)}
        ${this._renderStep("Update Session", "update_session", this._executeUpdateSessionStep, !e)}
        ${this._renderStep("Complete Session", "complete_session", this._executeCompleteSessionStep, i)}
        ${this._renderStep("Get Order", "get_order", this._executeGetOrderStep, !t)}
        ${this._renderStep("Cancel Session", "cancel_session", this._executeCancelSessionStep, !e)}
      </div>
    `;
  }
  _renderStep(e, t, i, a) {
    const r = this._activeStep === t;
    return o`
      <div class="step-row">
        <div class="step-label">${e}</div>
        <uui-button
          look="primary"
          color="positive"
          label=${e}
          ?disabled=${a || !!this._activeStep}
          @click=${i}>
          ${r ? "Running..." : e}
        </uui-button>
      </div>
    `;
  }
  _renderRunState() {
    return o`
      <div class="runtime-state">
        <div><span class="label">Session ID</span><span class="value">${this._sessionId || "-"}</span></div>
        <div><span class="label">Session Status</span><span class="value">${this._sessionStatus || "-"}</span></div>
        <div><span class="label">Order ID</span><span class="value">${this._orderId || "-"}</span></div>
      </div>
    `;
  }
  _renderTranscriptPanel() {
    return this._transcripts.length === 0 ? o`<div class="empty-note">Run wizard steps to capture request/response transcripts.</div>` : o`
      <div class="transcripts">
        ${[...this._transcripts].reverse().map((e) => {
      const t = this._formatSnapshotBody(e.request?.body), i = this._formatSnapshotBody(e.response?.body), a = JSON.stringify(e.request?.headers ?? {}, null, 2), r = JSON.stringify(e.response?.headers ?? {}, null, 2), n = `${e.modeRequested} -> ${e.modeExecuted}`;
      return o`
            <details class="transcript-item">
              <summary>
                <span class="summary-step">${e.step}</span>
                <span class=${e.success ? "badge positive" : "badge danger"}>${e.success ? "Success" : "Failed"}</span>
                <span class="badge neutral">${n}</span>
                ${e.fallbackApplied ? o`<span class="badge warning">Fallback</span>` : h}
                <span class="badge neutral">HTTP ${e.response?.statusCode ?? "-"}</span>
              </summary>

              ${e.fallbackReason ? o`<div class="fallback-reason">${e.fallbackReason}</div>` : h}

              <div class="transcript-actions">
                <uui-button
                  look="secondary"
                  label="Copy Request"
                  @click=${() => this._copyText(`Headers:
${a}

Body:
${t}`, "Request")}>
                  Copy Request
                </uui-button>
                <uui-button
                  look="secondary"
                  label="Copy Response"
                  @click=${() => this._copyText(`Headers:
${r}

Body:
${i}`, "Response")}>
                  Copy Response
                </uui-button>
              </div>

              <div class="transcript-grid">
                <div>
                  <h5>Request</h5>
                  <div class="code-block">${a}</div>
                  <div class="code-block">${t}</div>
                </div>
                <div>
                  <h5>Response</h5>
                  <div class="code-block">${r}</div>
                  <div class="code-block">${i}</div>
                </div>
              </div>
            </details>
          `;
    })}
      </div>
    `;
  }
  render() {
    return o`
      <uui-box headline="Runtime Diagnostics">
        ${this._renderDiagnosticsPanel()}
      </uui-box>

      <uui-box headline="Run Setup">
        ${this._renderSetupPanel()}
      </uui-box>

      <uui-box headline="Wizard Steps">
        ${this._renderRunState()}
        ${this._renderWizardSteps()}
      </uui-box>

      <uui-box headline="Step Transcript">
        ${this._renderTranscriptPanel()}
      </uui-box>
    `;
  }
};
f = /* @__PURE__ */ new WeakMap();
P = /* @__PURE__ */ new WeakMap();
l.styles = I`    :host {
      display: block;
      width: 100%;
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .diagnostics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .setup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .runtime-state {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .label {
      display: block;
      font-size: 0.8rem;
      color: var(--uui-color-text-alt);
      margin-bottom: 2px;
    }

    .value {
      display: block;
      font-size: 0.95rem;
      word-break: break-word;
    }

    .token-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .warning-banner,
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      border-radius: 8px;
      border: 1px solid var(--uui-color-warning-standalone);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 12%, white);
    }

    .error-banner {
      border-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 10%, white);
    }

    .section-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin: var(--uui-size-space-4) 0;
    }

    .product-list,
    .group-list {
      display: grid;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
    }

    .product-row,
    .group-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface);
    }

    .group-row {
      grid-template-columns: 1fr minmax(220px, 320px);
    }

    .product-main,
    .group-main {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .product-main span,
    .group-main span {
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
    }

    .qty-input {
      width: 88px;
    }

    .steps {
      display: grid;
      gap: var(--uui-size-space-2);
    }

    .step-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--uui-size-space-2);
      align-items: center;
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
    }

    .step-label {
      font-weight: 600;
    }

    .empty-note {
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-2) 0;
    }

    .transcripts {
      display: grid;
      gap: var(--uui-size-space-3);
    }

    .transcript-item {
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .transcript-item summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      cursor: pointer;
      list-style: none;
    }

    .summary-step {
      font-weight: 600;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge.positive {
      color: #fff;
      background: var(--uui-color-positive-standalone);
    }

    .badge.danger {
      color: #fff;
      background: var(--uui-color-danger-standalone);
    }

    .badge.warning {
      color: #fff;
      background: var(--merchello-color-warning-status-background, #8a6500);
    }

    .badge.neutral {
      color: var(--uui-color-text);
      background: color-mix(in srgb, var(--uui-color-divider) 60%, white);
    }

    .fallback-reason {
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
    }

    .transcript-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .transcript-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .transcript-grid h5 {
      margin: 0 0 var(--uui-size-space-1) 0;
      font-size: 0.9rem;
    }

    .code-block {
      white-space: pre-wrap;
      font-family: var(--uui-font-family-monospace, "Consolas", "Courier New", monospace);
      font-size: 0.75rem;
      line-height: 1.35;
      border: 1px solid var(--uui-color-divider);
      border-radius: 6px;
      padding: var(--uui-size-space-2);
      background: color-mix(in srgb, var(--uui-color-surface) 70%, #f4f7fa);
      max-height: 280px;
      overflow: auto;
      margin-bottom: var(--uui-size-space-2);
    }

    @media (max-width: 900px) {
      .product-row {
        grid-template-columns: 1fr;
      }

      .group-row {
        grid-template-columns: 1fr;
      }

      .step-row {
        grid-template-columns: 1fr;
      }

      .transcript-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
u([
  s()
], l.prototype, "_isLoadingDiagnostics", 2);
u([
  s()
], l.prototype, "_diagnosticsError", 2);
u([
  s()
], l.prototype, "_diagnostics", 2);
u([
  s()
], l.prototype, "_modeRequested", 2);
u([
  s()
], l.prototype, "_templatePreset", 2);
u([
  s()
], l.prototype, "_agentId", 2);
u([
  s()
], l.prototype, "_dryRun", 2);
u([
  s()
], l.prototype, "_realOrderConfirmed", 2);
u([
  s()
], l.prototype, "_paymentHandlerId", 2);
u([
  s()
], l.prototype, "_availablePaymentHandlerIds", 2);
u([
  s()
], l.prototype, "_selectedProducts", 2);
u([
  s()
], l.prototype, "_buyerEmail", 2);
u([
  s()
], l.prototype, "_buyerPhone", 2);
u([
  s()
], l.prototype, "_buyerGivenName", 2);
u([
  s()
], l.prototype, "_buyerFamilyName", 2);
u([
  s()
], l.prototype, "_buyerAddressLine1", 2);
u([
  s()
], l.prototype, "_buyerAddressLine2", 2);
u([
  s()
], l.prototype, "_buyerLocality", 2);
u([
  s()
], l.prototype, "_buyerAdministrativeArea", 2);
u([
  s()
], l.prototype, "_buyerPostalCode", 2);
u([
  s()
], l.prototype, "_buyerCountryCode", 2);
u([
  s()
], l.prototype, "_discountCodesInput", 2);
u([
  s()
], l.prototype, "_sessionId", 2);
u([
  s()
], l.prototype, "_sessionStatus", 2);
u([
  s()
], l.prototype, "_orderId", 2);
u([
  s()
], l.prototype, "_fulfillmentGroups", 2);
u([
  s()
], l.prototype, "_selectedFulfillmentOptionIds", 2);
u([
  s()
], l.prototype, "_transcripts", 2);
u([
  s()
], l.prototype, "_activeStep", 2);
l = u([
  $("merchello-ucp-flow-tester")
], l);
var ee = Object.defineProperty, te = Object.getOwnPropertyDescriptor, z = (e) => {
  throw TypeError(e);
}, y = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? te(t, i) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (a ? d(t, i, r) : d(r)) || r);
  return a && r && ee(t, i, r), r;
}, L = (e, t, i) => t.has(e) || z("Cannot " + i), k = (e, t, i) => (L(e, t, "read from private field"), i ? i.call(e) : t.get(e)), O = (e, t, i) => t.has(e) ? z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), ie = (e, t, i, a) => (L(e, t, "write to private field"), t.set(e, i), i), x, v;
let m = class extends T(S) {
  constructor() {
    super(), this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "store", this._configuration = null, this._descriptionEditorConfig = void 0, O(this, x, new K(this)), O(this, v), this.consumeContext(N, (e) => {
      ie(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfiguration();
  }
  async _loadConfiguration() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, t] = await Promise.all([
      c.getStoreConfiguration(),
      c.getDescriptionEditorSettings()
    ]);
    if (e.error || !e.data) {
      this._errorMessage = e.error?.message ?? "Failed to load store settings.", this._isLoading = !1, this._setFallbackEditorConfig();
      return;
    }
    this._configuration = e.data, t.data?.dataTypeKey ? await this._loadDataTypeConfig(t.data.dataTypeKey) : this._setFallbackEditorConfig(), this._isLoading = !1;
  }
  async _loadDataTypeConfig(e) {
    try {
      const { error: t } = await k(this, x).requestByUnique(e);
      if (t) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await k(this, x).byUnique(e),
        (i) => {
          if (!i) {
            this._setFallbackEditorConfig();
            return;
          }
          this._descriptionEditorConfig = new D(i.values);
        },
        "_observeSettingsDescriptionDataType"
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }
  _setFallbackEditorConfig() {
    this._descriptionEditorConfig = new D([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"]
          ]
        ]
      },
      {
        alias: "extensions",
        value: [
          "Umb.Tiptap.RichTextEssentials",
          "Umb.Tiptap.Bold",
          "Umb.Tiptap.Italic",
          "Umb.Tiptap.Underline",
          "Umb.Tiptap.Link",
          "Umb.Tiptap.BulletList",
          "Umb.Tiptap.OrderedList"
        ]
      }
    ]);
  }
  async _handleSave() {
    if (!this._configuration || this._isSaving)
      return;
    this._isSaving = !0;
    const { data: e, error: t } = await c.saveStoreConfiguration(this._configuration);
    if (t || !e) {
      k(this, v)?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: t?.message ?? "An unknown error occurred while saving settings."
        }
      }), this._isSaving = !1;
      return;
    }
    this._configuration = e, this._errorMessage = null, k(this, v)?.peek("positive", {
      data: {
        headline: "Settings saved",
        message: "Store configuration has been updated."
      }
    }), this._isSaving = !1;
  }
  _toPropertyValueMap(e) {
    const t = {};
    for (const i of e)
      t[i.alias] = i.value;
    return t;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getStringOrNullFromPropertyValue(e) {
    const t = this._getStringFromPropertyValue(e).trim();
    return t.length > 0 ? t : null;
  }
  _getNumberFromPropertyValue(e, t) {
    if (typeof e == "number" && Number.isFinite(e)) return e;
    if (typeof e == "string") {
      const i = Number(e);
      return Number.isFinite(i) ? i : t;
    }
    return t;
  }
  _getBooleanFromPropertyValue(e, t) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return t;
  }
  _getFirstDropdownValue(e) {
    if (Array.isArray(e)) {
      const t = e.find((i) => typeof i == "string");
      return typeof t == "string" ? t : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getMediaKeysFromPropertyValue(e) {
    return Array.isArray(e) ? e.map((t) => {
      if (!t || typeof t != "object") return "";
      const i = t;
      return typeof i.mediaKey == "string" && i.mediaKey ? i.mediaKey : typeof i.key == "string" && i.key ? i.key : "";
    }).filter(Boolean) : [];
  }
  _createMediaPickerValue(e) {
    return e.map((t) => ({ key: t, mediaKey: t }));
  }
  _getSingleMediaPickerValue(e) {
    return this._getMediaKeysFromPropertyValue(e)[0] ?? null;
  }
  _deserializeRichTextPropertyValue(e) {
    if (!e)
      return { markup: "", blocks: null };
    try {
      const t = JSON.parse(e);
      if (typeof t.markup == "string" || t.blocks !== void 0)
        return {
          markup: t.markup ?? "",
          blocks: t.blocks ?? null
        };
    } catch {
    }
    return {
      markup: e,
      blocks: null
    };
  }
  _serializeRichTextPropertyValue(e) {
    if (e == null) return null;
    if (typeof e == "string")
      return JSON.stringify({ markup: e, blocks: null });
    if (typeof e == "object") {
      const t = e;
      return typeof t.markup == "string" || t.blocks !== void 0 ? JSON.stringify({
        markup: t.markup ?? "",
        blocks: t.blocks ?? null
      }) : JSON.stringify(e);
    }
    return null;
  }
  _getLogoPositionConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Left", value: "Left" },
          { name: "Center", value: "Center" },
          { name: "Right", value: "Right" }
        ]
      }
    ];
  }
  _getColorValueFromEvent(e) {
    return e.target.value?.trim() ?? "";
  }
  _handleCheckoutColorChange(e, t) {
    if (!this._configuration) return;
    const i = this._getColorValueFromEvent(t);
    switch (e) {
      case "headerBackgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            headerBackgroundColor: i || null
          }
        };
        return;
      case "primaryColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            primaryColor: i || this._configuration.checkout.primaryColor
          }
        };
        return;
      case "accentColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            accentColor: i || this._configuration.checkout.accentColor
          }
        };
        return;
      case "backgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            backgroundColor: i || this._configuration.checkout.backgroundColor
          }
        };
        return;
      case "textColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            textColor: i || this._configuration.checkout.textColor
          }
        };
        return;
      case "errorColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            errorColor: i || this._configuration.checkout.errorColor
          }
        };
        return;
    }
  }
  _handleEmailThemeColorChange(e, t) {
    if (!this._configuration) return;
    const i = this._getColorValueFromEvent(t);
    if (i)
      switch (e) {
        case "primaryColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                primaryColor: i
              }
            }
          };
          return;
        case "textColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                textColor: i
              }
            }
          };
          return;
        case "backgroundColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                backgroundColor: i
              }
            }
          };
          return;
        case "secondaryTextColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                secondaryTextColor: i
              }
            }
          };
          return;
        case "contentBackgroundColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                contentBackgroundColor: i
              }
            }
          };
          return;
      }
  }
  _renderColorProperty(e, t, i) {
    return o`
      <umb-property-layout .label=${e}>
        <div slot="editor" class="color-picker-field">
          <uui-color-picker .label=${e} .value=${t} @change=${i}></uui-color-picker>
        </div>
      </umb-property-layout>
    `;
  }
  _getStoreSettingsDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "invoiceNumberPrefix", value: e.store.invoiceNumberPrefix },
      { alias: "name", value: e.store.name },
      { alias: "email", value: e.store.email ?? "" },
      { alias: "supportEmail", value: e.store.supportEmail ?? "" },
      { alias: "phone", value: e.store.phone ?? "" },
      {
        alias: "logoMediaKey",
        value: e.store.logoMediaKey ? this._createMediaPickerValue([e.store.logoMediaKey]) : []
      },
      { alias: "websiteUrl", value: e.store.websiteUrl ?? "" },
      { alias: "address", value: e.store.address ?? "" },
      { alias: "displayPricesIncTax", value: e.store.displayPricesIncTax },
      { alias: "showStockLevels", value: e.store.showStockLevels },
      { alias: "lowStockThreshold", value: e.store.lowStockThreshold }
    ];
  }
  _handleStoreSettingsDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      store: {
        ...this._configuration.store,
        invoiceNumberPrefix: this._getStringFromPropertyValue(i.invoiceNumberPrefix),
        name: this._getStringFromPropertyValue(i.name),
        email: this._getStringOrNullFromPropertyValue(i.email),
        supportEmail: this._getStringOrNullFromPropertyValue(i.supportEmail),
        phone: this._getStringOrNullFromPropertyValue(i.phone),
        logoMediaKey: this._getSingleMediaPickerValue(i.logoMediaKey),
        websiteUrl: this._getStringOrNullFromPropertyValue(i.websiteUrl),
        address: this._getStringFromPropertyValue(i.address),
        displayPricesIncTax: this._getBooleanFromPropertyValue(
          i.displayPricesIncTax,
          this._configuration.store.displayPricesIncTax
        ),
        showStockLevels: this._getBooleanFromPropertyValue(
          i.showStockLevels,
          this._configuration.store.showStockLevels
        ),
        lowStockThreshold: this._getNumberFromPropertyValue(
          i.lowStockThreshold,
          this._configuration.store.lowStockThreshold
        )
      }
    };
  }
  _getInvoiceRemindersDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "reminderDaysBeforeDue", value: e.invoiceReminders.reminderDaysBeforeDue },
      { alias: "overdueReminderIntervalDays", value: e.invoiceReminders.overdueReminderIntervalDays },
      { alias: "maxOverdueReminders", value: e.invoiceReminders.maxOverdueReminders },
      { alias: "checkIntervalHours", value: e.invoiceReminders.checkIntervalHours }
    ];
  }
  _handleInvoiceRemindersDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      invoiceReminders: {
        ...this._configuration.invoiceReminders,
        reminderDaysBeforeDue: this._getNumberFromPropertyValue(
          i.reminderDaysBeforeDue,
          this._configuration.invoiceReminders.reminderDaysBeforeDue
        ),
        overdueReminderIntervalDays: this._getNumberFromPropertyValue(
          i.overdueReminderIntervalDays,
          this._configuration.invoiceReminders.overdueReminderIntervalDays
        ),
        maxOverdueReminders: this._getNumberFromPropertyValue(
          i.maxOverdueReminders,
          this._configuration.invoiceReminders.maxOverdueReminders
        ),
        checkIntervalHours: this._getNumberFromPropertyValue(
          i.checkIntervalHours,
          this._configuration.invoiceReminders.checkIntervalHours
        )
      }
    };
  }
  _getPoliciesDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "termsContent", value: this._deserializeRichTextPropertyValue(e.policies.termsContent) },
      { alias: "privacyContent", value: this._deserializeRichTextPropertyValue(e.policies.privacyContent) }
    ];
  }
  _handlePoliciesDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      policies: {
        ...this._configuration.policies,
        termsContent: this._serializeRichTextPropertyValue(i.termsContent),
        privacyContent: this._serializeRichTextPropertyValue(i.privacyContent)
      }
    };
  }
  _getCheckoutBrandingDatasetValue() {
    const e = this._configuration;
    return [
      {
        alias: "headerBackgroundImageMediaKey",
        value: e.checkout.headerBackgroundImageMediaKey ? this._createMediaPickerValue([e.checkout.headerBackgroundImageMediaKey]) : []
      },
      { alias: "logoPosition", value: [e.checkout.logoPosition] },
      { alias: "logoMaxWidth", value: e.checkout.logoMaxWidth },
      { alias: "headingFontFamily", value: e.checkout.headingFontFamily },
      { alias: "bodyFontFamily", value: e.checkout.bodyFontFamily },
      { alias: "showExpressCheckout", value: e.checkout.showExpressCheckout },
      { alias: "billingPhoneRequired", value: e.checkout.billingPhoneRequired },
      { alias: "confirmationRedirectUrl", value: e.checkout.confirmationRedirectUrl ?? "" },
      { alias: "customScriptUrl", value: e.checkout.customScriptUrl ?? "" },
      { alias: "orderTermsShowCheckbox", value: e.checkout.orderTerms.showCheckbox },
      { alias: "orderTermsCheckboxText", value: e.checkout.orderTerms.checkboxText },
      { alias: "orderTermsCheckboxRequired", value: e.checkout.orderTerms.checkboxRequired }
    ];
  }
  _handleCheckoutBrandingDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []), a = this._getFirstDropdownValue(i.logoPosition) || this._configuration.checkout.logoPosition;
    this._configuration = {
      ...this._configuration,
      checkout: {
        ...this._configuration.checkout,
        headerBackgroundImageMediaKey: this._getSingleMediaPickerValue(i.headerBackgroundImageMediaKey),
        logoPosition: a,
        logoMaxWidth: this._getNumberFromPropertyValue(i.logoMaxWidth, this._configuration.checkout.logoMaxWidth),
        headingFontFamily: this._getStringFromPropertyValue(i.headingFontFamily) || this._configuration.checkout.headingFontFamily,
        bodyFontFamily: this._getStringFromPropertyValue(i.bodyFontFamily) || this._configuration.checkout.bodyFontFamily,
        showExpressCheckout: this._getBooleanFromPropertyValue(
          i.showExpressCheckout,
          this._configuration.checkout.showExpressCheckout
        ),
        billingPhoneRequired: this._getBooleanFromPropertyValue(
          i.billingPhoneRequired,
          this._configuration.checkout.billingPhoneRequired
        ),
        confirmationRedirectUrl: this._getStringOrNullFromPropertyValue(i.confirmationRedirectUrl),
        customScriptUrl: this._getStringOrNullFromPropertyValue(i.customScriptUrl),
        orderTerms: {
          ...this._configuration.checkout.orderTerms,
          showCheckbox: this._getBooleanFromPropertyValue(
            i.orderTermsShowCheckbox,
            this._configuration.checkout.orderTerms.showCheckbox
          ),
          checkboxText: this._getStringFromPropertyValue(i.orderTermsCheckboxText) || this._configuration.checkout.orderTerms.checkboxText,
          checkboxRequired: this._getBooleanFromPropertyValue(
            i.orderTermsCheckboxRequired,
            this._configuration.checkout.orderTerms.checkboxRequired
          )
        }
      }
    };
  }
  _getAbandonedCheckoutDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "abandonmentThresholdHours", value: e.abandonedCheckout.abandonmentThresholdHours },
      { alias: "recoveryExpiryDays", value: e.abandonedCheckout.recoveryExpiryDays },
      { alias: "checkIntervalMinutes", value: e.abandonedCheckout.checkIntervalMinutes },
      { alias: "firstEmailDelayHours", value: e.abandonedCheckout.firstEmailDelayHours },
      { alias: "reminderEmailDelayHours", value: e.abandonedCheckout.reminderEmailDelayHours },
      { alias: "finalEmailDelayHours", value: e.abandonedCheckout.finalEmailDelayHours },
      { alias: "maxRecoveryEmails", value: e.abandonedCheckout.maxRecoveryEmails }
    ];
  }
  _handleAbandonedCheckoutDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      abandonedCheckout: {
        ...this._configuration.abandonedCheckout,
        abandonmentThresholdHours: this._getNumberFromPropertyValue(
          i.abandonmentThresholdHours,
          this._configuration.abandonedCheckout.abandonmentThresholdHours
        ),
        recoveryExpiryDays: this._getNumberFromPropertyValue(
          i.recoveryExpiryDays,
          this._configuration.abandonedCheckout.recoveryExpiryDays
        ),
        checkIntervalMinutes: this._getNumberFromPropertyValue(
          i.checkIntervalMinutes,
          this._configuration.abandonedCheckout.checkIntervalMinutes
        ),
        firstEmailDelayHours: this._getNumberFromPropertyValue(
          i.firstEmailDelayHours,
          this._configuration.abandonedCheckout.firstEmailDelayHours
        ),
        reminderEmailDelayHours: this._getNumberFromPropertyValue(
          i.reminderEmailDelayHours,
          this._configuration.abandonedCheckout.reminderEmailDelayHours
        ),
        finalEmailDelayHours: this._getNumberFromPropertyValue(
          i.finalEmailDelayHours,
          this._configuration.abandonedCheckout.finalEmailDelayHours
        ),
        maxRecoveryEmails: this._getNumberFromPropertyValue(
          i.maxRecoveryEmails,
          this._configuration.abandonedCheckout.maxRecoveryEmails
        )
      }
    };
  }
  _getEmailSettingsDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "defaultFromAddress", value: e.email.defaultFromAddress ?? "" },
      { alias: "defaultFromName", value: e.email.defaultFromName ?? "" },
      { alias: "themeFontFamily", value: e.email.theme.fontFamily }
    ];
  }
  _handleEmailSettingsDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      email: {
        ...this._configuration.email,
        defaultFromAddress: this._getStringOrNullFromPropertyValue(i.defaultFromAddress),
        defaultFromName: this._getStringOrNullFromPropertyValue(i.defaultFromName),
        theme: {
          ...this._configuration.email.theme,
          fontFamily: this._getStringFromPropertyValue(i.themeFontFamily) || this._configuration.email.theme.fontFamily
        }
      }
    };
  }
  _getUcpDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "termsUrl", value: e.ucp.termsUrl ?? "" },
      { alias: "privacyUrl", value: e.ucp.privacyUrl ?? "" }
    ];
  }
  _handleUcpDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      ucp: {
        ...this._configuration.ucp,
        termsUrl: this._getStringOrNullFromPropertyValue(i.termsUrl),
        privacyUrl: this._getStringOrNullFromPropertyValue(i.privacyUrl)
      }
    };
  }
  _renderSaveActions() {
    return o`
      <div class="tab-actions">
        <uui-button
          look="primary"
          color="positive"
          label="Save settings"
          ?disabled=${this._isSaving}
          @click=${this._handleSave}>
          ${this._isSaving ? "Saving..." : "Save settings"}
        </uui-button>
      </div>
    `;
  }
  _renderStoreTab() {
    return o`
      <uui-box headline="Store">
        <umb-property-dataset
          .value=${this._getStoreSettingsDatasetValue()}
          @change=${this._handleStoreSettingsDatasetChange}>
          <umb-property
            alias="invoiceNumberPrefix"
            label="Invoice Prefix"
            description="Prefix used when generating invoice numbers."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property
            alias="name"
            label="Store Name"
            description="Displayed in checkout and customer-facing views."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property alias="email" label="Store Email" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="supportEmail" label="Support Email" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="phone" label="Phone" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>

          <umb-property
            alias="logoMediaKey"
            label="Logo"
            description="Media item used as the store logo."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: !1 }]}>
          </umb-property>

          <umb-property alias="websiteUrl" label="Website URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="address" label="Address" property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"></umb-property>

          <umb-property alias="displayPricesIncTax" label="Display Prices Inc Tax" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="showStockLevels" label="Show Stock Levels" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property
            alias="lowStockThreshold"
            label="Low Stock Threshold"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Invoice Reminders">
        <umb-property-dataset
          .value=${this._getInvoiceRemindersDatasetValue()}
          @change=${this._handleInvoiceRemindersDatasetChange}>
          <umb-property
            alias="reminderDaysBeforeDue"
            label="Reminder Days Before Due"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="overdueReminderIntervalDays"
            label="Overdue Reminder Interval Days"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="maxOverdueReminders"
            label="Max Overdue Reminders"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalHours"
            label="Check Interval Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      ${this._renderSaveActions()}
    `;
  }
  _renderPoliciesTab() {
    return o`
      <uui-box headline="Policies">
        <umb-property-dataset
          .value=${this._getPoliciesDatasetValue()}
          @change=${this._handlePoliciesDatasetChange}>
          <umb-property
            alias="termsContent"
            label="Terms Content"
            description="Rich content rendered for checkout Terms."
            property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
            .config=${this._descriptionEditorConfig}>
          </umb-property>
          <umb-property
            alias="privacyContent"
            label="Privacy Content"
            description="Rich content rendered for checkout Privacy policy."
            property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
            .config=${this._descriptionEditorConfig}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderCheckoutTab() {
    const e = this._configuration;
    return o`
      <uui-box headline="Checkout">
        <umb-property-dataset
          .value=${this._getCheckoutBrandingDatasetValue()}
          @change=${this._handleCheckoutBrandingDatasetChange}>
          <umb-property
            alias="headerBackgroundImageMediaKey"
            label="Header Background Image"
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: !1 }]}>
          </umb-property>
          ${this._renderColorProperty(
      "Header Background Color",
      e.checkout.headerBackgroundColor ?? "",
      (t) => this._handleCheckoutColorChange("headerBackgroundColor", t)
    )}
          <umb-property
            alias="logoPosition"
            label="Logo Position"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getLogoPositionConfig()}>
          </umb-property>
          <umb-property alias="logoMaxWidth" label="Logo Max Width" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.checkout.primaryColor,
      (t) => this._handleCheckoutColorChange("primaryColor", t)
    )}
          ${this._renderColorProperty(
      "Accent Color",
      e.checkout.accentColor,
      (t) => this._handleCheckoutColorChange("accentColor", t)
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.checkout.backgroundColor,
      (t) => this._handleCheckoutColorChange("backgroundColor", t)
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.checkout.textColor,
      (t) => this._handleCheckoutColorChange("textColor", t)
    )}
          ${this._renderColorProperty(
      "Error Color",
      e.checkout.errorColor,
      (t) => this._handleCheckoutColorChange("errorColor", t)
    )}
          <umb-property alias="headingFontFamily" label="Heading Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="bodyFontFamily" label="Body Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="showExpressCheckout" label="Show Express Checkout" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="billingPhoneRequired" label="Billing Phone Required" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="confirmationRedirectUrl" label="Confirmation Redirect URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="customScriptUrl" label="Custom Script URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="orderTermsShowCheckbox" label="Order Terms Checkbox" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="orderTermsCheckboxText" label="Order Terms Checkbox Text" property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"></umb-property>
          <umb-property alias="orderTermsCheckboxRequired" label="Order Terms Checkbox Required" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Abandoned Checkout">
        <umb-property-dataset
          .value=${this._getAbandonedCheckoutDatasetValue()}
          @change=${this._handleAbandonedCheckoutDatasetChange}>
          <umb-property alias="abandonmentThresholdHours" label="Abandonment Threshold Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"></umb-property>
          <umb-property alias="recoveryExpiryDays" label="Recovery Expiry Days" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="checkIntervalMinutes" label="Check Interval Minutes" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="firstEmailDelayHours" label="First Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="reminderEmailDelayHours" label="Reminder Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="finalEmailDelayHours" label="Final Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="maxRecoveryEmails" label="Max Recovery Emails" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderEmailTab() {
    const e = this._configuration;
    return o`
      <uui-box headline="Email">
        <umb-property-dataset
          .value=${this._getEmailSettingsDatasetValue()}
          @change=${this._handleEmailSettingsDatasetChange}>
          <umb-property alias="defaultFromAddress" label="Default From Address" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="defaultFromName" label="Default From Name" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.email.theme.primaryColor,
      (t) => this._handleEmailThemeColorChange("primaryColor", t)
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.email.theme.textColor,
      (t) => this._handleEmailThemeColorChange("textColor", t)
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.email.theme.backgroundColor,
      (t) => this._handleEmailThemeColorChange("backgroundColor", t)
    )}
          <umb-property alias="themeFontFamily" label="Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty(
      "Secondary Text Color",
      e.email.theme.secondaryTextColor,
      (t) => this._handleEmailThemeColorChange("secondaryTextColor", t)
    )}
          ${this._renderColorProperty(
      "Content Background Color",
      e.email.theme.contentBackgroundColor,
      (t) => this._handleEmailThemeColorChange("contentBackgroundColor", t)
    )}
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderUcpTab() {
    return o`
      <uui-box headline="UCP">
        <umb-property-dataset
          .value=${this._getUcpDatasetValue()}
          @change=${this._handleUcpDatasetChange}>
          <umb-property alias="termsUrl" label="Terms URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="privacyUrl" label="Privacy URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="UCP Flow Tester">
        <merchello-ucp-flow-tester></merchello-ucp-flow-tester>
      </uui-box>

      ${this._renderSaveActions()}
    `;
  }
  _renderCurrentTab() {
    switch (this._activeTab) {
      case "store":
        return this._renderStoreTab();
      case "policies":
        return this._renderPoliciesTab();
      case "checkout":
        return this._renderCheckoutTab();
      case "email":
        return this._renderEmailTab();
      case "ucp":
        return this._renderUcpTab();
      default:
        return h;
    }
  }
  _renderErrorBanner() {
    return this._errorMessage ? o`
      <uui-box class="error-box">
        <div class="error-message">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      </uui-box>
    ` : h;
  }
  render() {
    return this._isLoading ? o`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      ` : this._configuration ? o`
      ${this._renderErrorBanner()}

      <uui-tab-group class="tabs">
        <uui-tab label="Store" ?active=${this._activeTab === "store"} @click=${() => this._activeTab = "store"}>Store</uui-tab>
        <uui-tab label="Policies" ?active=${this._activeTab === "policies"} @click=${() => this._activeTab = "policies"}>Policies</uui-tab>
        <uui-tab label="Checkout" ?active=${this._activeTab === "checkout"} @click=${() => this._activeTab = "checkout"}>Checkout</uui-tab>
        <uui-tab label="Email" ?active=${this._activeTab === "email"} @click=${() => this._activeTab = "email"}>Email</uui-tab>
        <uui-tab label="UCP" ?active=${this._activeTab === "ucp"} @click=${() => this._activeTab = "ucp"}>UCP</uui-tab>
      </uui-tab-group>

      <div class="tab-content">
        ${this._renderCurrentTab()}
      </div>
    ` : o`
        ${this._renderErrorBanner()}
        <div class="tab-actions">
          <uui-button label="Retry" look="secondary" @click=${this._loadConfiguration}>Retry</uui-button>
        </div>
      `;
  }
};
x = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
m.styles = I`
    :host {
      display: block;
    }

    .tabs {
      margin-top: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab-content {
      display: grid;
      gap: var(--uui-size-space-4);
      padding-bottom: var(--uui-size-space-4);
    }

    .tab-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }

    .color-picker-field {
      width: 100%;
      display: flex;
      align-items: center;
      min-height: 2.5rem;
    }

    .color-picker-field uui-color-picker {
      --uui-color-picker-width: 280px;
      width: 280px;
      max-width: 100%;
      flex: 0 0 auto;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-8);
    }

    .error-box {
      border: 1px solid var(--uui-color-danger-standalone);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-height: 2rem;
    }
  `;
y([
  s()
], m.prototype, "_isLoading", 2);
y([
  s()
], m.prototype, "_isSaving", 2);
y([
  s()
], m.prototype, "_errorMessage", 2);
y([
  s()
], m.prototype, "_activeTab", 2);
y([
  s()
], m.prototype, "_configuration", 2);
y([
  s()
], m.prototype, "_descriptionEditorConfig", 2);
m = y([
  $("merchello-store-configuration-tabs")
], m);
var re = Object.defineProperty, ae = Object.getOwnPropertyDescriptor, E = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? ae(t, i) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (a ? d(t, i, r) : d(r)) || r);
  return a && r && re(t, i, r), r;
};
let _ = class extends T(S) {
  constructor() {
    super(...arguments), this._isLoading = !0, this._showSeedData = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadStatus();
  }
  async _loadStatus() {
    this._isLoading = !0;
    const { data: e } = await c.getSeedDataStatus();
    this._showSeedData = e?.isEnabled === !0 && e?.isInstalled === !1, this._isLoading = !1;
  }
  _onSeedDataInstalled() {
    this._showSeedData = !1;
  }
  render() {
    return this._isLoading ? h : o`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          ${this._showSeedData ? o`
                <merchello-seed-data-workspace
                  @seed-data-installed=${this._onSeedDataInstalled}
                ></merchello-seed-data-workspace>
              ` : h}

          <merchello-store-configuration-tabs></merchello-store-configuration-tabs>
        </div>
      </umb-body-layout>
    `;
  }
};
_.styles = [
  I`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }
    `
];
E([
  s()
], _.prototype, "_isLoading", 2);
E([
  s()
], _.prototype, "_showSeedData", 2);
_ = E([
  $("merchello-settings-workspace")
], _);
const ge = _;
export {
  _ as MerchelloSettingsWorkspaceElement,
  ge as default
};
//# sourceMappingURL=settings-workspace.element-DxT9Z618.js.map
