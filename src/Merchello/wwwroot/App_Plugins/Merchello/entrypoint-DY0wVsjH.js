import { UMB_AUTH_CONTEXT as d } from "@umbraco-cms/backoffice/auth";
import { s as h } from "./merchello-api-DFeoGYDY.js";
import { p as E } from "./store-settings-BfPYtFfT.js";
const r = "merchello-modal-width", l = "uui-modal-dialog", c = "data-merchello-dialog", f = `
  :host([data-merchello-dialog]) dialog {
    max-width: calc(100vw - 2rem);
    min-width: min(var(--merchello-modal-min-width, 46rem), calc(100vw - 2rem));
  }

  @media (max-width: 768px) {
    :host([data-merchello-dialog]) dialog {
      max-width: calc(100vw - 1rem);
      min-width: calc(100vw - 1rem);
    }
  }
`;
let s = null;
const M = (e) => e instanceof HTMLElement && e.tagName.toLowerCase().startsWith("merchello-"), a = (e) => {
  Array.from(e.children).some((o) => M(o)) ? e.setAttribute(c, "") : e.removeAttribute(c);
}, m = (e) => {
  if (!(e instanceof HTMLElement)) return;
  const t = e.shadowRoot;
  if (t) {
    if (!t.getElementById(r)) {
      const o = document.createElement("style");
      o.id = r, o.textContent = f, t.appendChild(o);
    }
    a(e);
  }
}, i = (e) => {
  e instanceof Element && (e.matches(l) && m(e), e.querySelectorAll(l).forEach((t) => {
    m(t);
  }));
}, L = () => {
  i(document.documentElement), customElements.whenDefined(l).then(() => {
    i(document.documentElement);
  }), !s && (s = new MutationObserver((e) => {
    e.forEach((t) => {
      t.addedNodes.forEach((o) => {
        if (i(o), o instanceof Element) {
          const n = o.closest(l);
          n instanceof HTMLElement && a(n);
        }
      }), t.removedNodes.forEach(() => {
        if (t.target instanceof Element) {
          const o = t.target.closest(l);
          o instanceof HTMLElement && a(o);
        }
      }), t.target instanceof HTMLElement && t.target.matches(l) && a(t.target);
    });
  }), s.observe(document.documentElement, { childList: !0, subtree: !0 }));
}, g = () => {
  s?.disconnect(), s = null;
}, p = (e, t) => {
  L(), e.consumeContext(d, async (o) => {
    const n = o?.getOpenApiConfiguration();
    h({
      token: n?.token,
      baseUrl: n?.base ?? "",
      credentials: n?.credentials ?? "same-origin"
    }), E();
  });
}, w = (e, t) => {
  g();
};
export {
  p as onInit,
  w as onUnload
};
//# sourceMappingURL=entrypoint-DY0wVsjH.js.map
