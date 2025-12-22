import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as section } from "./section/manifest.js";
import { manifests as tree } from "./tree/manifest.js";
import { manifests as orders } from "./orders/manifest.js";
import { manifests as products } from "./products/manifest.js";
import { manifests as customers } from "./customers/manifest.js";
import { manifests as collections } from "./collections/manifest.js";
import { manifests as filters } from "./filters/manifest.js";
import { manifests as productTypes } from "./product-types/manifest.js";
import { manifests as productFeed } from "./product-feed/manifest.js";
import { manifests as providers } from "./providers/manifest.js";
import { manifests as analytics } from "./analytics/manifest.js";
import { manifests as discounts } from "./discounts/manifest.js";
import { manifests as tax } from "./tax/manifest.js";
import { manifests as suppliers } from "./suppliers/manifest.js";
import { manifests as warehouses } from "./warehouses/manifest.js";
import { manifests as shipping } from "./shipping/manifest.js";
import { manifests as paymentProviders } from "./payment-providers/manifest.js";
import { manifests as exchangeRateProviders } from "./exchange-rate-providers/manifest.js";
import { manifests as settings } from "./settings/manifest.js";
import { manifests as productPicker } from "./shared/product-picker/manifest.js";

// Job of the bundle is to collate all the manifests from different parts of the extension and load other manifests
// We load this bundle from umbraco-package.json
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...section,
  ...tree,
  ...orders,
  ...products,
  ...customers,
  ...collections,
  ...filters,
  ...productTypes,
  ...productFeed,
  ...providers,
  ...analytics,
  ...discounts,
  ...tax,
  ...suppliers,
  ...warehouses,
  ...shipping,
  ...paymentProviders,
  ...exchangeRateProviders,
  ...settings,
  ...productPicker,
];
