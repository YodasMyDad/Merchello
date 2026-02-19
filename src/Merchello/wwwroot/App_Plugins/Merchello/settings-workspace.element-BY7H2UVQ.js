import { LitElement as w, html as s, nothing as h, css as x, state as a, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as F } from "@umbraco-cms/backoffice/element-api";
import { M as d } from "./merchello-api-OYuQK4Mu.js";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { UmbDataTypeDetailRepository as W } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as D } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
import { UMB_MODAL_MANAGER_CONTEXT as K } from "@umbraco-cms/backoffice/modal";
import { M as j } from "./product-picker-modal.token-BfbHsSHl.js";
import { c as J } from "./formatting-CuYSKks5.js";
var Y = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, C = (e, t, r, i) => {
  for (var o = i > 1 ? void 0 : i ? Q(t, r) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (o = (i ? c(t, r, o) : c(o)) || o);
  return i && o && Y(t, r, o), o;
};
let _ = class extends F(w) {
  constructor() {
    super(...arguments), this._isInstalling = !1, this._isInstallComplete = !1, this._message = "", this._hasError = !1;
  }
  async _installSeedData() {
    if (this._isInstalling || this._isInstallComplete) return;
    this._isInstalling = !0, this._hasError = !1, this._message = "";
    const { data: e, error: t } = await d.installSeedData();
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
    return s`
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

        ${this._hasError ? s`
              <uui-alert color="danger">${this._message}</uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Retry"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            ` : s`
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
    return s`
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
    return s`
      <uui-box>
        <div class="complete">
          <uui-icon name="icon-check" class="success-icon"></uui-icon>
          <h3>Sample Data Installed</h3>
          ${this._message ? s`<p>${this._message}</p>` : h}
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
_.styles = x`
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
  a()
], _.prototype, "_isInstalling", 2);
C([
  a()
], _.prototype, "_isInstallComplete", 2);
C([
  a()
], _.prototype, "_message", 2);
C([
  a()
], _.prototype, "_hasError", 2);
_ = C([
  S("merchello-seed-data-workspace")
], _);
var X = Object.defineProperty, Z = Object.getOwnPropertyDescriptor, M = (e) => {
  throw TypeError(e);
}, u = (e, t, r, i) => {
  for (var o = i > 1 ? void 0 : i ? Z(t, r) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (o = (i ? c(t, r, o) : c(o)) || o);
  return i && o && X(t, r, o), o;
}, L = (e, t, r) => t.has(e) || M("Cannot " + r), I = (e, t, r) => (L(e, t, "read from private field"), t.get(e)), O = (e, t, r) => t.has(e) ? M("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), A = (e, t, r, i) => (L(e, t, "write to private field"), t.set(e, r), r), f, T;
let n = class extends F(w) {
  constructor() {
    super(), this._isLoadingDiagnostics = !0, this._diagnosticsError = null, this._diagnostics = null, this._modeRequested = "adapter", this._templatePreset = "physical", this._agentId = "", this._dryRun = !0, this._realOrderConfirmed = !1, this._paymentHandlerId = "manual:manual", this._availablePaymentHandlerIds = [], this._selectedProducts = [], this._buyerEmail = "buyer@example.com", this._buyerPhone = "+14155550100", this._buyerGivenName = "Alex", this._buyerFamilyName = "Taylor", this._buyerAddressLine1 = "1 Test Street", this._buyerAddressLine2 = "", this._buyerLocality = "New York", this._buyerAdministrativeArea = "NY", this._buyerPostalCode = "10001", this._buyerCountryCode = "US", this._discountCodesInput = "", this._sessionId = null, this._sessionStatus = null, this._orderId = null, this._fulfillmentGroups = [], this._selectedFulfillmentOptionIds = {}, this._transcripts = [], this._activeStep = null, O(this, f), O(this, T), this.consumeContext(K, (e) => {
      A(this, f, e);
    }), this.consumeContext(N, (e) => {
      A(this, T, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadDiagnostics();
  }
  async _loadDiagnostics() {
    this._isLoadingDiagnostics = !0, this._diagnosticsError = null;
    const { data: e, error: t } = await d.getUcpFlowDiagnostics();
    if (t || !e) {
      this._diagnosticsError = t?.message ?? this._t("merchello_ucpFlowTesterDiagnosticsLoadFailed", "Unable to load UCP flow diagnostics."), this._isLoadingDiagnostics = !1;
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
  _t(e, t) {
    const r = this.localize;
    return r?.termOrDefault ? r.termOrDefault(e, t) : t;
  }
  _renderReadOnlyProperty(e, t, r) {
    return s`
      <umb-property-layout orientation="vertical" .label=${this._t(e, t)}>
        <span slot="editor" class="value">${r}</span>
      </umb-property-layout>
    `;
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
    if (!I(this, f))
      return;
    const e = this._templatePreset === "digital" ? null : {
      countryCode: this._buyerCountryCode || "US",
      regionCode: this._buyerAdministrativeArea || void 0
    }, r = await I(this, f).open(this, j, {
      data: {
        config: {
          currencySymbol: "$",
          shippingAddress: e,
          excludeProductIds: this._selectedProducts.map((i) => i.productId)
        }
      }
    }).onSubmit().catch(() => {
    });
    r?.selections?.length && this._mergeSelectedProducts(r.selections);
  }
  _mergeSelectedProducts(e) {
    const t = [...this._selectedProducts];
    for (const r of e) {
      const i = this._normalizeSelectedProduct(r);
      if (i == null)
        continue;
      const o = t.findIndex((l) => l.key === i.key);
      if (o >= 0) {
        const l = t[o];
        t[o] = {
          ...l,
          quantity: l.quantity + 1
        };
      } else
        t.push(i);
    }
    this._selectedProducts = t;
  }
  _normalizeSelectedProduct(e) {
    if (!e.productId || !e.name)
      return null;
    const t = e.selectedAddons ?? [], r = t.map((i) => `${i.optionId}:${i.valueId}`).sort().join("|");
    return {
      key: `${e.productId}::${r}`,
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
    const r = this._readInputValue(t), i = Number(r), o = Number.isFinite(i) ? Math.max(1, Math.round(i)) : 1;
    this._selectedProducts = this._selectedProducts.map(
      (l) => l.key === e ? {
        ...l,
        quantity: o
      } : l
    );
  }
  _removeProduct(e) {
    this._selectedProducts = this._selectedProducts.filter((t) => t.key !== e);
  }
  _updateFulfillmentGroupSelection(e, t) {
    const r = this._readInputValue(t);
    this._selectedFulfillmentOptionIds = {
      ...this._selectedFulfillmentOptionIds,
      [e]: r
    };
  }
  async _executeManifestStep() {
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest()
    };
    await this._executeStep("manifest", () => d.ucpTestManifest(e));
  }
  async _executeCreateSessionStep() {
    if (this._selectedProducts.length === 0) {
      this._notify("warning", this._t("merchello_ucpFlowTesterSelectProductWarning", "Select at least one product before creating a session."));
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
    await this._executeStep("create_session", () => d.ucpTestCreateSession(t));
  }
  async _executeGetSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId
    };
    await this._executeStep("get_session", () => d.ucpTestGetSession(e));
  }
  async _executeUpdateSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
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
    await this._executeStep("update_session", () => d.ucpTestUpdateSession(t));
  }
  async _executeCompleteSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
      return;
    }
    if (!this._dryRun && !this._realOrderConfirmed) {
      this._notify("warning", this._t("merchello_ucpFlowTesterConfirmRealOrderWarning", "Confirm real order creation before running complete."));
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
    await this._executeStep("complete_session", () => d.ucpTestCompleteSession(t));
  }
  async _executeGetOrderStep() {
    if (!this._orderId) {
      this._notify("warning", this._t("merchello_ucpFlowTesterNoOrderIdWarning", "No order ID is available yet."));
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      orderId: this._orderId
    };
    await this._executeStep("get_order", () => d.ucpTestGetOrder(e));
  }
  async _executeCancelSessionStep() {
    if (!this._sessionId) {
      this._notify("warning", this._t("merchello_ucpFlowTesterNoActiveSessionWarning", "No session is active."));
      return;
    }
    const e = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId
    };
    await this._executeStep("cancel_session", () => d.ucpTestCancelSession(e));
  }
  async _executeStep(e, t) {
    if (!this._activeStep) {
      this._activeStep = e;
      try {
        const { data: r, error: i } = await t();
        if (i || !r) {
          this._notify("danger", i?.message ?? this._t("merchello_ucpFlowTesterStepFailed", `Step ${e} failed.`));
          return;
        }
        this._applyStepResult(r);
      } catch (r) {
        const i = r instanceof Error ? r.message : this._t("merchello_ucpFlowTesterStepFailed", `Step ${e} failed.`);
        this._notify("danger", i);
      } finally {
        this._activeStep = null;
      }
    }
  }
  _applyStepResult(e) {
    this._transcripts = [...this._transcripts, e], e.sessionId && (this._sessionId = e.sessionId), e.status && (this._sessionStatus = e.status), e.orderId && (this._orderId = e.orderId), this._syncPaymentHandlers(e.responseData), this._syncFulfillmentGroups(e.responseData);
  }
  _syncPaymentHandlers(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const r = this._asObject(t.ucp), o = this._asArray(r?.payment_handlers).map((l) => this._asObject(l)).map((l) => this._asString(l?.handler_id)).filter((l) => !!l);
    o.length !== 0 && (this._availablePaymentHandlerIds = Array.from(new Set(o)), this._availablePaymentHandlerIds.includes(this._paymentHandlerId) || (this._paymentHandlerId = this._availablePaymentHandlerIds[0]));
  }
  _syncFulfillmentGroups(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const r = this._asObject(t.fulfillment);
    if (!r)
      return;
    const i = this._asArray(r.methods), o = [];
    for (const c of i) {
      const U = this._asObject(c);
      if (U)
        for (const H of this._asArray(U.groups)) {
          const b = this._asObject(H), $ = this._asString(b?.id);
          if (!b || !$)
            continue;
          const q = this._asArray(b.options).map((p) => this._asObject(p)).filter((p) => p != null).map((p) => {
            const G = this._asArray(p.totals), E = this._asObject(G[0]);
            return {
              id: this._asString(p.id) ?? "",
              title: this._asString(p.title) ?? this._t("merchello_ucpFlowTesterOptionLabel", "Option"),
              amount: this._asNumber(E?.amount),
              currency: this._asString(E?.currency)
            };
          }).filter((p) => p.id.length > 0);
          o.push({
            id: $,
            name: this._asString(b.name) ?? $,
            selectedOptionId: this._asString(b.selected_option_id),
            options: q
          });
        }
    }
    if (o.length === 0)
      return;
    const l = { ...this._selectedFulfillmentOptionIds };
    for (const c of o)
      l[c.id] || (c.selectedOptionId ? l[c.id] = c.selectedOptionId : c.options.length === 1 && (l[c.id] = c.options[0].id));
    this._fulfillmentGroups = o, this._selectedFulfillmentOptionIds = l;
  }
  _buildLineItemsPayload() {
    const e = [...this._selectedProducts];
    return this._templatePreset === "multi-item" && e.length === 1 && e.push({
      ...e[0],
      key: `${e[0].key}::copy`
    }), e.map((t, r) => ({
      id: `li-${r + 1}`,
      quantity: Math.max(1, t.quantity),
      item: {
        id: t.productId,
        title: t.name,
        price: this._toMinorUnits(t.price),
        imageUrl: t.imageUrl ?? void 0,
        options: t.selectedAddons.map((i) => ({
          name: i.optionName,
          value: i.valueName
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
      return this._t("merchello_ucpFlowTesterEmptySnapshot", "(empty)");
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return t;
    }
  }
  async _copyText(e, t) {
    try {
      await navigator.clipboard.writeText(e), this._notify("positive", this._t("merchello_ucpFlowTesterCopied", `${t} copied.`));
    } catch {
      this._notify("warning", this._t("merchello_ucpFlowTesterClipboardFailed", "Clipboard write failed."));
    }
  }
  _notify(e, t) {
    I(this, T)?.peek(e, {
      data: {
        headline: this._t("merchello_ucpFlowTesterHeadline", "UCP Flow Tester"),
        message: t
      }
    });
  }
  _renderDiagnosticsPanel() {
    return this._isLoadingDiagnostics ? s`<div class="loading-row"><uui-loader></uui-loader><span>${this._t("merchello_ucpFlowTesterLoadingDiagnostics", "Loading diagnostics...")}</span></div>` : this._diagnosticsError ? s`
        <div class="error-banner">
          <span>${this._diagnosticsError}</span>
          <uui-button
            .label=${this._t("merchello_ucpFlowTesterRetryDiagnostics", "Retry diagnostics")}
            look="secondary"
            @click=${this._loadDiagnostics}>
            ${this._t("general_retry", "Retry")}
          </uui-button>
        </div>
      ` : this._diagnostics ? s`
      <div class="diagnostics-grid">
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterProtocolVersion",
      "Protocol Version",
      this._diagnostics.protocolVersion || "-"
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterStrictMode",
      "Strict Mode",
      this._diagnostics.strictModeAvailable ? this._t("merchello_ucpFlowTesterStatusAvailable", "Available") : this._t("merchello_ucpFlowTesterStatusBlocked", "Blocked")
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterPublicBaseUrl",
      "Public Base URL",
      this._diagnostics.publicBaseUrl || "-"
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterEffectiveBaseUrl",
      "Effective Base URL",
      this._diagnostics.effectiveBaseUrl || "-"
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterRequireHttps",
      "Require HTTPS",
      this._diagnostics.requireHttps ? this._t("general_yes", "Yes") : this._t("general_no", "No")
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterMinimumTls",
      "Minimum TLS",
      this._diagnostics.minimumTlsVersion || "-"
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterAgentProfileUrl",
      "Agent Profile URL",
      this._diagnostics.simulatedAgentProfileUrl || "-"
    )}
        ${this._renderReadOnlyProperty(
      "merchello_ucpFlowTesterFallbackMode",
      "Fallback Mode",
      this._diagnostics.strictFallbackMode || "-"
    )}
      </div>

      <div class="diagnostics-meta-grid">
        <umb-property-layout orientation="vertical" .label=${this._t("merchello_ucpFlowTesterCapabilities", "Capabilities")}>
          <div slot="editor" class="token-row">
            ${this._diagnostics.capabilities.length === 0 ? s`<span class="value">${this._t("merchello_ucpFlowTesterNone", "None")}</span>` : this._diagnostics.capabilities.map((e) => s`<uui-tag>${e}</uui-tag>`)}
          </div>
        </umb-property-layout>

        <umb-property-layout orientation="vertical" .label=${this._t("merchello_ucpFlowTesterExtensions", "Extensions")}>
          <div slot="editor" class="token-row">
            ${this._diagnostics.extensions.length === 0 ? s`<span class="value">${this._t("merchello_ucpFlowTesterNone", "None")}</span>` : this._diagnostics.extensions.map((e) => s`<uui-tag>${e}</uui-tag>`)}
          </div>
        </umb-property-layout>
      </div>
    ` : h;
  }
  _renderStrictBlockedBanner() {
    return this._isStrictModeBlocked() ? s`
      <div class="warning-banner">
        <div>
          <strong>${this._t("merchello_ucpFlowTesterStrictBlockedTitle", "Strict mode is blocked.")}</strong>
          <div>${this._diagnostics?.strictModeBlockReason || this._t("merchello_ucpFlowTesterStrictUnavailable", "Strict mode is unavailable in this runtime.")}</div>
        </div>
        <uui-button
          .label=${this._t("merchello_ucpFlowTesterSwitchToAdapter", "Switch to adapter mode")}
          look="primary"
          color="positive"
          @click=${this._switchToAdapterMode}>
          ${this._t("merchello_ucpFlowTesterSwitchToAdapterButton", "Switch to Adapter")}
        </uui-button>
      </div>
    ` : h;
  }
  _getExecutionModeOptions() {
    return [
      {
        name: this._t("merchello_ucpFlowTesterAdapterMode", "Adapter Mode"),
        value: "adapter",
        selected: this._modeRequested === "adapter"
      },
      {
        name: this._t("merchello_ucpFlowTesterStrictHttpMode", "Strict HTTP Mode"),
        value: "strict",
        selected: this._modeRequested === "strict"
      }
    ];
  }
  _getTemplateOptions() {
    return [
      {
        name: this._t("merchello_ucpFlowTesterTemplatePhysical", "Physical Product"),
        value: "physical",
        selected: this._templatePreset === "physical"
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateDigital", "Digital Product"),
        value: "digital",
        selected: this._templatePreset === "digital"
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateIncompleteBuyer", "Incomplete Buyer"),
        value: "incomplete",
        selected: this._templatePreset === "incomplete"
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateMultiItem", "Multi-item"),
        value: "multi-item",
        selected: this._templatePreset === "multi-item"
      }
    ];
  }
  _getPaymentHandlerOptions() {
    return this._availablePaymentHandlerIds.map((e) => ({
      name: e,
      value: e,
      selected: e === this._paymentHandlerId
    }));
  }
  _getFulfillmentGroupOptions(e) {
    return [
      {
        name: this._t("merchello_ucpFlowTesterSelectOption", "Select option"),
        value: "",
        selected: !this._selectedFulfillmentOptionIds[e.id]
      },
      ...e.options.map((t) => ({
        name: `${t.title}${t.amount != null ? ` (${t.currency || ""} ${t.amount})` : ""}`,
        value: t.id,
        selected: this._selectedFulfillmentOptionIds[e.id] === t.id
      }))
    ];
  }
  _renderSetupPanel() {
    return s`
      ${this._renderStrictBlockedBanner()}

      <div class="setup-grid">
        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterExecutionModeLabel", "Execution Mode")}
          .description=${this._t("merchello_ucpFlowTesterExecutionModeDescription", "Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.")}>
          <uui-select
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterExecutionModeLabel", "Execution Mode")}
            .options=${this._getExecutionModeOptions()}
            @change=${this._handleModeChange}>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterTemplateLabel", "Template")}
          .description=${this._t("merchello_ucpFlowTesterTemplateDescription", "Guided setup presets for common UCP scenarios.")}>
          <uui-select
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterTemplateLabel", "Template")}
            .options=${this._getTemplateOptions()}
            @change=${this._handleTemplatePresetChange}>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterAgentIdLabel", "Agent ID")}
          .description=${this._t("merchello_ucpFlowTesterAgentIdDescription", "Used to build the simulated test agent profile URL.")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAgentIdLabel", "Agent ID")} .value=${this._agentId} @input=${this._handleAgentIdChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterDryRunLabel", "Dry Run Complete")}
          .description=${this._t("merchello_ucpFlowTesterDryRunDescription", "When enabled, complete returns a preview and does not create an order.")}>
          <uui-toggle slot="editor" .label=${this._t("merchello_ucpFlowTesterDryRunLabel", "Dry Run Complete")} ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterRealOrderConfirmationLabel", "Real Order Confirmation")}
          .description=${this._t("merchello_ucpFlowTesterRealOrderConfirmationDescription", "Required before running complete with dry-run disabled.")}>
          <uui-toggle
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterRealOrderConfirmationLabel", "Real Order Confirmation")}
            ?disabled=${this._dryRun}
            ?checked=${this._realOrderConfirmed}
            @change=${this._handleRealOrderConfirmedChange}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
          .description=${this._t("merchello_ucpFlowTesterPaymentHandlerDescription", "Used for complete session requests in real mode.")}>
          ${this._availablePaymentHandlerIds.length > 0 ? s`
                <uui-select
                  slot="editor"
                  .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
                  .options=${this._getPaymentHandlerOptions()}
                  @change=${this._handlePaymentHandlerIdChange}>
                </uui-select>
              ` : s`
                <uui-input
                  slot="editor"
                  .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
                  .value=${this._paymentHandlerId}
                  @input=${this._handlePaymentHandlerIdChange}>
                </uui-input>
              `}
        </umb-property-layout>
      </div>

      <div class="section-toolbar">
        <uui-button
          .label=${this._t("merchello_ucpFlowTesterAddProducts", "Add products")}
          look="primary"
          color="positive"
          @click=${this._openProductPicker}>
          ${this._t("merchello_ucpFlowTesterPickProducts", "Pick Products")}
        </uui-button>
        <uui-button
          .label=${this._t("merchello_ucpFlowTesterStartNewRun", "Start a new run")}
          look="secondary"
          @click=${this._startNewRun}>
          ${this._t("merchello_ucpFlowTesterStartNewRunButton", "Start New Run")}
        </uui-button>
      </div>

      ${this._renderSelectedProducts()}
      ${this._renderBuyerAndDiscountSetup()}
      ${this._renderFulfillmentSelections()}
    `;
  }
  _renderSelectedProducts() {
    return this._selectedProducts.length === 0 ? s`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoProductsSelected", "No products selected yet.")}</div>` : s`
      <div class="product-list">
        ${this._selectedProducts.map((e) => s`
          <div class="product-row">
            <div class="product-main">
              <strong>${e.name}</strong>
              <span>${e.sku || this._t("merchello_ucpFlowTesterNoSku", "No SKU")} · $${J(e.price, 2)}</span>
            </div>
            <uui-input
              class="qty-input"
              type="number"
              min="1"
              .label=${this._t("merchello_ucpFlowTesterQuantity", "Quantity")}
              .value=${String(e.quantity)}
              @input=${(t) => this._updateProductQuantity(e.key, t)}>
            </uui-input>
            <uui-button
              look="secondary"
              color="danger"
              .label=${this._t("merchello_ucpFlowTesterRemoveProduct", "Remove product")}
              @click=${() => this._removeProduct(e.key)}>
              ${this._t("general_remove", "Remove")}
            </uui-button>
          </div>
        `)}
      </div>
    `;
  }
  _renderBuyerAndDiscountSetup() {
    return s`
      <div class="setup-grid">
        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterBuyerEmail", "Buyer Email")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterBuyerEmail", "Buyer Email")} .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterBuyerPhone", "Buyer Phone")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterBuyerPhone", "Buyer Phone")} .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterGivenName", "Given Name")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterGivenName", "Given Name")} .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterFamilyName", "Family Name")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterFamilyName", "Family Name")} .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterAddressLine1", "Address Line 1")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAddressLine1", "Address Line 1")} .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterAddressLine2", "Address Line 2")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAddressLine2", "Address Line 2")} .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterTownCity", "Town/City")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterTownCity", "Town/City")} .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterRegion", "Region")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterRegion", "Region")} .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterPostalCode", "Postal Code")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterPostalCode", "Postal Code")} .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterCountryCode", "Country Code")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterCountryCode", "Country Code")} maxlength="2" .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterDiscountCodes", "Discount Codes")}
          .description=${this._t("merchello_ucpFlowTesterDiscountCodesDescription", "Comma-separated promotional codes.")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterDiscountCodes", "Discount Codes")} .value=${this._discountCodesInput} @input=${this._handleDiscountCodesChange}></uui-input>
        </umb-property-layout>
      </div>
    `;
  }
  _renderFulfillmentSelections() {
    return this._fulfillmentGroups.length === 0 ? s`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoFulfillmentGroups", "No fulfillment groups available yet. Run create/get/update first.")}</div>` : s`
      <div class="group-list">
        ${this._fulfillmentGroups.map((e) => s`
          <div class="group-row">
            <div class="group-main">
              <strong>${e.name}</strong>
              <span>${e.id}</span>
            </div>
            <uui-select
              .label=${this._t("merchello_ucpFlowTesterFulfillmentOption", "Fulfillment option")}
              .options=${this._getFulfillmentGroupOptions(e)}
              @change=${(t) => this._updateFulfillmentGroupSelection(e.id, t)}>
            </uui-select>
          </div>
        `)}
      </div>
    `;
  }
  _renderWizardSteps() {
    const e = !!this._sessionId, t = !!this._orderId, r = !e || !this._dryRun && !this._realOrderConfirmed;
    return s`
      <div class="steps">
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepManifest", "Manifest"), "manifest", this._executeManifestStep, !1)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCreateSession", "Create Session"), "create_session", this._executeCreateSessionStep, this._selectedProducts.length === 0)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepGetSession", "Get Session"), "get_session", this._executeGetSessionStep, !e)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepUpdateSession", "Update Session"), "update_session", this._executeUpdateSessionStep, !e)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCompleteSession", "Complete Session"), "complete_session", this._executeCompleteSessionStep, r)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepGetOrder", "Get Order"), "get_order", this._executeGetOrderStep, !t)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCancelSession", "Cancel Session"), "cancel_session", this._executeCancelSessionStep, !e)}
      </div>
    `;
  }
  _renderStep(e, t, r, i) {
    const o = this._activeStep === t;
    return s`
      <div class="step-row">
        <div class="step-label">${e}</div>
        <uui-button
          look="primary"
          color="positive"
          .label=${e}
          ?disabled=${i || !!this._activeStep}
          @click=${r}>
          ${o ? this._t("merchello_ucpFlowTesterRunning", "Running...") : e}
        </uui-button>
      </div>
    `;
  }
  _renderRunState() {
    return s`
      <div class="runtime-state">
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterSessionId", "Session ID", this._sessionId || "-")}
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterSessionStatus", "Session Status", this._sessionStatus || "-")}
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterOrderId", "Order ID", this._orderId || "-")}
      </div>
    `;
  }
  _renderTranscriptPanel() {
    return this._transcripts.length === 0 ? s`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoTranscripts", "Run wizard steps to capture request/response transcripts.")}</div>` : s`
      <div class="transcripts">
        ${[...this._transcripts].reverse().map((e) => {
      const t = this._formatSnapshotBody(e.request?.body), r = this._formatSnapshotBody(e.response?.body), i = JSON.stringify(e.request?.headers ?? {}, null, 2), o = JSON.stringify(e.response?.headers ?? {}, null, 2), l = `${e.modeRequested} -> ${e.modeExecuted}`;
      return s`
            <details class="transcript-item">
              <summary>
                <span class="summary-step">${e.step}</span>
                <span class=${e.success ? "badge positive" : "badge danger"}>${e.success ? this._t("general_success", "Success") : this._t("general_failed", "Failed")}</span>
                <span class="badge neutral">${l}</span>
                ${e.fallbackApplied ? s`<span class="badge warning">${this._t("merchello_ucpFlowTesterFallback", "Fallback")}</span>` : h}
                <span class="badge neutral">${this._t("merchello_ucpFlowTesterHttpPrefix", "HTTP")} ${e.response?.statusCode ?? "-"}</span>
              </summary>

              ${e.fallbackReason ? s`<div class="fallback-reason">${e.fallbackReason}</div>` : h}

              <div class="transcript-actions">
                <uui-button
                  look="secondary"
                  .label=${this._t("merchello_ucpFlowTesterCopyRequest", "Copy Request")}
                  @click=${() => this._copyText(`Headers:
${i}

Body:
${t}`, this._t("merchello_ucpFlowTesterRequest", "Request"))}>
                  ${this._t("merchello_ucpFlowTesterCopyRequest", "Copy Request")}
                </uui-button>
                <uui-button
                  look="secondary"
                  .label=${this._t("merchello_ucpFlowTesterCopyResponse", "Copy Response")}
                  @click=${() => this._copyText(`Headers:
${o}

Body:
${r}`, this._t("merchello_ucpFlowTesterResponse", "Response"))}>
                  ${this._t("merchello_ucpFlowTesterCopyResponse", "Copy Response")}
                </uui-button>
              </div>

              <div class="transcript-grid">
                <div>
                  <h5>${this._t("merchello_ucpFlowTesterRequest", "Request")}</h5>
                  <div class="code-block">${i}</div>
                  <div class="code-block">${t}</div>
                </div>
                <div>
                  <h5>${this._t("merchello_ucpFlowTesterResponse", "Response")}</h5>
                  <div class="code-block">${o}</div>
                  <div class="code-block">${r}</div>
                </div>
              </div>
            </details>
          `;
    })}
      </div>
    `;
  }
  render() {
    return s`
      <uui-box .headline=${this._t("merchello_ucpFlowTesterRuntimeDiagnostics", "Runtime Diagnostics")}>
        ${this._renderDiagnosticsPanel()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterRunSetup", "Run Setup")}>
        ${this._renderSetupPanel()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterWizardSteps", "Wizard Steps")}>
        ${this._renderRunState()}
        ${this._renderWizardSteps()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterStepTranscript", "Step Transcript")}>
        ${this._renderTranscriptPanel()}
      </uui-box>
    `;
  }
};
f = /* @__PURE__ */ new WeakMap();
T = /* @__PURE__ */ new WeakMap();
n.styles = x`    :host {
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

    .diagnostics-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-2);
    }

    .setup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .setup-grid uui-input,
    .setup-grid uui-select,
    .setup-grid uui-toggle {
      width: 100%;
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

    .group-row uui-select {
      width: 100%;
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
  a()
], n.prototype, "_isLoadingDiagnostics", 2);
u([
  a()
], n.prototype, "_diagnosticsError", 2);
u([
  a()
], n.prototype, "_diagnostics", 2);
u([
  a()
], n.prototype, "_modeRequested", 2);
u([
  a()
], n.prototype, "_templatePreset", 2);
u([
  a()
], n.prototype, "_agentId", 2);
u([
  a()
], n.prototype, "_dryRun", 2);
u([
  a()
], n.prototype, "_realOrderConfirmed", 2);
u([
  a()
], n.prototype, "_paymentHandlerId", 2);
u([
  a()
], n.prototype, "_availablePaymentHandlerIds", 2);
u([
  a()
], n.prototype, "_selectedProducts", 2);
u([
  a()
], n.prototype, "_buyerEmail", 2);
u([
  a()
], n.prototype, "_buyerPhone", 2);
u([
  a()
], n.prototype, "_buyerGivenName", 2);
u([
  a()
], n.prototype, "_buyerFamilyName", 2);
u([
  a()
], n.prototype, "_buyerAddressLine1", 2);
u([
  a()
], n.prototype, "_buyerAddressLine2", 2);
u([
  a()
], n.prototype, "_buyerLocality", 2);
u([
  a()
], n.prototype, "_buyerAdministrativeArea", 2);
u([
  a()
], n.prototype, "_buyerPostalCode", 2);
u([
  a()
], n.prototype, "_buyerCountryCode", 2);
u([
  a()
], n.prototype, "_discountCodesInput", 2);
u([
  a()
], n.prototype, "_sessionId", 2);
u([
  a()
], n.prototype, "_sessionStatus", 2);
u([
  a()
], n.prototype, "_orderId", 2);
u([
  a()
], n.prototype, "_fulfillmentGroups", 2);
u([
  a()
], n.prototype, "_selectedFulfillmentOptionIds", 2);
u([
  a()
], n.prototype, "_transcripts", 2);
u([
  a()
], n.prototype, "_activeStep", 2);
n = u([
  S("merchello-ucp-flow-tester")
], n);
var ee = Object.defineProperty, te = Object.getOwnPropertyDescriptor, z = (e) => {
  throw TypeError(e);
}, y = (e, t, r, i) => {
  for (var o = i > 1 ? void 0 : i ? te(t, r) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (o = (i ? c(t, r, o) : c(o)) || o);
  return i && o && ee(t, r, o), o;
}, V = (e, t, r) => t.has(e) || z("Cannot " + r), P = (e, t, r) => (V(e, t, "read from private field"), r ? r.call(e) : t.get(e)), B = (e, t, r) => t.has(e) ? z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), re = (e, t, r, i) => (V(e, t, "write to private field"), t.set(e, r), r), k, v;
let m = class extends F(w) {
  constructor() {
    super(), this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "store", this._configuration = null, this._descriptionEditorConfig = void 0, B(this, k, new W(this)), B(this, v), this.consumeContext(N, (e) => {
      re(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfiguration();
  }
  async _loadConfiguration() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, t] = await Promise.all([
      d.getStoreConfiguration(),
      d.getDescriptionEditorSettings()
    ]);
    if (e.error || !e.data) {
      this._errorMessage = e.error?.message ?? "Failed to load store settings.", this._isLoading = !1, this._setFallbackEditorConfig();
      return;
    }
    this._configuration = e.data, t.data?.dataTypeKey ? await this._loadDataTypeConfig(t.data.dataTypeKey) : this._setFallbackEditorConfig(), this._isLoading = !1;
  }
  async _loadDataTypeConfig(e) {
    try {
      const { error: t } = await P(this, k).requestByUnique(e);
      if (t) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await P(this, k).byUnique(e),
        (r) => {
          if (!r) {
            this._setFallbackEditorConfig();
            return;
          }
          this._descriptionEditorConfig = new D(r.values);
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
    const { data: e, error: t } = await d.saveStoreConfiguration(this._configuration);
    if (t || !e) {
      P(this, v)?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: t?.message ?? "An unknown error occurred while saving settings."
        }
      }), this._isSaving = !1;
      return;
    }
    this._configuration = e, this._errorMessage = null, P(this, v)?.peek("positive", {
      data: {
        headline: "Settings saved",
        message: "Store configuration has been updated."
      }
    }), this._isSaving = !1;
  }
  _toPropertyValueMap(e) {
    const t = {};
    for (const r of e)
      t[r.alias] = r.value;
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
      const r = Number(e);
      return Number.isFinite(r) ? r : t;
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
      const t = e.find((r) => typeof r == "string");
      return typeof t == "string" ? t : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getMediaKeysFromPropertyValue(e) {
    return Array.isArray(e) ? e.map((t) => {
      if (!t || typeof t != "object") return "";
      const r = t;
      return typeof r.mediaKey == "string" && r.mediaKey ? r.mediaKey : typeof r.key == "string" && r.key ? r.key : "";
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
  _t(e, t) {
    const r = this.localize;
    return r?.termOrDefault ? r.termOrDefault(e, t) : t;
  }
  _handleCheckoutColorChange(e, t) {
    if (!this._configuration) return;
    const r = this._getColorValueFromEvent(t);
    switch (e) {
      case "headerBackgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            headerBackgroundColor: r || null
          }
        };
        return;
      case "primaryColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            primaryColor: r || this._configuration.checkout.primaryColor
          }
        };
        return;
      case "accentColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            accentColor: r || this._configuration.checkout.accentColor
          }
        };
        return;
      case "backgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            backgroundColor: r || this._configuration.checkout.backgroundColor
          }
        };
        return;
      case "textColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            textColor: r || this._configuration.checkout.textColor
          }
        };
        return;
      case "errorColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            errorColor: r || this._configuration.checkout.errorColor
          }
        };
        return;
    }
  }
  _handleEmailThemeColorChange(e, t) {
    if (!this._configuration) return;
    const r = this._getColorValueFromEvent(t);
    if (r)
      switch (e) {
        case "primaryColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                primaryColor: r
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
                textColor: r
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
                backgroundColor: r
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
                secondaryTextColor: r
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
                contentBackgroundColor: r
              }
            }
          };
          return;
      }
  }
  _renderColorProperty(e, t, r) {
    return s`
      <umb-property-layout .label=${e}>
        <div slot="editor" class="color-picker-field">
          <uui-color-picker .label=${e} .value=${t} @change=${r}></uui-color-picker>
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      store: {
        ...this._configuration.store,
        invoiceNumberPrefix: this._getStringFromPropertyValue(r.invoiceNumberPrefix),
        name: this._getStringFromPropertyValue(r.name),
        email: this._getStringOrNullFromPropertyValue(r.email),
        supportEmail: this._getStringOrNullFromPropertyValue(r.supportEmail),
        phone: this._getStringOrNullFromPropertyValue(r.phone),
        logoMediaKey: this._getSingleMediaPickerValue(r.logoMediaKey),
        websiteUrl: this._getStringOrNullFromPropertyValue(r.websiteUrl),
        address: this._getStringFromPropertyValue(r.address),
        displayPricesIncTax: this._getBooleanFromPropertyValue(
          r.displayPricesIncTax,
          this._configuration.store.displayPricesIncTax
        ),
        showStockLevels: this._getBooleanFromPropertyValue(
          r.showStockLevels,
          this._configuration.store.showStockLevels
        ),
        lowStockThreshold: this._getNumberFromPropertyValue(
          r.lowStockThreshold,
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      invoiceReminders: {
        ...this._configuration.invoiceReminders,
        reminderDaysBeforeDue: this._getNumberFromPropertyValue(
          r.reminderDaysBeforeDue,
          this._configuration.invoiceReminders.reminderDaysBeforeDue
        ),
        overdueReminderIntervalDays: this._getNumberFromPropertyValue(
          r.overdueReminderIntervalDays,
          this._configuration.invoiceReminders.overdueReminderIntervalDays
        ),
        maxOverdueReminders: this._getNumberFromPropertyValue(
          r.maxOverdueReminders,
          this._configuration.invoiceReminders.maxOverdueReminders
        ),
        checkIntervalHours: this._getNumberFromPropertyValue(
          r.checkIntervalHours,
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      policies: {
        ...this._configuration.policies,
        termsContent: this._serializeRichTextPropertyValue(r.termsContent),
        privacyContent: this._serializeRichTextPropertyValue(r.privacyContent)
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []), i = this._getFirstDropdownValue(r.logoPosition) || this._configuration.checkout.logoPosition;
    this._configuration = {
      ...this._configuration,
      checkout: {
        ...this._configuration.checkout,
        headerBackgroundImageMediaKey: this._getSingleMediaPickerValue(r.headerBackgroundImageMediaKey),
        logoPosition: i,
        logoMaxWidth: this._getNumberFromPropertyValue(r.logoMaxWidth, this._configuration.checkout.logoMaxWidth),
        headingFontFamily: this._getStringFromPropertyValue(r.headingFontFamily) || this._configuration.checkout.headingFontFamily,
        bodyFontFamily: this._getStringFromPropertyValue(r.bodyFontFamily) || this._configuration.checkout.bodyFontFamily,
        showExpressCheckout: this._getBooleanFromPropertyValue(
          r.showExpressCheckout,
          this._configuration.checkout.showExpressCheckout
        ),
        billingPhoneRequired: this._getBooleanFromPropertyValue(
          r.billingPhoneRequired,
          this._configuration.checkout.billingPhoneRequired
        ),
        confirmationRedirectUrl: this._getStringOrNullFromPropertyValue(r.confirmationRedirectUrl),
        customScriptUrl: this._getStringOrNullFromPropertyValue(r.customScriptUrl),
        orderTerms: {
          ...this._configuration.checkout.orderTerms,
          showCheckbox: this._getBooleanFromPropertyValue(
            r.orderTermsShowCheckbox,
            this._configuration.checkout.orderTerms.showCheckbox
          ),
          checkboxText: this._getStringFromPropertyValue(r.orderTermsCheckboxText) || this._configuration.checkout.orderTerms.checkboxText,
          checkboxRequired: this._getBooleanFromPropertyValue(
            r.orderTermsCheckboxRequired,
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      abandonedCheckout: {
        ...this._configuration.abandonedCheckout,
        abandonmentThresholdHours: this._getNumberFromPropertyValue(
          r.abandonmentThresholdHours,
          this._configuration.abandonedCheckout.abandonmentThresholdHours
        ),
        recoveryExpiryDays: this._getNumberFromPropertyValue(
          r.recoveryExpiryDays,
          this._configuration.abandonedCheckout.recoveryExpiryDays
        ),
        checkIntervalMinutes: this._getNumberFromPropertyValue(
          r.checkIntervalMinutes,
          this._configuration.abandonedCheckout.checkIntervalMinutes
        ),
        firstEmailDelayHours: this._getNumberFromPropertyValue(
          r.firstEmailDelayHours,
          this._configuration.abandonedCheckout.firstEmailDelayHours
        ),
        reminderEmailDelayHours: this._getNumberFromPropertyValue(
          r.reminderEmailDelayHours,
          this._configuration.abandonedCheckout.reminderEmailDelayHours
        ),
        finalEmailDelayHours: this._getNumberFromPropertyValue(
          r.finalEmailDelayHours,
          this._configuration.abandonedCheckout.finalEmailDelayHours
        ),
        maxRecoveryEmails: this._getNumberFromPropertyValue(
          r.maxRecoveryEmails,
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      email: {
        ...this._configuration.email,
        defaultFromAddress: this._getStringOrNullFromPropertyValue(r.defaultFromAddress),
        defaultFromName: this._getStringOrNullFromPropertyValue(r.defaultFromName),
        theme: {
          ...this._configuration.email.theme,
          fontFamily: this._getStringFromPropertyValue(r.themeFontFamily) || this._configuration.email.theme.fontFamily
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
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []);
    this._configuration = {
      ...this._configuration,
      ucp: {
        ...this._configuration.ucp,
        termsUrl: this._getStringOrNullFromPropertyValue(r.termsUrl),
        privacyUrl: this._getStringOrNullFromPropertyValue(r.privacyUrl)
      }
    };
  }
  _renderSaveActions() {
    return s`
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
    return s`
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
    return s`
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
    return s`
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
    return s`
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
    return s`
      <uui-box .headline=${this._t("merchello_settingsUcpHeadline", "UCP")}>
        <umb-property-dataset
          .value=${this._getUcpDatasetValue()}
          @change=${this._handleUcpDatasetChange}>
          <umb-property alias="termsUrl" .label=${this._t("merchello_settingsUcpTermsUrl", "Terms URL")} property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="privacyUrl" .label=${this._t("merchello_settingsUcpPrivacyUrl", "Privacy URL")} property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box .headline=${this._t("merchello_settingsUcpFlowTesterHeadline", "UCP Flow Tester")}>
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
    return this._errorMessage ? s`
      <uui-box class="error-box">
        <div class="error-message">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      </uui-box>
    ` : h;
  }
  render() {
    return this._isLoading ? s`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      ` : this._configuration ? s`
      ${this._renderErrorBanner()}

      <uui-tab-group class="tabs">
        <uui-tab label="Store" ?active=${this._activeTab === "store"} @click=${() => this._activeTab = "store"}>Store</uui-tab>
        <uui-tab label="Policies" ?active=${this._activeTab === "policies"} @click=${() => this._activeTab = "policies"}>Policies</uui-tab>
        <uui-tab label="Checkout" ?active=${this._activeTab === "checkout"} @click=${() => this._activeTab = "checkout"}>Checkout</uui-tab>
        <uui-tab label="Email" ?active=${this._activeTab === "email"} @click=${() => this._activeTab = "email"}>Email</uui-tab>
        <uui-tab .label=${this._t("merchello_settingsUcpTab", "UCP")} ?active=${this._activeTab === "ucp"} @click=${() => this._activeTab = "ucp"}>
          ${this._t("merchello_settingsUcpTab", "UCP")}
        </uui-tab>
      </uui-tab-group>

      <div class="tab-content">
        ${this._renderCurrentTab()}
      </div>
    ` : s`
        ${this._renderErrorBanner()}
        <div class="tab-actions">
          <uui-button label="Retry" look="secondary" @click=${this._loadConfiguration}>Retry</uui-button>
        </div>
      `;
  }
};
k = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
m.styles = x`
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
  a()
], m.prototype, "_isLoading", 2);
y([
  a()
], m.prototype, "_isSaving", 2);
y([
  a()
], m.prototype, "_errorMessage", 2);
y([
  a()
], m.prototype, "_activeTab", 2);
y([
  a()
], m.prototype, "_configuration", 2);
y([
  a()
], m.prototype, "_descriptionEditorConfig", 2);
m = y([
  S("merchello-store-configuration-tabs")
], m);
var ie = Object.defineProperty, oe = Object.getOwnPropertyDescriptor, R = (e, t, r, i) => {
  for (var o = i > 1 ? void 0 : i ? oe(t, r) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (o = (i ? c(t, r, o) : c(o)) || o);
  return i && o && ie(t, r, o), o;
};
let g = class extends F(w) {
  constructor() {
    super(...arguments), this._isLoading = !0, this._showSeedData = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadStatus();
  }
  async _loadStatus() {
    this._isLoading = !0;
    const { data: e } = await d.getSeedDataStatus();
    this._showSeedData = e?.isEnabled === !0 && e?.isInstalled === !1, this._isLoading = !1;
  }
  _onSeedDataInstalled() {
    this._showSeedData = !1;
  }
  render() {
    return this._isLoading ? h : s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          ${this._showSeedData ? s`
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
g.styles = [
  x`
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
R([
  a()
], g.prototype, "_isLoading", 2);
R([
  a()
], g.prototype, "_showSeedData", 2);
g = R([
  S("merchello-settings-workspace")
], g);
const _e = g;
export {
  g as MerchelloSettingsWorkspaceElement,
  _e as default
};
//# sourceMappingURL=settings-workspace.element-BY7H2UVQ.js.map
