import { LitElement as D, nothing as u, html as o, css as H, state as g, customElement as j } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as W } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as B } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT as J, UMB_CONFIRM_MODAL as X } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as Q } from "@umbraco-cms/backoffice/notification";
import { M as $ } from "./merchello-api-Dp_zU_yi.js";
import { A as K, B as Y, C as L } from "./navigation-CvTcY6zJ.js";
import { e as N } from "./formatting-B_f6AiQh.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
var Z = Object.defineProperty, ee = Object.getOwnPropertyDescriptor, z = (e) => {
  throw TypeError(e);
}, m = (e, t, i, r) => {
  for (var s = r > 1 ? void 0 : r ? ee(t, i) : t, a = e.length - 1, l; a >= 0; a--)
    (l = e[a]) && (s = (r ? l(t, i, s) : l(s)) || s);
  return r && s && Z(t, i, s), s;
}, O = (e, t, i) => t.has(e) || z("Cannot " + i), n = (e, t, i) => (O(e, t, "read from private field"), t.get(e)), I = (e, t, i) => t.has(e) ? z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, r) => (O(e, t, "write to private field"), t.set(e, i), i), C, f, E, F;
const P = 5;
let d = class extends W(D) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._isRebuilding = !1, this._isPreviewLoading = !1, this._loadError = null, this._validationErrors = {}, this._productTypes = [], this._collections = [], this._filterGroups = [], this._resolvers = [], this._countries = [], this._routes = [], this._activePath = "", this._customLabelArgsText = Array.from({ length: P }, () => "{}"), this._customLabelArgsErrors = Array.from({ length: P }, () => ""), this._customFieldArgsText = [], this._customFieldArgsErrors = [], this._isSlugManuallyEdited = !1, I(this, C), I(this, f), I(this, E), I(this, F, !1), this._initRoutes(), this.consumeContext(B, (e) => {
      k(this, C, e), n(this, C) && (this._isNew = n(this, C).isNew, this.observe(n(this, C).feed, (t) => {
        t && this._applyFeed(t);
      }, "_feed"), this.observe(n(this, C).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(n(this, C).loadError, (t) => {
        this._loadError = t;
      }, "_loadError"));
    }), this.consumeContext(Q, (e) => {
      k(this, f, e);
    }), this.consumeContext(J, (e) => {
      k(this, E, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, F, !0), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, F, !1);
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
    const [e, t, i, r, s] = await Promise.all([
      $.getProductTypes(),
      $.getProductCollections(),
      $.getFilterGroups(),
      $.getProductFeedResolvers(),
      $.getCountries()
    ]);
    n(this, F) && (e.data && (this._productTypes = e.data), t.data && (this._collections = t.data), i.data && (this._filterGroups = i.data), r.data && (this._resolvers = r.data), s.data && (this._countries = s.data));
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
      r.slot < 0 || r.slot >= P || t.has(r.slot) || t.set(r.slot, {
        slot: r.slot,
        sourceType: r.sourceType || "static",
        staticValue: r.staticValue,
        resolverAlias: r.resolverAlias,
        args: { ...r.args ?? {} }
      });
    const i = Array.from({ length: P }, (r, s) => t.get(s) ?? this._createEmptyCustomLabel(s));
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
    this._feed = t, this._isLoading = !1, this._isNew = !t.id, this._loadError = null, this._validationErrors = {}, this._customLabelArgsText = t.customLabels.map((i) => this._formatArgs(i.args)), this._customLabelArgsErrors = Array.from({ length: P }, () => ""), this._customFieldArgsText = t.customFields.map((i) => this._formatArgs(i.args)), this._customFieldArgsErrors = t.customFields.map(() => ""), this._isSlugManuallyEdited = this._isSlugOverride(t.name, t.slug);
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
    const s = e.filterValueGroups.find((p) => p.filterGroupId === t);
    let a = e.filterValueGroups.filter((p) => p.filterGroupId !== t);
    const l = this._toggleIdSelection(s?.filterIds ?? [], i, r);
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
    const r = this._feed.filterConfig, s = {
      ...r,
      [e]: this._toggleIdSelection(r[e], t, i)
    };
    this._commitFeed({
      ...this._feed,
      filterConfig: s
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
    const r = (this._filterGroups.find((s) => s.id === e)?.filters ?? []).map((s) => s.id);
    r.length !== 0 && this._commitFeed({
      ...this._feed,
      filterConfig: this._toggleFilterGroupValues(this._feed.filterConfig, e, r, t)
    });
  }
  _updateManualPromotion(e, t) {
    if (!this._feed) return;
    const i = this._feed.manualPromotions.map((r, s) => s === e ? t({ ...r }) : r);
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
    this._updateManualPromotion(e, (s) => {
      const a = s.filterConfig;
      return {
        ...s,
        filterConfig: {
          ...a,
          [t]: this._toggleIdSelection(a[t], i, r)
        }
      };
    });
  }
  _handleManualPromotionFilterValueChange(e, t, i, r) {
    this._updateManualPromotion(e, (s) => ({
      ...s,
      filterConfig: this._toggleFilterValue(s.filterConfig, t, i, r)
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
    const s = (this._filterGroups.find((a) => a.id === t)?.filters ?? []).map((a) => a.id);
    s.length !== 0 && this._updateManualPromotion(e, (a) => ({
      ...a,
      filterConfig: this._toggleFilterGroupValues(a.filterConfig, t, s, i)
    }));
  }
  _toggleFilterGroupValues(e, t, i, r) {
    let s = { ...e };
    for (const a of i)
      s = this._toggleFilterValue(s, t, a, r);
    return s;
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
    const t = this._resolveNamesByIds(this._productTypes, e.productTypeIds), i = this._resolveNamesByIds(this._collections, e.collectionIds), r = e.filterValueGroups.map((c) => {
      const y = this._filterGroups.find((v) => v.id === c.filterGroupId), b = this._resolveNamesByIds(y?.filters ?? [], c.filterIds);
      return {
        groupName: y?.name ?? c.filterGroupId,
        valueNames: b
      };
    }).filter((c) => c.valueNames.length > 0), s = [];
    t.length > 0 && s.push(`productType IN (${t.map((c) => `"${c}"`).join(", ")})`), i.length > 0 && s.push(`collection IN (${i.map((c) => `"${c}"`).join(", ")})`);
    for (const c of r)
      s.push(`${c.groupName} IN (${c.valueNames.map((y) => `"${y}"`).join(", ")})`);
    const a = s.length > 0 ? s.join(" AND ") : "TRUE (no selection filters)", l = [];
    t.length > 0 && l.push(`product type is ${this._formatSentenceValueList(t)}`), i.length > 0 && l.push(`collection is ${this._formatSentenceValueList(i)}`);
    for (const c of r)
      l.push(`${c.groupName} is ${this._formatSentenceValueList(c.valueNames)}`);
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
    const i = this._feed.customFields.map((r, s) => s === e ? t({ ...r, args: { ...r.args } }) : r);
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
      for (const [s, a] of Object.entries(i)) {
        const l = s.trim();
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
    const r = this._parseArgs(t), s = [...this._customLabelArgsErrors];
    s[e] = r.error ?? "", this._customLabelArgsErrors = s, !r.error && r.value && this._updateCustomLabel(e, (a) => ({
      ...a,
      args: r.value
    }));
  }
  _handleCustomFieldArgsInput(e, t) {
    const i = [...this._customFieldArgsText];
    i[e] = t, this._customFieldArgsText = i;
    const r = this._parseArgs(t), s = [...this._customFieldArgsErrors];
    s[e] = r.error ?? "", this._customFieldArgsErrors = s, !r.error && r.value && this._updateCustomField(e, (a) => ({
      ...a,
      args: r.value
    }));
  }
  _reparseArgsForSave() {
    if (!this._feed) return !1;
    let e = !1;
    const t = [...this._customLabelArgsErrors], i = [...this._customFieldArgsErrors];
    for (let r = 0; r < P; r++) {
      const s = this._feed.customLabels.find((p) => p.slot === r);
      if (!(s?.sourceType === "resolver" && this._resolverSupportsArgs(s.resolverAlias))) {
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
      const s = this._feed.customFields[r];
      if (!(s.sourceType === "resolver" && this._resolverSupportsArgs(s.resolverAlias))) {
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
    for (const s of this._feed.customLabels)
      s.sourceType === "resolver" && !s.resolverAlias && (e[`customLabel-${s.slot}`] = "Select a resolver for resolver source type.");
    this._feed.customFields.forEach((s, a) => {
      s.attribute.trim() || (e[`customField-${a}`] = "Attribute is required."), s.sourceType === "resolver" && !s.resolverAlias && (e[`customFieldResolver-${a}`] = "Select a resolver for resolver source type.");
    }), this._feed.manualPromotions.forEach((s, a) => {
      s.promotionId.trim() || (e[`promotionId-${a}`] = "Promotion ID is required."), s.name.trim() || (e[`promotionName-${a}`] = "Promotion name is required."), s.requiresCouponCode && !s.couponCode?.trim() && (e[`promotionCoupon-${a}`] = "Coupon code is required when coupon is enabled."), s.percentOff != null && s.amountOff != null && (e[`promotionValue-${a}`] = "Set either percent off or amount off, not both.");
    }), this._validationErrors = e;
    const t = this._feed.customLabels.some((s) => s.sourceType === "resolver" && this._resolverSupportsArgs(s.resolverAlias) && !!this._customLabelArgsErrors[s.slot]), i = this._feed.customFields.some((s, a) => s.sourceType === "resolver" && this._resolverSupportsArgs(s.resolverAlias) && !!this._customFieldArgsErrors[a]), r = t || i;
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
      n(this, f)?.peek("warning", {
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
      const { data: r, error: s } = await $.createProductFeed(e);
      if (this._isSaving = !1, s || !r) {
        n(this, f)?.peek("danger", {
          data: {
            headline: "Create failed",
            message: s?.message ?? "Unable to create product feed."
          }
        });
        return;
      }
      this._isNew = !1, this._applyFeed(r), n(this, C)?.updateFeed(r), n(this, f)?.peek("positive", {
        data: {
          headline: "Feed created",
          message: `${r.name} was created. Run Rebuild Now or request the feed URL to generate snapshots.`
        }
      }), K(r.id);
      return;
    }
    const { data: t, error: i } = await $.updateProductFeed(this._feed.id, e);
    if (this._isSaving = !1, i || !t) {
      n(this, f)?.peek("danger", {
        data: {
          headline: "Save failed",
          message: i?.message ?? "Unable to update product feed."
        }
      });
      return;
    }
    this._applyFeed(t), n(this, C)?.updateFeed(t), n(this, f)?.peek("positive", {
      data: {
        headline: "Feed saved",
        message: `${t.name} has been updated.`
      }
    });
  }
  async _handleDelete() {
    if (!this._feed?.id || this._isNew) return;
    if (!n(this, E)) {
      n(this, f)?.peek("warning", {
        data: {
          headline: "Action unavailable",
          message: "Delete confirmation is not available right now. Refresh and try again."
        }
      });
      return;
    }
    const e = n(this, E).open(this, X, {
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
      n(this, f)?.peek("danger", {
        data: {
          headline: "Delete failed",
          message: t.message
        }
      });
      return;
    }
    n(this, f)?.peek("positive", {
      data: {
        headline: "Feed deleted",
        message: `${this._feed.name} was deleted.`
      }
    }), Y();
  }
  async _reloadCurrentFeed() {
    if (!this._feed?.id) return;
    const { data: e } = await $.getProductFeed(this._feed.id);
    !n(this, F) || !e || (this._applyFeed(e), n(this, C)?.updateFeed(e));
  }
  async _handleRebuild() {
    if (!this._feed?.id || this._isNew) return;
    this._isRebuilding = !0;
    const { data: e, error: t } = await $.rebuildProductFeed(this._feed.id);
    if (this._isRebuilding = !1, !!n(this, F)) {
      if (t || !e) {
        n(this, f)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: t?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      this._lastRebuild = e, e.success ? n(this, f)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${e.productItemCount} products and ${e.promotionCount} promotions generated.`
        }
      }) : n(this, f)?.peek("warning", {
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
    if (this._isPreviewLoading = !1, !!n(this, F)) {
      if (t || !e) {
        n(this, f)?.peek("danger", {
          data: {
            headline: "Preview failed",
            message: t?.message ?? "Unable to preview feed."
          }
        });
        return;
      }
      this._preview = e, e.error && n(this, f)?.peek("warning", {
        data: {
          headline: "Preview returned an error",
          message: e.error
        }
      });
    }
  }
  async _copyToClipboard(e, t) {
    try {
      await navigator.clipboard.writeText(e), n(this, f)?.peek("positive", {
        data: {
          headline: "Copied",
          message: t
        }
      });
    } catch {
      n(this, f)?.peek("warning", {
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
    const i = t.getFullYear(), r = String(t.getMonth() + 1).padStart(2, "0"), s = String(t.getDate()).padStart(2, "0"), a = String(t.getHours()).padStart(2, "0"), l = String(t.getMinutes()).padStart(2, "0");
    return `${i}-${r}-${s}T${a}:${l}`;
  }
  _fromDateTimeLocal(e) {
    if (!e) return null;
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  _renderErrors() {
    if (Object.keys(this._validationErrors).length === 0) return u;
    const e = Array.from(new Set(Object.values(this._validationErrors)));
    return o`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Fix the following before saving:</strong>
          <ul>
            ${e.map((t) => o`<li>${t}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }
  _renderGeneralTab() {
    if (!this._feed) return u;
    const e = window.location.origin, t = `${e}/api/merchello/feeds/${this._feed.slug}.xml`, i = `${e}/api/merchello/feeds/${this._feed.slug}/promotions.xml`, r = this._feed.hasProductSnapshot ? { label: "Ready", color: "positive" } : this._feed.lastGeneratedUtc ? { label: "Missing", color: "warning" } : { label: "Not generated", color: "default" }, s = this._feed.hasPromotionsSnapshot ? { label: "Ready", color: "positive" } : this._feed.lastGeneratedUtc ? { label: "Missing", color: "warning" } : { label: "Not generated", color: "default" }, a = this._countries.map((l) => ({
      name: `${l.name} (${l.code})`,
      value: l.code,
      selected: l.code === this._feed?.countryCode
    }));
    return o`
      <uui-box headline="General Settings">
        <div class="form-stack">
          <umb-property-layout
            class="full-row"
            label="Slug"
            description="When created, a short random prefix is prepended before this slug. Edit to change the saved URL slug.">
            <uui-input
              slot="editor"
              .value=${this._feed.slug ?? ""}
              @input=${(l) => this._handleSlugInput(l.target.value)}
              maxlength="200"
              placeholder="google-shopping-us">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Feed Status">
            <uui-toggle
              slot="editor"
              label="Feed enabled"
              ?checked=${this._feed.isEnabled}
              @change=${(l) => this._setGeneralField("isEnabled", l.target.checked)}>
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
            ${a.length > 0 ? o`
                  <uui-select
                    slot="editor"
                    label="Country"
                    .options=${a}
                    @change=${(l) => this._setGeneralField("countryCode", l.target.value)}
                    ?invalid=${!!this._validationErrors.countryCode}>
                  </uui-select>
                ` : o`
                  <uui-input
                    slot="editor"
                    .value=${this._feed.countryCode}
                    maxlength="2"
                    @input=${(l) => this._setGeneralField("countryCode", l.target.value.toUpperCase())}
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
              @input=${(l) => this._setGeneralField("currencyCode", l.target.value.toUpperCase())}
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
              @input=${(l) => this._setGeneralField("languageCode", l.target.value.toLowerCase())}
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
              @change=${(l) => this._setGeneralField("includeTaxInPrice", l.target.checked)}>
              Include tax in g:price
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      ${this._isNew ? u : o`
            <uui-box headline="Feed URLs">
              <umb-property-layout label="Products Endpoint">
                <div slot="editor" class="url-row">
                  <uui-input .value=${t} readonly></uui-input>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._copyToClipboard(t, "Products URL copied.")}>
                    Copy
                  </uui-button>
                  <uui-button look="secondary" compact href=${t} target="_blank" rel="noopener">
                    Open
                  </uui-button>
                </div>
              </umb-property-layout>

              <umb-property-layout label="Promotions Endpoint">
                <div slot="editor" class="url-row">
                  <uui-input .value=${i} readonly></uui-input>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._copyToClipboard(i, "Promotions URL copied.")}>
                    Copy
                  </uui-button>
                  <uui-button look="secondary" compact href=${i} target="_blank" rel="noopener">
                    Open
                  </uui-button>
                </div>
              </umb-property-layout>
            </uui-box>

            <uui-box headline="Generation Status">
              <div class="status-grid">
                <div>
                  <strong>Last generated:</strong>
                  <span>${this._feed.lastGeneratedUtc ? N(this._feed.lastGeneratedUtc) : "Never"}</span>
                </div>
                <div>
                  <strong>Products snapshot:</strong>
                  <uui-tag color=${r.color}>
                    ${r.label}
                  </uui-tag>
                </div>
                <div>
                  <strong>Promotions snapshot:</strong>
                  <uui-tag color=${s.color}>
                    ${s.label}
                  </uui-tag>
                </div>
              </div>

              ${this._feed.lastGenerationError ? o`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._feed.lastGenerationError}</span>
                    </div>
                  ` : u}

              <p class="hint">
                Snapshots are cached XML outputs used for public feed responses and fallback behavior.
                They are created during rebuild or when feed URLs are requested.
              </p>
            </uui-box>
          `}
    `;
  }
  _renderSelectionChecklist(e, t, i, r, s, a, l) {
    const p = this._productTypes.length, c = e.productTypeIds.length, y = p > 0 && c === p, b = c === 0 ? `0 of ${p} selected • No restriction (all product types)` : y ? `${c} of ${p} selected • Effectively no restriction` : `${c} of ${p} selected • OR logic (any selected type)`, v = this._collections.length, _ = e.collectionIds.length, w = v > 0 && _ === v, M = _ === 0 ? `0 of ${v} selected • No restriction (all collections + unassigned)` : w ? `${_} of ${v} selected • OR logic (products must be in at least one collection)` : `${_} of ${v} selected • OR logic (any selected collection)`, x = this._buildSelectionQueryInfo(e);
    return o`
      <div class="selection-stack">
        <uui-box headline="Effective Query">
          <div class="query-builder">
            <div class="query-builder-header">
              <uui-tag color="default">Live preview</uui-tag>
            </div>

            <p class="query-english">${x.english}</p>
            <code class="query-expression">${x.expression}</code>

            <div class="query-groups">
              <section class="query-group">
                <strong>Product Types</strong>
                <div class="query-tag-list">
                  ${x.productTypeNames.length > 0 ? x.productTypeNames.map((h) => o`<uui-tag color="warning">${h}</uui-tag>`) : o`<uui-tag color="positive">Any</uui-tag>`}
                </div>
              </section>

              <section class="query-group">
                <strong>Collections</strong>
                <div class="query-tag-list">
                  ${x.collectionNames.length > 0 ? x.collectionNames.map((h) => o`<uui-tag color="warning">${h}</uui-tag>`) : o`<uui-tag color="positive">Any</uui-tag>`}
                </div>
              </section>

              <section class="query-group full-width">
                <strong>Filter Values</strong>
                ${x.filterGroups.length === 0 ? o`
                      <div class="query-tag-list">
                        <uui-tag color="positive">Any</uui-tag>
                      </div>
                    ` : o`
                      <div class="query-filter-groups">
                        ${x.filterGroups.map((h) => o`
                          <div class="query-filter-group">
                            <span class="query-filter-group-name">${h.groupName}</span>
                            <div class="query-tag-list">
                              ${h.valueNames.map((S) => o`<uui-tag color="warning">${S}</uui-tag>`)}
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
        ${p > 0 ? o`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${b}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${y}
                      @click=${() => s(!0)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${c === 0}
                      @click=${() => s(!1)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products with any selected product type (OR).
              </p>
            ` : u}
        ${this._productTypes.length === 0 ? o`<p class="hint">No product types found.</p>` : o`
              <div class="checkbox-grid">
                ${this._productTypes.map((h) => {
      const S = e.productTypeIds.includes(h.id);
      return o`
                    <uui-checkbox
                      label=${h.name}
                      ?checked=${S}
                      @change=${(A) => t(h.id, A.target.checked)}>
                      ${h.name}
                    </uui-checkbox>
                  `;
    })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Collections">
        ${v > 0 ? o`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${M}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${w}
                      @click=${() => a(!0)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${_ === 0}
                      @click=${() => a(!1)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products in any selected collection (OR). If any collection is selected, products with no collections are excluded.
              </p>
            ` : u}
        ${this._collections.length === 0 ? o`<p class="hint">No collections found.</p>` : o`
              <div class="checkbox-grid">
                ${this._collections.map((h) => {
      const S = e.collectionIds.includes(h.id);
      return o`
                    <uui-checkbox
                      label=${h.name}
                      ?checked=${S}
                      @change=${(A) => i(h.id, A.target.checked)}>
                      ${h.name}
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
        ${this._filterGroups.length === 0 ? o`<p class="hint">No filter groups found.</p>` : o`
              <div class="group-list">
                ${this._filterGroups.map((h) => {
      const S = e.filterValueGroups.find((T) => T.filterGroupId === h.id), A = this._getSelectedFilterCount(e, h.id), R = (h.filters ?? []).length, G = R > 0 && A === R, q = A === 0 ? `0 of ${R} selected • Group ignored` : `${A} of ${R} selected • OR in this group`;
      return o`
                    <section class="group-card">
                      <div class="selection-toolbar selection-toolbar-with-title">
                        <h4>${h.name}</h4>
                        <div class="selection-meta">
                          <span class="selection-count">${q}</span>
                          <div class="selection-actions">
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${G}
                              @click=${() => l(h.id, !0)}>
                              Select all
                            </uui-button>
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${A === 0}
                              @click=${() => l(h.id, !1)}>
                              Clear
                            </uui-button>
                          </div>
                        </div>
                      </div>
                      <div class="checkbox-grid">
                        ${(h.filters ?? []).map((T) => {
        const U = S?.filterIds.includes(T.id) ?? !1;
        return o`
                            <uui-checkbox
                              label=${T.name}
                              ?checked=${U}
                              @change=${(V) => r(h.id, T.id, V.target.checked)}>
                              ${T.name}
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
    return this._feed ? o`
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
    ` : u;
  }
  _renderManualPromotion(e, t) {
    return o`
      <uui-box headline=${e.name?.trim() ? e.name : `Manual Promotion ${t + 1}`}>
        <div class="promotion-actions">
          <uui-button look="secondary" color="danger" compact @click=${() => this._removeManualPromotion(t)}>
            Remove
          </uui-button>
        </div>

        ${this._validationErrors[`promotionName-${t}`] ? o`<p class="error-message">${this._validationErrors[`promotionName-${t}`]}</p>` : u}

        ${this._validationErrors[`promotionId-${t}`] ? o`<p class="error-message">${this._validationErrors[`promotionId-${t}`]}</p>` : u}

        ${this._validationErrors[`promotionCoupon-${t}`] ? o`<p class="error-message">${this._validationErrors[`promotionCoupon-${t}`]}</p>` : u}

        ${this._validationErrors[`promotionValue-${t}`] ? o`<p class="error-message">${this._validationErrors[`promotionValue-${t}`]}</p>` : u}

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
              label="Promotion description"
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

          ${e.requiresCouponCode ? o`
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
              ` : u}

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
      (i, r, s) => this._handleManualPromotionFilterValueChange(t, i, r, s),
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
    return this._feed ? o`
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

      ${this._feed.manualPromotions.length === 0 ? o`
            <merchello-empty-state
              icon="icon-megaphone"
              headline="No manual promotions"
              message="Add a promotion if you need feed-specific campaigns beyond auto-exported discounts.">
            </merchello-empty-state>
          ` : o`${this._feed.manualPromotions.map((e, t) => this._renderManualPromotion(e, t))}`}
    ` : u;
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
    return this._feed ? o`
      <uui-box headline="Custom Labels (0-4)">
        <p class="hint">
          Configure each Google custom label slot with a static value or a resolver.
        </p>
        <p class="hint">
          Resolver values are computed per product when feed XML is generated. Use static values when the same value applies to all products.
        </p>
      </uui-box>

      ${this._feed.customLabels.map((e) => {
      const t = this._validationErrors[`customLabel-${e.slot}`], i = this._customLabelArgsErrors[e.slot], r = this._customLabelArgsText[e.slot] ?? "{}", s = e.sourceType === "resolver", a = s && !!e.resolverAlias?.trim(), l = s && this._resolverSupportsArgs(e.resolverAlias), p = this._getResolverHelpText(e.resolverAlias), c = this._getResolverArgsHelpText(e.resolverAlias), y = this._getResolverArgsExample(e.resolverAlias);
      return o`
          <uui-box headline=${`Custom Label ${e.slot}`}>
            ${t ? o`<p class="error-message">${t}</p>` : u}

            <div class="grid two-col-grid">
              <umb-property-layout label="Source Type">
                <uui-select
                  slot="editor"
                  label="Source Type"
                  .options=${this._renderSourceOptions(e.sourceType)}
                  @change=${(b) => this._updateCustomLabel(e.slot, (v) => ({
        ...v,
        sourceType: b.target.value || "static"
      }))}>
                </uui-select>
              </umb-property-layout>

              ${s ? o`
                    <umb-property-layout label="Resolver" ?mandatory=${!0}>
                      <uui-select
                        slot="editor"
                        label="Resolver"
                        .options=${this._renderResolverOptions(e.resolverAlias)}
                        @change=${(b) => this._updateCustomLabel(e.slot, (v) => ({
        ...v,
        resolverAlias: b.target.value || null
      }))}>
                      </uui-select>
                    </umb-property-layout>
                  ` : o`
                    <umb-property-layout label="Static Value">
                      <uui-input
                        slot="editor"
                        .value=${e.staticValue ?? ""}
                        @input=${(b) => this._updateCustomLabel(e.slot, (v) => ({
        ...v,
        staticValue: b.target.value || null
      }))}>
                      </uui-input>
                    </umb-property-layout>
                  `}

              <div class="resolver-panel full-row">
                ${s ? o`
                      ${a ? o`<p class="hint resolver-help">${p}</p>` : o`<p class="hint">Select a resolver to view details.</p>`}

                      ${a && l ? o`
                            <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                              <uui-textarea
                                slot="editor"
                                label="Custom label resolver parameters"
                                .value=${r}
                                ?invalid=${!!i}
                                @input=${(b) => this._handleCustomLabelArgsInput(e.slot, b.target.value)}>
                              </uui-textarea>
                              ${i ? o`<p class="error-message">${i}</p>` : o`
                                    <p class="hint">${c}</p>
                                    <p class="hint">Example: <code>${y}</code></p>
                                  `}
                            </umb-property-layout>
                          ` : u}

                      ${a && !l ? o`<p class="hint resolver-no-args">This resolver does not take parameters.</p>` : u}
                    ` : o`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
              </div>
            </div>
          </uui-box>
        `;
    })}
    ` : u;
  }
  _renderCustomFieldsTab() {
    return this._feed ? o`
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

      ${this._feed.customFields.length === 0 ? o`
            <merchello-empty-state
              icon="icon-add"
              headline="No custom fields"
              message="Add custom attributes for additional Google feed fields.">
            </merchello-empty-state>
          ` : o`
            ${this._feed.customFields.map((e, t) => {
      const i = this._validationErrors[`customField-${t}`], r = this._validationErrors[`customFieldResolver-${t}`], s = this._customFieldArgsErrors[t], a = this._customFieldArgsText[t] ?? "{}", l = e.sourceType === "resolver", p = l && !!e.resolverAlias?.trim(), c = l && this._resolverSupportsArgs(e.resolverAlias), y = this._getResolverHelpText(e.resolverAlias), b = this._getResolverArgsHelpText(e.resolverAlias), v = this._getResolverArgsExample(e.resolverAlias);
      return o`
                <uui-box headline=${e.attribute ? e.attribute : `Custom Field ${t + 1}`}>
                  <div class="promotion-actions">
                    <uui-button look="secondary" color="danger" compact @click=${() => this._removeCustomField(t)}>
                      Remove
                    </uui-button>
                  </div>

                  ${i ? o`<p class="error-message">${i}</p>` : u}
                  ${r ? o`<p class="error-message">${r}</p>` : u}

                  <div class="grid two-col-grid">
                    <umb-property-layout label="Attribute" ?mandatory=${!0}>
                      <uui-input
                        slot="editor"
                        .value=${e.attribute}
                        @input=${(_) => this._updateCustomField(t, (w) => ({
        ...w,
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
                        @change=${(_) => this._updateCustomField(t, (w) => ({
        ...w,
        sourceType: _.target.value || "static"
      }))}>
                      </uui-select>
                    </umb-property-layout>

                    ${l ? o`
                          <umb-property-layout label="Resolver" ?mandatory=${!0}>
                            <uui-select
                              slot="editor"
                              label="Resolver"
                              .options=${this._renderResolverOptions(e.resolverAlias)}
                              @change=${(_) => this._updateCustomField(t, (w) => ({
        ...w,
        resolverAlias: _.target.value || null
      }))}>
                            </uui-select>
                          </umb-property-layout>
                        ` : o`
                          <umb-property-layout label="Static Value">
                            <uui-input
                              slot="editor"
                              .value=${e.staticValue ?? ""}
                              @input=${(_) => this._updateCustomField(t, (w) => ({
        ...w,
        staticValue: _.target.value || null
      }))}>
                            </uui-input>
                          </umb-property-layout>
                        `}

                    <div class="resolver-panel">
                      ${l ? o`
                            ${p ? o`<p class="hint resolver-help">${y}</p>` : o`<p class="hint">Select a resolver to view details.</p>`}
                            ${p && c ? o`<p class="hint">This resolver supports parameters. Configure them below.</p>` : u}

                            ${p && !c ? o`<p class="hint resolver-no-args">This resolver does not take parameters.</p>` : u}
                          ` : o`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
                    </div>

                    ${p && c ? o`
                          <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                            <uui-textarea
                              slot="editor"
                              label="Custom field resolver parameters"
                              .value=${a}
                              ?invalid=${!!s}
                              @input=${(_) => this._handleCustomFieldArgsInput(t, _.target.value)}>
                            </uui-textarea>
                            ${s ? o`<p class="error-message">${s}</p>` : o`
                                  <p class="hint">${b}</p>
                                  <p class="hint">Example: <code>${v}</code></p>
                                `}
                          </umb-property-layout>
                        ` : u}
                  </div>
                </uui-box>
              `;
    })}
          `}
    ` : u;
  }
  _renderPreviewTab() {
    return this._feed ? this._isNew || !this._feed.id ? o`
        <uui-box headline="Preview">
          <p class="hint">Save this feed first, then preview diagnostics and sample output.</p>
        </uui-box>
      ` : o`
      <uui-box headline="Preview & Diagnostics">
        <div class="promotion-actions">
          <uui-button look="secondary" ?disabled=${this._isPreviewLoading} @click=${this._handlePreview}>
            ${this._isPreviewLoading ? "Loading preview..." : "Refresh Preview"}
          </uui-button>
          <uui-button look="secondary" ?disabled=${this._isRebuilding} @click=${this._handleRebuild}>
            ${this._isRebuilding ? "Rebuilding..." : "Rebuild Now"}
          </uui-button>
        </div>

        ${this._preview ? o`
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

              ${this._preview.error ? o`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._preview.error}</span>
                    </div>
                  ` : u}

              ${this._preview.warnings.length > 0 ? o`
                    <h4>Warnings</h4>
                    <ul class="bullet-list">
                      ${this._preview.warnings.map((e) => o`<li>${e}</li>`)}
                    </ul>
                  ` : o`<p class="hint">No warnings in the current preview.</p>`}

              ${this._preview.sampleProductIds.length > 0 ? o`
                    <h4>Sample Product IDs</h4>
                    <ul class="bullet-list mono">
                      ${this._preview.sampleProductIds.map((e) => o`<li>${e}</li>`)}
                    </ul>
                  ` : u}
            ` : o`<p class="hint">Run preview to inspect generated output and warnings.</p>`}
      </uui-box>

      ${this._lastRebuild ? o`
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
                  <span>${N(this._lastRebuild.generatedAtUtc)}</span>
                </div>
                <div>
                  <strong>Warnings:</strong>
                  <span>${this._lastRebuild.warningCount}</span>
                </div>
              </div>

              ${this._lastRebuild.error ? o`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._lastRebuild.error}</span>
                    </div>
                  ` : u}

              ${this._lastRebuild.warnings.length > 0 ? o`
                    <ul class="bullet-list">
                      ${this._lastRebuild.warnings.map((e) => o`<li>${e}</li>`)}
                    </ul>
                  ` : u}
            </uui-box>
          ` : u}
    ` : u;
  }
  _renderActiveTab() {
    const e = this._getActiveTab();
    return e === "selection" ? this._renderSelectionTab() : e === "promotions" ? this._renderPromotionsTab() : e === "custom-labels" ? this._renderCustomLabelsTab() : e === "custom-fields" ? this._renderCustomFieldsTab() : e === "preview" ? this._renderPreviewTab() : this._renderGeneralTab();
  }
  _renderTabs() {
    const e = this._getActiveTab();
    return o`
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
    return this._isLoading ? o`
        <umb-body-layout>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      ` : this._loadError ? o`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-alert"
            headline="Unable to load product feed"
            message=${this._loadError}>
            <uui-button slot="action" look="primary" href=${L()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      ` : this._feed ? o`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${L()} label="Back" class="back-button">
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
          ${this._isNew ? u : o`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `}

          ${this._isNew ? u : o`
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
    ` : o`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-rss"
            headline="Feed not found"
            message="The requested feed could not be loaded.">
            <uui-button slot="action" look="primary" href=${L()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      `;
  }
};
C = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
E = /* @__PURE__ */ new WeakMap();
F = /* @__PURE__ */ new WeakMap();
d.styles = H`
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

    .query-builder {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .query-builder-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
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

      .query-groups {
        grid-template-columns: 1fr;
      }

      .two-col-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
m([
  g()
], d.prototype, "_feed", 2);
m([
  g()
], d.prototype, "_isNew", 2);
m([
  g()
], d.prototype, "_isLoading", 2);
m([
  g()
], d.prototype, "_isSaving", 2);
m([
  g()
], d.prototype, "_isRebuilding", 2);
m([
  g()
], d.prototype, "_isPreviewLoading", 2);
m([
  g()
], d.prototype, "_loadError", 2);
m([
  g()
], d.prototype, "_validationErrors", 2);
m([
  g()
], d.prototype, "_productTypes", 2);
m([
  g()
], d.prototype, "_collections", 2);
m([
  g()
], d.prototype, "_filterGroups", 2);
m([
  g()
], d.prototype, "_resolvers", 2);
m([
  g()
], d.prototype, "_countries", 2);
m([
  g()
], d.prototype, "_preview", 2);
m([
  g()
], d.prototype, "_lastRebuild", 2);
m([
  g()
], d.prototype, "_routes", 2);
m([
  g()
], d.prototype, "_routerPath", 2);
m([
  g()
], d.prototype, "_activePath", 2);
m([
  g()
], d.prototype, "_customLabelArgsText", 2);
m([
  g()
], d.prototype, "_customLabelArgsErrors", 2);
m([
  g()
], d.prototype, "_customFieldArgsText", 2);
m([
  g()
], d.prototype, "_customFieldArgsErrors", 2);
m([
  g()
], d.prototype, "_isSlugManuallyEdited", 2);
d = m([
  j("merchello-product-feed-detail")
], d);
const ce = d;
export {
  d as MerchelloProductFeedDetailElement,
  ce as default
};
//# sourceMappingURL=product-feed-detail.element-BBoyvYSr.js.map
