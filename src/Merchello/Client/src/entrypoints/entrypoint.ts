import type {
  UmbEntryPointOnInit,
  UmbEntryPointOnUnload,
} from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { setApiConfig } from "@api/merchello-api.js";
import { preloadSettings } from "@api/store-settings.js";

// load up the manifests here
export const onInit: UmbEntryPointOnInit = (_host, _extensionRegistry) => {
  console.log("Hello from my extension 🎉");

  _host.consumeContext(UMB_AUTH_CONTEXT, async (authContext) => {
    const config = authContext?.getOpenApiConfiguration();

    setApiConfig({
      token: config?.token,
      baseUrl: config?.base ?? "",
      credentials: config?.credentials ?? "same-origin",
    });

    // Preload store settings for currency formatting
    preloadSettings();
  });
};

export const onUnload: UmbEntryPointOnUnload = (_host, _extensionRegistry) => {
  console.log("Goodbye from my extension 👋");
};
