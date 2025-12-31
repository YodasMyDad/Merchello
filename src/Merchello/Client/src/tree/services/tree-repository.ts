import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UmbTreeRepositoryBase, type UmbTreeRepository } from "@umbraco-cms/backoffice/tree";
import type { MerchelloTreeItemModel, MerchelloTreeRootModel } from '@tree/types/tree.types.js';
import { MERCHELLO_ROOT_ENTITY_TYPE } from '@tree/types/tree.types.js';
import { MerchelloTreeDataSource } from "./tree-data-source.js";

export class MerchelloTreeRepository
  extends UmbTreeRepositoryBase<MerchelloTreeItemModel, MerchelloTreeRootModel>
  implements UmbTreeRepository, UmbApi
{
  constructor(host: UmbControllerHost) {
    super(host, MerchelloTreeDataSource);
  }

  async requestTreeRoot() {
    const root: MerchelloTreeRootModel = {
      unique: null,
      entityType: MERCHELLO_ROOT_ENTITY_TYPE,
      name: "Merchello",
      hasChildren: true,
      isFolder: true,
    };

    return { data: root };
  }
}

export { MerchelloTreeRepository as api };
