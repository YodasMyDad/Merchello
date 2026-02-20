import { html as u, css as m, state as p, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as w } from "@umbraco-cms/backoffice/lit-element";
var E = Object.defineProperty, k = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, v = (e, t, a, n) => {
  for (var s = n > 1 ? void 0 : n ? k(t, a) : t, o = e.length - 1, c; o >= 0; o--)
    (c = e[o]) && (s = (n ? c(t, a, s) : c(s)) || s);
  return n && s && E(t, a, s), s;
}, g = (e, t, a) => t.has(e) || _("Cannot " + a), d = (e, t, a) => (g(e, t, "read from private field"), t.get(e)), h = (e, t, a) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), C = (e, t, a) => (g(e, t, "access private method"), a), r, l, S;
let i = class extends w {
  constructor() {
    super(...arguments), h(this, l), this._isSaving = !1, this._canSave = !1, h(this, r, (e) => {
      this._isSaving = e.detail.isSaving, this._canSave = e.detail.canSave;
    });
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("merchello:settings-save-state", d(this, r));
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("merchello:settings-save-state", d(this, r));
  }
  render() {
    return u`
      <umb-workspace-editor headline="Merchello">
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Save settings"
          ?disabled=${this._isSaving || !this._canSave}
          @click=${C(this, l, S)}>
          ${this._isSaving ? "Saving..." : "Save settings"}
        </uui-button>
      </umb-workspace-editor>
    `;
  }
};
r = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakSet();
S = function() {
  window.dispatchEvent(new CustomEvent("merchello:trigger-settings-save"));
};
i.styles = [
  m`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
v([
  p()
], i.prototype, "_isSaving", 2);
v([
  p()
], i.prototype, "_canSave", 2);
i = v([
  f("merchello-settings-workspace-editor")
], i);
const M = i;
export {
  i as MerchelloSettingsWorkspaceEditorElement,
  M as default
};
//# sourceMappingURL=settings-workspace-editor.element-YWMLl3cw.js.map
