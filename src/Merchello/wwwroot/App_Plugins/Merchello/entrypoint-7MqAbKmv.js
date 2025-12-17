import { UMB_AUTH_CONTEXT as s } from "@umbraco-cms/backoffice/auth";
import { s as i } from "./merchello-api-BxGPRYg2.js";
import { p as r } from "./store-settings-5Ug53ovY.js";
const c = (e, n) => {
  console.log("Hello from my extension 🎉"), e.consumeContext(s, async (t) => {
    const o = t?.getOpenApiConfiguration();
    i({
      token: o?.token,
      baseUrl: o?.base ?? "",
      credentials: o?.credentials ?? "same-origin"
    }), r();
  });
}, g = (e, n) => {
  console.log("Goodbye from my extension 👋");
};
export {
  c as onInit,
  g as onUnload
};
//# sourceMappingURL=entrypoint-7MqAbKmv.js.map
