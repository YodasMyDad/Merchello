import { UmbContextBase as l } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as h, UmbBooleanState as i } from "@umbraco-cms/backoffice/observable-api";
import { r as a } from "./bundle.manifests-DG6vVQ_s.js";
import { U as u, C as d, a as m, b as c } from "./upsell.types-ChZp0X_-.js";
import { M as U } from "./merchello-api-Dp_zU_yi.js";
const f = "Merchello.Upsells.Workspace";
class w extends l {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = f, this.#a = new r(this), this.#e = !1, this.#s = new h(void 0), this.upsell = this.#s.asObservable(), this.#i = new i(!1), this.isLoading = this.#i.asObservable(), this.#o = new i(!1), this.isSaving = this.#o.asObservable(), this.#a.setEntityType(a), this.#a.setUnique("upsells"), this.routes = new n(t), this.routes.setRoutes([
      {
        path: "edit/upsells/create",
        component: () => import("./upsell-detail.element-sHBL58o0.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0, this.#s.setValue(this._createEmptyUpsell());
        }
      },
      {
        path: "edit/upsells/:id",
        component: () => import("./upsell-detail.element-sHBL58o0.js"),
        setup: (s, e) => {
          this.#e = !1;
          const o = e.match.params.id;
          this.load(o);
        }
      },
      {
        path: "edit/upsells",
        component: () => import("./upsells-workspace-editor.element-Cz8rJ66R.js"),
        setup: () => {
          this.#t = void 0, this.#s.setValue(void 0), this.#e = !1;
        }
      },
      {
        path: "",
        redirectTo: "edit/upsells"
      }
    ]);
  }
  #a;
  #t;
  #e;
  #s;
  #i;
  #o;
  getEntityType() {
    return a;
  }
  getUnique() {
    return this.#t ?? "upsells";
  }
  get isNew() {
    return this.#e;
  }
  async load(t) {
    this.#t = t, this.#i.setValue(!0);
    const { data: s, error: e } = await U.getUpsell(t);
    if (e) {
      this.#i.setValue(!1);
      return;
    }
    this.#s.setValue(s), this.#i.setValue(!1);
  }
  async reload() {
    this.#t && await this.load(this.#t);
  }
  updateUpsell(t) {
    this.#s.setValue(t), t.id && this.#e && (this.#t = t.id, this.#e = !1);
  }
  getUpsell() {
    return this.#s.getValue();
  }
  setIsSaving(t) {
    this.#o.setValue(t);
  }
  _createEmptyUpsell() {
    const t = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: "",
      name: "",
      description: void 0,
      heading: "",
      message: void 0,
      status: c.Draft,
      statusLabel: "Draft",
      statusColor: "default",
      displayLocation: m.Checkout,
      checkoutMode: d.Inline,
      sortBy: u.BestSeller,
      maxProducts: 4,
      suppressIfInCart: !0,
      priority: 1e3,
      startsAt: t,
      endsAt: void 0,
      timezone: void 0,
      dateCreated: t,
      dateUpdated: t,
      triggerRules: [],
      recommendationRules: [],
      eligibilityRules: []
    };
  }
}
export {
  f as MERCHELLO_UPSELLS_WORKSPACE_ALIAS,
  w as MerchelloUpsellsWorkspaceContext,
  w as api
};
//# sourceMappingURL=upsells-workspace.context-AmKDtzxQ.js.map
