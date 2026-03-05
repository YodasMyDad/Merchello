import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_SECTION_SIDEBAR_MENU_SECTION_CONTEXT } from "@umbraco-cms/backoffice/menu";
import { linkEntityExpansionEntries } from "@umbraco-cms/backoffice/utils";
import {
  MERCHELLO_ROOT_ENTITY_TYPE,
  MERCHELLO_ORDERS_ENTITY_TYPE,
  MERCHELLO_PRODUCTS_ENTITY_TYPE,
} from "@tree/types/tree.types.js";

const MENU_ITEM_ALIAS = "Merchello.MenuItem";

/**
 * Map of child entity unique → parent entity for tree expansion.
 * Only child items (nested under a parent tree node) need entries here.
 */
const PARENT_MAP: Record<string, { entityType: string; unique: string }> = {
  outstanding: { entityType: MERCHELLO_ORDERS_ENTITY_TYPE, unique: "orders" },
  "abandoned-checkouts": { entityType: MERCHELLO_ORDERS_ENTITY_TYPE, unique: "orders" },
  upsells: { entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE, unique: "products" },
  "import-export": { entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE, unique: "products" },
};

/**
 * Controller that expands the Merchello sidebar tree to show the current workspace item.
 * Attach in workspace context constructors via `new MerchelloTreeExpansionController(this, entityType, unique)`.
 */
export class MerchelloTreeExpansionController extends UmbControllerBase {
  constructor(host: UmbControllerHost, _entityType: string, unique: string) {
    super(host, "merchello-tree-expansion");

    this.consumeContext(UMB_SECTION_SIDEBAR_MENU_SECTION_CONTEXT, (menuContext) => {
      // Build the structure path from root → parent (exclude current item)
      const structureItems: Array<{ entityType: string; unique: string | null }> = [
        { entityType: MERCHELLO_ROOT_ENTITY_TYPE, unique: null },
      ];

      const parent = PARENT_MAP[unique];
      if (parent) {
        structureItems.push(parent);
      }

      const linkedEntries = linkEntityExpansionEntries(structureItems);
      const entriesWithAlias = linkedEntries.map((entry) => ({
        ...entry,
        menuItemAlias: MENU_ITEM_ALIAS,
      }));

      menuContext?.expansion.expandItems(entriesWithAlias);
    });
  }
}
