import { LitElement as k, nothing as d, html as s, css as P, state as p, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as S } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT as R, UMB_CONFIRM_MODAL as L } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-DVoMavUk.js";
import { A as O, B as N, C } from "./navigation-CvTcY6zJ.js";
import { e as F } from "./formatting-C1GHFA0J.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var z = Object.defineProperty, M = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, c = (e, t, r, i) => {
  for (var o = i > 1 ? void 0 : i ? M(t, r) : t, a = e.length - 1, u; a >= 0; a--)
    (u = e[a]) && (o = (i ? u(t, r, o) : u(o)) || o);
  return i && o && z(t, r, o), o;
}, T = (e, t, r) => t.has(e) || A("Cannot " + r), l = (e, t, r) => (T(e, t, "read from private field"), t.get(e)), y = (e, t, r) => t.has(e) ? A("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), v = (e, t, r, i) => (T(e, t, "write to private field"), t.set(e, r), r), _, h, $, f;
const b = 5;
let n = class extends E(k) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._isRebuilding = !1, this._isPreviewLoading = !1, this._isRegeneratingToken = !1, this._loadError = null, this._validationErrors = {}, this._productTypes = [], this._collections = [], this._filterGroups = [], this._resolvers = [], this._countries = [], this._routes = [], this._activePath = "", this._customLabelArgsText = Array.from({ length: b }, () => "{}"), this._customLabelArgsErrors = Array.from({ length: b }, () => ""), this._customFieldArgsText = [], this._customFieldArgsErrors = [], y(this, _), y(this, h), y(this, $), y(this, f, !1), this._initRoutes(), this.consumeContext(S, (e) => {
      v(this, _, e), l(this, _) && (this._isNew = l(this, _).isNew, this.observe(l(this, _).feed, (t) => {
        t && this._applyFeed(t);
      }, "_feed"), this.observe(l(this, _).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(l(this, _).loadError, (t) => {
        this._loadError = t;
      }, "_loadError"));
    }), this.consumeContext(I, (e) => {
      v(this, h, e);
    }), this.consumeContext(R, (e) => {
      v(this, $, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, f, !0), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, f, !1);
  }
  _initRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/general", component: e },
      { path: "tab/selection", component: e },
      { path: "tab/promotions", component: e },
      { path: "tab/custom-labels", component: e },
      { path: "tab/custom-fields", component: e },
      { path: "tab/preview", component: e },
      { path: "", redirectTo: "tab/general" }
    ];
  }
  async _loadReferenceData() {
    const [e, t, r, i, o] = await Promise.all([
      g.getProductTypes(),
      g.getProductCollections(),
      g.getFilterGroups(),
      g.getProductFeedResolvers(),
      g.getCountries()
    ]);
    l(this, f) && (e.data && (this._productTypes = e.data), t.data && (this._collections = t.data), r.data && (this._filterGroups = r.data), i.data && (this._resolvers = i.data), o.data && (this._countries = o.data));
  }
  _createEmptyFilterConfig() {
    return {
      productTypeIds: [],
      collectionIds: [],
      filterValueGroups: []
    };
  }
  _createEmptyCustomLabel(e) {
    return {
      slot: e,
      sourceType: "static",
      staticValue: null,
      resolverAlias: null,
      args: {}
    };
  }
  _createEmptyManualPromotion() {
    return {
      promotionId: `manual-${crypto.randomUUID()}`,
      name: "",
      requiresCouponCode: !1,
      couponCode: null,
      description: null,
      startsAtUtc: null,
      endsAtUtc: null,
      priority: 1e3,
      percentOff: null,
      amountOff: null,
      filterConfig: this._createEmptyFilterConfig()
    };
  }
  _normalizeFilterConfig(e) {
    return {
      productTypeIds: [...new Set(e?.productTypeIds ?? [])],
      collectionIds: [...new Set(e?.collectionIds ?? [])],
      filterValueGroups: (e?.filterValueGroups ?? []).map((t) => ({
        filterGroupId: t.filterGroupId,
        filterIds: [...new Set(t.filterIds ?? [])]
      })).filter((t) => t.filterIds.length > 0)
    };
  }
  _normalizeFeed(e) {
    const t = /* @__PURE__ */ new Map();
    for (const i of e.customLabels ?? [])
      i.slot < 0 || i.slot >= b || t.has(i.slot) || t.set(i.slot, {
        slot: i.slot,
        sourceType: i.sourceType || "static",
        staticValue: i.staticValue,
        resolverAlias: i.resolverAlias,
        args: { ...i.args ?? {} }
      });
    const r = Array.from({ length: b }, (i, o) => t.get(o) ?? this._createEmptyCustomLabel(o));
    return {
      ...e,
      filterConfig: this._normalizeFilterConfig(e.filterConfig),
      customLabels: r,
      customFields: (e.customFields ?? []).map((i) => ({
        attribute: i.attribute ?? "",
        sourceType: i.sourceType || "static",
        staticValue: i.staticValue,
        resolverAlias: i.resolverAlias,
        args: { ...i.args ?? {} }
      })),
      manualPromotions: (e.manualPromotions ?? []).map((i) => ({
        promotionId: i.promotionId,
        name: i.name,
        requiresCouponCode: i.requiresCouponCode,
        couponCode: i.couponCode,
        description: i.description,
        startsAtUtc: i.startsAtUtc,
        endsAtUtc: i.endsAtUtc,
        priority: i.priority,
        percentOff: i.percentOff,
        amountOff: i.amountOff,
        filterConfig: this._normalizeFilterConfig(i.filterConfig)
      }))
    };
  }
  _applyFeed(e) {
    const t = this._normalizeFeed(e);
    this._feed = t, this._isLoading = !1, this._isNew = !t.id, this._loadError = null, this._validationErrors = {}, this._customLabelArgsText = t.customLabels.map((r) => this._formatArgs(r.args)), this._customLabelArgsErrors = Array.from({ length: b }, () => ""), this._customFieldArgsText = t.customFields.map((r) => this._formatArgs(r.args)), this._customFieldArgsErrors = t.customFields.map(() => "");
  }
  _commitFeed(e) {
    this._feed = e;
  }
  _getTabHref(e) {
    return this._routerPath ? `${this._routerPath}/tab/${e}` : `tab/${e}`;
  }
  _getActiveTab() {
    return this._activePath.includes("tab/selection") ? "selection" : this._activePath.includes("tab/promotions") ? "promotions" : this._activePath.includes("tab/custom-labels") ? "custom-labels" : this._activePath.includes("tab/custom-fields") ? "custom-fields" : this._activePath.includes("tab/preview") ? "preview" : "general";
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _toggleIdSelection(e, t, r) {
    return r ? e.includes(t) ? e : [...e, t] : e.filter((i) => i !== t);
  }
  _toggleFilterValue(e, t, r, i) {
    const o = e.filterValueGroups.find((m) => m.filterGroupId === t);
    let a = e.filterValueGroups.filter((m) => m.filterGroupId !== t);
    const u = this._toggleIdSelection(o?.filterIds ?? [], r, i);
    return u.length > 0 && (a = [
      ...a,
      {
        filterGroupId: t,
        filterIds: u
      }
    ]), {
      ...e,
      filterValueGroups: a
    };
  }
  _setGeneralField(e, t) {
    this._feed && this._commitFeed({
      ...this._feed,
      [e]: t
    });
  }
  _handleRootSelectionChange(e, t, r) {
    if (!this._feed) return;
    const i = this._feed.filterConfig, o = {
      ...i,
      [e]: this._toggleIdSelection(i[e], t, r)
    };
    this._commitFeed({
      ...this._feed,
      filterConfig: o
    });
  }
  _handleRootFilterValueChange(e, t, r) {
    if (!this._feed) return;
    const i = this._toggleFilterValue(this._feed.filterConfig, e, t, r);
    this._commitFeed({
      ...this._feed,
      filterConfig: i
    });
  }
  _updateManualPromotion(e, t) {
    if (!this._feed) return;
    const r = this._feed.manualPromotions.map((i, o) => o === e ? t({ ...i }) : i);
    this._commitFeed({
      ...this._feed,
      manualPromotions: r
    });
  }
  _addManualPromotion() {
    this._feed && this._commitFeed({
      ...this._feed,
      manualPromotions: [...this._feed.manualPromotions, this._createEmptyManualPromotion()]
    });
  }
  _removeManualPromotion(e) {
    this._feed && this._commitFeed({
      ...this._feed,
      manualPromotions: this._feed.manualPromotions.filter((t, r) => r !== e)
    });
  }
  _handleManualPromotionSelectionChange(e, t, r, i) {
    this._updateManualPromotion(e, (o) => {
      const a = o.filterConfig;
      return {
        ...o,
        filterConfig: {
          ...a,
          [t]: this._toggleIdSelection(a[t], r, i)
        }
      };
    });
  }
  _handleManualPromotionFilterValueChange(e, t, r, i) {
    this._updateManualPromotion(e, (o) => ({
      ...o,
      filterConfig: this._toggleFilterValue(o.filterConfig, t, r, i)
    }));
  }
  _addCustomField() {
    if (!this._feed) return;
    const e = {
      ...this._feed,
      customFields: [
        ...this._feed.customFields,
        {
          attribute: "",
          sourceType: "static",
          staticValue: null,
          resolverAlias: null,
          args: {}
        }
      ]
    };
    this._commitFeed(e), this._customFieldArgsText = [...this._customFieldArgsText, "{}"], this._customFieldArgsErrors = [...this._customFieldArgsErrors, ""];
  }
  _removeCustomField(e) {
    this._feed && (this._commitFeed({
      ...this._feed,
      customFields: this._feed.customFields.filter((t, r) => r !== e)
    }), this._customFieldArgsText = this._customFieldArgsText.filter((t, r) => r !== e), this._customFieldArgsErrors = this._customFieldArgsErrors.filter((t, r) => r !== e));
  }
  _updateCustomField(e, t) {
    if (!this._feed) return;
    const r = this._feed.customFields.map((i, o) => o === e ? t({ ...i, args: { ...i.args } }) : i);
    this._commitFeed({
      ...this._feed,
      customFields: r
    });
  }
  _updateCustomLabel(e, t) {
    if (!this._feed) return;
    const r = this._feed.customLabels.map((i) => i.slot === e ? t({ ...i, args: { ...i.args } }) : i);
    this._commitFeed({
      ...this._feed,
      customLabels: r
    });
  }
  _formatArgs(e) {
    return Object.keys(e).length === 0 ? "{}" : JSON.stringify(e, null, 2);
  }
  _parseArgs(e) {
    const t = e.trim();
    if (!t)
      return { value: {} };
    try {
      const r = JSON.parse(t);
      if (!r || typeof r != "object" || Array.isArray(r))
        return { error: "Args must be a JSON object." };
      const i = {};
      for (const [o, a] of Object.entries(r)) {
        const u = o.trim();
        if (u) {
          if (a == null) {
            i[u] = "";
            continue;
          }
          if (typeof a == "object")
            return { error: "Args values must be primitives (string/number/boolean)." };
          i[u] = String(a);
        }
      }
      return { value: i };
    } catch {
      return { error: "Invalid JSON in args." };
    }
  }
  _handleCustomLabelArgsInput(e, t) {
    const r = [...this._customLabelArgsText];
    r[e] = t, this._customLabelArgsText = r;
    const i = this._parseArgs(t), o = [...this._customLabelArgsErrors];
    o[e] = i.error ?? "", this._customLabelArgsErrors = o, !i.error && i.value && this._updateCustomLabel(e, (a) => ({
      ...a,
      args: i.value
    }));
  }
  _handleCustomFieldArgsInput(e, t) {
    const r = [...this._customFieldArgsText];
    r[e] = t, this._customFieldArgsText = r;
    const i = this._parseArgs(t), o = [...this._customFieldArgsErrors];
    o[e] = i.error ?? "", this._customFieldArgsErrors = o, !i.error && i.value && this._updateCustomField(e, (a) => ({
      ...a,
      args: i.value
    }));
  }
  _reparseArgsForSave() {
    if (!this._feed) return !1;
    let e = !1;
    const t = [...this._customLabelArgsErrors], r = [...this._customFieldArgsErrors];
    for (let i = 0; i < b; i++) {
      const o = this._parseArgs(this._customLabelArgsText[i] ?? "{}");
      if (t[i] = o.error ?? "", o.error) {
        e = !0;
        continue;
      }
      this._updateCustomLabel(i, (a) => ({
        ...a,
        args: o.value ?? {}
      }));
    }
    for (let i = 0; i < this._feed.customFields.length; i++) {
      const o = this._parseArgs(this._customFieldArgsText[i] ?? "{}");
      if (r[i] = o.error ?? "", o.error) {
        e = !0;
        continue;
      }
      this._updateCustomField(i, (a) => ({
        ...a,
        args: o.value ?? {}
      }));
    }
    return this._customLabelArgsErrors = t, this._customFieldArgsErrors = r, !e;
  }
  _validate() {
    if (!this._feed) return !1;
    const e = {};
    this._feed.name.trim() || (e.name = "Name is required."), (!this._feed.countryCode.trim() || this._feed.countryCode.trim().length !== 2) && (e.countryCode = "Country code must be 2 letters."), (!this._feed.currencyCode.trim() || this._feed.currencyCode.trim().length !== 3) && (e.currencyCode = "Currency code must be 3 letters."), this._feed.languageCode.trim() || (e.languageCode = "Language code is required.");
    for (const r of this._feed.customLabels)
      r.sourceType === "resolver" && !r.resolverAlias && (e[`customLabel-${r.slot}`] = "Select a resolver for resolver source type.");
    this._feed.customFields.forEach((r, i) => {
      r.attribute.trim() || (e[`customField-${i}`] = "Attribute is required."), r.sourceType === "resolver" && !r.resolverAlias && (e[`customFieldResolver-${i}`] = "Select a resolver for resolver source type.");
    }), this._feed.manualPromotions.forEach((r, i) => {
      r.promotionId.trim() || (e[`promotionId-${i}`] = "Promotion ID is required."), r.name.trim() || (e[`promotionName-${i}`] = "Promotion name is required."), r.requiresCouponCode && !r.couponCode?.trim() && (e[`promotionCoupon-${i}`] = "Coupon code is required when coupon is enabled."), r.percentOff != null && r.amountOff != null && (e[`promotionValue-${i}`] = "Set either percent off or amount off, not both.");
    }), this._validationErrors = e;
    const t = this._customLabelArgsErrors.some(Boolean) || this._customFieldArgsErrors.some(Boolean);
    return Object.keys(e).length === 0 && !t;
  }
  _toRequest(e) {
    return {
      name: e.name.trim(),
      slug: e.slug?.trim() ? e.slug.trim() : null,
      isEnabled: e.isEnabled,
      countryCode: e.countryCode.trim().toUpperCase(),
      currencyCode: e.currencyCode.trim().toUpperCase(),
      languageCode: e.languageCode.trim().toLowerCase(),
      filterConfig: this._normalizeFilterConfig(e.filterConfig),
      customLabels: e.customLabels.map((t) => ({
        slot: t.slot,
        sourceType: t.sourceType,
        staticValue: t.staticValue?.trim() ? t.staticValue.trim() : null,
        resolverAlias: t.resolverAlias?.trim() ? t.resolverAlias.trim() : null,
        args: { ...t.args ?? {} }
      })),
      customFields: e.customFields.map((t) => ({
        attribute: t.attribute.trim(),
        sourceType: t.sourceType,
        staticValue: t.staticValue?.trim() ? t.staticValue.trim() : null,
        resolverAlias: t.resolverAlias?.trim() ? t.resolverAlias.trim() : null,
        args: { ...t.args ?? {} }
      })),
      manualPromotions: e.manualPromotions.map((t) => ({
        promotionId: t.promotionId.trim(),
        name: t.name.trim(),
        requiresCouponCode: t.requiresCouponCode,
        couponCode: t.couponCode?.trim() ? t.couponCode.trim() : null,
        description: t.description?.trim() ? t.description.trim() : null,
        startsAtUtc: t.startsAtUtc,
        endsAtUtc: t.endsAtUtc,
        priority: t.priority,
        percentOff: t.percentOff,
        amountOff: t.amountOff,
        filterConfig: this._normalizeFilterConfig(t.filterConfig)
      }))
    };
  }
  async _handleSave() {
    if (!this._feed) return;
    if (!this._reparseArgsForSave() || !this._validate()) {
      l(this, h)?.peek("warning", {
        data: {
          headline: "Validation failed",
          message: "Check highlighted fields before saving."
        }
      });
      return;
    }
    this._isSaving = !0;
    const e = this._toRequest(this._feed);
    if (this._isNew) {
      const { data: i, error: o } = await g.createProductFeed(e);
      if (this._isSaving = !1, o || !i) {
        l(this, h)?.peek("danger", {
          data: {
            headline: "Create failed",
            message: o?.message ?? "Unable to create product feed."
          }
        });
        return;
      }
      this._isNew = !1, this._applyFeed(i), l(this, _)?.updateFeed(i), l(this, h)?.peek("positive", {
        data: {
          headline: "Feed created",
          message: `${i.name} is ready.`
        }
      }), O(i.id);
      return;
    }
    const { data: t, error: r } = await g.updateProductFeed(this._feed.id, e);
    if (this._isSaving = !1, r || !t) {
      l(this, h)?.peek("danger", {
        data: {
          headline: "Save failed",
          message: r?.message ?? "Unable to update product feed."
        }
      });
      return;
    }
    this._applyFeed(t), l(this, _)?.updateFeed(t), l(this, h)?.peek("positive", {
      data: {
        headline: "Feed saved",
        message: `${t.name} has been updated.`
      }
    });
  }
  async _handleDelete() {
    if (!this._feed?.id || this._isNew) return;
    const e = l(this, $)?.open(this, L, {
      data: {
        headline: "Delete Product Feed",
        content: `Delete "${this._feed.name}"? This cannot be undone.`,
        color: "danger",
        confirmLabel: "Delete"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    const { error: t } = await g.deleteProductFeed(this._feed.id);
    if (t) {
      l(this, h)?.peek("danger", {
        data: {
          headline: "Delete failed",
          message: t.message
        }
      });
      return;
    }
    l(this, h)?.peek("positive", {
      data: {
        headline: "Feed deleted",
        message: `${this._feed.name} was deleted.`
      }
    }), N();
  }
  async _reloadCurrentFeed() {
    if (!this._feed?.id) return;
    const { data: e } = await g.getProductFeed(this._feed.id);
    !l(this, f) || !e || (this._applyFeed(e), l(this, _)?.updateFeed(e));
  }
  async _handleRebuild() {
    if (!this._feed?.id || this._isNew) return;
    this._isRebuilding = !0;
    const { data: e, error: t } = await g.rebuildProductFeed(this._feed.id);
    if (this._isRebuilding = !1, !!l(this, f)) {
      if (t || !e) {
        l(this, h)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: t?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      this._lastRebuild = e, e.success ? l(this, h)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${e.productItemCount} products and ${e.promotionCount} promotions generated.`
        }
      }) : l(this, h)?.peek("warning", {
        data: {
          headline: "Rebuild finished with errors",
          message: e.error ?? "Feed rebuild failed."
        }
      }), await this._reloadCurrentFeed(), await this._handlePreview();
    }
  }
  async _handlePreview() {
    if (!this._feed?.id || this._isNew) return;
    this._isPreviewLoading = !0;
    const { data: e, error: t } = await g.previewProductFeed(this._feed.id);
    if (this._isPreviewLoading = !1, !!l(this, f)) {
      if (t || !e) {
        l(this, h)?.peek("danger", {
          data: {
            headline: "Preview failed",
            message: t?.message ?? "Unable to preview feed."
          }
        });
        return;
      }
      this._preview = e, e.error && l(this, h)?.peek("warning", {
        data: {
          headline: "Preview returned an error",
          message: e.error
        }
      });
    }
  }
  async _handleRegenerateToken() {
    if (!this._feed?.id || this._isNew) return;
    this._isRegeneratingToken = !0;
    const { data: e, error: t } = await g.regenerateProductFeedToken(this._feed.id);
    if (this._isRegeneratingToken = !1, t || !e) {
      l(this, h)?.peek("danger", {
        data: {
          headline: "Token regeneration failed",
          message: t?.message ?? "Unable to regenerate token."
        }
      });
      return;
    }
    this._commitFeed({
      ...this._feed,
      accessToken: e.accessToken
    }), l(this, h)?.peek("positive", {
      data: {
        headline: "Token regenerated",
        message: "A new token has been created for this feed."
      }
    });
  }
  async _copyToClipboard(e, t) {
    try {
      await navigator.clipboard.writeText(e), l(this, h)?.peek("positive", {
        data: {
          headline: "Copied",
          message: t
        }
      });
    } catch {
      l(this, h)?.peek("warning", {
        data: {
          headline: "Copy failed",
          message: "Clipboard access is not available."
        }
      });
    }
  }
  _toDateTimeLocal(e) {
    if (!e) return "";
    const t = new Date(e);
    if (Number.isNaN(t.getTime())) return "";
    const r = t.getFullYear(), i = String(t.getMonth() + 1).padStart(2, "0"), o = String(t.getDate()).padStart(2, "0"), a = String(t.getHours()).padStart(2, "0"), u = String(t.getMinutes()).padStart(2, "0");
    return `${r}-${i}-${o}T${a}:${u}`;
  }
  _fromDateTimeLocal(e) {
    if (!e) return null;
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  _renderErrors() {
    if (Object.keys(this._validationErrors).length === 0) return d;
    const e = Array.from(new Set(Object.values(this._validationErrors)));
    return s`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Fix the following before saving:</strong>
          <ul>
            ${e.map((t) => s`<li>${t}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }
  _renderGeneralTab() {
    if (!this._feed) return d;
    const e = this._feed.accessToken, t = window.location.origin, r = e ? `${t}/api/merchello/feeds/${this._feed.slug}.xml?token=${e}` : null, i = e ? `${t}/api/merchello/feeds/${this._feed.slug}/promotions.xml?token=${e}` : null, o = this._countries.map((a) => ({
      name: `${a.name} (${a.code})`,
      value: a.code,
      selected: a.code === this._feed?.countryCode
    }));
    return s`
      <uui-box headline="General Settings">
        <div class="grid">
          <umb-property-layout
            label="Feed Name"
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.name}>
            <uui-input
              slot="editor"
              .value=${this._feed.name}
              @input=${(a) => this._setGeneralField("name", a.target.value)}
              maxlength="200"
              ?invalid=${!!this._validationErrors.name}
              placeholder="Google Shopping - US">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Slug"
            description="Used in the feed URL. Leave blank to auto-generate.">
            <uui-input
              slot="editor"
              .value=${this._feed.slug ?? ""}
              @input=${(a) => this._setGeneralField("slug", a.target.value)}
              maxlength="200"
              placeholder="google-shopping-us">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Enabled">
            <uui-toggle
              slot="editor"
              label="Feed enabled"
              ?checked=${this._feed.isEnabled}
              @change=${(a) => this._setGeneralField("isEnabled", a.target.checked)}>
              Feed enabled
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Market Settings">
        <div class="grid">
          <umb-property-layout
            label="Country"
            description="Google target country (ISO 3166-1 alpha-2)."
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.countryCode}>
            ${o.length > 0 ? s`
                  <uui-select
                    slot="editor"
                    label="Country"
                    .options=${o}
                    @change=${(a) => this._setGeneralField("countryCode", a.target.value)}
                    ?invalid=${!!this._validationErrors.countryCode}>
                  </uui-select>
                ` : s`
                  <uui-input
                    slot="editor"
                    .value=${this._feed.countryCode}
                    maxlength="2"
                    @input=${(a) => this._setGeneralField("countryCode", a.target.value.toUpperCase())}
                    ?invalid=${!!this._validationErrors.countryCode}
                    placeholder="US">
                  </uui-input>
                `}
          </umb-property-layout>

          <umb-property-layout
            label="Currency"
            description="ISO 4217 currency code."
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.currencyCode}>
            <uui-input
              slot="editor"
              .value=${this._feed.currencyCode}
              maxlength="3"
              @input=${(a) => this._setGeneralField("currencyCode", a.target.value.toUpperCase())}
              ?invalid=${!!this._validationErrors.currencyCode}
              placeholder="USD">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Language"
            description="Feed language code."
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.languageCode}>
            <uui-input
              slot="editor"
              .value=${this._feed.languageCode}
              maxlength="10"
              @input=${(a) => this._setGeneralField("languageCode", a.target.value.toLowerCase())}
              ?invalid=${!!this._validationErrors.languageCode}
              placeholder="en">
            </uui-input>
          </umb-property-layout>
        </div>
      </uui-box>

      ${this._isNew ? d : s`
            <uui-box headline="Access Token & Feed URLs">
              <div class="token-actions">
                <uui-button
                  look="secondary"
                  ?disabled=${this._isRegeneratingToken}
                  @click=${this._handleRegenerateToken}>
                  ${this._isRegeneratingToken ? "Regenerating..." : "Regenerate Token"}
                </uui-button>
              </div>

              ${e ? s`
                    <umb-property-layout label="Current Token">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${e} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(e, "Token copied to clipboard.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Products Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${r ?? ""} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(r ?? "", "Products URL copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Promotions Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${i ?? ""} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(i ?? "", "Promotions URL copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>
                  ` : s`
                    <p class="hint">
                      Tokens are never returned after save. Regenerate a token to reveal and copy new feed URLs.
                    </p>
                  `}
            </uui-box>

            <uui-box headline="Generation Status">
              <div class="status-grid">
                <div>
                  <strong>Last generated:</strong>
                  <span>${this._feed.lastGeneratedUtc ? F(this._feed.lastGeneratedUtc) : "Never"}</span>
                </div>
                <div>
                  <strong>Products snapshot:</strong>
                  <uui-tag color=${this._feed.hasProductSnapshot ? "positive" : "default"}>
                    ${this._feed.hasProductSnapshot ? "Available" : "Missing"}
                  </uui-tag>
                </div>
                <div>
                  <strong>Promotions snapshot:</strong>
                  <uui-tag color=${this._feed.hasPromotionsSnapshot ? "positive" : "default"}>
                    ${this._feed.hasPromotionsSnapshot ? "Available" : "Missing"}
                  </uui-tag>
                </div>
              </div>

              ${this._feed.lastGenerationError ? s`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._feed.lastGenerationError}</span>
                    </div>
                  ` : d}
            </uui-box>
          `}
    `;
  }
  _renderSelectionChecklist(e, t, r, i) {
    return s`
      <uui-box headline="Product Types">
        ${this._productTypes.length === 0 ? s`<p class="hint">No product types found.</p>` : s`
              <div class="checkbox-grid">
                ${this._productTypes.map((o) => {
      const a = e.productTypeIds.includes(o.id);
      return s`
                    <uui-checkbox
                      ?checked=${a}
                      @change=${(u) => t(o.id, u.target.checked)}>
                      ${o.name}
                    </uui-checkbox>
                  `;
    })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Collections">
        ${this._collections.length === 0 ? s`<p class="hint">No collections found.</p>` : s`
              <div class="checkbox-grid">
                ${this._collections.map((o) => {
      const a = e.collectionIds.includes(o.id);
      return s`
                    <uui-checkbox
                      ?checked=${a}
                      @change=${(u) => r(o.id, u.target.checked)}>
                      ${o.name}
                    </uui-checkbox>
                  `;
    })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Filter Values">
        <p class="hint">Within each group values are OR. Across groups selection is AND.</p>
        ${this._filterGroups.length === 0 ? s`<p class="hint">No filter groups found.</p>` : s`
              <div class="group-list">
                ${this._filterGroups.map((o) => {
      const a = e.filterValueGroups.find((u) => u.filterGroupId === o.id);
      return s`
                    <section class="group-card">
                      <h4>${o.name}</h4>
                      <div class="checkbox-grid">
                        ${(o.filters ?? []).map((u) => {
        const m = a?.filterIds.includes(u.id) ?? !1;
        return s`
                            <uui-checkbox
                              ?checked=${m}
                              @change=${(w) => i(o.id, u.id, w.target.checked)}>
                              ${u.name}
                            </uui-checkbox>
                          `;
      })}
                      </div>
                    </section>
                  `;
    })}
              </div>
            `}
      </uui-box>
    `;
  }
  _renderSelectionTab() {
    return this._feed ? s`
      ${this._renderSelectionChecklist(
      this._feed.filterConfig,
      (e, t) => this._handleRootSelectionChange("productTypeIds", e, t),
      (e, t) => this._handleRootSelectionChange("collectionIds", e, t),
      (e, t, r) => this._handleRootFilterValueChange(e, t, r)
    )}
    ` : d;
  }
  _renderManualPromotion(e, t) {
    return s`
      <uui-box headline=${e.name?.trim() ? e.name : `Manual Promotion ${t + 1}`}>
        <div class="promotion-actions">
          <uui-button look="secondary" color="danger" compact @click=${() => this._removeManualPromotion(t)}>
            Remove
          </uui-button>
        </div>

        ${this._validationErrors[`promotionName-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionName-${t}`]}</p>` : d}

        ${this._validationErrors[`promotionId-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionId-${t}`]}</p>` : d}

        ${this._validationErrors[`promotionCoupon-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionCoupon-${t}`]}</p>` : d}

        ${this._validationErrors[`promotionValue-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionValue-${t}`]}</p>` : d}

        <div class="grid">
          <umb-property-layout label="Promotion ID" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${e.promotionId}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      promotionId: r.target.value
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Name" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${e.name}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      name: r.target.value
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Priority">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(e.priority ?? 1e3)}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      priority: parseInt(r.target.value || "1000", 10)
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Description">
            <uui-textarea
              slot="editor"
              .value=${e.description ?? ""}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      description: r.target.value || null
    }))}>
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="Requires Coupon">
            <uui-toggle
              slot="editor"
              label="Requires coupon code"
              ?checked=${e.requiresCouponCode}
              @change=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      requiresCouponCode: r.target.checked,
      couponCode: r.target.checked ? i.couponCode : null
    }))}>
              Requires coupon code
            </uui-toggle>
          </umb-property-layout>

          ${e.requiresCouponCode ? s`
                <umb-property-layout label="Coupon Code" ?mandatory=${!0}>
                  <uui-input
                    slot="editor"
                    .value=${e.couponCode ?? ""}
                    @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      couponCode: r.target.value || null
    }))}>
                  </uui-input>
                </umb-property-layout>
              ` : d}

          <umb-property-layout label="Starts At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(e.startsAtUtc)}
              @change=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      startsAtUtc: this._fromDateTimeLocal(r.target.value)
    }))}>
          </umb-property-layout>

          <umb-property-layout label="Ends At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(e.endsAtUtc)}
              @change=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      endsAtUtc: this._fromDateTimeLocal(r.target.value)
    }))}>
          </umb-property-layout>

          <umb-property-layout label="Percent Off">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              max="100"
              step="0.01"
              .value=${e.percentOff == null ? "" : String(e.percentOff)}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      percentOff: r.target.value ? Number(r.target.value) : null
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Amount Off">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="0.01"
              .value=${e.amountOff == null ? "" : String(e.amountOff)}
              @input=${(r) => this._updateManualPromotion(t, (i) => ({
      ...i,
      amountOff: r.target.value ? Number(r.target.value) : null
    }))}>
            </uui-input>
          </umb-property-layout>
        </div>

        <div class="promotion-filter-section">
          <h4>Promotion Filters</h4>
          ${this._renderSelectionChecklist(
      e.filterConfig,
      (r, i) => this._handleManualPromotionSelectionChange(t, "productTypeIds", r, i),
      (r, i) => this._handleManualPromotionSelectionChange(t, "collectionIds", r, i),
      (r, i, o) => this._handleManualPromotionFilterValueChange(t, r, i, o)
    )}
        </div>
      </uui-box>
    `;
  }
  _renderPromotionsTab() {
    return this._feed ? s`
      <uui-box headline="Automatic Promotions">
        <p class="hint">
          Discount promotions are generated automatically from eligible discounts with <code>showInFeed=true</code>.
          Use manual promotions below for feed-specific campaigns.
        </p>
      </uui-box>

      <uui-box headline="Manual Promotions">
        <div class="promotion-actions">
          <uui-button look="secondary" @click=${this._addManualPromotion}>
            <uui-icon name="icon-add" slot="icon"></uui-icon>
            Add Manual Promotion
          </uui-button>
        </div>
      </uui-box>

      ${this._feed.manualPromotions.length === 0 ? s`
            <merchello-empty-state
              icon="icon-megaphone"
              headline="No manual promotions"
              message="Add a promotion if you need feed-specific campaigns beyond auto-exported discounts.">
            </merchello-empty-state>
          ` : s`${this._feed.manualPromotions.map((e, t) => this._renderManualPromotion(e, t))}`}
    ` : d;
  }
  _renderResolverOptions(e) {
    return [
      {
        name: "Select resolver...",
        value: "",
        selected: !e
      },
      ...this._resolvers.map((t) => ({
        name: `${t.alias} - ${t.description}`,
        value: t.alias,
        selected: t.alias === e
      }))
    ];
  }
  _renderSourceOptions(e) {
    return [
      { name: "Static", value: "static", selected: e !== "resolver" },
      { name: "Resolver", value: "resolver", selected: e === "resolver" }
    ];
  }
  _renderCustomLabelsTab() {
    return this._feed ? s`
      <uui-box headline="Custom Labels (0-4)">
        <p class="hint">
          Configure each Google custom label slot with a static value or a resolver alias.
        </p>
      </uui-box>

      ${this._feed.customLabels.map((e) => {
      const t = this._validationErrors[`customLabel-${e.slot}`], r = this._customLabelArgsErrors[e.slot], i = this._customLabelArgsText[e.slot] ?? "{}";
      return s`
          <uui-box headline=${`custom_label_${e.slot}`}>
            ${t ? s`<p class="error-message">${t}</p>` : d}

            <div class="grid">
              <umb-property-layout label="Source Type">
                <uui-select
                  slot="editor"
                  label="Source Type"
                  .options=${this._renderSourceOptions(e.sourceType)}
                  @change=${(o) => this._updateCustomLabel(e.slot, (a) => ({
        ...a,
        sourceType: o.target.value || "static"
      }))}>
                </uui-select>
              </umb-property-layout>

              ${e.sourceType === "resolver" ? s`
                    <umb-property-layout label="Resolver Alias" ?mandatory=${!0}>
                      <uui-select
                        slot="editor"
                        label="Resolver"
                        .options=${this._renderResolverOptions(e.resolverAlias)}
                        @change=${(o) => this._updateCustomLabel(e.slot, (a) => ({
        ...a,
        resolverAlias: o.target.value || null
      }))}>
                      </uui-select>
                    </umb-property-layout>

                    <umb-property-layout label="Resolver Args (JSON object)">
                      <uui-textarea
                        slot="editor"
                        .value=${i}
                        ?invalid=${!!r}
                        @input=${(o) => this._handleCustomLabelArgsInput(e.slot, o.target.value)}>
                      </uui-textarea>
                      ${r ? s`<p class="error-message">${r}</p>` : s`<p class="hint">Example: {"key":"value","flag":"true"}</p>`}
                    </umb-property-layout>
                  ` : s`
                    <umb-property-layout label="Static Value">
                      <uui-input
                        slot="editor"
                        .value=${e.staticValue ?? ""}
                        @input=${(o) => this._updateCustomLabel(e.slot, (a) => ({
        ...a,
        staticValue: o.target.value || null
      }))}>
                      </uui-input>
                    </umb-property-layout>
                  `}
            </div>
          </uui-box>
        `;
    })}
    ` : d;
  }
  _renderCustomFieldsTab() {
    return this._feed ? s`
      <uui-box headline="Custom Fields">
        <div class="promotion-actions">
          <uui-button look="secondary" @click=${this._addCustomField}>
            <uui-icon name="icon-add" slot="icon"></uui-icon>
            Add Custom Field
          </uui-button>
        </div>
        <p class="hint">
          Only attributes on the Google whitelist are accepted by the backend.
        </p>
      </uui-box>

      ${this._feed.customFields.length === 0 ? s`
            <merchello-empty-state
              icon="icon-add"
              headline="No custom fields"
              message="Add custom attributes for additional Google feed fields.">
            </merchello-empty-state>
          ` : s`
            ${this._feed.customFields.map((e, t) => {
      const r = this._validationErrors[`customField-${t}`], i = this._validationErrors[`customFieldResolver-${t}`], o = this._customFieldArgsErrors[t], a = this._customFieldArgsText[t] ?? "{}";
      return s`
                <uui-box headline=${e.attribute ? e.attribute : `Custom Field ${t + 1}`}>
                  <div class="promotion-actions">
                    <uui-button look="secondary" color="danger" compact @click=${() => this._removeCustomField(t)}>
                      Remove
                    </uui-button>
                  </div>

                  ${r ? s`<p class="error-message">${r}</p>` : d}
                  ${i ? s`<p class="error-message">${i}</p>` : d}

                  <div class="grid">
                    <umb-property-layout label="Attribute" ?mandatory=${!0}>
                      <uui-input
                        slot="editor"
                        .value=${e.attribute}
                        @input=${(u) => this._updateCustomField(t, (m) => ({
        ...m,
        attribute: u.target.value
      }))}
                        placeholder="e.g. product_highlight">
                      </uui-input>
                    </umb-property-layout>

                    <umb-property-layout label="Source Type">
                      <uui-select
                        slot="editor"
                        label="Source Type"
                        .options=${this._renderSourceOptions(e.sourceType)}
                        @change=${(u) => this._updateCustomField(t, (m) => ({
        ...m,
        sourceType: u.target.value || "static"
      }))}>
                      </uui-select>
                    </umb-property-layout>

                    ${e.sourceType === "resolver" ? s`
                          <umb-property-layout label="Resolver Alias" ?mandatory=${!0}>
                            <uui-select
                              slot="editor"
                              label="Resolver"
                              .options=${this._renderResolverOptions(e.resolverAlias)}
                              @change=${(u) => this._updateCustomField(t, (m) => ({
        ...m,
        resolverAlias: u.target.value || null
      }))}>
                            </uui-select>
                          </umb-property-layout>

                          <umb-property-layout label="Resolver Args (JSON object)">
                            <uui-textarea
                              slot="editor"
                              .value=${a}
                              ?invalid=${!!o}
                              @input=${(u) => this._handleCustomFieldArgsInput(t, u.target.value)}>
                            </uui-textarea>
                            ${o ? s`<p class="error-message">${o}</p>` : s`<p class="hint">Example: {"key":"value","flag":"true"}</p>`}
                          </umb-property-layout>
                        ` : s`
                          <umb-property-layout label="Static Value">
                            <uui-input
                              slot="editor"
                              .value=${e.staticValue ?? ""}
                              @input=${(u) => this._updateCustomField(t, (m) => ({
        ...m,
        staticValue: u.target.value || null
      }))}>
                            </uui-input>
                          </umb-property-layout>
                        `}
                  </div>
                </uui-box>
              `;
    })}
          `}
    ` : d;
  }
  _renderPreviewTab() {
    return this._feed ? this._isNew || !this._feed.id ? s`
        <uui-box headline="Preview">
          <p class="hint">Save this feed first, then preview diagnostics and sample output.</p>
        </uui-box>
      ` : s`
      <uui-box headline="Preview & Diagnostics">
        <div class="promotion-actions">
          <uui-button look="secondary" ?disabled=${this._isPreviewLoading} @click=${this._handlePreview}>
            ${this._isPreviewLoading ? "Loading preview..." : "Refresh Preview"}
          </uui-button>
          <uui-button look="secondary" ?disabled=${this._isRebuilding} @click=${this._handleRebuild}>
            ${this._isRebuilding ? "Rebuilding..." : "Rebuild Now"}
          </uui-button>
        </div>

        ${this._preview ? s`
              <div class="status-grid">
                <div>
                  <strong>Products:</strong>
                  <span>${this._preview.productItemCount}</span>
                </div>
                <div>
                  <strong>Promotions:</strong>
                  <span>${this._preview.promotionCount}</span>
                </div>
                <div>
                  <strong>Warnings:</strong>
                  <span>${this._preview.warnings.length}</span>
                </div>
              </div>

              ${this._preview.error ? s`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._preview.error}</span>
                    </div>
                  ` : d}

              ${this._preview.warnings.length > 0 ? s`
                    <h4>Warnings</h4>
                    <ul class="bullet-list">
                      ${this._preview.warnings.map((e) => s`<li>${e}</li>`)}
                    </ul>
                  ` : s`<p class="hint">No warnings in the current preview.</p>`}

              ${this._preview.sampleProductIds.length > 0 ? s`
                    <h4>Sample Product IDs</h4>
                    <ul class="bullet-list mono">
                      ${this._preview.sampleProductIds.map((e) => s`<li>${e}</li>`)}
                    </ul>
                  ` : d}
            ` : s`<p class="hint">Run preview to inspect generated output and warnings.</p>`}
      </uui-box>

      ${this._lastRebuild ? s`
            <uui-box headline="Last Rebuild Result">
              <div class="status-grid">
                <div>
                  <strong>Status:</strong>
                  <uui-tag color=${this._lastRebuild.success ? "positive" : "danger"}>
                    ${this._lastRebuild.success ? "Success" : "Failed"}
                  </uui-tag>
                </div>
                <div>
                  <strong>Generated:</strong>
                  <span>${F(this._lastRebuild.generatedAtUtc)}</span>
                </div>
                <div>
                  <strong>Warnings:</strong>
                  <span>${this._lastRebuild.warningCount}</span>
                </div>
              </div>

              ${this._lastRebuild.error ? s`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._lastRebuild.error}</span>
                    </div>
                  ` : d}

              ${this._lastRebuild.warnings.length > 0 ? s`
                    <ul class="bullet-list">
                      ${this._lastRebuild.warnings.map((e) => s`<li>${e}</li>`)}
                    </ul>
                  ` : d}
            </uui-box>
          ` : d}
    ` : d;
  }
  _renderActiveTab() {
    const e = this._getActiveTab();
    return e === "selection" ? this._renderSelectionTab() : e === "promotions" ? this._renderPromotionsTab() : e === "custom-labels" ? this._renderCustomLabelsTab() : e === "custom-fields" ? this._renderCustomFieldsTab() : e === "preview" ? this._renderPreviewTab() : this._renderGeneralTab();
  }
  _renderTabs() {
    const e = this._getActiveTab();
    return s`
      <uui-tab-group slot="header">
        <uui-tab label="General" href=${this._getTabHref("general")} ?active=${e === "general"}>
          General
        </uui-tab>
        <uui-tab label="Selection" href=${this._getTabHref("selection")} ?active=${e === "selection"}>
          Selection
        </uui-tab>
        <uui-tab label="Promotions" href=${this._getTabHref("promotions")} ?active=${e === "promotions"}>
          Promotions
        </uui-tab>
        <uui-tab label="Custom Labels" href=${this._getTabHref("custom-labels")} ?active=${e === "custom-labels"}>
          Custom Labels
        </uui-tab>
        <uui-tab label="Custom Fields" href=${this._getTabHref("custom-fields")} ?active=${e === "custom-fields"}>
          Custom Fields
        </uui-tab>
        <uui-tab label="Preview" href=${this._getTabHref("preview")} ?active=${e === "preview"}>
          Preview
        </uui-tab>
      </uui-tab-group>
    `;
  }
  render() {
    return this._isLoading ? s`
        <umb-body-layout>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      ` : this._loadError ? s`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-alert"
            headline="Unable to load product feed"
            message=${this._loadError}>
            <uui-button slot="action" look="primary" href=${C()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      ` : this._feed ? s`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${C()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-rss"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._feed.name}
            @input=${(e) => this._setGeneralField("name", e.target.value)}
            placeholder=${this._isNew ? "Enter feed name..." : "Feed name"}>
          </uui-input>
          <uui-tag color=${this._feed.isEnabled ? "positive" : "default"}>
            ${this._feed.isEnabled ? "Enabled" : "Disabled"}
          </uui-tag>
        </div>

        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <div class="tab-content">
            ${this._renderErrors()}
            ${this._renderActiveTab()}
          </div>
        </umb-body-layout>

        <umb-footer-layout slot="footer">
          ${this._isNew ? d : s`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `}

          ${this._isNew ? d : s`
                <uui-button
                  slot="actions"
                  look="secondary"
                  ?disabled=${this._isRebuilding}
                  @click=${this._handleRebuild}>
                  ${this._isRebuilding ? "Rebuilding..." : "Rebuild Now"}
                </uui-button>
              `}

          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? this._isNew ? "Creating..." : "Saving..." : this._isNew ? "Create Feed" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    ` : s`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-rss"
            headline="Feed not found"
            message="The requested feed could not be loaded.">
            <uui-button slot="action" look="primary" href=${C()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      `;
  }
};
_ = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
n.styles = P`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    #name-input {
      flex: 1;
      --uui-input-border-color: transparent;
      --uui-input-background-color: transparent;
      font-size: var(--uui-type-h5-size);
      font-weight: 700;
    }

    #name-input:hover,
    #name-input:focus-within {
      --uui-input-border-color: var(--uui-color-border);
      --uui-input-background-color: var(--uui-color-surface);
    }

    umb-router-slot {
      display: none;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 320px;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      padding: var(--uui-size-layout-1);
    }

    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .status-grid div {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .error-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      background: color-mix(in srgb, var(--uui-color-danger) 10%, var(--uui-color-surface));
      border: 1px solid color-mix(in srgb, var(--uui-color-danger) 35%, var(--uui-color-surface));
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .error-banner ul {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .error-inline {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      color: var(--uui-color-danger-emphasis);
      margin-top: var(--uui-size-space-3);
    }

    .error-message {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-danger-emphasis);
      font-size: var(--uui-type-small-size);
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      margin: var(--uui-size-space-2) 0 0;
    }

    .token-actions,
    .promotion-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .url-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .url-row uui-input {
      flex: 1;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--uui-size-space-2);
    }

    .group-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .group-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .group-card h4 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: var(--uui-type-default-size);
    }

    .promotion-filter-section {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .promotion-filter-section h4 {
      margin: 0 0 var(--uui-size-space-3);
    }

    .bullet-list {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .bullet-list.mono {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
    }

    input[type="datetime-local"] {
      width: 100%;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-default-size);
      box-sizing: border-box;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    @media (max-width: 900px) {
      .tab-content {
        padding: var(--uui-size-space-4);
      }

      .url-row {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `;
c([
  p()
], n.prototype, "_feed", 2);
c([
  p()
], n.prototype, "_isNew", 2);
c([
  p()
], n.prototype, "_isLoading", 2);
c([
  p()
], n.prototype, "_isSaving", 2);
c([
  p()
], n.prototype, "_isRebuilding", 2);
c([
  p()
], n.prototype, "_isPreviewLoading", 2);
c([
  p()
], n.prototype, "_isRegeneratingToken", 2);
c([
  p()
], n.prototype, "_loadError", 2);
c([
  p()
], n.prototype, "_validationErrors", 2);
c([
  p()
], n.prototype, "_productTypes", 2);
c([
  p()
], n.prototype, "_collections", 2);
c([
  p()
], n.prototype, "_filterGroups", 2);
c([
  p()
], n.prototype, "_resolvers", 2);
c([
  p()
], n.prototype, "_countries", 2);
c([
  p()
], n.prototype, "_preview", 2);
c([
  p()
], n.prototype, "_lastRebuild", 2);
c([
  p()
], n.prototype, "_routes", 2);
c([
  p()
], n.prototype, "_routerPath", 2);
c([
  p()
], n.prototype, "_activePath", 2);
c([
  p()
], n.prototype, "_customLabelArgsText", 2);
c([
  p()
], n.prototype, "_customLabelArgsErrors", 2);
c([
  p()
], n.prototype, "_customFieldArgsText", 2);
c([
  p()
], n.prototype, "_customFieldArgsErrors", 2);
n = c([
  x("merchello-product-feed-detail")
], n);
const J = n;
export {
  n as MerchelloProductFeedDetailElement,
  J as default
};
//# sourceMappingURL=product-feed-detail.element-BsRg4HRJ.js.map
