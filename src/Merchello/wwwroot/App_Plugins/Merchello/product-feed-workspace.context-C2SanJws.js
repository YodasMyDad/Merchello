import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as l } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as d, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as i, UmbBooleanState as u } from "@umbraco-cms/backoffice/observable-api";
import { g as o } from "./bundle.manifests-DJ1-mVhE.js";
import { M as h } from "./merchello-api-DVoMavUk.js";
const c = "Merchello.ProductFeed.Workspace";
class g extends r {
  constructor(e) {
    super(e, d.toString()), this.workspaceAlias = c, this.#a = new l(this), this.#t = !1, this.#s = new i(void 0), this.feed = this.#s.asObservable(), this.#i = new u(!1), this.isLoading = this.#i.asObservable(), this.#o = new i(null), this.loadError = this.#o.asObservable(), this.#a.setEntityType(o), this.#a.setUnique("product-feed"), this.routes = new n(e), this.routes.setRoutes([
      {
        path: "edit/product-feeds/create",
        component: () => import("./product-feed-detail.element-BsRg4HRJ.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#o.setValue(null), this.#s.setValue({
            id: "",
            name: "",
            slug: "",
            isEnabled: !0,
            countryCode: "US",
            currencyCode: "USD",
            languageCode: "en",
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
        component: () => import("./product-feed-detail.element-BsRg4HRJ.js"),
        setup: (s, t) => {
          const a = t.match.params.id;
          this.loadFeed(a);
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
    return o;
  }
  getUnique() {
    return this.#e ?? "product-feed";
  }
  get isNew() {
    return this.#t;
  }
  async loadFeed(e) {
    this.#e = e, this.#t = !1, this.#i.setValue(!0), this.#o.setValue(null);
    const { data: s, error: t } = await h.getProductFeed(e);
    if (t || !s) {
      this.#o.setValue(t?.message ?? "Feed not found."), this.#i.setValue(!1);
      return;
    }
    this.#s.setValue(s), this.#i.setValue(!1);
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
}
export {
  c as MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS,
  g as MerchelloProductFeedWorkspaceContext,
  g as api
};
//# sourceMappingURL=product-feed-workspace.context-C2SanJws.js.map
