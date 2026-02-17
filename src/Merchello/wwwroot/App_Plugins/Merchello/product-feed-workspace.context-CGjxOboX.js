import { UmbContextBase as c } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as n } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as l, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a, UmbBooleanState as u } from "@umbraco-cms/backoffice/observable-api";
import { g as d } from "./bundle.manifests-nVhn7kdE.js";
import { M as p } from "./merchello-api-B3w7Bp8a.js";
const f = "Merchello.ProductFeed.Workspace";
class P extends c {
  constructor(t) {
    super(t, l.toString()), this.workspaceAlias = f, this.#a = new n(this), this.#s = !1, this.#t = new a(void 0), this.feed = this.#t.asObservable(), this.#i = new u(!1), this.isLoading = this.#i.asObservable(), this.#o = new a(null), this.loadError = this.#o.asObservable(), this.#r(), this.#a.setEntityType(d), this.#a.setUnique("product-feeds"), this.routes = new h(t), this.routes.setRoutes([
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
        component: () => import("./product-feed-detail.element-erpM2v5k.js"),
        setup: (i, s) => {
          const e = s.match.params.id;
          this.#d("/edit/product-feed/", "/edit/product-feeds/"), this.loadFeed(e);
        }
      },
      {
        path: "edit/product-feeds/create",
        component: () => import("./product-feed-detail.element-erpM2v5k.js"),
        setup: () => {
          this.#s = !0, this.#e = void 0, this.#o.setValue(null), this.#t.setValue({
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
        component: () => import("./product-feed-detail.element-erpM2v5k.js"),
        setup: (i, s) => {
          const e = s.match.params.id;
          this.loadFeed(e);
        }
      },
      {
        path: "edit/product-feeds",
        component: () => import("./product-feed-workspace-editor.element-DvSzk632.js"),
        setup: () => {
          this.#e = void 0, this.#s = !1, this.#t.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
        }
      },
      {
        path: "",
        redirectTo: "edit/product-feeds"
      }
    ]);
  }
  #a;
  #e;
  #s;
  #t;
  #i;
  #o;
  getEntityType() {
    return d;
  }
  getUnique() {
    return this.#e ?? "product-feeds";
  }
  get isNew() {
    return this.#s;
  }
  async loadFeed(t) {
    this.#e = t, this.#s = !1, this.#i.setValue(!0), this.#o.setValue(null);
    const { data: i, error: s } = await p.getProductFeed(t);
    if (s || !i) {
      this.#o.setValue(s?.message ?? "Feed not found."), this.#i.setValue(!1);
      return;
    }
    const e = this.#t.getValue(), o = i.accessToken ?? (e?.id === i.id ? e.accessToken : null);
    this.#t.setValue({
      ...i,
      accessToken: o
    }), this.#i.setValue(!1);
  }
  async reloadFeed() {
    this.#e && await this.loadFeed(this.#e);
  }
  updateFeed(t) {
    this.#t.setValue(t), t.id && (this.#e = t.id, this.#s = !1);
  }
  clearFeed() {
    this.#e = void 0, this.#s = !1, this.#t.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
  }
  #d(t, i) {
    const { pathname: s, search: e, hash: o } = window.location;
    if (!s.includes(t))
      return;
    const r = s.replace(t, i);
    history.replaceState(history.state, "", `${r}${e}${o}`);
  }
  #r() {
    const { pathname: t, search: i, hash: s } = window.location;
    let e = t;
    e.includes("/edit/product-feed/") ? e = e.replace("/edit/product-feed/", "/edit/product-feeds/") : e.endsWith("/edit/product-feed") && (e = e.replace("/edit/product-feed", "/edit/product-feeds")), e !== t && history.replaceState(history.state, "", `${e}${i}${s}`);
  }
}
export {
  f as MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS,
  P as MerchelloProductFeedWorkspaceContext,
  P as api
};
//# sourceMappingURL=product-feed-workspace.context-CGjxOboX.js.map
