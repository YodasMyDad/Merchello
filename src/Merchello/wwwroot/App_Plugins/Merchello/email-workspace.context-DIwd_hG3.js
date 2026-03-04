import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as i } from "@umbraco-cms/backoffice/observable-api";
import { l as a } from "./bundle.manifests-BsncRfoU.js";
import { M as m } from "./merchello-api-BtThjGiA.js";
const u = "Merchello.Emails.Workspace";
class g extends o {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = u, this.#l = new r(this), this.#s = !1, this.#i = new i(void 0), this.email = this.#i.asObservable(), this.#t = new i(!1), this.isLoading = this.#t.asObservable(), this.#a = new i(null), this.loadError = this.#a.asObservable(), this.#l.setEntityType(a), this.#l.setUnique("emails"), this.routes = new h(t), this.routes.setRoutes([
      // Create email route
      {
        path: "edit/emails/create",
        component: () => import("./email-editor.element-Cc2jfgGT.js"),
        setup: () => {
          this.#s = !0, this.#e = void 0, this.#t.setValue(!1), this.#a.setValue(null), this.#i.setValue(this._createEmptyEmail());
        }
      },
      // Email detail/edit route
      {
        path: "edit/emails/:id",
        component: () => import("./email-editor.element-Cc2jfgGT.js"),
        setup: (s, e) => {
          this.#s = !1;
          const l = e.match.params.id;
          this.loadEmail(l);
        }
      },
      // Emails list route
      {
        path: "edit/emails",
        component: () => import("./email-workspace-editor.element-hvGPvXzW.js"),
        setup: () => {
          this.#e = void 0, this.#i.setValue(void 0), this.#s = !1, this.#t.setValue(!1), this.#a.setValue(null);
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/emails"
      }
    ]);
  }
  #l;
  // Email configuration state
  #e;
  #s;
  #i;
  #t;
  #a;
  getEntityType() {
    return a;
  }
  getUnique() {
    return this.#e ?? "emails";
  }
  get isNew() {
    return this.#s;
  }
  // Email loading and management
  async loadEmail(t) {
    this.#e = t, this.#t.setValue(!0), this.#a.setValue(null), this.#i.setValue(void 0);
    const { data: s, error: e } = await m.getEmailConfiguration(t);
    if (e || !s) {
      this.#a.setValue(e?.message ?? "Email configuration not found."), this.#t.setValue(!1);
      return;
    }
    this.#i.setValue(s), this.#t.setValue(!1);
  }
  async reloadEmail() {
    this.#e && await this.loadEmail(this.#e);
  }
  updateEmail(t) {
    this.#i.setValue(t), this.#t.setValue(!1), this.#a.setValue(null), t.id && this.#s && (this.#e = t.id, this.#s = !1);
  }
  _createEmptyEmail() {
    return {
      id: "",
      name: "",
      topic: "",
      topicDisplayName: null,
      topicCategory: null,
      enabled: !0,
      templatePath: "",
      toExpression: "",
      subjectExpression: "",
      ccExpression: null,
      bccExpression: null,
      fromExpression: null,
      description: null,
      attachmentAliases: [],
      dateCreated: (/* @__PURE__ */ new Date()).toISOString(),
      dateModified: (/* @__PURE__ */ new Date()).toISOString(),
      totalSent: 0,
      totalFailed: 0,
      lastSentUtc: null
    };
  }
}
export {
  u as MERCHELLO_EMAILS_WORKSPACE_ALIAS,
  g as MerchelloEmailsWorkspaceContext,
  g as api
};
//# sourceMappingURL=email-workspace.context-DIwd_hG3.js.map
