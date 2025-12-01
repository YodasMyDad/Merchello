import type {
  UmbTreeAncestorsOfRequestArgs,
  UmbTreeChildrenOfRequestArgs,
  UmbTreeDataSource,
  UmbTreeRootItemsRequestArgs,
} from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { MerchelloTreeItemModel } from "./types.js";

export class MerchelloTreeDataSource extends UmbControllerBase implements UmbTreeDataSource<MerchelloTreeItemModel> {
  async getRootItems(_args: UmbTreeRootItemsRequestArgs) {
    const rootItems: Array<MerchelloTreeItemModel> = [
      {
        entityType: "merchello-settings",
        unique: "settings",
        name: "Settings",
        hasChildren: false,
        isFolder: false,
        icon: "icon-settings",
        parent: { unique: null, entityType: "merchello-root" },
      },
    ];

    return { data: { items: rootItems, total: rootItems.length } };
  }

  async getChildrenOf(_args: UmbTreeChildrenOfRequestArgs) {
    // No nested children for now
    return { data: { items: [], total: 0 } };
  }

  async getAncestorsOf(_args: UmbTreeAncestorsOfRequestArgs) {
    return { data: [] };
  }
}
