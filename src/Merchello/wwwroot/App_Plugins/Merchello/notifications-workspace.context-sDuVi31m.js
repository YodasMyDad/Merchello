import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as l } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as i, UmbBooleanState as h, UmbStringState as c } from "@umbraco-cms/backoffice/observable-api";
import { o as a } from "./bundle.manifests-CML9JKrj.js";
import { M as u } from "./merchello-api-Dp_zU_yi.js";
const m = "Merchello.Notifications.Workspace";
class g extends o {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = m, this.#i = new r(this), this.#e = new i(void 0), this.data = this.#e.asObservable(), this.#t = new h(!1), this.loading = this.#t.asObservable(), this.#s = new i(null), this.loadError = this.#s.asObservable(), this.#a = new c(""), this.searchTerm = this.#a.asObservable(), this.#i.setEntityType(a), this.#i.setUnique("notifications"), this.routes = new l(t), this.routes.setRoutes([
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
  #e;
  #t;
  #s;
  #a;
  getEntityType() {
    return a;
  }
  getUnique() {
    return "notifications";
  }
  async loadData(t = !1) {
    if (this.#t.getValue() || !t && this.#e.getValue())
      return;
    this.#t.setValue(!0), this.#s.setValue(null);
    const { data: e, error: s } = await u.getNotifications();
    if (s || !e) {
      this.#s.setValue(s?.message ?? "Failed to load notifications."), this.#t.setValue(!1);
      return;
    }
    this.#e.setValue(e), this.#t.setValue(!1);
  }
  setSearchTerm(t) {
    this.#a.setValue(t);
  }
}
export {
  m as MERCHELLO_NOTIFICATIONS_WORKSPACE_ALIAS,
  g as MerchelloNotificationsWorkspaceContext,
  g as api
};
//# sourceMappingURL=notifications-workspace.context-sDuVi31m.js.map
