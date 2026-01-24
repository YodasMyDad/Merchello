import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as l, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as m } from "@umbraco-cms/backoffice/observable-api";
import { l as s } from "./bundle.manifests-BKIC9Rfi.js";
import { M as p } from "./merchello-api-658q9849.js";
const h = "Merchello.Emails.Workspace";
class C extends o {
  constructor(t) {
    super(t, l.toString()), this.workspaceAlias = h, this.#s = new r(this), this.#e = !1, this.#i = new m(void 0), this.email = this.#i.asObservable(), this.#s.setEntityType(s), this.#s.setUnique("emails"), this.routes = new n(t), this.routes.setRoutes([
      // Create email route
      {
        path: "edit/emails/create",
        component: () => import("./email-editor.element-DgWE2jsu.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0, this.#i.setValue(this._createEmptyEmail());
        }
      },
      // Email detail/edit route
      {
        path: "edit/emails/:id",
        component: () => import("./email-editor.element-DgWE2jsu.js"),
        setup: (i, e) => {
          this.#e = !1;
          const a = e.match.params.id;
          this.loadEmail(a);
        }
      },
      // Emails list route
      {
        path: "edit/emails",
        component: () => import("./email-workspace-editor.element-hvGPvXzW.js"),
        setup: () => {
          this.#t = void 0, this.#i.setValue(void 0), this.#e = !1;
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/emails"
      }
    ]);
  }
  #s;
  // Email configuration state
  #t;
  #e;
  #i;
  getEntityType() {
    return s;
  }
  getUnique() {
    return this.#t ?? "emails";
  }
  get isNew() {
    return this.#e;
  }
  // Email loading and management
  async loadEmail(t) {
    this.#t = t;
    const { data: i, error: e } = await p.getEmailConfiguration(t);
    e || this.#i.setValue(i);
  }
  async reloadEmail() {
    this.#t && await this.loadEmail(this.#t);
  }
  updateEmail(t) {
    this.#i.setValue(t), t.id && this.#e && (this.#t = t.id, this.#e = !1);
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
  h as MERCHELLO_EMAILS_WORKSPACE_ALIAS,
  C as MerchelloEmailsWorkspaceContext,
  C as api
};
//# sourceMappingURL=email-workspace.context-Bp7tkh1S.js.map
