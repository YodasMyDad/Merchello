import { LitElement as J, nothing as c, html as s, css as X, state as f, customElement as Q } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as K } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as Y } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT as Z, UMB_CONFIRM_MODAL as ee } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as te } from "@umbraco-cms/backoffice/notification";
import { M as $ } from "./merchello-api-B3w7Bp8a.js";
import { A as re, B as ie, C as O } from "./navigation-CvTcY6zJ.js";
import { e as G } from "./formatting-C7zDJOqJ.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var oe = Object.defineProperty, se = Object.getOwnPropertyDescriptor, q = (e) => {
  throw TypeError(e);
}, m = (e, t, i, r) => {
  for (var o = r > 1 ? void 0 : r ? se(t, i) : t, a = e.length - 1, l; a >= 0; a--)
    (l = e[a]) && (o = (r ? l(t, i, o) : l(o)) || o);
  return r && o && oe(t, i, o), o;
}, U = (e, t, i) => t.has(e) || q("Cannot " + i), d = (e, t, i) => (U(e, t, "read from private field"), t.get(e)), E = (e, t, i) => t.has(e) ? q("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), P = (e, t, i, r) => (U(e, t, "write to private field"), t.set(e, i), i), C, v, I, F;
const k = 5;
let h = class extends K(J) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._isRebuilding = !1, this._isPreviewLoading = !1, this._isRegeneratingToken = !1, this._loadError = null, this._validationErrors = {}, this._productTypes = [], this._collections = [], this._filterGroups = [], this._resolvers = [], this._countries = [], this._routes = [], this._activePath = "", this._customLabelArgsText = Array.from({ length: k }, () => "{}"), this._customLabelArgsErrors = Array.from({ length: k }, () => ""), this._customFieldArgsText = [], this._customFieldArgsErrors = [], this._isSlugManuallyEdited = !1, E(this, C), E(this, v), E(this, I), E(this, F, !1), this._initRoutes(), this.consumeContext(Y, (e) => {
      P(this, C, e), d(this, C) && (this._isNew = d(this, C).isNew, this.observe(d(this, C).feed, (t) => {
        t && this._applyFeed(t);
      }, "_feed"), this.observe(d(this, C).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(d(this, C).loadError, (t) => {
        this._loadError = t;
      }, "_loadError"));
    }), this.consumeContext(te, (e) => {
      P(this, v, e);
    }), this.consumeContext(Z, (e) => {
      P(this, I, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), P(this, F, !0), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), P(this, F, !1);
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
    const [e, t, i, r, o] = await Promise.all([
      $.getProductTypes(),
      $.getProductCollections(),
      $.getFilterGroups(),
      $.getProductFeedResolvers(),
      $.getCountries()
    ]);
    d(this, F) && (e.data && (this._productTypes = e.data), t.data && (this._collections = t.data), i.data && (this._filterGroups = i.data), r.data && (this._resolvers = r.data), o.data && (this._countries = o.data));
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
    for (const r of e.customLabels ?? [])
      r.slot < 0 || r.slot >= k || t.has(r.slot) || t.set(r.slot, {
        slot: r.slot,
        sourceType: r.sourceType || "static",
        staticValue: r.staticValue,
        resolverAlias: r.resolverAlias,
        args: { ...r.args ?? {} }
      });
    const i = Array.from({ length: k }, (r, o) => t.get(o) ?? this._createEmptyCustomLabel(o));
    return {
      ...e,
      includeTaxInPrice: e.includeTaxInPrice ?? !1,
      filterConfig: this._normalizeFilterConfig(e.filterConfig),
      customLabels: i,
      customFields: (e.customFields ?? []).map((r) => ({
        attribute: r.attribute ?? "",
        sourceType: r.sourceType || "static",
        staticValue: r.staticValue,
        resolverAlias: r.resolverAlias,
        args: { ...r.args ?? {} }
      })),
      manualPromotions: (e.manualPromotions ?? []).map((r) => ({
        promotionId: r.promotionId,
        name: r.name,
        requiresCouponCode: r.requiresCouponCode,
        couponCode: r.couponCode,
        description: r.description,
        startsAtUtc: r.startsAtUtc,
        endsAtUtc: r.endsAtUtc,
        priority: r.priority,
        percentOff: r.percentOff,
        amountOff: r.amountOff,
        filterConfig: this._normalizeFilterConfig(r.filterConfig)
      }))
    };
  }
  _applyFeed(e) {
    const t = this._normalizeFeed(e);
    this._feed = t, this._isLoading = !1, this._isNew = !t.id, this._loadError = null, this._validationErrors = {}, this._customLabelArgsText = t.customLabels.map((i) => this._formatArgs(i.args)), this._customLabelArgsErrors = Array.from({ length: k }, () => ""), this._customFieldArgsText = t.customFields.map((i) => this._formatArgs(i.args)), this._customFieldArgsErrors = t.customFields.map(() => ""), this._isSlugManuallyEdited = this._isSlugOverride(t.name, t.slug);
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
  _toggleIdSelection(e, t, i) {
    return i ? e.includes(t) ? e : [...e, t] : e.filter((r) => r !== t);
  }
  _toggleFilterValue(e, t, i, r) {
    const o = e.filterValueGroups.find((p) => p.filterGroupId === t);
    let a = e.filterValueGroups.filter((p) => p.filterGroupId !== t);
    const l = this._toggleIdSelection(o?.filterIds ?? [], i, r);
    return l.length > 0 && (a = [
      ...a,
      {
        filterGroupId: t,
        filterIds: l
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
  _generateSlug(e) {
    return e ? e.toLowerCase().replace(/\s+/g, " ").replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\-._]/g, "").replace(/-{2,}/g, "-") : "";
  }
  _isSlugOverride(e, t) {
    const i = t ?? "";
    return i.trim() ? i !== this._generateSlug(e) : !1;
  }
  _handleNameInput(e) {
    if (!this._feed) return;
    const t = e, i = this._isSlugManuallyEdited ? this._feed.slug : this._generateSlug(t);
    this._commitFeed({
      ...this._feed,
      name: t,
      slug: i
    });
  }
  _handleSlugInput(e) {
    if (!this._feed) return;
    const t = this._isSlugOverride(this._feed.name, e);
    this._isSlugManuallyEdited = t, this._commitFeed({
      ...this._feed,
      slug: t ? e : this._generateSlug(this._feed.name)
    });
  }
  _handleRootSelectionChange(e, t, i) {
    if (!this._feed) return;
    const r = this._feed.filterConfig, o = {
      ...r,
      [e]: this._toggleIdSelection(r[e], t, i)
    };
    this._commitFeed({
      ...this._feed,
      filterConfig: o
    });
  }
  _handleRootFilterValueChange(e, t, i) {
    if (!this._feed) return;
    const r = this._toggleFilterValue(this._feed.filterConfig, e, t, i);
    this._commitFeed({
      ...this._feed,
      filterConfig: r
    });
  }
  _setRootSelectionIds(e, t) {
    this._feed && this._commitFeed({
      ...this._feed,
      filterConfig: {
        ...this._feed.filterConfig,
        [e]: [...new Set(t)]
      }
    });
  }
  _setRootFilterGroupSelection(e, t) {
    if (!this._feed) return;
    const r = (this._filterGroups.find((o) => o.id === e)?.filters ?? []).map((o) => o.id);
    r.length !== 0 && this._commitFeed({
      ...this._feed,
      filterConfig: this._toggleFilterGroupValues(this._feed.filterConfig, e, r, t)
    });
  }
  _updateManualPromotion(e, t) {
    if (!this._feed) return;
    const i = this._feed.manualPromotions.map((r, o) => o === e ? t({ ...r }) : r);
    this._commitFeed({
      ...this._feed,
      manualPromotions: i
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
      manualPromotions: this._feed.manualPromotions.filter((t, i) => i !== e)
    });
  }
  _handleManualPromotionSelectionChange(e, t, i, r) {
    this._updateManualPromotion(e, (o) => {
      const a = o.filterConfig;
      return {
        ...o,
        filterConfig: {
          ...a,
          [t]: this._toggleIdSelection(a[t], i, r)
        }
      };
    });
  }
  _handleManualPromotionFilterValueChange(e, t, i, r) {
    this._updateManualPromotion(e, (o) => ({
      ...o,
      filterConfig: this._toggleFilterValue(o.filterConfig, t, i, r)
    }));
  }
  _setManualPromotionSelectionIds(e, t, i) {
    this._updateManualPromotion(e, (r) => ({
      ...r,
      filterConfig: {
        ...r.filterConfig,
        [t]: [...new Set(i)]
      }
    }));
  }
  _setManualPromotionFilterGroupSelection(e, t, i) {
    const o = (this._filterGroups.find((a) => a.id === t)?.filters ?? []).map((a) => a.id);
    o.length !== 0 && this._updateManualPromotion(e, (a) => ({
      ...a,
      filterConfig: this._toggleFilterGroupValues(a.filterConfig, t, o, i)
    }));
  }
  _toggleFilterGroupValues(e, t, i, r) {
    let o = { ...e };
    for (const a of i)
      o = this._toggleFilterValue(o, t, a, r);
    return o;
  }
  _getSelectedFilterCount(e, t) {
    return e.filterValueGroups.find((i) => i.filterGroupId === t)?.filterIds.length ?? 0;
  }
  _resolveNamesByIds(e, t) {
    const i = new Map(e.map((r) => [r.id, r.name]));
    return t.map((r) => i.get(r) ?? r);
  }
  _formatSentenceValueList(e) {
    if (e.length === 0)
      return "any value";
    const t = e.map((i) => `"${i}"`);
    return t.length === 1 ? t[0] : t.length === 2 ? `${t[0]} or ${t[1]}` : `${t.slice(0, -1).join(", ")}, or ${t[t.length - 1]}`;
  }
  _buildSelectionQueryInfo(e) {
    const t = this._resolveNamesByIds(this._productTypes, e.productTypeIds), i = this._resolveNamesByIds(this._collections, e.collectionIds), r = e.filterValueGroups.map((u) => {
      const n = this._filterGroups.find((w) => w.id === u.filterGroupId), b = this._resolveNamesByIds(n?.filters ?? [], u.filterIds);
      return {
        groupName: n?.name ?? u.filterGroupId,
        valueNames: b
      };
    }).filter((u) => u.valueNames.length > 0), o = [];
    t.length > 0 && o.push(`productType IN (${t.map((u) => `"${u}"`).join(", ")})`), i.length > 0 && o.push(`collection IN (${i.map((u) => `"${u}"`).join(", ")})`);
    for (const u of r)
      o.push(`${u.groupName} IN (${u.valueNames.map((n) => `"${n}"`).join(", ")})`);
    const a = o.length > 0 ? o.join(" AND ") : "TRUE (no selection filters)", l = [];
    t.length > 0 && l.push(`product type is ${this._formatSentenceValueList(t)}`), i.length > 0 && l.push(`collection is ${this._formatSentenceValueList(i)}`);
    for (const u of r)
      l.push(`${u.groupName} is ${this._formatSentenceValueList(u.valueNames)}`);
    const p = l.length > 0 ? `Include products where ${l.join(" and ")}.` : "Include all products. No product type, collection, or filter-value restrictions are active.";
    return {
      productTypeNames: t,
      collectionNames: i,
      filterGroups: r,
      expression: a,
      english: p
    };
  }
  _getResolverDescriptor(e) {
    if (!e)
      return;
    const t = e.trim().toLowerCase();
    return this._resolvers.find((i) => i.alias.trim().toLowerCase() === t);
  }
  _resolverSupportsArgs(e) {
    return this._getResolverDescriptor(e)?.supportsArgs ?? !1;
  }
  _getResolverHelpText(e) {
    const t = this._getResolverDescriptor(e);
    return t && (t.helpText?.trim() || t.description) || "Resolver computes a value dynamically for each product.";
  }
  _getResolverArgsHelpText(e) {
    return this._getResolverDescriptor(e)?.argsHelpText?.trim() || "Provide a JSON object with simple key/value pairs.";
  }
  _getResolverArgsExample(e) {
    return this._getResolverDescriptor(e)?.argsExampleJson?.trim() || '{"key":"value","flag":"true"}';
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
      customFields: this._feed.customFields.filter((t, i) => i !== e)
    }), this._customFieldArgsText = this._customFieldArgsText.filter((t, i) => i !== e), this._customFieldArgsErrors = this._customFieldArgsErrors.filter((t, i) => i !== e));
  }
  _updateCustomField(e, t) {
    if (!this._feed) return;
    const i = this._feed.customFields.map((r, o) => o === e ? t({ ...r, args: { ...r.args } }) : r);
    this._commitFeed({
      ...this._feed,
      customFields: i
    });
  }
  _updateCustomLabel(e, t) {
    if (!this._feed) return;
    const i = this._feed.customLabels.map((r) => r.slot === e ? t({ ...r, args: { ...r.args } }) : r);
    this._commitFeed({
      ...this._feed,
      customLabels: i
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
      const i = JSON.parse(t);
      if (!i || typeof i != "object" || Array.isArray(i))
        return { error: "Args must be a JSON object." };
      const r = {};
      for (const [o, a] of Object.entries(i)) {
        const l = o.trim();
        if (l) {
          if (a == null) {
            r[l] = "";
            continue;
          }
          if (typeof a == "object")
            return { error: "Args values must be primitives (string/number/boolean)." };
          r[l] = String(a);
        }
      }
      return { value: r };
    } catch {
      return { error: "Invalid JSON in args." };
    }
  }
  _handleCustomLabelArgsInput(e, t) {
    const i = [...this._customLabelArgsText];
    i[e] = t, this._customLabelArgsText = i;
    const r = this._parseArgs(t), o = [...this._customLabelArgsErrors];
    o[e] = r.error ?? "", this._customLabelArgsErrors = o, !r.error && r.value && this._updateCustomLabel(e, (a) => ({
      ...a,
      args: r.value
    }));
  }
  _handleCustomFieldArgsInput(e, t) {
    const i = [...this._customFieldArgsText];
    i[e] = t, this._customFieldArgsText = i;
    const r = this._parseArgs(t), o = [...this._customFieldArgsErrors];
    o[e] = r.error ?? "", this._customFieldArgsErrors = o, !r.error && r.value && this._updateCustomField(e, (a) => ({
      ...a,
      args: r.value
    }));
  }
  _reparseArgsForSave() {
    if (!this._feed) return !1;
    let e = !1;
    const t = [...this._customLabelArgsErrors], i = [...this._customFieldArgsErrors];
    for (let r = 0; r < k; r++) {
      const o = this._feed.customLabels.find((p) => p.slot === r);
      if (!(o?.sourceType === "resolver" && this._resolverSupportsArgs(o.resolverAlias))) {
        t[r] = "";
        continue;
      }
      const l = this._parseArgs(this._customLabelArgsText[r] ?? "{}");
      if (t[r] = l.error ?? "", l.error) {
        e = !0;
        continue;
      }
      this._updateCustomLabel(r, (p) => ({
        ...p,
        args: l.value ?? {}
      }));
    }
    for (let r = 0; r < this._feed.customFields.length; r++) {
      const o = this._feed.customFields[r];
      if (!(o.sourceType === "resolver" && this._resolverSupportsArgs(o.resolverAlias))) {
        i[r] = "";
        continue;
      }
      const l = this._parseArgs(this._customFieldArgsText[r] ?? "{}");
      if (i[r] = l.error ?? "", l.error) {
        e = !0;
        continue;
      }
      this._updateCustomField(r, (p) => ({
        ...p,
        args: l.value ?? {}
      }));
    }
    return this._customLabelArgsErrors = t, this._customFieldArgsErrors = i, !e;
  }
  _validate() {
    if (!this._feed) return !1;
    const e = {};
    this._feed.name.trim() || (e.name = "Name is required."), (!this._feed.countryCode.trim() || this._feed.countryCode.trim().length !== 2) && (e.countryCode = "Country code must be 2 letters."), (!this._feed.currencyCode.trim() || this._feed.currencyCode.trim().length !== 3) && (e.currencyCode = "Currency code must be 3 letters."), this._feed.languageCode.trim() || (e.languageCode = "Language code is required.");
    for (const o of this._feed.customLabels)
      o.sourceType === "resolver" && !o.resolverAlias && (e[`customLabel-${o.slot}`] = "Select a resolver for resolver source type.");
    this._feed.customFields.forEach((o, a) => {
      o.attribute.trim() || (e[`customField-${a}`] = "Attribute is required."), o.sourceType === "resolver" && !o.resolverAlias && (e[`customFieldResolver-${a}`] = "Select a resolver for resolver source type.");
    }), this._feed.manualPromotions.forEach((o, a) => {
      o.promotionId.trim() || (e[`promotionId-${a}`] = "Promotion ID is required."), o.name.trim() || (e[`promotionName-${a}`] = "Promotion name is required."), o.requiresCouponCode && !o.couponCode?.trim() && (e[`promotionCoupon-${a}`] = "Coupon code is required when coupon is enabled."), o.percentOff != null && o.amountOff != null && (e[`promotionValue-${a}`] = "Set either percent off or amount off, not both.");
    }), this._validationErrors = e;
    const t = this._feed.customLabels.some((o) => o.sourceType === "resolver" && this._resolverSupportsArgs(o.resolverAlias) && !!this._customLabelArgsErrors[o.slot]), i = this._feed.customFields.some((o, a) => o.sourceType === "resolver" && this._resolverSupportsArgs(o.resolverAlias) && !!this._customFieldArgsErrors[a]), r = t || i;
    return Object.keys(e).length === 0 && !r;
  }
  _toRequest(e) {
    return {
      name: e.name.trim(),
      slug: e.slug?.trim() ? e.slug.trim() : null,
      isEnabled: e.isEnabled,
      countryCode: e.countryCode.trim().toUpperCase(),
      currencyCode: e.currencyCode.trim().toUpperCase(),
      languageCode: e.languageCode.trim().toLowerCase(),
      includeTaxInPrice: e.includeTaxInPrice ?? null,
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
      d(this, v)?.peek("warning", {
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
      const { data: r, error: o } = await $.createProductFeed(e);
      if (this._isSaving = !1, o || !r) {
        d(this, v)?.peek("danger", {
          data: {
            headline: "Create failed",
            message: o?.message ?? "Unable to create product feed."
          }
        });
        return;
      }
      this._isNew = !1, this._applyFeed(r), d(this, C)?.updateFeed(r), d(this, v)?.peek("positive", {
        data: {
          headline: "Feed created",
          message: `${r.name} was created. Run Rebuild Now or request the feed URL to generate snapshots.`
        }
      }), re(r.id);
      return;
    }
    const { data: t, error: i } = await $.updateProductFeed(this._feed.id, e);
    if (this._isSaving = !1, i || !t) {
      d(this, v)?.peek("danger", {
        data: {
          headline: "Save failed",
          message: i?.message ?? "Unable to update product feed."
        }
      });
      return;
    }
    this._applyFeed(t), d(this, C)?.updateFeed(t), d(this, v)?.peek("positive", {
      data: {
        headline: "Feed saved",
        message: `${t.name} has been updated.`
      }
    });
  }
  async _handleDelete() {
    if (!this._feed?.id || this._isNew) return;
    const e = d(this, I)?.open(this, ee, {
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
    const { error: t } = await $.deleteProductFeed(this._feed.id);
    if (t) {
      d(this, v)?.peek("danger", {
        data: {
          headline: "Delete failed",
          message: t.message
        }
      });
      return;
    }
    d(this, v)?.peek("positive", {
      data: {
        headline: "Feed deleted",
        message: `${this._feed.name} was deleted.`
      }
    }), ie();
  }
  async _reloadCurrentFeed() {
    if (!this._feed?.id) return;
    const { data: e } = await $.getProductFeed(this._feed.id);
    !d(this, F) || !e || (this._applyFeed(e), d(this, C)?.updateFeed(e));
  }
  async _handleRebuild() {
    if (!this._feed?.id || this._isNew) return;
    this._isRebuilding = !0;
    const { data: e, error: t } = await $.rebuildProductFeed(this._feed.id);
    if (this._isRebuilding = !1, !!d(this, F)) {
      if (t || !e) {
        d(this, v)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: t?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      this._lastRebuild = e, e.success ? d(this, v)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${e.productItemCount} products and ${e.promotionCount} promotions generated.`
        }
      }) : d(this, v)?.peek("warning", {
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
    const { data: e, error: t } = await $.previewProductFeed(this._feed.id);
    if (this._isPreviewLoading = !1, !!d(this, F)) {
      if (t || !e) {
        d(this, v)?.peek("danger", {
          data: {
            headline: "Preview failed",
            message: t?.message ?? "Unable to preview feed."
          }
        });
        return;
      }
      this._preview = e, e.error && d(this, v)?.peek("warning", {
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
    const { data: e, error: t } = await $.regenerateProductFeedToken(this._feed.id);
    if (this._isRegeneratingToken = !1, t || !e) {
      d(this, v)?.peek("danger", {
        data: {
          headline: "Token regeneration failed",
          message: t?.message ?? "Unable to regenerate token."
        }
      });
      return;
    }
    const i = {
      ...this._feed,
      accessToken: e.accessToken
    };
    this._commitFeed(i), d(this, C)?.updateFeed(i), d(this, v)?.peek("positive", {
      data: {
        headline: "Token regenerated",
        message: "A new token has been created for this feed."
      }
    });
  }
  async _copyToClipboard(e, t) {
    try {
      await navigator.clipboard.writeText(e), d(this, v)?.peek("positive", {
        data: {
          headline: "Copied",
          message: t
        }
      });
    } catch {
      d(this, v)?.peek("warning", {
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
    const i = t.getFullYear(), r = String(t.getMonth() + 1).padStart(2, "0"), o = String(t.getDate()).padStart(2, "0"), a = String(t.getHours()).padStart(2, "0"), l = String(t.getMinutes()).padStart(2, "0");
    return `${i}-${r}-${o}T${a}:${l}`;
  }
  _fromDateTimeLocal(e) {
    if (!e) return null;
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  _renderErrors() {
    if (Object.keys(this._validationErrors).length === 0) return c;
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
    if (!this._feed) return c;
    const e = this._feed.accessToken, t = window.location.origin, i = `${t}/api/merchello/feeds/${this._feed.slug}.xml`, r = `${t}/api/merchello/feeds/${this._feed.slug}/promotions.xml`, o = e ? `${i}?token=${encodeURIComponent(e)}` : `${i}?token=<regenerate-required>`, a = e ? `${r}?token=${encodeURIComponent(e)}` : `${r}?token=<regenerate-required>`, l = this._feed.hasProductSnapshot ? { label: "Ready", color: "positive" } : this._feed.lastGeneratedUtc ? { label: "Missing", color: "warning" } : { label: "Not generated", color: "default" }, p = this._feed.hasPromotionsSnapshot ? { label: "Ready", color: "positive" } : this._feed.lastGeneratedUtc ? { label: "Missing", color: "warning" } : { label: "Not generated", color: "default" }, u = this._countries.map((n) => ({
      name: `${n.name} (${n.code})`,
      value: n.code,
      selected: n.code === this._feed?.countryCode
    }));
    return s`
      <uui-box headline="General Settings">
        <div class="form-stack">
          <umb-property-layout
            class="full-row"
            label="Slug"
            description="Auto-generated from Feed Name using SlugHelper. Edit to override.">
            <uui-input
              slot="editor"
              .value=${this._feed.slug ?? ""}
              @input=${(n) => this._handleSlugInput(n.target.value)}
              maxlength="200"
              placeholder="google-shopping-us">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Feed Status">
            <uui-toggle
              slot="editor"
              label="Feed enabled"
              ?checked=${this._feed.isEnabled}
              @change=${(n) => this._setGeneralField("isEnabled", n.target.checked)}>
              Feed enabled
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Market Settings">
        <p class="hint">
          Google feed targets are market-specific. Country, currency, and language are required for products and promotions feeds.
        </p>
        <div class="market-grid">
          <umb-property-layout
            label="Country"
            description="Google target country (ISO 3166-1 alpha-2)."
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.countryCode}>
            ${u.length > 0 ? s`
                  <uui-select
                    slot="editor"
                    label="Country"
                    .options=${u}
                    @change=${(n) => this._setGeneralField("countryCode", n.target.value)}
                    ?invalid=${!!this._validationErrors.countryCode}>
                  </uui-select>
                ` : s`
                  <uui-input
                    slot="editor"
                    .value=${this._feed.countryCode}
                    maxlength="2"
                    @input=${(n) => this._setGeneralField("countryCode", n.target.value.toUpperCase())}
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
              @input=${(n) => this._setGeneralField("currencyCode", n.target.value.toUpperCase())}
              ?invalid=${!!this._validationErrors.currencyCode}
              placeholder="USD">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Language"
            description="Required for Google language targeting (ISO 639-1, e.g. en)."
            ?mandatory=${!0}
            ?invalid=${!!this._validationErrors.languageCode}>
            <uui-input
              slot="editor"
              .value=${this._feed.languageCode}
              maxlength="10"
              @input=${(n) => this._setGeneralField("languageCode", n.target.value.toLowerCase())}
              ?invalid=${!!this._validationErrors.languageCode}
                placeholder="en">
            </uui-input>
          </umb-property-layout>
        </div>

        <div class="market-toggle-row">
          <umb-property-layout
            label="Include Tax In Price"
            description="Controls whether feed prices are tax-inclusive or tax-exclusive for g:price.">
            <uui-toggle
              slot="editor"
              label="Include tax in g:price"
              ?checked=${this._feed.includeTaxInPrice}
              @change=${(n) => this._setGeneralField("includeTaxInPrice", n.target.checked)}>
              Include tax in g:price
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      ${this._isNew ? c : s`
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
                        <uui-input .value=${o} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(o, "Products URL copied.")}>
                          Copy
                        </uui-button>
                        <uui-button look="secondary" compact href=${o} target="_blank" rel="noopener">
                          Open
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Promotions Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${a} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(a, "Promotions URL copied.")}>
                          Copy
                        </uui-button>
                        <uui-button look="secondary" compact href=${a} target="_blank" rel="noopener">
                          Open
                        </uui-button>
                      </div>
                    </umb-property-layout>
                  ` : s`
                    <umb-property-layout label="Products Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${o} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(o, "Products endpoint copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Promotions Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${a} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(a, "Promotions endpoint copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <p class="hint">
                      The API does not return plaintext tokens after save.
                      If this browser session has no saved token, regenerate to reveal and copy new feed URLs.
                    </p>
                  `}
            </uui-box>

            <uui-box headline="Generation Status">
              <div class="status-grid">
                <div>
                  <strong>Last generated:</strong>
                  <span>${this._feed.lastGeneratedUtc ? G(this._feed.lastGeneratedUtc) : "Never"}</span>
                </div>
                <div>
                  <strong>Products snapshot:</strong>
                  <uui-tag color=${l.color}>
                    ${l.label}
                  </uui-tag>
                </div>
                <div>
                  <strong>Promotions snapshot:</strong>
                  <uui-tag color=${p.color}>
                    ${p.label}
                  </uui-tag>
                </div>
              </div>

              ${this._feed.lastGenerationError ? s`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._feed.lastGenerationError}</span>
                    </div>
                  ` : c}

              <p class="hint">
                Snapshots are cached XML outputs used for public feed responses and fallback behavior.
                They are created during rebuild or when feed URLs are requested.
              </p>
            </uui-box>
          `}
    `;
  }
  _renderSelectionChecklist(e, t, i, r, o, a, l) {
    const p = this._productTypes.length, u = e.productTypeIds.length, n = p > 0 && u === p, b = u > 0 && !n, w = u === 0 ? `0 of ${p} selected • No restriction (all product types)` : n ? `${u} of ${p} selected • Effectively no restriction` : `${u} of ${p} selected • OR logic (any selected type)`, _ = this._collections.length, y = e.collectionIds.length, M = _ > 0 && y === _, L = y > 0, V = y === 0 ? `0 of ${_} selected • No restriction (all collections + unassigned)` : M ? `${y} of ${_} selected • OR logic (products must be in at least one collection)` : `${y} of ${_} selected • OR logic (any selected collection)`, N = e.filterValueGroups.filter((g) => g.filterIds.length > 0), D = N.reduce((g, x) => g + x.filterIds.length, 0), z = N.length > 0, A = this._buildSelectionQueryInfo(e);
    return s`
      <div class="selection-stack">
      <uui-box headline="Selection Logic">
        <div class="logic-grid">
          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>1. Product Types</strong>
              <uui-tag color=${b ? "warning" : "positive"}>
                ${b ? "Active • OR" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">A product matches if its type is any selected type.</p>
          </section>

          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>2. Collections</strong>
              <uui-tag color=${L ? "warning" : "positive"}>
                ${L ? "Active • OR" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">
              A product matches if it is in any selected collection. If none are selected, collection matching is not used.
            </p>
          </section>

          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>3. Filter Values</strong>
              <uui-tag color=${z ? "warning" : "positive"}>
                ${z ? "Active • AND across groups" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">
              Within each selected group values are OR. Across selected groups, products must match every group (AND).
            </p>
          </section>
        </div>

        <div class="logic-summary">
          <strong>Current rule summary:</strong>
          <ul class="logic-list">
            <li>Product Types: ${b ? "restricted" : "not restricted"}</li>
            <li>Collections: ${L ? "restricted" : "not restricted"}</li>
            <li>Filter Values: ${z ? `${N.length} groups / ${D} values active` : "not restricted"}</li>
          </ul>
        </div>

        <div class="query-builder">
          <div class="query-builder-header">
            <strong>Effective Query</strong>
            <uui-tag color="default">Live preview</uui-tag>
          </div>

          <p class="query-english">${A.english}</p>
          <code class="query-expression">${A.expression}</code>

          <div class="query-groups">
            <section class="query-group">
              <strong>Product Types</strong>
              <div class="query-tag-list">
                ${A.productTypeNames.length > 0 ? A.productTypeNames.map((g) => s`<uui-tag color="warning">${g}</uui-tag>`) : s`<uui-tag color="positive">Any</uui-tag>`}
              </div>
            </section>

            <section class="query-group">
              <strong>Collections</strong>
              <div class="query-tag-list">
                ${A.collectionNames.length > 0 ? A.collectionNames.map((g) => s`<uui-tag color="warning">${g}</uui-tag>`) : s`<uui-tag color="positive">Any</uui-tag>`}
              </div>
            </section>

            <section class="query-group full-width">
              <strong>Filter Values</strong>
              ${A.filterGroups.length === 0 ? s`
                    <div class="query-tag-list">
                      <uui-tag color="positive">Any</uui-tag>
                    </div>
                  ` : s`
                    <div class="query-filter-groups">
                      ${A.filterGroups.map((g) => s`
                        <div class="query-filter-group">
                          <span class="query-filter-group-name">${g.groupName}</span>
                          <div class="query-tag-list">
                            ${g.valueNames.map((x) => s`<uui-tag color="warning">${x}</uui-tag>`)}
                          </div>
                        </div>
                      `)}
                    </div>
                  `}
            </section>
          </div>
        </div>
      </uui-box>

      <uui-box headline="Product Types">
        ${p > 0 ? s`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${w}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${n}
                      @click=${() => o(!0)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${u === 0}
                      @click=${() => o(!1)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products with any selected product type (OR).
              </p>
            ` : c}
        ${this._productTypes.length === 0 ? s`<p class="hint">No product types found.</p>` : s`
              <div class="checkbox-grid">
                ${this._productTypes.map((g) => {
      const x = e.productTypeIds.includes(g.id);
      return s`
                    <uui-checkbox
                      ?checked=${x}
                      @change=${(T) => t(g.id, T.target.checked)}>
                      ${g.name}
                    </uui-checkbox>
                  `;
    })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Collections">
        ${_ > 0 ? s`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${V}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${M}
                      @click=${() => a(!0)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${y === 0}
                      @click=${() => a(!1)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products in any selected collection (OR). If any collection is selected, products with no collections are excluded.
              </p>
            ` : c}
        ${this._collections.length === 0 ? s`<p class="hint">No collections found.</p>` : s`
              <div class="checkbox-grid">
                ${this._collections.map((g) => {
      const x = e.collectionIds.includes(g.id);
      return s`
                    <uui-checkbox
                      ?checked=${x}
                      @change=${(T) => i(g.id, T.target.checked)}>
                      ${g.name}
                    </uui-checkbox>
                  `;
    })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Filter Values">
        <p class="hint">Within each group values are OR. Across groups selection is AND.</p>
        <p class="hint selection-hint">
          Selecting all values in a group still requires the product to have at least one value from that group.
        </p>
        ${this._filterGroups.length === 0 ? s`<p class="hint">No filter groups found.</p>` : s`
              <div class="group-list">
                ${this._filterGroups.map((g) => {
      const x = e.filterValueGroups.find((S) => S.filterGroupId === g.id), T = this._getSelectedFilterCount(e, g.id), R = (g.filters ?? []).length, H = R > 0 && T === R, j = T === 0 ? `0 of ${R} selected • Group ignored` : `${T} of ${R} selected • OR in this group`;
      return s`
                    <section class="group-card">
                      <div class="selection-toolbar selection-toolbar-with-title">
                        <h4>${g.name}</h4>
                        <div class="selection-meta">
                          <span class="selection-count">${j}</span>
                          <div class="selection-actions">
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${H}
                              @click=${() => l(g.id, !0)}>
                              Select all
                            </uui-button>
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${T === 0}
                              @click=${() => l(g.id, !1)}>
                              Clear
                            </uui-button>
                          </div>
                        </div>
                      </div>
                      <div class="checkbox-grid">
                        ${(g.filters ?? []).map((S) => {
        const W = x?.filterIds.includes(S.id) ?? !1;
        return s`
                            <uui-checkbox
                              ?checked=${W}
                              @change=${(B) => r(g.id, S.id, B.target.checked)}>
                              ${S.name}
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
      </div>
    `;
  }
  _renderSelectionTab() {
    return this._feed ? s`
      ${this._renderSelectionChecklist(
      this._feed.filterConfig,
      (e, t) => this._handleRootSelectionChange("productTypeIds", e, t),
      (e, t) => this._handleRootSelectionChange("collectionIds", e, t),
      (e, t, i) => this._handleRootFilterValueChange(e, t, i),
      (e) => this._setRootSelectionIds(
        "productTypeIds",
        e ? this._productTypes.map((t) => t.id) : []
      ),
      (e) => this._setRootSelectionIds(
        "collectionIds",
        e ? this._collections.map((t) => t.id) : []
      ),
      (e, t) => this._setRootFilterGroupSelection(e, t)
    )}
    ` : c;
  }
  _renderManualPromotion(e, t) {
    return s`
      <uui-box headline=${e.name?.trim() ? e.name : `Manual Promotion ${t + 1}`}>
        <div class="promotion-actions">
          <uui-button look="secondary" color="danger" compact @click=${() => this._removeManualPromotion(t)}>
            Remove
          </uui-button>
        </div>

        ${this._validationErrors[`promotionName-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionName-${t}`]}</p>` : c}

        ${this._validationErrors[`promotionId-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionId-${t}`]}</p>` : c}

        ${this._validationErrors[`promotionCoupon-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionCoupon-${t}`]}</p>` : c}

        ${this._validationErrors[`promotionValue-${t}`] ? s`<p class="error-message">${this._validationErrors[`promotionValue-${t}`]}</p>` : c}

        <div class="grid promotion-grid">
          <umb-property-layout label="Promotion ID" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${e.promotionId}
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      promotionId: i.target.value
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Name" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${e.name}
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      name: i.target.value
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Priority">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(e.priority ?? 1e3)}
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      priority: parseInt(i.target.value || "1000", 10)
    }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Description">
            <uui-textarea
              slot="editor"
              .value=${e.description ?? ""}
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      description: i.target.value || null
    }))}>
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="Requires Coupon">
            <uui-toggle
              slot="editor"
              label="Requires coupon code"
              ?checked=${e.requiresCouponCode}
              @change=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      requiresCouponCode: i.target.checked,
      couponCode: i.target.checked ? r.couponCode : null
    }))}>
              Requires coupon code
            </uui-toggle>
          </umb-property-layout>

          ${e.requiresCouponCode ? s`
                <umb-property-layout label="Coupon Code" ?mandatory=${!0}>
                  <uui-input
                    slot="editor"
                    .value=${e.couponCode ?? ""}
                    @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      couponCode: i.target.value || null
    }))}>
                  </uui-input>
                </umb-property-layout>
              ` : c}

          <umb-property-layout label="Starts At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(e.startsAtUtc)}
              @change=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      startsAtUtc: this._fromDateTimeLocal(i.target.value)
    }))}>
          </umb-property-layout>

          <umb-property-layout label="Ends At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(e.endsAtUtc)}
              @change=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      endsAtUtc: this._fromDateTimeLocal(i.target.value)
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
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      percentOff: i.target.value ? Number(i.target.value) : null
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
              @input=${(i) => this._updateManualPromotion(t, (r) => ({
      ...r,
      amountOff: i.target.value ? Number(i.target.value) : null
    }))}>
            </uui-input>
          </umb-property-layout>
        </div>

        <div class="promotion-filter-section">
          <h4>Promotion Filters</h4>
          ${this._renderSelectionChecklist(
      e.filterConfig,
      (i, r) => this._handleManualPromotionSelectionChange(t, "productTypeIds", i, r),
      (i, r) => this._handleManualPromotionSelectionChange(t, "collectionIds", i, r),
      (i, r, o) => this._handleManualPromotionFilterValueChange(t, i, r, o),
      (i) => this._setManualPromotionSelectionIds(
        t,
        "productTypeIds",
        i ? this._productTypes.map((r) => r.id) : []
      ),
      (i) => this._setManualPromotionSelectionIds(
        t,
        "collectionIds",
        i ? this._collections.map((r) => r.id) : []
      ),
      (i, r) => this._setManualPromotionFilterGroupSelection(t, i, r)
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
    ` : c;
  }
  _renderResolverOptions(e) {
    const t = e?.trim().toLowerCase() ?? "";
    return [
      {
        name: "Select resolver...",
        value: "",
        selected: !e
      },
      ...this._resolvers.map((i) => {
        const r = i.displayName?.trim() || i.alias;
        return {
          name: r.toLowerCase() !== i.alias.trim().toLowerCase() ? `${r} (${i.alias})` : r,
          value: i.alias,
          selected: i.alias.trim().toLowerCase() === t
        };
      })
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
          Configure each Google custom label slot with a static value or a resolver.
        </p>
        <p class="hint">
          Resolver values are computed per product when feed XML is generated. Use static values when the same value applies to all products.
        </p>
      </uui-box>

      ${this._feed.customLabels.map((e) => {
      const t = this._validationErrors[`customLabel-${e.slot}`], i = this._customLabelArgsErrors[e.slot], r = this._customLabelArgsText[e.slot] ?? "{}", o = e.sourceType === "resolver", a = o && !!e.resolverAlias?.trim(), l = o && this._resolverSupportsArgs(e.resolverAlias), p = this._getResolverHelpText(e.resolverAlias), u = this._getResolverArgsHelpText(e.resolverAlias), n = this._getResolverArgsExample(e.resolverAlias);
      return s`
          <uui-box headline=${`Custom Label ${e.slot}`}>
            ${t ? s`<p class="error-message">${t}</p>` : c}

            <div class="grid two-col-grid">
              <umb-property-layout label="Source Type">
                <uui-select
                  slot="editor"
                  label="Source Type"
                  .options=${this._renderSourceOptions(e.sourceType)}
                  @change=${(b) => this._updateCustomLabel(e.slot, (w) => ({
        ...w,
        sourceType: b.target.value || "static"
      }))}>
                </uui-select>
              </umb-property-layout>

              ${o ? s`
                    <umb-property-layout label="Resolver" ?mandatory=${!0}>
                      <uui-select
                        slot="editor"
                        label="Resolver"
                        .options=${this._renderResolverOptions(e.resolverAlias)}
                        @change=${(b) => this._updateCustomLabel(e.slot, (w) => ({
        ...w,
        resolverAlias: b.target.value || null
      }))}>
                      </uui-select>
                    </umb-property-layout>
                  ` : s`
                    <umb-property-layout label="Static Value">
                      <uui-input
                        slot="editor"
                        .value=${e.staticValue ?? ""}
                        @input=${(b) => this._updateCustomLabel(e.slot, (w) => ({
        ...w,
        staticValue: b.target.value || null
      }))}>
                      </uui-input>
                    </umb-property-layout>
                  `}

              <div class="resolver-panel full-row">
                ${o ? s`
                      ${a ? s`<p class="hint resolver-help">${p}</p>` : s`<p class="hint">Select a resolver to view details.</p>`}

                      ${a && l ? s`
                            <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                              <uui-textarea
                                slot="editor"
                                .value=${r}
                                ?invalid=${!!i}
                                @input=${(b) => this._handleCustomLabelArgsInput(e.slot, b.target.value)}>
                              </uui-textarea>
                              ${i ? s`<p class="error-message">${i}</p>` : s`
                                    <p class="hint">${u}</p>
                                    <p class="hint">Example: <code>${n}</code></p>
                                  `}
                            </umb-property-layout>
                          ` : c}

                      ${a && !l ? s`<p class="hint resolver-no-args">This resolver does not take parameters.</p>` : c}
                    ` : s`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
              </div>
            </div>
          </uui-box>
        `;
    })}
    ` : c;
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
        <p class="hint">
          Resolver-based fields are calculated per product at generation time, while static fields use the same value for all products.
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
      const i = this._validationErrors[`customField-${t}`], r = this._validationErrors[`customFieldResolver-${t}`], o = this._customFieldArgsErrors[t], a = this._customFieldArgsText[t] ?? "{}", l = e.sourceType === "resolver", p = l && !!e.resolverAlias?.trim(), u = l && this._resolverSupportsArgs(e.resolverAlias), n = this._getResolverHelpText(e.resolverAlias), b = this._getResolverArgsHelpText(e.resolverAlias), w = this._getResolverArgsExample(e.resolverAlias);
      return s`
                <uui-box headline=${e.attribute ? e.attribute : `Custom Field ${t + 1}`}>
                  <div class="promotion-actions">
                    <uui-button look="secondary" color="danger" compact @click=${() => this._removeCustomField(t)}>
                      Remove
                    </uui-button>
                  </div>

                  ${i ? s`<p class="error-message">${i}</p>` : c}
                  ${r ? s`<p class="error-message">${r}</p>` : c}

                  <div class="grid two-col-grid">
                    <umb-property-layout label="Attribute" ?mandatory=${!0}>
                      <uui-input
                        slot="editor"
                        .value=${e.attribute}
                        @input=${(_) => this._updateCustomField(t, (y) => ({
        ...y,
        attribute: _.target.value
      }))}
                        placeholder="e.g. product_highlight">
                      </uui-input>
                    </umb-property-layout>

                    <umb-property-layout label="Source Type">
                      <uui-select
                        slot="editor"
                        label="Source Type"
                        .options=${this._renderSourceOptions(e.sourceType)}
                        @change=${(_) => this._updateCustomField(t, (y) => ({
        ...y,
        sourceType: _.target.value || "static"
      }))}>
                      </uui-select>
                    </umb-property-layout>

                    ${l ? s`
                          <umb-property-layout label="Resolver" ?mandatory=${!0}>
                            <uui-select
                              slot="editor"
                              label="Resolver"
                              .options=${this._renderResolverOptions(e.resolverAlias)}
                              @change=${(_) => this._updateCustomField(t, (y) => ({
        ...y,
        resolverAlias: _.target.value || null
      }))}>
                            </uui-select>
                          </umb-property-layout>
                        ` : s`
                          <umb-property-layout label="Static Value">
                            <uui-input
                              slot="editor"
                              .value=${e.staticValue ?? ""}
                              @input=${(_) => this._updateCustomField(t, (y) => ({
        ...y,
        staticValue: _.target.value || null
      }))}>
                            </uui-input>
                          </umb-property-layout>
                        `}

                    <div class="resolver-panel">
                      ${l ? s`
                            ${p ? s`<p class="hint resolver-help">${n}</p>` : s`<p class="hint">Select a resolver to view details.</p>`}
                            ${p && u ? s`<p class="hint">This resolver supports parameters. Configure them below.</p>` : c}

                            ${p && !u ? s`<p class="hint resolver-no-args">This resolver does not take parameters.</p>` : c}
                          ` : s`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
                    </div>

                    ${p && u ? s`
                          <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                            <uui-textarea
                              slot="editor"
                              .value=${a}
                              ?invalid=${!!o}
                              @input=${(_) => this._handleCustomFieldArgsInput(t, _.target.value)}>
                            </uui-textarea>
                            ${o ? s`<p class="error-message">${o}</p>` : s`
                                  <p class="hint">${b}</p>
                                  <p class="hint">Example: <code>${w}</code></p>
                                `}
                          </umb-property-layout>
                        ` : c}
                  </div>
                </uui-box>
              `;
    })}
          `}
    ` : c;
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
                  ` : c}

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
                  ` : c}
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
                  <span>${G(this._lastRebuild.generatedAtUtc)}</span>
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
                  ` : c}

              ${this._lastRebuild.warnings.length > 0 ? s`
                    <ul class="bullet-list">
                      ${this._lastRebuild.warnings.map((e) => s`<li>${e}</li>`)}
                    </ul>
                  ` : c}
            </uui-box>
          ` : c}
    ` : c;
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
            <uui-button slot="action" look="primary" href=${O()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      ` : this._feed ? s`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${O()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-rss"></umb-icon>
          <uui-input
            id="name-input"
            label="Feed Name"
            .value=${this._feed.name}
            ?required=${!0}
            ?invalid=${!!this._validationErrors.name}
            @input=${(e) => this._handleNameInput(e.target.value)}
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
          ${this._isNew ? c : s`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `}

          ${this._isNew ? c : s`
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
            <uui-button slot="action" look="primary" href=${O()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      `;
  }
};
C = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
I = /* @__PURE__ */ new WeakMap();
F = /* @__PURE__ */ new WeakMap();
h.styles = X`
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

    .form-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .full-row {
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .grid > .full-row {
      grid-column: 1 / -1;
    }

    .two-col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .two-col-grid > umb-property-layout,
    .two-col-grid > .resolver-panel {
      width: 100%;
      min-width: 0;
    }

    .market-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-4);
    }

    .market-toggle-row {
      margin-top: var(--uui-size-space-4);
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

    .selection-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .logic-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .logic-rule {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-surface) 95%, var(--uui-color-border) 5%);
    }

    .logic-rule-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .logic-summary {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .logic-list {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .query-builder {
      border-top: 1px solid var(--uui-color-border);
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .query-builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .query-english {
      margin: 0;
      color: var(--uui-color-text);
    }

    .query-expression {
      display: block;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      font-family: var(--uui-font-monospace);
      background: color-mix(in srgb, var(--uui-color-surface) 96%, var(--uui-color-border) 4%);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .query-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
    }

    .query-group {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: color-mix(in srgb, var(--uui-color-surface) 97%, var(--uui-color-border) 3%);
    }

    .query-group.full-width {
      grid-column: 1 / -1;
    }

    .query-tag-list {
      display: flex;
      gap: var(--uui-size-space-1);
      flex-wrap: wrap;
    }

    .query-filter-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .query-filter-group {
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .query-filter-group-name {
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--uui-size-space-4);
      row-gap: var(--uui-size-space-2);
    }

    .selection-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
      flex-wrap: wrap;
    }

    .selection-toolbar-with-title {
      justify-content: space-between;
    }

    .selection-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .selection-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .selection-count {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .group-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-2);
    }

    .group-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      background: color-mix(in srgb, var(--uui-color-surface) 95%, var(--uui-color-border) 5%);
    }

    .group-card h4 {
      margin: 0;
      font-size: var(--uui-type-default-size);
    }

    .selection-hint {
      margin: 0 0 var(--uui-size-space-3);
    }

    .resolver-help {
      margin: 0;
    }

    .resolver-panel {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-height: 64px;
      background: color-mix(in srgb, var(--uui-color-surface) 92%, var(--uui-color-border) 8%);
    }

    .resolver-no-args {
      margin: 0;
    }

    uui-input,
    uui-select,
    uui-textarea {
      width: 100%;
    }

    .promotion-filter-section {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .promotion-filter-section h4 {
      margin: 0 0 var(--uui-size-space-3);
    }

    .promotion-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-4);
    }

    .promotion-grid > .full-row {
      grid-column: 1 / -1;
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

      .checkbox-grid {
        grid-template-columns: 1fr;
      }

      .promotion-grid {
        grid-template-columns: 1fr;
      }

      .logic-grid {
        grid-template-columns: 1fr;
      }

      .query-groups {
        grid-template-columns: 1fr;
      }

      .two-col-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
m([
  f()
], h.prototype, "_feed", 2);
m([
  f()
], h.prototype, "_isNew", 2);
m([
  f()
], h.prototype, "_isLoading", 2);
m([
  f()
], h.prototype, "_isSaving", 2);
m([
  f()
], h.prototype, "_isRebuilding", 2);
m([
  f()
], h.prototype, "_isPreviewLoading", 2);
m([
  f()
], h.prototype, "_isRegeneratingToken", 2);
m([
  f()
], h.prototype, "_loadError", 2);
m([
  f()
], h.prototype, "_validationErrors", 2);
m([
  f()
], h.prototype, "_productTypes", 2);
m([
  f()
], h.prototype, "_collections", 2);
m([
  f()
], h.prototype, "_filterGroups", 2);
m([
  f()
], h.prototype, "_resolvers", 2);
m([
  f()
], h.prototype, "_countries", 2);
m([
  f()
], h.prototype, "_preview", 2);
m([
  f()
], h.prototype, "_lastRebuild", 2);
m([
  f()
], h.prototype, "_routes", 2);
m([
  f()
], h.prototype, "_routerPath", 2);
m([
  f()
], h.prototype, "_activePath", 2);
m([
  f()
], h.prototype, "_customLabelArgsText", 2);
m([
  f()
], h.prototype, "_customLabelArgsErrors", 2);
m([
  f()
], h.prototype, "_customFieldArgsText", 2);
m([
  f()
], h.prototype, "_customFieldArgsErrors", 2);
m([
  f()
], h.prototype, "_isSlugManuallyEdited", 2);
h = m([
  Q("merchello-product-feed-detail")
], h);
const me = h;
export {
  h as MerchelloProductFeedDetailElement,
  me as default
};
//# sourceMappingURL=product-feed-detail.element-Bv0OwmGI.js.map
