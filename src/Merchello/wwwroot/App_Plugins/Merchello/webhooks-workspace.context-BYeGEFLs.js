import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as h } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as l } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as i } from "@umbraco-cms/backoffice/observable-api";
import { n as o } from "./bundle.manifests-BQbjNEqu.js";
import { M as u } from "./merchello-api-Cd16th0c.js";
const p = "Merchello.Webhooks.Workspace";
class S extends r {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = p, this.#o = new h(this), this.#e = new i(void 0), this.subscription = this.#e.asObservable(), this.#t = new i(!1), this.isLoading = this.#t.asObservable(), this.#i = new i(null), this.loadError = this.#i.asObservable(), this.#o.setEntityType(o), this.#o.setUnique("webhooks"), this.routes = new l(t), this.routes.setRoutes([
      // Webhook detail route (view deliveries)
      {
        path: "edit/webhooks/:id",
        component: () => import("./webhook-detail.element-BMmplCCP.js"),
        setup: (e, s) => {
          const a = s.match.params.id;
          this.loadSubscription(a);
        }
      },
      // Webhooks list route
      {
        path: "edit/webhooks",
        component: () => import("./webhooks-workspace-editor.element-C2FDB_Ep.js"),
        setup: () => {
          this.#s = void 0, this.#e.setValue(void 0), this.#t.setValue(!1), this.#i.setValue(null);
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/webhooks"
      }
    ]);
  }
  #o;
  // Webhook subscription state
  #s;
  #e;
  #t;
  #i;
  getEntityType() {
    return o;
  }
  getUnique() {
    return this.#s ?? "webhooks";
  }
  // Subscription loading and management
  async loadSubscription(t) {
    this.#s = t, this.#t.setValue(!0), this.#i.setValue(null), this.#e.setValue(void 0);
    const { data: e, error: s } = await u.getWebhookSubscription(t);
    if (s || !e) {
      this.#i.setValue(s?.message ?? "Webhook subscription not found."), this.#t.setValue(!1);
      return;
    }
    this.#e.setValue(e), this.#t.setValue(!1);
  }
  async reloadSubscription() {
    this.#s && await this.loadSubscription(this.#s);
  }
  updateSubscription(t) {
    this.#e.setValue(t), this.#t.setValue(!1), this.#i.setValue(null), t.id && (this.#s = t.id);
  }
  clearSubscription() {
    this.#s = void 0, this.#e.setValue(void 0), this.#t.setValue(!1), this.#i.setValue(null);
  }
}
export {
  p as MERCHELLO_WEBHOOKS_WORKSPACE_ALIAS,
  S as MerchelloWebhooksWorkspaceContext,
  S as api
};
//# sourceMappingURL=webhooks-workspace.context-BYeGEFLs.js.map
