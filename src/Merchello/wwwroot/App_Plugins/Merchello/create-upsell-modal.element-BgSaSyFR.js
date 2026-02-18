import { LitElement as g, html as v, css as b, state as m, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as U } from "@umbraco-cms/backoffice/notification";
import { M as $ } from "./merchello-api-Dp_zU_yi.js";
var x = Object.defineProperty, S = Object.getOwnPropertyDescriptor, c = (e) => {
  throw TypeError(e);
}, u = (e, t, i, s) => {
  for (var a = s > 1 ? void 0 : s ? S(t, i) : t, h = e.length - 1, d; h >= 0; h--)
    (d = e[h]) && (a = (s ? d(t, i, a) : d(a)) || a);
  return s && a && x(t, i, a), a;
}, f = (e, t, i) => t.has(e) || c("Cannot " + i), n = (e, t, i) => (f(e, t, "read from private field"), t.get(e)), p = (e, t, i) => t.has(e) ? c("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), _ = (e, t, i, s) => (f(e, t, "write to private field"), t.set(e, i), i), r, o;
let l = class extends y(g) {
  constructor() {
    super(), this._name = "", this._heading = "", this._isSaving = !1, this._formId = "MerchelloCreateUpsellForm", p(this, r), p(this, o), this.consumeContext(M, (e) => {
      _(this, r, e);
    }), this.consumeContext(U, (e) => {
      _(this, o, e);
    });
  }
  _handleNameInput(e) {
    this._name = e.target.value;
  }
  _handleHeadingInput(e) {
    this._heading = e.target.value;
  }
  _handleClose() {
    n(this, r)?.reject();
  }
  _handleSubmit(e) {
    e.preventDefault();
    const t = e.currentTarget;
    if (!t.checkValidity()) {
      t.reportValidity();
      return;
    }
    this._handleCreate();
  }
  async _handleCreate() {
    if (!this._name.trim()) return;
    this._isSaving = !0;
    const { data: e, error: t } = await $.createUpsell({
      name: this._name.trim(),
      heading: this._heading.trim() || this._name.trim(),
      displayLocation: 1
      // Default to Checkout
    });
    if (this._isSaving = !1, t) {
      n(this, o)?.peek("danger", {
        data: { headline: "Error", message: t.message }
      });
      return;
    }
    e?.id && (n(this, o)?.peek("positive", {
      data: { headline: "Upsell created", message: `"${this._name}" has been created` }
    }), n(this, r)?.setValue({ id: e.id }), n(this, r)?.submit());
  }
  render() {
    return v`
      <umb-body-layout headline="Create Upsell">
        <uui-box>
          <uui-form>
            <form id=${this._formId} @submit=${this._handleSubmit}>
              <uui-form-layout-item>
                <uui-label slot="label" for="upsell-name" required>Name</uui-label>
                <uui-input
                  id="upsell-name"
                  name="upsell-name"
                  .value=${this._name}
                  @input=${this._handleNameInput}
                  placeholder="e.g. Bed to Pillow Upsell"
                  label="Upsell name"
                  required
                ></uui-input>
              </uui-form-layout-item>

              <uui-form-layout-item>
                <uui-label slot="label" for="upsell-heading">Heading</uui-label>
                <uui-input
                  id="upsell-heading"
                  name="upsell-heading"
                  .value=${this._heading}
                  @input=${this._handleHeadingInput}
                  placeholder="e.g. Complete your bedroom"
                  label="Upsell heading"
                ></uui-input>
              </uui-form-layout-item>
            </form>
          </uui-form>
        </uui-box>

        <uui-button
          slot="actions"
          label="Cancel"
          @click=${this._handleClose}
          ?disabled=${this._isSaving}
        >Cancel</uui-button>
        <uui-button
          slot="actions"
          form=${this._formId}
          type="submit"
          look="primary"
          color="positive"
          label="Create"
          ?disabled=${this._isSaving}
        >
          ${this._isSaving ? "Creating..." : "Create"}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
r = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
l.styles = b`
    :host {
      display: block;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
    }
  `;
u([
  m()
], l.prototype, "_name", 2);
u([
  m()
], l.prototype, "_heading", 2);
u([
  m()
], l.prototype, "_isSaving", 2);
l = u([
  C("merchello-create-upsell-modal")
], l);
const N = l;
export {
  l as MerchelloCreateUpsellModalElement,
  N as default
};
//# sourceMappingURL=create-upsell-modal.element-BgSaSyFR.js.map
