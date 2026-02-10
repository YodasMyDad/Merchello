import { UmbControllerBase as l } from "@umbraco-cms/backoffice/class-api";
import { UMB_PROPERTY_CONTEXT as p } from "@umbraco-cms/backoffice/property";
const E = "umb-property-editor-ui-dropdown", c = "umb-property-editor-ui-select", T = "umb-input-dropdown-list", d = "uui-select", m = "select#native", e = (r) => {
  r && (r.style.display = "block", r.style.width = "100%");
};
class y extends l {
  constructor(i) {
    super(i), this.consumeContext(p, (t) => {
      t && (this.observe(t.editor, (o) => {
        this.#t(o);
      }), this.observe(t.config, () => {
        this.#t(t.getEditor());
      }));
    });
  }
  async #t(i) {
    const t = i;
    if (!t) return;
    const o = t.tagName.toLowerCase();
    if (o !== E && o !== c) return;
    if (e(t), t.updateComplete && await t.updateComplete, o === c) {
      const u = t.shadowRoot?.querySelector(d);
      e(u);
      return;
    }
    const n = t.shadowRoot?.querySelector(m);
    e(n);
    const s = t.shadowRoot?.querySelector(T);
    e(s), s?.updateComplete && await s.updateComplete;
    const a = s?.shadowRoot?.querySelector(d);
    e(a);
  }
}
export {
  y as MerchelloDropdownLayoutPropertyContext,
  y as api
};
//# sourceMappingURL=dropdown-layout.property-context-DYQ0zB7v.js.map
