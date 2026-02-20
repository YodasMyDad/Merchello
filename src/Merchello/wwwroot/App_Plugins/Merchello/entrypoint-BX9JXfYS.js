import { UMB_AUTH_CONTEXT as m } from "@umbraco-cms/backoffice/auth";
import { s as h } from "./merchello-api-B76CV0sD.js";
import { p as E } from "./store-settings-7zNVo6g4.js";
const r = "merchello-modal-width", l = "uui-modal-dialog", c = "data-merchello-dialog", f = `
  :host([data-merchello-dialog]) dialog {
    box-sizing: border-box;
    max-width: 100%;
    min-width: min(var(--merchello-modal-min-width, 46rem), 100%);
  }

  @media (max-width: 768px) {
    :host([data-merchello-dialog]) dialog {
      max-width: 100%;
      min-width: 100%;
    }
  }
`;
let s = null;
const M = (e) => e instanceof HTMLElement && e.tagName.toLowerCase().startsWith("merchello-"), i = (e) => {
  Array.from(e.children).some((o) => M(o)) ? e.setAttribute(c, "") : e.removeAttribute(c);
}, d = (e) => {
  if (!(e instanceof HTMLElement)) return;
  const t = e.shadowRoot;
  if (t) {
    if (!t.getElementById(r)) {
      const o = document.createElement("style");
      o.id = r, o.textContent = f, t.appendChild(o);
    }
    i(e);
  }
}, a = (e) => {
  e instanceof Element && (e.matches(l) && d(e), e.querySelectorAll(l).forEach((t) => {
    d(t);
  }));
}, L = () => {
  a(document.documentElement), customElements.whenDefined(l).then(() => {
    a(document.documentElement);
  }), !s && (s = new MutationObserver((e) => {
    e.forEach((t) => {
      t.addedNodes.forEach((o) => {
        if (a(o), o instanceof Element) {
          const n = o.closest(l);
          n instanceof HTMLElement && i(n);
        }
      }), t.removedNodes.forEach(() => {
        if (t.target instanceof Element) {
          const o = t.target.closest(l);
          o instanceof HTMLElement && i(o);
        }
      }), t.target instanceof HTMLElement && t.target.matches(l) && i(t.target);
    });
  }), s.observe(document.documentElement, { childList: !0, subtree: !0 }));
}, g = () => {
  s?.disconnect(), s = null;
}, p = (e, t) => {
  L(), e.consumeContext(m, async (o) => {
    const n = o?.getOpenApiConfiguration();
    h({
      token: n?.token,
      baseUrl: n?.base ?? "",
      credentials: n?.credentials ?? "same-origin"
    }), E();
  });
}, A = (e, t) => {
  g();
};
export {
  p as onInit,
  A as onUnload
};
//# sourceMappingURL=entrypoint-BX9JXfYS.js.map
