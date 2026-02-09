import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as a } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as p } from "@umbraco-cms/backoffice/observable-api";
import { n as e } from "./bundle.manifests-_x6cFs6i.js";
import { M as c } from "./merchello-api-BB625Gjj.js";
const u = "Merchello.Webhooks.Workspace";
class w extends r {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = u, this.#i = new a(this), this.#o = new p(void 0), this.subscription = this.#o.asObservable(), this.#i.setEntityType(e), this.#i.setUnique("webhooks"), this.routes = new h(t), this.routes.setRoutes([
      // Webhook detail route (view deliveries)
      {
        path: "edit/webhooks/:id",
        component: () => import("./webhook-detail.element-aEflF29x.js"),
        setup: (i, o) => {
          const s = o.match.params.id;
          this.loadSubscription(s);
        }
      },
      // Webhooks list route
      {
        path: "edit/webhooks",
        component: () => import("./webhooks-workspace-editor.element-C2FDB_Ep.js"),
        setup: () => {
          this.#t = void 0, this.#o.setValue(void 0);
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/webhooks"
      }
    ]);
  }
  #i;
  // Webhook subscription state
  #t;
  #o;
  getEntityType() {
    return e;
  }
  getUnique() {
    return this.#t ?? "webhooks";
  }
  // Subscription loading and management
  async loadSubscription(t) {
    this.#t = t;
    const { data: i, error: o } = await c.getWebhookSubscription(t);
    o || this.#o.setValue(i);
  }
  async reloadSubscription() {
    this.#t && await this.loadSubscription(this.#t);
  }
  updateSubscription(t) {
    this.#o.setValue(t), t.id && (this.#t = t.id);
  }
  clearSubscription() {
    this.#t = void 0, this.#o.setValue(void 0);
  }
}
export {
  u as MERCHELLO_WEBHOOKS_WORKSPACE_ALIAS,
  w as MerchelloWebhooksWorkspaceContext,
  w as api
};
//# sourceMappingURL=webhooks-workspace.context-B8CukANf.js.map
