import { nothing as C, repeat as O, html as p, css as z, property as G, state as f, customElement as T } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as W } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as D } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as S } from "@umbraco-cms/backoffice/event";
import { M as b } from "./merchello-api-DNSJzonx.js";
var q = Object.defineProperty, I = Object.getOwnPropertyDescriptor, A = Object.getPrototypeOf, B = Reflect.set, x = (t) => {
  throw TypeError(t);
}, c = (t, e, o, r) => {
  for (var n = r > 1 ? void 0 : r ? I(e, o) : e, v = t.length - 1, y; v >= 0; v--)
    (y = t[v]) && (n = (r ? y(e, o, n) : y(n)) || n);
  return r && n && q(e, o, n), n;
}, m = (t, e, o) => e.has(t) || x("Cannot " + o), u = (t, e, o) => (m(t, e, "read from private field"), e.get(t)), g = (t, e, o) => e.has(t) ? x("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, o), d = (t, e, o, r) => (m(t, e, "write to private field"), e.set(t, o), o), a = (t, e, o) => (m(t, e, "access private method"), o), F = (t, e, o, r) => ({
  set _(n) {
    d(t, e, n);
  },
  get _() {
    return u(t, e);
  }
}), k = (t, e, o, r) => (B(A(t), o, r, e), r), h, l, _, s, E, $, P, w, M, L, U;
let i = class extends D(
  W,
  void 0
) {
  constructor() {
    super(...arguments), g(this, s), this.readonly = !1, this._isLoading = !1, this._countryCode = "US", this._suggestions = [], this._showSuggestions = !1, g(this, h, !1), g(this, l), g(this, _, 0);
  }
  connectedCallback() {
    super.connectedCallback(), d(this, h, !0), a(this, s, L).call(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, h, !1), u(this, l) && clearTimeout(u(this, l));
  }
  render() {
    const t = this.value ?? "";
    return p`
      <div class="wrapper">
        <uui-input
          label="Shopping Category"
          placeholder="Start typing to search shopping taxonomy..."
          .value=${t}
          ?disabled=${this.readonly}
          @input=${a(this, s, E)}
          @focus=${a(this, s, $)}
          @blur=${a(this, s, P)}>
        </uui-input>

        ${this._showSuggestions ? p`
              <div class="suggestions" role="listbox">
                ${O(
      this._suggestions,
      (e) => e,
      (e) => p`
                    <button
                      type="button"
                      role="option"
                      class="suggestion-item"
                      @mousedown=${(o) => o.preventDefault()}
                      @click=${() => a(this, s, U).call(this, e)}>
                      ${e}
                    </button>
                  `
    )}
              </div>
            ` : C}

        <div class="metadata">
          ${this._isLoading ? p`Loading categories for ${this._countryCode}...` : this._countryCode ? p`Using ${this._countryCode} taxonomy` : C}
        </div>
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
E = function(t) {
  const e = t.target.value ?? "";
  k(i.prototype, this, "value", e.length > 0 ? e : void 0), this.dispatchEvent(new S()), a(this, s, w).call(this, e);
};
$ = function() {
  const t = this.value ?? "";
  if (this._suggestions.length > 0) {
    this._showSuggestions = !0;
    return;
  }
  t.trim().length >= 2 && a(this, s, w).call(this, t);
};
P = function() {
  window.setTimeout(() => {
    this._showSuggestions = !1;
  }, 150);
};
w = function(t) {
  u(this, l) && clearTimeout(u(this, l));
  const e = t.trim();
  if (e.length < 2) {
    this._suggestions = [], this._showSuggestions = !1, this._isLoading = !1;
    return;
  }
  d(this, l, window.setTimeout(() => {
    a(this, s, M).call(this, e);
  }, 200));
};
M = async function(t) {
  const e = ++F(this, _)._;
  this._isLoading = !0;
  const { data: o } = await b.getGoogleShoppingCategories({
    query: t,
    limit: 20
  });
  !u(this, h) || e !== u(this, _) || (this._isLoading = !1, this._countryCode = o?.countryCode ?? this._countryCode, this._suggestions = o?.categories ?? [], this._showSuggestions = this._suggestions.length > 0);
};
L = async function() {
  const { data: t } = await b.getGoogleShoppingCategories({ limit: 1 });
  u(this, h) && (this._countryCode = t?.countryCode ?? this._countryCode);
};
U = function(t) {
  k(i.prototype, this, "value", t), this.dispatchEvent(new S()), this._showSuggestions = !1, this._suggestions = [];
};
i.styles = z`
    :host {
      display: block;
    }

    .wrapper {
      position: relative;
      width: 100%;
    }

    uui-input {
      width: 100%;
    }

    .suggestions {
      position: absolute;
      z-index: 10;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 260px;
      overflow-y: auto;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      box-shadow: var(--uui-shadow-depth-2);
    }

    .suggestion-item {
      width: 100%;
      text-align: left;
      padding: var(--uui-size-space-3);
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
      color: var(--uui-color-text);
    }

    .suggestion-item:hover,
    .suggestion-item:focus-visible {
      background: var(--uui-color-surface-alt);
      outline: none;
    }

    .metadata {
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      min-height: 18px;
    }
  `;
c([
  G({ type: Boolean, reflect: !0 })
], i.prototype, "readonly", 2);
c([
  f()
], i.prototype, "_isLoading", 2);
c([
  f()
], i.prototype, "_countryCode", 2);
c([
  f()
], i.prototype, "_suggestions", 2);
c([
  f()
], i.prototype, "_showSuggestions", 2);
i = c([
  T("merchello-property-editor-ui-google-shopping-category-picker")
], i);
const N = i;
export {
  i as MerchelloPropertyEditorUiGoogleShoppingCategoryPickerElement,
  N as default
};
//# sourceMappingURL=property-editor-ui-google-shopping-category-picker.element-CiRS_0XS.js.map
