import { UmbContextBase as l } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as n } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as c, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as o, UmbBooleanState as u } from "@umbraco-cms/backoffice/observable-api";
import { g as a } from "./bundle.manifests-Bxfe49u1.js";
import { M as p } from "./merchello-api-Dp_zU_yi.js";
const f = "Merchello.ProductFeed.Workspace";
class g extends l {
  constructor(e) {
    super(e, c.toString()), this.workspaceAlias = f, this.#a = new n(this), this.#t = !1, this.#s = new o(void 0), this.feed = this.#s.asObservable(), this.#i = new u(!1), this.isLoading = this.#i.asObservable(), this.#o = new o(null), this.loadError = this.#o.asObservable(), this.#d(), this.#a.setEntityType(a), this.#a.setUnique("product-feeds"), this.routes = new h(e), this.routes.setRoutes([
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
        component: () => import("./product-feed-detail.element-DdszImac.js"),
        setup: (i, s) => {
          const t = s.match.params.id;
          this.#r("/edit/product-feed/", "/edit/product-feeds/"), this.loadFeed(t);
        }
      },
      {
        path: "edit/product-feeds/create",
        component: () => import("./product-feed-detail.element-DdszImac.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#o.setValue(null), this.#s.setValue({
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
            hasPromotionsSnapshot: !1
          });
        }
      },
      {
        path: "edit/product-feeds/:id",
        component: () => import("./product-feed-detail.element-DdszImac.js"),
        setup: (i, s) => {
          const t = s.match.params.id;
          this.loadFeed(t);
        }
      },
      {
        path: "edit/product-feeds",
        component: () => import("./product-feed-workspace-editor.element-DvSzk632.js"),
        setup: () => {
          this.#e = void 0, this.#t = !1, this.#s.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
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
  #t;
  #s;
  #i;
  #o;
  getEntityType() {
    return a;
  }
  getUnique() {
    return this.#e ?? "product-feeds";
  }
  get isNew() {
    return this.#t;
  }
  async loadFeed(e) {
    this.#e = e, this.#t = !1, this.#i.setValue(!0), this.#o.setValue(null);
    const { data: i, error: s } = await p.getProductFeed(e);
    if (s || !i) {
      this.#o.setValue(s?.message ?? "Feed not found."), this.#i.setValue(!1);
      return;
    }
    this.#s.setValue(i), this.#i.setValue(!1);
  }
  async reloadFeed() {
    this.#e && await this.loadFeed(this.#e);
  }
  updateFeed(e) {
    this.#s.setValue(e), e.id && (this.#e = e.id, this.#t = !1);
  }
  clearFeed() {
    this.#e = void 0, this.#t = !1, this.#s.setValue(void 0), this.#o.setValue(null), this.#i.setValue(!1);
  }
  #r(e, i) {
    const { pathname: s, search: t, hash: r } = window.location;
    if (!s.includes(e))
      return;
    const d = s.replace(e, i);
    history.replaceState(history.state, "", `${d}${t}${r}`);
  }
  #d() {
    const { pathname: e, search: i, hash: s } = window.location;
    let t = e;
    t.includes("/edit/product-feed/") ? t = t.replace("/edit/product-feed/", "/edit/product-feeds/") : t.endsWith("/edit/product-feed") && (t = t.replace("/edit/product-feed", "/edit/product-feeds")), t !== e && history.replaceState(history.state, "", `${t}${i}${s}`);
  }
}
export {
  f as MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS,
  g as MerchelloProductFeedWorkspaceContext,
  g as api
};
//# sourceMappingURL=product-feed-workspace.context-C-fcISkx.js.map
