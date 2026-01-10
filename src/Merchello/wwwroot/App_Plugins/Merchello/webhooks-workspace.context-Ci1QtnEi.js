import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as a } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as p } from "@umbraco-cms/backoffice/observable-api";
import { n as i } from "./bundle.manifests-7dhTMFQN.js";
import { M as c } from "./merchello-api-D-qg1PlO.js";
const b = "Merchello.Webhooks.Workspace";
class w extends r {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = b, this.#e = new a(this), this.#o = new p(void 0), this.subscription = this.#o.asObservable(), this.#e.setEntityType(i), this.#e.setUnique("webhooks"), this.routes = new h(t), this.routes.setRoutes([
      // Webhook detail route (view deliveries)
      {
        path: "edit/webhooks/:id",
        component: () => import("./webhook-detail.element-Cvjz_NXS.js"),
        setup: (e, o) => {
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
  #e;
  // Webhook subscription state
  #t;
  #o;
  getEntityType() {
    return i;
  }
  getUnique() {
    return this.#t ?? "webhooks";
  }
  // Subscription loading and management
  async loadSubscription(t) {
    this.#t = t;
    const { data: e, error: o } = await c.getWebhookSubscription(t);
    if (o) {
      console.error("Failed to load webhook subscription:", o);
      return;
    }
    this.#o.setValue(e);
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
  b as MERCHELLO_WEBHOOKS_WORKSPACE_ALIAS,
  w as MerchelloWebhooksWorkspaceContext,
  w as api
};
//# sourceMappingURL=webhooks-workspace.context-Ci1QtnEi.js.map
