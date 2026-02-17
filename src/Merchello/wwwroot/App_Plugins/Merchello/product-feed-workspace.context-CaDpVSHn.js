import { UmbContextBase as c } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as l } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as u, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a, UmbBooleanState as p } from "@umbraco-cms/backoffice/observable-api";
import { g as n } from "./bundle.manifests-kJtMcY8M.js";
import { M as f } from "./merchello-api-B3w7Bp8a.js";
const m = "Merchello.ProductFeed.Workspace", d = "merchello:product-feed:tokens";
class V extends c {
  constructor(e) {
    super(e, u.toString()), this.workspaceAlias = m, this.#r = new l(this), this.#s = !1, this.#e = new a(void 0), this.feed = this.#e.asObservable(), this.#i = new p(!1), this.isLoading = this.#i.asObservable(), this.#o = new a(null), this.loadError = this.#o.asObservable(), this.#l(), this.#r.setEntityType(n), this.#r.setUnique("product-feeds"), this.routes = new h(e), this.routes.setRoutes([
      {
        path: "edit/product-feed",
        redirectTo: "edit/product-feeds"
      },
      {
        path: "edit/product-feed/create",
        redirectTo: "edit/product-feeds/create"
      },
      {
        path: "edit/product-feed/:id",
        component: () => import("./product-feed-detail.element-Bv0OwmGI.js"),
        setup: (t, s) => {
          const i = s.match.params.id;
          this.#c("/edit/product-feed/", "/edit/product-feeds/"), this.loadFeed(i);
        }
      },
      {
        path: "edit/product-feeds/create",
        component: () => import("./product-feed-detail.element-Bv0OwmGI.js"),
        setup: () => {
          this.#s = !0, this.#t = void 0, this.#o.setValue(null), this.#e.setValue({
            id: "",
            name: "",
            slug: "",
            isEnabled: !0,
            countryCode: "US",
            currencyCode: "USD",
            languageCode: "en",
            includeTaxInPrice: !1,
            filterConfig: {
              productTypeIds: [],
              collectionIds: [],
              filterValueGroups: []
            },
            customLabels: [],
            customFields: [],
            manualPromotions: [],
            lastGeneratedUtc: null,
            lastGenerationError: null,
            hasProductSnapshot: !1,
            hasPromotionsSnapshot: !1,
            accessToken: null
          });
        }
      },
      {
        path: "edit/product-feeds/:id",
        component: () => import("./product-feed-detail.element-Bv0OwmGI.js"),
        setup: (t, s) => {
          const i = s.match.params.id;
          this.loadFeed(i);
        }
      },
      {
        path: "edit/product-feeds",
        component: () => import("./product-feed-workspace-editor.element-DvSzk632.js"),
        setup: () => {
          this.#t = void 0, this.#s = !1, this.#e.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
        }
      },
      {
        path: "",
        redirectTo: "edit/product-feeds"
      }
    ]);
  }
  #r;
  #t;
  #s;
  #e;
  #i;
  #o;
  getEntityType() {
    return n;
  }
  getUnique() {
    return this.#t ?? "product-feeds";
  }
  get isNew() {
    return this.#s;
  }
  async loadFeed(e) {
    this.#t = e, this.#s = !1, this.#i.setValue(!0), this.#o.setValue(null);
    const { data: t, error: s } = await f.getProductFeed(e);
    if (s || !t) {
      this.#o.setValue(s?.message ?? "Feed not found."), this.#i.setValue(!1);
      return;
    }
    const i = this.#e.getValue(), o = this.#n(t.id), r = t.accessToken ?? (i?.id === t.id ? i.accessToken : null) ?? o;
    this.#a(t.id, r), this.#e.setValue({
      ...t,
      accessToken: r
    }), this.#i.setValue(!1);
  }
  async reloadFeed() {
    this.#t && await this.loadFeed(this.#t);
  }
  updateFeed(e) {
    const t = this.#e.getValue(), s = e.id ? this.#n(e.id) : null, i = e.accessToken ?? (t?.id === e.id ? t.accessToken : null) ?? s;
    this.#a(e.id, i), this.#e.setValue({
      ...e,
      accessToken: i
    }), e.id && (this.#t = e.id, this.#s = !1);
  }
  clearFeed() {
    this.#t = void 0, this.#s = !1, this.#e.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
  }
  #c(e, t) {
    const { pathname: s, search: i, hash: o } = window.location;
    if (!s.includes(e))
      return;
    const r = s.replace(e, t);
    history.replaceState(history.state, "", `${r}${i}${o}`);
  }
  #l() {
    const { pathname: e, search: t, hash: s } = window.location;
    let i = e;
    i.includes("/edit/product-feed/") ? i = i.replace("/edit/product-feed/", "/edit/product-feeds/") : i.endsWith("/edit/product-feed") && (i = i.replace("/edit/product-feed", "/edit/product-feeds")), i !== e && history.replaceState(history.state, "", `${i}${t}${s}`);
  }
  #a(e, t) {
    if (!(!e || !t))
      try {
        const s = this.#d();
        s[e] = t, window.sessionStorage.setItem(d, JSON.stringify(s));
      } catch {
      }
  }
  #n(e) {
    if (!e)
      return null;
    try {
      const s = this.#d()[e];
      return s?.trim() ? s : null;
    } catch {
      return null;
    }
  }
  #d() {
    const e = window.sessionStorage.getItem(d);
    if (!e)
      return {};
    const t = JSON.parse(e);
    if (!t || typeof t != "object" || Array.isArray(t))
      return {};
    const s = {};
    for (const [i, o] of Object.entries(t))
      typeof o != "string" || !o.trim() || (s[i] = o);
    return s;
  }
}
export {
  m as MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS,
  V as MerchelloProductFeedWorkspaceContext,
  V as api
};
//# sourceMappingURL=product-feed-workspace.context-CaDpVSHn.js.map
