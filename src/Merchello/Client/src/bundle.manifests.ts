import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as dashboards } from "./dashboards/manifest.js";
import { manifests as section } from "./section/manifest.js";
import { manifests as tree } from "./tree/manifest.js";
import { manifests as orders } from "./orders/manifest.js";
import { manifests as products } from "./products/manifest.js";
import { manifests as customers } from "./customers/manifest.js";
import { manifests as providers } from "./providers/manifest.js";
import { manifests as analytics } from "./analytics/manifest.js";
import { manifests as marketing } from "./marketing/manifest.js";
import { manifests as settings } from "./settings/manifest.js";
import { manifests as warehouses } from "./warehouses/manifest.js";
import { manifests as shipping } from "./shipping/manifest.js";
import { manifests as paymentProviders } from "./payment-providers/manifest.js";

// Job of the bundle is to collate all the manifests from different parts of the extension and load other manifests
// We load this bundle from umbraco-package.json
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...dashboards,
  ...section,
  ...tree,
  ...orders,
  ...products,
  ...customers,
  ...providers,
  ...analytics,
  ...marketing,
  ...settings,
  ...warehouses,
  ...shipping,
  ...paymentProviders,
];
