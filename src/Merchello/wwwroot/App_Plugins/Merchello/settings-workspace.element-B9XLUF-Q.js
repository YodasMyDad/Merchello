import { LitElement as U, html as o, nothing as c, css as R, state as n, customElement as E } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as D } from "@umbraco-cms/backoffice/element-api";
import { M as p } from "./merchello-api-NdGX4WPd.js";
import { UMB_NOTIFICATION_CONTEXT as H } from "@umbraco-cms/backoffice/notification";
import { UmbDataTypeDetailRepository as Y } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as M } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
import { UMB_MODAL_MANAGER_CONTEXT as Q } from "@umbraco-cms/backoffice/modal";
import { M as X } from "./product-picker-modal.token-BfbHsSHl.js";
import { b as Z } from "./formatting-DU6_gkL3.js";
var ee = Object.defineProperty, te = Object.getOwnPropertyDescriptor, P = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? te(t, i) : t, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (a = (r ? d(t, i, a) : d(a)) || a);
  return r && a && ee(t, i, a), a;
};
let g = class extends D(U) {
  constructor() {
    super(...arguments), this._isInstalling = !1, this._isInstallComplete = !1, this._message = "", this._hasError = !1;
  }
  async _installSeedData() {
    if (this._isInstalling || this._isInstallComplete) return;
    this._isInstalling = !0, this._hasError = !1, this._message = "";
    const { data: e, error: t } = await p.installSeedData();
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
          ${this._message ? o`<p>${this._message}</p>` : c}
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
g.styles = R`
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
P([
  n()
], g.prototype, "_isInstalling", 2);
P([
  n()
], g.prototype, "_isInstallComplete", 2);
P([
  n()
], g.prototype, "_message", 2);
P([
  n()
], g.prototype, "_hasError", 2);
g = P([
  E("merchello-seed-data-workspace")
], g);
var ie = Object.defineProperty, re = Object.getOwnPropertyDescriptor, q = (e) => {
  throw TypeError(e);
}, u = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? re(t, i) : t, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (a = (r ? d(t, i, a) : d(a)) || a);
  return r && a && ie(t, i, a), a;
}, G = (e, t, i) => t.has(e) || q("Cannot " + i), O = (e, t, i) => (G(e, t, "read from private field"), t.get(e)), L = (e, t, i) => t.has(e) ? q("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), V = (e, t, i, r) => (G(e, t, "write to private field"), t.set(e, i), i), C, $;
let l = class extends D(U) {
  constructor() {
    super(), this._isLoadingDiagnostics = !0, this._diagnosticsError = null, this._diagnostics = null, this._modeRequested = "adapter", this._templatePreset = "physical", this._agentId = "", this._dryRun = !0, this._realOrderConfirmed = !1, this._paymentHandlerId = "manual:manual", this._availablePaymentHandlerIds = [], this._selectedProducts = [], this._buyerEmail = "buyer@example.com", this._buyerPhone = "+14155550100", this._buyerGivenName = "Alex", this._buyerFamilyName = "Taylor", this._buyerAddressLine1 = "1 Test Street", this._buyerAddressLine2 = "", this._buyerLocality = "New York", this._buyerAdministrativeArea = "NY", this._buyerPostalCode = "10001", this._buyerCountryCode = "US", this._discountCodesInput = "", this._sessionId = null, this._sessionStatus = null, this._orderId = null, this._fulfillmentGroups = [], this._selectedFulfillmentOptionIds = {}, this._transcripts = [], this._activeStep = null, this._expandedStep = null, this._openSections = /* @__PURE__ */ new Set(["scenario", "products"]), L(this, C), L(this, $), this.consumeContext(Q, (e) => {
      V(this, C, e);
    }), this.consumeContext(H, (e) => {
      V(this, $, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadDiagnostics();
  }
  // ─── Business Logic ───────────────────────────────────────────────────────
  async _loadDiagnostics() {
    this._isLoadingDiagnostics = !0, this._diagnosticsError = null;
    const { data: e, error: t } = await p.getUcpFlowDiagnostics();
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
    const i = this.localize;
    return i?.termOrDefault ? i.termOrDefault(e, t) : t;
  }
  _isStrictModeBlocked() {
    return this._modeRequested === "strict" && this._diagnostics != null && !this._diagnostics.strictModeAvailable;
  }
  _switchToAdapterMode() {
    this._modeRequested = "adapter";
  }
  _startNewRun() {
    this._sessionId = null, this._sessionStatus = null, this._orderId = null, this._fulfillmentGroups = [], this._selectedFulfillmentOptionIds = {}, this._availablePaymentHandlerIds = [], this._paymentHandlerId = "manual:manual", this._transcripts = [], this._activeStep = null, this._realOrderConfirmed = !1, this._expandedStep = null;
  }
  async _openProductPicker() {
    if (!O(this, C))
      return;
    const e = this._templatePreset === "digital" ? null : {
      countryCode: this._buyerCountryCode || "US",
      regionCode: this._buyerAdministrativeArea || void 0
    }, i = await O(this, C).open(this, X, {
      data: {
        config: {
          currencySymbol: "$",
          shippingAddress: e,
          excludeProductIds: this._selectedProducts.map((r) => r.productId)
        }
      }
    }).onSubmit().catch(() => {
    });
    i?.selections?.length && this._mergeSelectedProducts(i.selections);
  }
  _mergeSelectedProducts(e) {
    const t = [...this._selectedProducts];
    for (const i of e) {
      const r = this._normalizeSelectedProduct(i);
      if (r == null)
        continue;
      const a = t.findIndex((s) => s.key === r.key);
      if (a >= 0) {
        const s = t[a];
        t[a] = {
          ...s,
          quantity: s.quantity + 1
        };
      } else
        t.push(r);
    }
    this._selectedProducts = t;
  }
  _normalizeSelectedProduct(e) {
    if (!e.productId || !e.name)
      return null;
    const t = e.selectedAddons ?? [], i = t.map((r) => `${r.optionId}:${r.valueId}`).sort().join("|");
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
    const i = this._readInputValue(t), r = Number(i), a = Number.isFinite(r) ? Math.max(1, Math.round(r)) : 1;
    this._selectedProducts = this._selectedProducts.map(
      (s) => s.key === e ? { ...s, quantity: a } : s
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
    await this._executeStep("manifest", () => p.ucpTestManifest(e));
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
    await this._executeStep("create_session", () => p.ucpTestCreateSession(t));
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
    await this._executeStep("get_session", () => p.ucpTestGetSession(e));
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
    await this._executeStep("update_session", () => p.ucpTestUpdateSession(t));
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
    await this._executeStep("complete_session", () => p.ucpTestCompleteSession(t));
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
    await this._executeStep("get_order", () => p.ucpTestGetOrder(e));
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
    await this._executeStep("cancel_session", () => p.ucpTestCancelSession(e));
  }
  async _executeStep(e, t) {
    if (!this._activeStep) {
      this._activeStep = e;
      try {
        const { data: i, error: r } = await t();
        if (r || !i) {
          this._notify("danger", r?.message ?? this._t("merchello_ucpFlowTesterStepFailed", `Step ${e} failed.`));
          return;
        }
        this._applyStepResult(i);
      } catch (i) {
        const r = i instanceof Error ? i.message : this._t("merchello_ucpFlowTesterStepFailed", `Step ${e} failed.`);
        this._notify("danger", r);
      } finally {
        this._activeStep = null;
      }
    }
  }
  _applyStepResult(e) {
    this._transcripts = [...this._transcripts, e], e.sessionId && (this._sessionId = e.sessionId), e.status && (this._sessionStatus = e.status), e.orderId && (this._orderId = e.orderId), this._syncPaymentHandlers(e.responseData), this._syncFulfillmentGroups(e.responseData), this._expandedStep = e.step ?? null;
  }
  _syncPaymentHandlers(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const i = this._asObject(t.ucp), a = this._asArray(i?.payment_handlers).map((s) => this._asObject(s)).map((s) => this._asString(s?.handler_id)).filter((s) => !!s);
    a.length !== 0 && (this._availablePaymentHandlerIds = Array.from(new Set(a)), this._availablePaymentHandlerIds.includes(this._paymentHandlerId) || (this._paymentHandlerId = this._availablePaymentHandlerIds[0]));
  }
  _syncFulfillmentGroups(e) {
    const t = this._asObject(e);
    if (!t)
      return;
    const i = this._asObject(t.fulfillment);
    if (!i)
      return;
    const r = this._asArray(i.methods), a = [];
    for (const d of r) {
      const S = this._asObject(d);
      if (S)
        for (const j of this._asArray(S.groups)) {
          const v = this._asObject(j), A = this._asString(v?.id);
          if (!v || !A)
            continue;
          const K = this._asArray(v.options).map((h) => this._asObject(h)).filter((h) => h != null).map((h) => {
            const J = this._asArray(h.totals), z = this._asObject(J[0]);
            return {
              id: this._asString(h.id) ?? "",
              title: this._asString(h.title) ?? this._t("merchello_ucpFlowTesterOptionLabel", "Option"),
              amount: this._asNumber(z?.amount),
              currency: this._asString(z?.currency)
            };
          }).filter((h) => h.id.length > 0);
          a.push({
            id: A,
            name: this._asString(v.name) ?? A,
            selectedOptionId: this._asString(v.selected_option_id),
            options: K
          });
        }
    }
    if (a.length === 0)
      return;
    const s = { ...this._selectedFulfillmentOptionIds };
    for (const d of a)
      s[d.id] || (d.selectedOptionId ? s[d.id] = d.selectedOptionId : d.options.length === 1 && (s[d.id] = d.options[0].id));
    this._fulfillmentGroups = a, this._selectedFulfillmentOptionIds = s;
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
        options: t.selectedAddons.map((r) => ({
          name: r.optionName,
          value: r.valueName
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
      return { codes: e };
  }
  _buildCreateFulfillmentPayload() {
    return this._templatePreset === "digital" ? void 0 : { methods: [{
      type: "shipping",
      destinations: [
        {
          type: "postal_address",
          address: this._buildAddressPayload()
        }
      ]
    }] };
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
    return Object.entries(this._selectedFulfillmentOptionIds).map(([e, t]) => ({ id: e, selectedOptionId: t })).filter((e) => !!e.id && !!e.selectedOptionId);
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
    O(this, $)?.peek(e, {
      data: {
        headline: this._t("merchello_ucpFlowTesterHeadline", "UCP Flow Tester"),
        message: t
      }
    });
  }
  // ─── UX Helpers ───────────────────────────────────────────────────────────
  _getStepTranscript(e) {
    for (let t = this._transcripts.length - 1; t >= 0; t--)
      if (this._transcripts[t].step === e)
        return this._transcripts[t];
    return null;
  }
  _getStepStatus(e) {
    if (this._activeStep === e) return "running";
    const t = this._getStepTranscript(e);
    return t ? t.success ? "success" : "error" : "idle";
  }
  _toggleSection(e) {
    const t = new Set(this._openSections);
    t.has(e) ? t.delete(e) : t.add(e), this._openSections = t;
  }
  _toggleStep(e) {
    this._expandedStep = this._expandedStep === e ? null : e;
  }
  // ─── Option Helpers ───────────────────────────────────────────────────────
  _getExecutionModeOptions() {
    return [
      { name: this._t("merchello_ucpFlowTesterAdapterMode", "Adapter Mode"), value: "adapter", selected: this._modeRequested === "adapter" },
      { name: this._t("merchello_ucpFlowTesterStrictHttpMode", "Strict HTTP Mode"), value: "strict", selected: this._modeRequested === "strict" }
    ];
  }
  _getTemplateOptions() {
    return [
      { name: this._t("merchello_ucpFlowTesterTemplatePhysical", "Physical Product"), value: "physical", selected: this._templatePreset === "physical" },
      { name: this._t("merchello_ucpFlowTesterTemplateDigital", "Digital Product"), value: "digital", selected: this._templatePreset === "digital" },
      { name: this._t("merchello_ucpFlowTesterTemplateIncompleteBuyer", "Incomplete Buyer"), value: "incomplete", selected: this._templatePreset === "incomplete" },
      { name: this._t("merchello_ucpFlowTesterTemplateMultiItem", "Multi-item"), value: "multi-item", selected: this._templatePreset === "multi-item" }
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
      { name: this._t("merchello_ucpFlowTesterSelectOption", "Select option"), value: "", selected: !this._selectedFulfillmentOptionIds[e.id] },
      ...e.options.map((t) => ({
        name: `${t.title}${t.amount != null ? ` (${t.currency || ""} ${t.amount})` : ""}`,
        value: t.id,
        selected: this._selectedFulfillmentOptionIds[e.id] === t.id
      }))
    ];
  }
  // ─── Render: Diagnostics Bar ──────────────────────────────────────────────
  _renderDiagnosticsBar() {
    if (this._isLoadingDiagnostics)
      return o`
        <div class="diagnostics-bar">
          <div class="loading-row">
            <uui-loader></uui-loader>
            <span>${this._t("merchello_ucpFlowTesterLoadingDiagnostics", "Loading diagnostics...")}</span>
          </div>
        </div>
      `;
    if (this._diagnosticsError)
      return o`
        <div class="diagnostics-bar diagnostics-bar--error">
          <span>${this._diagnosticsError}</span>
          <uui-button look="secondary" .label=${this._t("general_retry", "Retry")} @click=${this._loadDiagnostics}>
            ${this._t("general_retry", "Retry")}
          </uui-button>
        </div>
      `;
    if (!this._diagnostics) return c;
    const e = this._diagnostics;
    return o`
      <div class="diagnostics-bar">
        <span class="diag-chip diag-chip--neutral">Protocol ${e.protocolVersion || "–"}</span>
        <span class="diag-chip ${e.strictModeAvailable ? "diag-chip--positive" : "diag-chip--warning"}">
          Strict: ${e.strictModeAvailable ? "Available" : "Blocked"}
        </span>
        <span class="diag-chip ${e.requireHttps ? "diag-chip--positive" : "diag-chip--warning"}">
          HTTPS: ${e.requireHttps ? "Required" : "Optional"}
        </span>
        <span class="diag-chip diag-chip--neutral">TLS ${e.minimumTlsVersion || "–"}</span>
        <span class="diag-chip diag-chip--neutral">${e.capabilities.length} Capabilities</span>
        <span class="diag-chip diag-chip--neutral">${e.extensions.length} Extensions</span>
        ${e.publicBaseUrl ? o`<span class="diag-chip diag-chip--neutral diag-chip--url" title="${e.publicBaseUrl}">URL: ${e.publicBaseUrl}</span>` : c}
      </div>
    `;
  }
  // ─── Render: Setup Sidebar ────────────────────────────────────────────────
  _renderSetupSidebar() {
    const e = this._selectedProducts.length > 0 ? o`<span class="section-badge">${this._selectedProducts.length}</span>` : c;
    return o`
      <div class="setup-sidebar">
        ${this._renderAccordion("scenario", "Scenario", c, this._renderScenarioSection())}
        ${this._renderAccordion("products", "Products", e, this._renderProductsSection())}
        ${this._renderAccordion("buyer", "Buyer Info", c, this._renderBuyerInfoSection())}
        ${this._renderAccordion("advanced", "Advanced", c, this._renderAdvancedSection())}
      </div>
    `;
  }
  _renderAccordion(e, t, i, r) {
    const a = this._openSections.has(e);
    return o`
      <div class="accordion-section">
        <div class="accordion-header" @click=${() => this._toggleSection(e)}>
          <span class="accordion-chevron ${a ? "accordion-chevron--open" : ""}">›</span>
          <span class="accordion-title">${t}</span>
          ${i}
        </div>
        ${a ? o`<div class="accordion-body">${r}</div>` : c}
      </div>
    `;
  }
  _renderScenarioSection() {
    return o`
      ${this._renderStrictBlockedBanner()}
      <div class="field-group">
        <label class="field-label">Execution Mode</label>
        <uui-select
          .label=${"Execution Mode"}
          .options=${this._getExecutionModeOptions()}
          @change=${this._handleModeChange}>
        </uui-select>
        <span class="field-hint">Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.</span>
      </div>
      <div class="field-group">
        <label class="field-label">Template</label>
        <uui-select
          .label=${"Template"}
          .options=${this._getTemplateOptions()}
          @change=${this._handleTemplatePresetChange}>
        </uui-select>
        <span class="field-hint">Guided setup presets for common UCP scenarios.</span>
      </div>
      <div class="field-group">
        <label class="field-label">Agent ID</label>
        <uui-input
          .label=${"Agent ID"}
          .value=${this._agentId}
          @input=${this._handleAgentIdChange}>
        </uui-input>
        <span class="field-hint">Used to build the simulated test agent profile URL.</span>
      </div>
    `;
  }
  _renderProductsSection() {
    return o`
      <uui-button
        look="primary"
        color="positive"
        .label=${"Pick Products"}
        @click=${this._openProductPicker}>
        Pick Products
      </uui-button>
      ${this._selectedProducts.length === 0 ? o`<div class="empty-note">No products selected yet.</div>` : o`
          <div class="product-list">
            ${this._selectedProducts.map((e) => o`
              <div class="product-row">
                <div class="product-main">
                  <strong>${e.name}</strong>
                  <span>${e.sku || "No SKU"} · $${Z(e.price, 2)}</span>
                </div>
                <div class="product-qty">
                  <uui-input
                    type="number"
                    min="1"
                    .label=${"Qty"}
                    .value=${String(e.quantity)}
                    @input=${(t) => this._updateProductQuantity(e.key, t)}>
                  </uui-input>
                </div>
                <uui-button
                  look="secondary"
                  color="danger"
                  .label=${"Remove"}
                  @click=${() => this._removeProduct(e.key)}>
                  ×
                </uui-button>
              </div>
            `)}
          </div>
        `}
    `;
  }
  _renderBuyerInfoSection() {
    return o`
      <div class="buyer-grid buyer-grid--2col">
        <div class="field-group">
          <label class="field-label">Given Name</label>
          <uui-input .label=${"Given Name"} .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Family Name</label>
          <uui-input .label=${"Family Name"} .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </div>
      </div>
      <div class="buyer-grid buyer-grid--2col">
        <div class="field-group">
          <label class="field-label">Email</label>
          <uui-input type="email" .label=${"Email"} .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Phone</label>
          <uui-input type="tel" .label=${"Phone"} .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Address Line 1</label>
        <uui-input .label=${"Address Line 1"} .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
      </div>
      <div class="field-group">
        <label class="field-label">Address Line 2</label>
        <uui-input .label=${"Address Line 2"} .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
      </div>
      <div class="buyer-grid buyer-grid--3col">
        <div class="field-group">
          <label class="field-label">City</label>
          <uui-input .label=${"City"} .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Region</label>
          <uui-input .label=${"Region"} .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Postal Code</label>
          <uui-input .label=${"Postal Code"} .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </div>
      </div>
      <div class="field-group field-group--short">
        <label class="field-label">Country Code</label>
        <uui-input maxlength="2" .label=${"Country Code"} .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
      </div>
    `;
  }
  _renderAdvancedSection() {
    return o`
      <div class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-label">Dry Run</span>
          <span class="field-hint">Returns a preview without creating a real order.</span>
        </div>
        <uui-toggle .label=${"Dry Run"} ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
      </div>
      <div class="toggle-row ${this._dryRun ? "toggle-row--disabled" : ""}">
        <div class="toggle-info">
          <span class="toggle-label">Confirm Real Order</span>
          <span class="field-hint">Required before completing with dry run disabled.</span>
        </div>
        <uui-toggle
          .label=${"Confirm Real Order"}
          ?disabled=${this._dryRun}
          ?checked=${this._realOrderConfirmed}
          @change=${this._handleRealOrderConfirmedChange}>
        </uui-toggle>
      </div>
      <div class="field-group">
        <label class="field-label">Payment Handler</label>
        ${this._availablePaymentHandlerIds.length > 0 ? o`<uui-select .label=${"Payment Handler"} .options=${this._getPaymentHandlerOptions()} @change=${this._handlePaymentHandlerIdChange}></uui-select>` : o`<uui-input .label=${"Payment Handler"} .value=${this._paymentHandlerId} @input=${this._handlePaymentHandlerIdChange}></uui-input>`}
      </div>
      <div class="field-group">
        <label class="field-label">Discount Codes</label>
        <uui-input
          .label=${"Discount Codes"}
          .value=${this._discountCodesInput}
          @input=${this._handleDiscountCodesChange}
          placeholder="code1, code2">
        </uui-input>
        <span class="field-hint">Comma-separated promotional codes.</span>
      </div>
    `;
  }
  // ─── Render: Flow Panel ───────────────────────────────────────────────────
  _renderFlowPanel() {
    return o`
      <div class="flow-panel">
        ${this._renderSessionState()}
        <div class="flow-toolbar">
          <uui-button look="secondary" .label=${"Start New Run"} @click=${this._startNewRun}>
            Start New Run
          </uui-button>
        </div>
        ${this._renderStepTimeline()}
      </div>
    `;
  }
  _renderSessionState() {
    const e = this._sessionId ? `${this._sessionId.substring(0, 12)}…` : "–", t = this._orderId ? `${this._orderId.substring(0, 12)}…` : "–", i = this._sessionStatus ? this._sessionStatus.includes("ready") ? "positive" : this._sessionStatus.includes("cancel") ? "warning" : "neutral" : "neutral";
    return o`
      <div class="session-state">
        <div
          class="session-chip ${this._sessionId ? "session-chip--active" : ""}"
          title="${this._sessionId ?? ""}"
          @click=${this._sessionId ? () => void this._copyText(this._sessionId, "Session ID") : c}>
          <span class="session-chip-label">Session</span>
          <span class="session-chip-value">${e}</span>
        </div>
        <div class="session-chip session-chip--status-${i}">
          <span class="session-chip-label">Status</span>
          <span class="session-chip-value">${this._sessionStatus || "–"}</span>
        </div>
        <div
          class="session-chip ${this._orderId ? "session-chip--active" : ""}"
          title="${this._orderId ?? ""}"
          @click=${this._orderId ? () => void this._copyText(this._orderId, "Order ID") : c}>
          <span class="session-chip-label">Order</span>
          <span class="session-chip-value">${t}</span>
        </div>
      </div>
    `;
  }
  _renderStepTimeline() {
    const e = !this._sessionId || !this._dryRun && !this._realOrderConfirmed, t = [
      { key: "manifest", label: "Manifest", desc: "Fetch the manifest to verify protocol configuration and capabilities", disabled: !1, action: () => this._executeManifestStep() },
      { key: "create_session", label: "Create Session", desc: "Initialize a checkout session with the selected products and buyer info", disabled: this._selectedProducts.length === 0, action: () => this._executeCreateSessionStep() },
      { key: "get_session", label: "Get Session", desc: "Retrieve the current session state and available shipping options", disabled: !this._sessionId, action: () => this._executeGetSessionStep() },
      { key: "update_session", label: "Update Session", desc: "Apply a shipping selection and confirm buyer information", disabled: !this._sessionId, action: () => this._executeUpdateSessionStep() },
      { key: "complete_session", label: "Complete Session", desc: "Process payment and finalize the order", disabled: e, action: () => this._executeCompleteSessionStep() },
      { key: "get_order", label: "Get Order", desc: "Retrieve the created order details after successful completion", disabled: !this._orderId, action: () => this._executeGetOrderStep() },
      { key: "cancel_session", label: "Cancel Session", desc: "Cancel the current session without placing an order", disabled: !this._sessionId, action: () => this._executeCancelSessionStep() }
    ];
    return o`
      <div class="step-timeline">
        ${t.map((i, r) => this._renderStepCard(i, r))}
      </div>
    `;
  }
  _renderStepCard(e, t) {
    const i = this._getStepStatus(e.key), r = this._expandedStep === e.key, a = this._getStepTranscript(e.key) !== null, s = a, d = i === "running" ? o`<uui-loader style="--uui-loader-default-stroke-color:#fff"></uui-loader>` : i === "success" ? "✓" : i === "error" ? "✕" : t + 1;
    return o`
      <div
        class="step-card step-card--${i} ${s ? "step-card--clickable" : ""}"
        @click=${s ? () => this._toggleStep(e.key) : c}>
        <div class="step-card-header">
          <div class="step-number step-number--${i}">${d}</div>
          <div class="step-info">
            <span class="step-name">${e.label}</span>
            <span class="step-desc">${e.desc}</span>
            ${e.key === "update_session" && this._fulfillmentGroups.length > 0 ? this._renderFulfillmentSelections() : c}
          </div>
          <div class="step-actions" @click=${(S) => S.stopPropagation()}>
            ${a ? o`<span class="step-expand-hint">${r ? "▲" : "▼"}</span>` : c}
            <uui-button
              look="secondary"
              .label=${e.label}
              ?disabled=${e.disabled || !!this._activeStep}
              @click=${() => void e.action()}>
              ${i === "running" ? "Running…" : "Run"}
            </uui-button>
          </div>
        </div>
        ${r ? this._renderInlineTranscript(e.key) : c}
      </div>
    `;
  }
  _renderFulfillmentSelections() {
    return this._fulfillmentGroups.length === 0 ? c : o`
      <div class="fulfillment-groups">
        ${this._fulfillmentGroups.map((e) => o`
          <div class="fulfillment-row">
            <span class="fulfillment-name">${e.name}</span>
            <uui-select
              .label=${e.name}
              .options=${this._getFulfillmentGroupOptions(e)}
              @change=${(t) => this._updateFulfillmentGroupSelection(e.id, t)}>
            </uui-select>
          </div>
        `)}
      </div>
    `;
  }
  _renderInlineTranscript(e) {
    const t = this._getStepTranscript(e);
    if (!t)
      return o`<div class="transcript-inline"><div class="empty-note">No data for this step yet.</div></div>`;
    const i = this._formatSnapshotBody(t.request?.body), r = this._formatSnapshotBody(t.response?.body), a = JSON.stringify(t.request?.headers ?? {}, null, 2), s = JSON.stringify(t.response?.headers ?? {}, null, 2), d = `${t.modeRequested} → ${t.modeExecuted}`;
    return o`
      <div class="transcript-inline">
        <div class="transcript-meta">
          <span class="badge ${t.success ? "positive" : "danger"}">${t.success ? "Success" : "Failed"}</span>
          <span class="badge neutral">${d}</span>
          ${t.fallbackApplied ? o`<span class="badge warning">Fallback</span>` : c}
          <span class="badge neutral">HTTP ${t.response?.statusCode ?? "–"}</span>
        </div>
        ${t.fallbackReason ? o`<div class="fallback-reason">${t.fallbackReason}</div>` : c}
        <div class="transcript-copy-row">
          <uui-button
            look="secondary"
            .label=${"Copy Request"}
            @click=${() => void this._copyText(`Headers:
${a}

Body:
${i}`, "Request")}>
            Copy Request
          </uui-button>
          <uui-button
            look="secondary"
            .label=${"Copy Response"}
            @click=${() => void this._copyText(`Headers:
${s}

Body:
${r}`, "Response")}>
            Copy Response
          </uui-button>
        </div>
        <div class="transcript-grid">
          <div>
            <div class="transcript-col-header">Request</div>
            <div class="code-block">${a}</div>
            <div class="code-block">${i}</div>
          </div>
          <div>
            <div class="transcript-col-header">Response</div>
            <div class="code-block">${s}</div>
            <div class="code-block">${r}</div>
          </div>
        </div>
      </div>
    `;
  }
  _renderStrictBlockedBanner() {
    return this._isStrictModeBlocked() ? o`
      <div class="warning-banner">
        <div>
          <strong>${this._t("merchello_ucpFlowTesterStrictBlockedTitle", "Strict mode is blocked.")}</strong>
          <div>${this._diagnostics?.strictModeBlockReason || this._t("merchello_ucpFlowTesterStrictUnavailable", "Strict mode is unavailable in this runtime.")}</div>
        </div>
        <uui-button
          look="primary"
          color="positive"
          .label=${this._t("merchello_ucpFlowTesterSwitchToAdapter", "Switch to adapter mode")}
          @click=${this._switchToAdapterMode}>
          ${this._t("merchello_ucpFlowTesterSwitchToAdapterButton", "Switch to Adapter")}
        </uui-button>
      </div>
    ` : c;
  }
  // ─── Main Render ──────────────────────────────────────────────────────────
  render() {
    return o`
      ${this._renderDiagnosticsBar()}
      <div class="tester-layout">
        ${this._renderSetupSidebar()}
        ${this._renderFlowPanel()}
      </div>
    `;
  }
};
C = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
l.styles = R`
    :host {
      display: block;
      width: 100%;
    }

    /* ── Diagnostics Bar ── */

    .diagnostics-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      margin-bottom: var(--uui-size-space-4);
    }

    .diagnostics-bar--error {
      border-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 8%, white);
    }

    .diag-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .diag-chip--neutral {
      background: color-mix(in srgb, var(--uui-color-divider) 50%, transparent);
      color: var(--uui-color-text);
      border-color: var(--uui-color-divider);
    }

    .diag-chip--positive {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 12%, white);
      color: var(--uui-color-positive-standalone);
      border-color: color-mix(in srgb, var(--uui-color-positive-standalone) 40%, transparent);
    }

    .diag-chip--warning {
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 15%, white);
      color: #8a5c00;
      border-color: color-mix(in srgb, var(--uui-color-warning-standalone) 50%, transparent);
    }

    .diag-chip--url {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.85rem;
      color: var(--uui-color-text-alt);
    }

    /* ── Two-Column Layout ── */

    .tester-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: var(--uui-size-space-5);
      align-items: start;
    }

    /* ── Setup Sidebar ── */

    .setup-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      position: sticky;
      top: var(--uui-size-space-4);
    }

    .accordion-section {
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      overflow: hidden;
      background: var(--uui-color-surface);
    }

    .accordion-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      cursor: pointer;
      user-select: none;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .accordion-header:hover {
      background: color-mix(in srgb, var(--uui-color-focus) 5%, var(--uui-color-surface));
    }

    .accordion-chevron {
      display: inline-block;
      font-size: 1rem;
      color: var(--uui-color-text-alt);
      transition: transform 0.15s ease;
      transform: rotate(0deg);
      width: 16px;
      text-align: center;
    }

    .accordion-chevron--open {
      transform: rotate(90deg);
    }

    .accordion-title {
      flex: 1;
    }

    .accordion-body {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-divider);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--uui-color-positive-standalone);
      color: #fff;
    }

    /* ── Field Groups ── */

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-group--short uui-input {
      width: 80px;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .field-hint {
      font-size: 0.73rem;
      color: var(--uui-color-text-alt);
      line-height: 1.35;
    }

    .field-group uui-input,
    .field-group uui-select {
      width: 100%;
    }

    /* ── Buyer Grid ── */

    .buyer-grid {
      display: grid;
      gap: var(--uui-size-space-2);
    }

    .buyer-grid--2col {
      grid-template-columns: 1fr 1fr;
    }

    .buyer-grid--3col {
      grid-template-columns: 1fr 1fr 1fr;
    }

    /* ── Toggle Rows ── */

    .toggle-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-divider);
    }

    .toggle-row:last-of-type {
      border-bottom: none;
    }

    .toggle-row--disabled {
      opacity: 0.5;
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .toggle-label {
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* ── Products ── */

    .product-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .product-row {
      display: grid;
      grid-template-columns: 1fr 64px auto;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-divider);
      border-radius: 6px;
      background: var(--uui-color-surface);
    }

    .product-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .product-main strong {
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-main span {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .product-qty uui-input {
      width: 100%;
    }

    /* ── Warning Banner ── */

    .warning-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      border-radius: 6px;
      border: 1px solid var(--uui-color-warning-standalone);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 12%, white);
      font-size: 0.85rem;
    }

    .empty-note {
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
      padding: var(--uui-size-space-2) 0;
    }

    /* ── Flow Panel ── */

    .flow-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .flow-toolbar {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* ── Session State ── */

    .session-state {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .session-chip {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      background: var(--uui-color-surface);
      min-width: 130px;
      flex: 1;
    }

    .session-chip--active {
      border-color: var(--uui-color-positive-standalone);
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 6%, white);
      cursor: pointer;
    }

    .session-chip--active:hover {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 12%, white);
    }

    .session-chip--status-positive {
      border-color: var(--uui-color-positive-standalone);
    }

    .session-chip--status-warning {
      border-color: var(--uui-color-warning-standalone);
    }

    .session-chip-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--uui-color-text-alt);
    }

    .session-chip-value {
      font-size: 0.82rem;
      font-weight: 500;
      font-family: var(--uui-font-family-monospace, monospace);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Step Timeline ── */

    .step-timeline {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .step-card {
      border: 1px solid var(--uui-color-divider);
      border-left: 3px solid var(--uui-color-divider);
      border-radius: 8px;
      background: var(--uui-color-surface);
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .step-card--clickable {
      cursor: pointer;
    }

    .step-card--running {
      border-left-color: var(--uui-color-focus, #1a73e8);
      background: color-mix(in srgb, var(--uui-color-focus, #1a73e8) 4%, white);
    }

    .step-card--success {
      border-left-color: var(--uui-color-positive-standalone);
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 4%, white);
    }

    .step-card--success.step-card--clickable:hover {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 8%, white);
    }

    .step-card--error {
      border-left-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 4%, white);
    }

    .step-card--error.step-card--clickable:hover {
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 8%, white);
    }

    .step-card-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 700;
      flex-shrink: 0;
      color: #fff;
      transition: background 0.15s ease;
    }

    .step-number--idle {
      background: var(--uui-color-disabled, #ccc);
      color: var(--uui-color-text-alt);
    }

    .step-number--running {
      background: var(--uui-color-focus, #1a73e8);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .step-number--success {
      background: var(--uui-color-positive-standalone);
    }

    .step-number--error {
      background: var(--uui-color-danger-standalone);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    .step-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .step-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .step-desc {
      font-size: 0.77rem;
      color: var(--uui-color-text-alt);
      line-height: 1.35;
    }

    .step-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .step-expand-hint {
      font-size: 0.7rem;
      color: var(--uui-color-text-alt);
    }

    /* ── Fulfillment Groups (inside step card) ── */

    .fulfillment-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-divider);
    }

    .fulfillment-row {
      display: grid;
      grid-template-columns: 1fr minmax(180px, 260px);
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .fulfillment-name {
      font-size: 0.82rem;
      font-weight: 500;
    }

    .fulfillment-row uui-select {
      width: 100%;
    }

    /* ── Inline Transcript ── */

    .transcript-inline {
      border-top: 1px solid var(--uui-color-divider);
      padding: var(--uui-size-space-3);
    }

    .transcript-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .transcript-copy-row {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-2);
    }

    .transcript-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .transcript-col-header {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-1);
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

    .fallback-reason {
      margin-top: var(--uui-size-space-1);
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.82rem;
    }

    /* ── Badges ── */

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
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

    .value {
      display: block;
      font-size: 0.95rem;
      word-break: break-word;
    }

    /* ── Responsive ── */

    @media (max-width: 960px) {
      .tester-layout {
        grid-template-columns: 1fr;
      }

      .setup-sidebar {
        position: static;
      }

      .transcript-grid {
        grid-template-columns: 1fr;
      }

      .buyer-grid--2col,
      .buyer-grid--3col {
        grid-template-columns: 1fr;
      }

      .fulfillment-row {
        grid-template-columns: 1fr;
      }
    }
  `;
u([
  n()
], l.prototype, "_isLoadingDiagnostics", 2);
u([
  n()
], l.prototype, "_diagnosticsError", 2);
u([
  n()
], l.prototype, "_diagnostics", 2);
u([
  n()
], l.prototype, "_modeRequested", 2);
u([
  n()
], l.prototype, "_templatePreset", 2);
u([
  n()
], l.prototype, "_agentId", 2);
u([
  n()
], l.prototype, "_dryRun", 2);
u([
  n()
], l.prototype, "_realOrderConfirmed", 2);
u([
  n()
], l.prototype, "_paymentHandlerId", 2);
u([
  n()
], l.prototype, "_availablePaymentHandlerIds", 2);
u([
  n()
], l.prototype, "_selectedProducts", 2);
u([
  n()
], l.prototype, "_buyerEmail", 2);
u([
  n()
], l.prototype, "_buyerPhone", 2);
u([
  n()
], l.prototype, "_buyerGivenName", 2);
u([
  n()
], l.prototype, "_buyerFamilyName", 2);
u([
  n()
], l.prototype, "_buyerAddressLine1", 2);
u([
  n()
], l.prototype, "_buyerAddressLine2", 2);
u([
  n()
], l.prototype, "_buyerLocality", 2);
u([
  n()
], l.prototype, "_buyerAdministrativeArea", 2);
u([
  n()
], l.prototype, "_buyerPostalCode", 2);
u([
  n()
], l.prototype, "_buyerCountryCode", 2);
u([
  n()
], l.prototype, "_discountCodesInput", 2);
u([
  n()
], l.prototype, "_sessionId", 2);
u([
  n()
], l.prototype, "_sessionStatus", 2);
u([
  n()
], l.prototype, "_orderId", 2);
u([
  n()
], l.prototype, "_fulfillmentGroups", 2);
u([
  n()
], l.prototype, "_selectedFulfillmentOptionIds", 2);
u([
  n()
], l.prototype, "_transcripts", 2);
u([
  n()
], l.prototype, "_activeStep", 2);
u([
  n()
], l.prototype, "_expandedStep", 2);
u([
  n()
], l.prototype, "_openSections", 2);
l = u([
  E("merchello-ucp-flow-tester")
], l);
var ae = Object.defineProperty, oe = Object.getOwnPropertyDescriptor, W = (e) => {
  throw TypeError(e);
}, y = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? oe(t, i) : t, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (a = (r ? d(t, i, a) : d(a)) || a);
  return r && a && ae(t, i, a), a;
}, B = (e, t, i) => t.has(e) || W("Cannot " + i), _ = (e, t, i) => (B(e, t, "read from private field"), t.get(e)), w = (e, t, i) => t.has(e) ? W("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), se = (e, t, i, r) => (B(e, t, "write to private field"), t.set(e, i), i), T = (e, t, i) => (B(e, t, "access private method"), i), I, x, F, b, k;
let m = class extends D(U) {
  constructor() {
    super(), w(this, b), this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "store", this._configuration = null, this._descriptionEditorConfig = void 0, w(this, I, new Y(this)), w(this, x), w(this, F, () => {
      this._handleSave();
    }), this.consumeContext(H, (e) => {
      se(this, x, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("merchello:trigger-settings-save", _(this, F)), this._loadConfiguration();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("merchello:trigger-settings-save", _(this, F));
  }
  async _loadConfiguration() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, t] = await Promise.all([
      p.getStoreConfiguration(),
      p.getDescriptionEditorSettings()
    ]);
    if (e.error || !e.data) {
      this._errorMessage = e.error?.message ?? "Failed to load store settings.", this._isLoading = !1, this._setFallbackEditorConfig();
      return;
    }
    this._configuration = e.data, T(this, b, k).call(this), t.data?.dataTypeKey ? await this._loadDataTypeConfig(t.data.dataTypeKey) : this._setFallbackEditorConfig(), this._isLoading = !1;
  }
  async _loadDataTypeConfig(e) {
    try {
      const { error: t } = await _(this, I).requestByUnique(e);
      if (t) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await _(this, I).byUnique(e),
        (i) => {
          if (!i) {
            this._setFallbackEditorConfig();
            return;
          }
          this._descriptionEditorConfig = new M(i.values);
        },
        "_observeSettingsDescriptionDataType"
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }
  _setFallbackEditorConfig() {
    this._descriptionEditorConfig = new M([
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
    this._isSaving = !0, T(this, b, k).call(this);
    const { data: e, error: t } = await p.saveStoreConfiguration(this._configuration);
    if (t || !e) {
      _(this, x)?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: t?.message ?? "An unknown error occurred while saving settings."
        }
      }), this._isSaving = !1, T(this, b, k).call(this);
      return;
    }
    this._configuration = e, this._errorMessage = null, _(this, x)?.peek("positive", {
      data: {
        headline: "Settings saved",
        message: "Store configuration has been updated."
      }
    }), this._isSaving = !1, T(this, b, k).call(this);
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
  _getNullableBoolFromPropertyValue(e) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return null;
  }
  _getNullableIntFromPropertyValue(e) {
    if (typeof e == "number" && Number.isFinite(e)) return e;
    if (typeof e == "string" && e.trim() !== "") {
      const t = parseInt(e, 10);
      return Number.isFinite(t) ? t : null;
    }
    return null;
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
  _getFontFamilyConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "System Default", value: "system-ui" },
          { name: "Arial", value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
          { name: "Georgia", value: "Georgia, 'Times New Roman', Times, serif" },
          { name: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
          { name: "Palatino", value: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
          { name: "Segoe UI", value: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
          { name: "Times New Roman", value: "'Times New Roman', Times, Georgia, serif" },
          { name: "Trebuchet MS", value: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans', sans-serif" },
          { name: "Verdana", value: "Verdana, Geneva, Tahoma, sans-serif" }
        ]
      }
    ];
  }
  _getEmailFontFamilyConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
          { name: "Arial", value: "Arial, Helvetica, sans-serif" },
          { name: "Georgia", value: "Georgia, 'Times New Roman', Times, serif" },
          { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
          { name: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
          { name: "Tahoma", value: "Tahoma, Geneva, sans-serif" }
        ]
      }
    ];
  }
  _getColorValueFromEvent(e) {
    return e.target.value?.trim() ?? "";
  }
  _t(e, t) {
    const i = this.localize;
    return i?.termOrDefault ? i.termOrDefault(e, t) : t;
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
  _renderColorProperty(e, t, i, r) {
    return o`
      <umb-property-layout .label=${e} .description=${r ?? ""}>
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
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []), r = this._getFirstDropdownValue(i.logoPosition) || this._configuration.checkout.logoPosition;
    this._configuration = {
      ...this._configuration,
      checkout: {
        ...this._configuration.checkout,
        headerBackgroundImageMediaKey: this._getSingleMediaPickerValue(i.headerBackgroundImageMediaKey),
        logoPosition: r,
        logoMaxWidth: this._getNumberFromPropertyValue(i.logoMaxWidth, this._configuration.checkout.logoMaxWidth),
        headingFontFamily: this._getStringFromPropertyValue(i.headingFontFamily) || this._configuration.checkout.headingFontFamily,
        bodyFontFamily: this._getStringFromPropertyValue(i.bodyFontFamily) || this._configuration.checkout.bodyFontFamily,
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
    const t = this._configuration.ucp;
    return [
      { alias: "termsUrl", value: t.termsUrl ?? "" },
      { alias: "privacyUrl", value: t.privacyUrl ?? "" },
      { alias: "publicBaseUrl", value: t.publicBaseUrl ?? "" },
      { alias: "allowedAgents", value: t.allowedAgents?.join(`
`) ?? "" },
      { alias: "capabilityCheckout", value: t.capabilityCheckout ?? !0 },
      { alias: "capabilityOrder", value: t.capabilityOrder ?? !0 },
      { alias: "capabilityIdentityLinking", value: t.capabilityIdentityLinking ?? !1 },
      { alias: "extensionDiscount", value: t.extensionDiscount ?? !0 },
      { alias: "extensionFulfillment", value: t.extensionFulfillment ?? !0 },
      { alias: "extensionBuyerConsent", value: t.extensionBuyerConsent ?? !1 },
      { alias: "extensionAp2Mandates", value: t.extensionAp2Mandates ?? !1 },
      { alias: "webhookTimeoutSeconds", value: t.webhookTimeoutSeconds ?? "" }
    ];
  }
  _handleUcpDatasetChange(e) {
    if (!this._configuration) return;
    const t = e.target, i = this._toPropertyValueMap(t.value ?? []), r = this._getStringOrNullFromPropertyValue(i.allowedAgents), a = r ? r.split(/[\n,]+/).map((s) => s.trim()).filter((s) => s.length > 0) : null;
    this._configuration = {
      ...this._configuration,
      ucp: {
        ...this._configuration.ucp,
        termsUrl: this._getStringOrNullFromPropertyValue(i.termsUrl),
        privacyUrl: this._getStringOrNullFromPropertyValue(i.privacyUrl),
        publicBaseUrl: this._getStringOrNullFromPropertyValue(i.publicBaseUrl),
        allowedAgents: a,
        capabilityCheckout: this._getNullableBoolFromPropertyValue(i.capabilityCheckout),
        capabilityOrder: this._getNullableBoolFromPropertyValue(i.capabilityOrder),
        capabilityIdentityLinking: this._getNullableBoolFromPropertyValue(i.capabilityIdentityLinking),
        extensionDiscount: this._getNullableBoolFromPropertyValue(i.extensionDiscount),
        extensionFulfillment: this._getNullableBoolFromPropertyValue(i.extensionFulfillment),
        extensionBuyerConsent: this._getNullableBoolFromPropertyValue(i.extensionBuyerConsent),
        extensionAp2Mandates: this._getNullableBoolFromPropertyValue(i.extensionAp2Mandates),
        webhookTimeoutSeconds: this._getNullableIntFromPropertyValue(i.webhookTimeoutSeconds)
      }
    };
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

          <umb-property
            alias="email"
            label="Store Email"
            description="Primary contact email used for store communications and support contact links."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="phone"
            label="Phone"
            description="Store contact number shown in customer-facing checkout and email footer areas."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property
            alias="logoMediaKey"
            label="Logo"
            description="Media item used as the store logo."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: !1 }]}>
          </umb-property>

          <umb-property
            alias="websiteUrl"
            label="Website URL"
            description="Public storefront base URL. Leave blank to automatically use the current store URL from the active request."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="address"
            label="Address"
            description="Store address shown in email footers and customer statement PDFs."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>

          <umb-property
            alias="displayPricesIncTax"
            label="Display Prices Inc Tax"
            description="Controls whether storefront prices are shown including tax by default."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="showStockLevels"
            label="Show Stock Levels"
            description="Shows available stock quantities on product-facing views when enabled."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="lowStockThreshold"
            label="Low Stock Threshold"
            description="Inventory count at or below this value is considered low stock."
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
            description="How many days before an invoice due date to send the first reminder."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="overdueReminderIntervalDays"
            label="Overdue Reminder Interval Days"
            description="Number of days between overdue reminder emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="maxOverdueReminders"
            label="Max Overdue Reminders"
            description="Maximum number of overdue reminders to send per invoice."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalHours"
            label="Check Interval Hours"
            description="How often the reminder job checks for invoices that need reminder emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

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
            description="Background image displayed behind the checkout header area."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: !1 }]}>
          </umb-property>
          ${this._renderColorProperty(
      "Header Background Color",
      e.checkout.headerBackgroundColor ?? "",
      (t) => this._handleCheckoutColorChange("headerBackgroundColor", t),
      "Background color for the checkout header. Used when no image is set."
    )}
          <umb-property
            alias="logoPosition"
            label="Logo Position"
            description="Horizontal alignment of the store logo in the checkout header."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getLogoPositionConfig()}>
          </umb-property>
          <umb-property
            alias="logoMaxWidth"
            label="Logo Max Width"
            description="Maximum width in pixels for the store logo image."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer">
          </umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.checkout.primaryColor,
      (t) => this._handleCheckoutColorChange("primaryColor", t),
      "Main brand color used for buttons and primary interactive elements."
    )}
          ${this._renderColorProperty(
      "Accent Color",
      e.checkout.accentColor,
      (t) => this._handleCheckoutColorChange("accentColor", t),
      "Secondary color used for links, focus states, and highlighted elements."
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.checkout.backgroundColor,
      (t) => this._handleCheckoutColorChange("backgroundColor", t),
      "Page background color for the checkout."
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.checkout.textColor,
      (t) => this._handleCheckoutColorChange("textColor", t),
      "Default text color used throughout the checkout."
    )}
          ${this._renderColorProperty(
      "Error Color",
      e.checkout.errorColor,
      (t) => this._handleCheckoutColorChange("errorColor", t),
      "Color used for error messages and validation feedback."
    )}
          <umb-property
            alias="headingFontFamily"
            label="Heading Font Family"
            description="Font used for headings, section titles, and the store name."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getFontFamilyConfig()}>
          </umb-property>
          <umb-property
            alias="bodyFontFamily"
            label="Body Font Family"
            description="Font used for body text, form labels, and all other checkout text."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getFontFamilyConfig()}>
          </umb-property>
          <umb-property
            alias="billingPhoneRequired"
            label="Billing Phone Required"
            description="Require a phone number in the billing address form."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="confirmationRedirectUrl"
            label="Confirmation Redirect URL"
            description="Redirect customers to this URL after order confirmation. Leave empty to use the built-in confirmation page."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="customScriptUrl"
            label="Custom Script URL"
            description="URL to a custom JavaScript file loaded on checkout pages. Useful for analytics or tracking scripts."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="orderTermsShowCheckbox"
            label="Order Terms Checkbox"
            description="Show a terms and conditions checkbox before payment."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="orderTermsCheckboxText"
            label="Order Terms Checkbox Text"
            description="Text next to the terms checkbox. Use {terms:Link Text} and {privacy:Link Text} to insert policy links."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>
          <umb-property
            alias="orderTermsCheckboxRequired"
            label="Order Terms Checkbox Required"
            description="Require customers to accept terms before completing payment."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Abandoned Checkout">
        <umb-property-dataset
          .value=${this._getAbandonedCheckoutDatasetValue()}
          @change=${this._handleAbandonedCheckoutDatasetChange}>
          <umb-property
            alias="abandonmentThresholdHours"
            label="Abandonment Threshold Hours"
            description="Time after last activity before a checkout is considered abandoned."
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0.5 }]}>
          </umb-property>
          <umb-property
            alias="recoveryExpiryDays"
            label="Recovery Expiry Days"
            description="Days after abandonment before recovery attempts stop."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalMinutes"
            label="Check Interval Minutes"
            description="How often the system checks for newly abandoned checkouts."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 5 }]}>
          </umb-property>
          <umb-property
            alias="firstEmailDelayHours"
            label="First Email Delay Hours"
            description="Hours after abandonment before the first recovery email is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="reminderEmailDelayHours"
            label="Reminder Email Delay Hours"
            description="Hours after the first email before a follow-up reminder is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="finalEmailDelayHours"
            label="Final Email Delay Hours"
            description="Hours after the reminder before the final recovery email is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="maxRecoveryEmails"
            label="Max Recovery Emails"
            description="Maximum number of recovery emails sent per abandoned checkout."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>
    `;
  }
  _renderEmailTab() {
    const e = this._configuration;
    return o`
      <uui-box headline="Email">
        <umb-property-dataset
          .value=${this._getEmailSettingsDatasetValue()}
          @change=${this._handleEmailSettingsDatasetChange}>
          <umb-property
            alias="defaultFromAddress"
            label="Default From Address"
            description="Email address used as the sender for all outgoing store emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="defaultFromName"
            label="Default From Name"
            description="Display name shown alongside the from address in customer emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.email.theme.primaryColor,
      (t) => this._handleEmailThemeColorChange("primaryColor", t),
      "Brand color used for buttons, links, and key highlights in emails."
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.email.theme.textColor,
      (t) => this._handleEmailThemeColorChange("textColor", t),
      "Default text color used throughout email templates."
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.email.theme.backgroundColor,
      (t) => this._handleEmailThemeColorChange("backgroundColor", t),
      "Outer background color surrounding the email content area."
    )}
          <umb-property
            alias="themeFontFamily"
            label="Font Family"
            description="Font used for all text in email templates."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getEmailFontFamilyConfig()}>
          </umb-property>
          ${this._renderColorProperty(
      "Secondary Text Color",
      e.email.theme.secondaryTextColor,
      (t) => this._handleEmailThemeColorChange("secondaryTextColor", t),
      "Color used for supporting text such as footers and captions."
    )}
          ${this._renderColorProperty(
      "Content Background Color",
      e.email.theme.contentBackgroundColor,
      (t) => this._handleEmailThemeColorChange("contentBackgroundColor", t),
      "Background color of the main content area within emails."
    )}
        </umb-property-dataset>
      </uui-box>
    `;
  }
  _renderUcpTab() {
    return o`
      <umb-property-dataset
        .value=${this._getUcpDatasetValue()}
        @change=${this._handleUcpDatasetChange}>

        <uui-box .headline=${this._t("merchello_settingsUcpHeadline", "UCP")}>
          <umb-property
            alias="termsUrl"
            .label=${this._t("merchello_settingsUcpTermsUrl", "Terms URL")}
            description="URL to the store terms of service. Included as a legal link in UCP session responses."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="privacyUrl"
            .label=${this._t("merchello_settingsUcpPrivacyUrl", "Privacy URL")}
            description="URL to the store privacy policy. Included as a legal link in UCP session responses."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="publicBaseUrl"
            label="Public Base URL"
            description="Override the public base URL used in UCP manifest URLs and strict mode. Leave empty to use the store website URL."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="allowedAgents"
            label="Allowed Agents"
            description="Restrict access to specific agent profile URIs (one per line). Use * to allow all agents. Leave empty to use the appsettings default."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>
          <umb-property
            alias="webhookTimeoutSeconds"
            label="Webhook Timeout (seconds)"
            description="Timeout for outbound webhook calls. Leave empty to use the appsettings default."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer">
          </umb-property>
        </uui-box>

        <uui-box headline="Capabilities">
          <umb-property alias="capabilityCheckout" label="Checkout" description="Allow agents to create and manage checkout sessions." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityOrder" label="Order" description="Allow agents to retrieve order details and status after checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityIdentityLinking" label="Identity Linking" description="Allow agents to link external buyer identities to customer accounts." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

        <uui-box headline="Extensions">
          <umb-property alias="extensionDiscount" label="Discount" description="Expose discount and promotional code support to agents during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionFulfillment" label="Fulfillment" description="Expose shipping and fulfillment options to agents during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionBuyerConsent" label="Buyer Consent" description="Require agents to present terms and privacy consent during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionAp2Mandates" label="AP2 Mandates" description="Enable AP2 regulatory mandate compliance for applicable transactions." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

      </umb-property-dataset>

      <uui-box .headline=${this._t("merchello_settingsUcpFlowTesterHeadline", "UCP Flow Tester")}>
        <merchello-ucp-flow-tester></merchello-ucp-flow-tester>
      </uui-box>

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
        return c;
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
    ` : c;
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
        <uui-tab .label=${this._t("merchello_settingsUcpTab", "UCP")} ?active=${this._activeTab === "ucp"} @click=${() => this._activeTab = "ucp"}>
          ${this._t("merchello_settingsUcpTab", "UCP")}
        </uui-tab>
      </uui-tab-group>

      <div class="tab-content">
        ${this._renderCurrentTab()}
      </div>
    ` : o`
        ${this._renderErrorBanner()}
        <div class="retry-actions">
          <uui-button label="Retry" look="secondary" @click=${this._loadConfiguration}>Retry</uui-button>
        </div>
      `;
  }
};
I = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
F = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakSet();
k = function() {
  window.dispatchEvent(
    new CustomEvent("merchello:settings-save-state", {
      detail: { isSaving: this._isSaving, canSave: !!this._configuration }
    })
  );
};
m.styles = R`
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

    .tab-content > umb-property-dataset {
      display: grid;
      gap: var(--uui-size-space-4);
    }

    .retry-actions {
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
  n()
], m.prototype, "_isLoading", 2);
y([
  n()
], m.prototype, "_isSaving", 2);
y([
  n()
], m.prototype, "_errorMessage", 2);
y([
  n()
], m.prototype, "_activeTab", 2);
y([
  n()
], m.prototype, "_configuration", 2);
y([
  n()
], m.prototype, "_descriptionEditorConfig", 2);
m = y([
  E("merchello-store-configuration-tabs")
], m);
var ne = Object.defineProperty, le = Object.getOwnPropertyDescriptor, N = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? le(t, i) : t, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (a = (r ? d(t, i, a) : d(a)) || a);
  return r && a && ne(t, i, a), a;
};
let f = class extends D(U) {
  constructor() {
    super(...arguments), this._isLoading = !0, this._showSeedData = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadStatus();
  }
  async _loadStatus() {
    this._isLoading = !0;
    const { data: e } = await p.getSeedDataStatus();
    this._showSeedData = e?.isEnabled === !0 && e?.isInstalled === !1, this._isLoading = !1;
  }
  _onSeedDataInstalled() {
    this._showSeedData = !1;
  }
  render() {
    return this._isLoading ? c : o`
      <div class="content">
        ${this._showSeedData ? o`
              <merchello-seed-data-workspace
                @seed-data-installed=${this._onSeedDataInstalled}
              ></merchello-seed-data-workspace>
            ` : c}

        <merchello-store-configuration-tabs></merchello-store-configuration-tabs>
      </div>
    `;
  }
};
f.styles = [
  R`
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
N([
  n()
], f.prototype, "_isLoading", 2);
N([
  n()
], f.prototype, "_showSeedData", 2);
f = N([
  E("merchello-settings-workspace")
], f);
const fe = f;
export {
  f as MerchelloSettingsWorkspaceElement,
  fe as default
};
//# sourceMappingURL=settings-workspace.element-B9XLUF-Q.js.map
