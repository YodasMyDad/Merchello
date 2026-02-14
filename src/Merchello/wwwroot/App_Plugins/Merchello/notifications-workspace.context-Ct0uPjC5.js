import { UmbContextBase as s } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as a } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as r } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as n, UmbBooleanState as h, UmbStringState as c } from "@umbraco-cms/backoffice/observable-api";
import { o as e } from "./bundle.manifests-DDhrqaxl.js";
import { M as l } from "./merchello-api-DNSJzonx.js";
const m = "Merchello.Notifications.Workspace";
class E extends s {
  constructor(t) {
    super(t, o.toString()), this.workspaceAlias = m, this.#i = new a(this), this.#t = new n(void 0), this.data = this.#t.asObservable(), this.#e = new h(!1), this.loading = this.#e.asObservable(), this.#s = new c(""), this.searchTerm = this.#s.asObservable(), this.#i.setEntityType(e), this.#i.setUnique("notifications"), this.routes = new r(t), this.routes.setRoutes([
      {
        path: "edit/notifications",
        component: () => import("./notifications-workspace-editor.element-CRJrLwrT.js"),
        setup: () => {
          this.loadData();
        }
      },
      {
        path: "",
        redirectTo: "edit/notifications"
      }
    ]);
  }
  #i;
  #t;
  #e;
  #s;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "notifications";
  }
  async loadData() {
    if (this.#t.getValue())
      return;
    this.#e.setValue(!0);
    const { data: t, error: i } = await l.getNotifications();
    !i && t && this.#t.setValue(t), this.#e.setValue(!1);
  }
  setSearchTerm(t) {
    this.#s.setValue(t);
  }
}
export {
  m as MERCHELLO_NOTIFICATIONS_WORKSPACE_ALIAS,
  E as MerchelloNotificationsWorkspaceContext,
  E as api
};
//# sourceMappingURL=notifications-workspace.context-Ct0uPjC5.js.map
