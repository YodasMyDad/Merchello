# Umbraco V17 Backoffice Extension Development

## Architecture
- Web Components + TypeScript + Lit + Vite
- Extension manifest system (TypeScript-based registration)
- Import from `@umbraco-cms/backoffice/*` packages
- Base classes: `UmbElementMixin(LitElement)` or `UmbLitElement`
- Context API: `consumeContext(TOKEN, callback)` for DI

> This project uses TypeScript manifest registration. See [Merchello Patterns](#merchello-project-patterns).

> For anything not covered here, consult https://docs.umbraco.com/umbraco-cms

## Manifest Common Properties
```typescript
{ type, alias, name, js?: () => import('./file.js'), api?: () => import('./file.js'),
  weight?: number, meta?: object, conditions?: Array, kind?: string }
```

> **Note:** Use `js` for lazy-loading elements/views, `api` for context/action classes, `element` for direct element references.

## Extension Types Reference

| Type | Required Meta | Kind | Common Conditions |
|------|--------------|------|-------------------|
| `section` | `label`, `pathname` | — | `Umb.Condition.SectionUserPermission` |
| `menu` | — | — | — |
| `dashboard` | `label`, `pathname` | — | `Umb.Condition.SectionAlias` |
| `propertyEditorUi` | `label`, `propertyEditorSchemaAlias`, `icon`, `group` | — | — |
| `tree` | `repositoryAlias` | `default` | — |
| `treeItem` | — (uses `forEntityTypes`) | `default` | — |
| `menuItem` | `label`, `menus`, `treeAlias` (if kind:'tree') | `tree` | — |
| `workspace` | `entityType`, `headline` (if default) | `default` or `routable` | — |
| `workspaceView` | `label`, `pathname`, `icon` | — | `Umb.Condition.WorkspaceAlias` |
| `workspaceAction` | `label`, `icon` | `default` | `Umb.Condition.WorkspaceAlias` |
| `entityAction` | `label`, `icon` (uses `forEntityTypes`) | — | `Umb.Condition.UserPermission` |
| `entityBulkAction` | `label`, `repositoryAlias` (uses `forEntityTypes`) | — | `Umb.Condition.CollectionAlias` |
| `collection` | `repositoryAlias` | — | — |
| `collectionView` | `label`, `icon`, `pathName` | — | `Umb.Condition.CollectionAlias` |
| `sectionView` | `label`, `pathname`, `icon` | — | `Umb.Condition.SectionAlias` |
| `sectionSidebarApp` | `label`, `menu` (if kind:'menu') | `menu` | `Umb.Condition.SectionAlias` |
| `headerApp` | — | — | — |
| `workspaceFooterApp` | — | — | `Umb.Condition.WorkspaceAlias` |
| `propertyAction` | `label`, `icon` (uses `forPropertyEditorUis`) | — | — |
| `searchProvider` | `label` | — | — |
| `globalContext` | — | — | — |
| `condition` | — | — | — |
| `store` | — | — | — |
| `repository` | — | — | — |
| `icons` | — (uses `js`) | — | — |
| `localization` | `culture` (uses `js`) | — | — |
| `backofficeEntryPoint` | — | — | — |

## Full Extension Examples

### Custom Section with Tree (Complete Example)
```typescript
// section/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  // 1. Section
  {
    type: "section",
    alias: "My.Section",
    name: "My Section",
    meta: { label: "My Section", pathname: "my-section" },
    conditions: [{ alias: "Umb.Condition.SectionUserPermission", match: "My.Section" }],
  },
  // 2. Menu (required for sidebar)
  {
    type: "menu",
    alias: "My.Menu",
    name: "My Menu",
  },
  // 3. Sidebar App (displays the menu)
  {
    type: "sectionSidebarApp",
    kind: "menu",
    alias: "My.SidebarApp",
    name: "My Sidebar",
    weight: 100,
    meta: { label: "My Menu", menu: "My.Menu" },
    conditions: [{ alias: "Umb.Condition.SectionAlias", match: "My.Section" }],
  },
  // 4. Dashboard (optional)
  {
    type: "dashboard",
    alias: "My.Dashboard",
    name: "My Dashboard",
    js: () => import("./my-dashboard.element.js"),
    weight: 100,
    meta: { label: "Dashboard", pathname: "dashboard" },
    conditions: [{ alias: "Umb.Condition.SectionAlias", match: "My.Section" }],
  },
];

// tree/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  // 5. Repository
  {
    type: "repository",
    alias: "My.Tree.Repository",
    name: "My Tree Repository",
    api: () => import("./repository.js"),
  },
  // 6. Tree (IMPORTANT: kind: 'default' is required!)
  {
    type: "tree",
    kind: "default",
    alias: "My.Tree",
    name: "My Tree",
    meta: { repositoryAlias: "My.Tree.Repository" },
  },
  // 7. TreeItem (renders tree nodes)
  {
    type: "treeItem",
    kind: "default",
    alias: "My.TreeItem",
    name: "My Tree Item",
    forEntityTypes: ["my-root", "my-item"],
  },
  // 8. MenuItem (adds tree to menu)
  {
    type: "menuItem",
    kind: "tree",
    alias: "My.MenuItem",
    name: "My Menu Item",
    weight: 100,
    meta: { label: "My Tree", menus: ["My.Menu"], treeAlias: "My.Tree" },
  },
];

// workspace/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  // 9. Workspace for root entity
  {
    type: "workspace",
    kind: "default",
    alias: "My.Root.Workspace",
    name: "My Root Workspace",
    meta: { entityType: "my-root", headline: "My Section" },
  },
  // 10. Workspace for items
  {
    type: "workspace",
    kind: "default",
    alias: "My.Item.Workspace",
    name: "My Item Workspace",
    meta: { entityType: "my-item", headline: "Item" },
  },
  // 11. WorkspaceView (content shown in workspace)
  {
    type: "workspaceView",
    alias: "My.Item.Workspace.View",
    name: "My Item View",
    js: () => import("./my-item-view.element.js"),
    weight: 100,
    meta: { label: "Details", pathname: "details", icon: "icon-settings" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "My.Item.Workspace" }],
  },
];
```

### Dashboard
```typescript
{
  type: 'dashboard',
  alias: 'My.Dashboard',
  js: () => import('./dashboard.element.js'),
  weight: 100,
  meta: { label: 'My Dashboard', pathname: 'my-dashboard' },
  conditions: [{ alias: 'Umb.Condition.SectionAlias', match: 'Umb.Section.Content' }]
}
```

### Property Editor UI
```typescript
{
  type: 'propertyEditorUi',
  alias: 'My.PropertyEditor',
  js: () => import('./editor.element.js'),
  meta: {
    label: 'My Editor',
    propertyEditorSchemaAlias: 'Umbraco.Plain.String',
    icon: 'icon-code',
    group: 'common',
    settings: {
      properties: [{ alias: 'config1', label: 'Config', propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox' }],
      defaultData: [{ alias: 'config1', value: 'default' }]
    }
  }
}
```

### EntityAction
```typescript
{
  type: 'entityAction',
  alias: 'My.EntityAction',
  forEntityTypes: ['document'],
  api: () => import('./action.js'),
  meta: { label: 'My Action', icon: 'icon-edit' },
  conditions: [{ alias: 'Umb.Condition.UserPermission', allOf: ['Umb.User.Permission.Update'] }]
}
```

## Compact Extension Skeletons

```typescript
// Section
{ type: 'section', alias: 'My.Section', meta: { label: 'My Section', pathname: 'my-section' },
  conditions: [{ alias: 'Umb.Condition.SectionUserPermission', match: 'My.Section' }] }

// Menu (required for trees in custom sections)
{ type: 'menu', alias: 'My.Menu', name: 'My Menu' }

// Tree (IMPORTANT: kind: 'default' required!)
{ type: 'tree', kind: 'default', alias: 'My.Tree', name: 'My Tree',
  meta: { repositoryAlias: 'My.Tree.Repository' } }

// TreeItem
{ type: 'treeItem', kind: 'default', alias: 'My.TreeItem', forEntityTypes: ['my-root', 'my-item'] }

// MenuItem (tree kind)
{ type: 'menuItem', kind: 'tree', alias: 'My.MenuItem', weight: 100,
  meta: { label: 'My Tree', menus: ['My.Menu'], treeAlias: 'My.Tree' } }

// Workspace (simple - no CRUD)
{ type: 'workspace', kind: 'default', alias: 'My.Workspace',
  meta: { entityType: 'my-entity', headline: 'My Workspace' } }

// Workspace (routable - for CRUD operations)
{ type: 'workspace', kind: 'routable', alias: 'My.Workspace',
  api: () => import('./workspace-context.js'), meta: { entityType: 'my-entity' } }

// WorkspaceView (IMPORTANT: use 'js' not 'element')
{ type: 'workspaceView', alias: 'My.View', js: () => import('./view.element.js'),
  weight: 100, meta: { label: 'View', pathname: 'view', icon: 'icon-document' },
  conditions: [{ alias: 'Umb.Condition.WorkspaceAlias', match: 'My.Workspace' }] }

// WorkspaceAction
{ type: 'workspaceAction', kind: 'default', alias: 'My.Action', api: () => import('./action.js'),
  weight: 100, meta: { label: 'Action', look: 'primary', color: 'positive' },
  conditions: [{ alias: 'Umb.Condition.WorkspaceAlias', match: 'My.Workspace' }] }

// SectionSidebarApp
{ type: 'sectionSidebarApp', kind: 'menu', alias: 'My.Sidebar', weight: 100,
  meta: { label: 'Menu', menu: 'My.Menu' },
  conditions: [{ alias: 'Umb.Condition.SectionAlias', match: 'My.Section' }] }

// Repository
{ type: 'repository', alias: 'My.Repository', api: () => import('./repository.js') }

// Store
{ type: 'store', alias: 'My.Store', api: () => import('./store.js') }

// GlobalContext + Condition
{ type: 'globalContext', alias: 'My.Context', api: () => import('./context.js') }
{ type: 'condition', alias: 'My.Condition', api: () => import('./condition.js') }

// Icons + Localization
{ type: 'icons', alias: 'My.Icons', js: () => import('./icons.js') }
{ type: 'localization', alias: 'My.Loc.En', meta: { culture: 'en' }, js: () => import('./en.js') }
```

## Component Patterns

### Dashboard Element
```typescript
import { LitElement, html, customElement, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';

@customElement('my-dashboard')
export class MyDashboard extends UmbElementMixin(LitElement) {
  #notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => { this.#notificationContext = ctx; });
  }

  #onClick() {
    this.#notificationContext?.peek('positive', { data: { headline: 'Success!' } });
  }

  render() {
    return html`
      <uui-box headline="My Dashboard">
        <uui-button @click=${this.#onClick} look="primary" label="Click"></uui-button>
      </uui-box>
    `;
  }

  static styles = [css`:host { display: block; padding: var(--uui-size-layout-1); }`];
}

export default MyDashboard;
declare global { interface HTMLElementTagNameMap { 'my-dashboard': MyDashboard; } }
```

### Property Editor
```typescript
import { html, customElement, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import type { UmbPropertyEditorUiElement, UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';

@customElement('my-property-editor')
export class MyPropertyEditor extends UmbLitElement implements UmbPropertyEditorUiElement {
  @property({ type: String }) value = '';
  @property({ type: Boolean }) readonly = false;

  set config(config: UmbPropertyEditorConfigCollection | undefined) {
    // config?.getValueByAlias('configKey')
  }

  #onChange(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new UmbChangeEvent());
  }

  render() {
    return html`<uui-input .value=${this.value} @input=${this.#onChange} ?readonly=${this.readonly}></uui-input>`;
  }
}

export default MyPropertyEditor;
declare global { interface HTMLElementTagNameMap { 'my-property-editor': MyPropertyEditor; } }
```

### Tree Repository (Complete Working Example)
```typescript
// types.ts
import type { UmbTreeItemModel, UmbTreeRootModel } from "@umbraco-cms/backoffice/tree";

export interface MyTreeItemModel extends UmbTreeItemModel {
  entityType: string;
  unique: string;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
  icon?: string;
  parent: { unique: string | null; entityType: string };  // IMPORTANT: parent needs both!
}

export interface MyTreeRootModel extends UmbTreeRootModel {
  entityType: string;
  unique: null;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
}

export const MY_ROOT_ENTITY_TYPE = "my-root";
export const MY_ITEM_ENTITY_TYPE = "my-item";

// data-source.ts
import type {
  UmbTreeAncestorsOfRequestArgs,
  UmbTreeChildrenOfRequestArgs,
  UmbTreeDataSource,
  UmbTreeRootItemsRequestArgs,
} from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { MyTreeItemModel } from "./types.js";
import { MY_ROOT_ENTITY_TYPE, MY_ITEM_ENTITY_TYPE } from "./types.js";

export class MyTreeDataSource extends UmbControllerBase implements UmbTreeDataSource<MyTreeItemModel> {
  async getRootItems(_args: UmbTreeRootItemsRequestArgs) {
    const rootItems: Array<MyTreeItemModel> = [
      {
        entityType: MY_ITEM_ENTITY_TYPE,
        unique: "item-1",
        name: "My Item",
        hasChildren: false,
        isFolder: false,
        icon: "icon-settings",
        parent: { unique: null, entityType: MY_ROOT_ENTITY_TYPE },
      },
    ];
    return { data: { items: rootItems, total: rootItems.length } };
  }

  async getChildrenOf(_args: UmbTreeChildrenOfRequestArgs) {
    return { data: { items: [], total: 0 } };
  }

  async getAncestorsOf(_args: UmbTreeAncestorsOfRequestArgs) {
    return { data: [] };
  }
}

// repository.ts
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UmbTreeRepositoryBase, type UmbTreeRepository } from "@umbraco-cms/backoffice/tree";
import type { MyTreeItemModel, MyTreeRootModel } from "./types.js";
import { MY_ROOT_ENTITY_TYPE } from "./types.js";
import { MyTreeDataSource } from "./data-source.js";

export class MyTreeRepository
  extends UmbTreeRepositoryBase<MyTreeItemModel, MyTreeRootModel>
  implements UmbTreeRepository, UmbApi
{
  constructor(host: UmbControllerHost) {
    super(host, MyTreeDataSource);
  }

  async requestTreeRoot() {
    const root: MyTreeRootModel = {
      unique: null,
      entityType: MY_ROOT_ENTITY_TYPE,
      name: "My Root",
      hasChildren: true,
      isFolder: true,
    };
    return { data: root };
  }
}

export { MyTreeRepository as api };
```

### Workspace Action (skeleton)
```typescript
import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
export class MyAction extends UmbWorkspaceActionBase {
  async execute() { const ctx = await this.getContext(UMB_WORKSPACE_CONTEXT); }
}
export const api = MyAction;
```

### Entity Action (skeleton)
```typescript
import { UmbEntityActionBase } from '@umbraco-cms/backoffice/entity-action';
export class MyAction extends UmbEntityActionBase {
  async execute() { const { unique } = this.args; }
}
export const api = MyAction;
```

### Entity Bulk Action (skeleton)
```typescript
import { UmbEntityBulkActionBase } from '@umbraco-cms/backoffice/entity-bulk-action';
export class MyBulkAction extends UmbEntityBulkActionBase {
  async execute() { for (const unique of this.selection) { /* bulk op */ } }
}
export const api = MyBulkAction;
```

### Custom Context (skeleton)
```typescript
import { UmbContextBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { UmbNumberState } from '@umbraco-cms/backoffice/observable-api';

export class MyContext extends UmbContextBase {
  #state = new UmbNumberState(0);
  readonly state = this.#state.asObservable();
  constructor(host: UmbControllerHost) { super(host, MY_CONTEXT_TOKEN); }
  updateState(value: number) { this.#state.setValue(value); }
}
export const api = MyContext;
export const MY_CONTEXT_TOKEN = new UmbContextToken<MyContext>('MyContext');
```

### Modal Usage (skeleton)
```typescript
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalToken } from '@umbraco-cms/backoffice/modal';

export const MY_MODAL = new UmbModalToken<MyData, MyResult>('My.Modal', { modal: { type: 'sidebar', size: 'small' } });

// In component
#modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
constructor() { super(); this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => { this.#modalManager = ctx; }); }
async #open() { const result = await this.#modalManager?.open(this, MY_MODAL, { data: {} }); }
```

### Custom Condition (skeleton)
```typescript
import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-api';
export class MyCondition extends UmbConditionBase {
  constructor(host, args) {
    super(host, args);
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (ctx) => {
      this.observe(ctx.currentUser, (user) => { this.permitted = user?.name === 'Admin'; });
    });
  }
}
export { MyCondition as api };
```

## User Context & Permissions

### Access Current User
```typescript
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
this.consumeContext(UMB_CURRENT_USER_CONTEXT, (ctx) => {
  this.observe(ctx?.currentUser, (user) => { /* user.name, user.hasDocumentRootAccess */ });
});
```

### Permission Conditions
```typescript
conditions: [{ alias: 'Umb.Condition.UserPermission', allOf: ['Umb.User.Permission.Browse'] }]
conditions: [{ alias: 'Umb.Condition.SectionUserPermission', match: 'Umb.Section.Content' }]
```

### Permission Aliases

| Category | Aliases |
|----------|---------|
| Document | `Umb.Document.Create`, `.Read`, `.Update`, `.Delete`, `.Publish`, `.Unpublish`, `.Duplicate`, `.Move`, `.Sort`, `.PropertyValue.Read`, `.PropertyValue.Write` |
| Section | `Umb.Section.Content`, `.Media`, `.Settings`, `.Members`, `.Users` |

## UUI Components

### Combined Example
```typescript
html`
  <uui-box headline="Title">
    <uui-button label="Save" look="primary" color="positive" @click=${this.onClick}></uui-button>
    <uui-input .value=${this.val} @input=${this.onChange} placeholder="Text" ?readonly=${this.ro}></uui-input>
    <uui-icon name="icon-add"></uui-icon>
    <uui-badge color="positive">New</uui-badge>
    <uui-loader></uui-loader>
    <uui-table>
      <uui-table-head><uui-table-head-cell>Name</uui-table-head-cell></uui-table-head>
      <uui-table-row><uui-table-cell>Value</uui-table-cell></uui-table-row>
    </uui-table>
    <uui-form><form @submit=${this.onSubmit}><uui-button type="submit" label="Go"></uui-button></form></uui-form>
  </uui-box>
`
```

### Component Properties
| Component | Key Properties |
|-----------|---------------|
| `uui-button` | `label`, `look` (primary/secondary/outline/placeholder), `color` (default/positive/warning/danger) |
| `uui-input` | `.value`, `placeholder`, `?readonly`, `@input` |
| `uui-box` | `headline` |
| `uui-badge` | `color`, `look` |

### CSS Variables
- Spacing: `--uui-size-space-1` to `-6`, Layout: `--uui-size-layout-1` to `-5`
- Colors: `--uui-color-text`, `--uui-color-background`
- Text classes: `uui-h1`, `uui-h2`, `uui-text`, `uui-lead` (import `UmbTextStyles` from `@umbraco-cms/backoffice/style`)

## Key Imports
```typescript
// Core
import { LitElement, html, css, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';

// Context
import { UmbContextToken, UmbContextBase } from '@umbraco-cms/backoffice/context-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';

// Common Contexts
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { UMB_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/workspace';

// Tree
import { UmbTreeRepositoryBase } from '@umbraco-cms/backoffice/tree';
import type { UmbTreeRepository, UmbTreeItemModel, UmbTreeRootModel, UmbTreeDataSource } from '@umbraco-cms/backoffice/tree';
import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';

// Observables
import { UmbNumberState, UmbStringState, UmbBooleanState, UmbArrayState, UmbObjectState } from '@umbraco-cms/backoffice/observable-api';

// Events, Property Editors, Validation, Resources
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import type { UmbPropertyEditorUiElement, UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';

// Extension API
import type { UmbApi } from '@umbraco-cms/backoffice/extension-api';
```

## API Communication

### tryExecute Pattern
```typescript
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { DocumentService } from '@umbraco-cms/backoffice/external/backend-api';

const { data, error } = await tryExecute(this, DocumentService.getDocumentById({ path: { id } }));
if (error) { console.error(error); return; }
```

### Data Source Pattern
```typescript
export class MyDataSource implements UmbDetailDataSource<MyModel> {
  #host: UmbControllerHost;
  constructor(host: UmbControllerHost) { this.#host = host; }

  async createScaffold(preset?: Partial<MyModel>) {
    return { data: { entityType: 'my-entity', unique: UmbId.new(), name: '', ...preset } };
  }
  async read(unique: string) {
    const { data, error } = await tryExecute(this.#host, MyService.getById({ path: { id: unique } }));
    return error ? { error } : { data: this.#mapToFrontend(data) };
  }
  async create(model: MyModel) { /* tryExecute POST, return read() */ }
  async update(model: MyModel) { /* tryExecute PUT, return read() */ }
  async delete(unique: string) { return tryExecute(this.#host, MyService.deleteById({ path: { id: unique } })); }
}
```

### Repository Pattern
```typescript
import { UmbDetailRepositoryBase } from '@umbraco-cms/backoffice/repository';
export class MyRepository extends UmbDetailRepositoryBase<MyModel> {
  constructor(host: UmbControllerHost) { super(host, MyDataSource, MY_STORE_CONTEXT); }
  override async create(model: MyModel) { return super.create(model, null); }
}
```

## Validation

### Form Control Validation
```typescript
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';

export class MyEditor extends UmbFormControlMixin<string, typeof UmbLitElement>(UmbLitElement) {
  @property({ type: Boolean }) mandatory = false;
  @property({ type: String }) mandatoryMessage = 'Required';

  protected override firstUpdated() {
    this.addValidator('valueMissing', () => this.mandatoryMessage, () => this.mandatory && !this.value);
  }
}
```

## Common Patterns

### Observe State
```typescript
this.observe(myContext.counter, (value) => { this.#counter = value; }, 'alias');
```

### Property Dataset (Form Builder)
```typescript
html`
  <umb-property-dataset .value=${this.data} @change=${(e) => { this.data = e.target.value; }}>
    <umb-property label="Name" alias="name" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
  </umb-property-dataset>
`
```

## Conditions Reference
`Umb.Condition.SectionAlias`, `.WorkspaceAlias`, `.CollectionAlias`, `.UserPermission`, `.UserPermission.Document`, `.UserPermission.Media`, `.SectionUserPermission`, `.WorkspaceEntityType`

## Extension Kinds (Important!)

| Type | Kind | Description |
|------|------|-------------|
| `tree` | `default` | **Required** - Standard tree behavior |
| `treeItem` | `default` | Standard tree item rendering |
| `workspace` | `default` | Simple workspace (no routing/CRUD) |
| `workspace` | `routable` | Complex workspace with routing, for CRUD operations |
| `menuItem` | `tree` | Menu item that displays a tree |
| `sectionSidebarApp` | `menu` | Sidebar that displays a menu |
| `workspaceAction` | `default` | Standard workspace action button |
| `workspaceView` | `collection` | View that displays a collection |

> **Note:** `kind` provides pre-configured behavior. Omitting required `kind` values will cause features to not work!

## Best Practices
1. Use lazy imports: `js: () => import('./file.js')` for elements
2. Use `api: () => import('./file.js')` for context/action classes
3. Export `default` for elements, `api` for classes
4. Declare global types: `HTMLElementTagNameMap`
5. Use contexts over direct imports
6. Keep observables private, expose via `asObservable()`
7. Higher weight = appears first
8. Use UUI components for consistency
9. Naming: `Umb` prefix for core, your prefix for custom
10. Tree items must have `parent: { unique, entityType }` structure

---

## Merchello Project Patterns

> This section covers only Merchello-specific differences. For general patterns, see sections above.

### Project Structure
```
src/Merchello/Client/
├── public/umbraco-package.json     # Minimal - loads bundle only
├── src/
│   ├── bundle.manifests.ts         # Entry point - aggregates all manifests
│   ├── api/merchello-api.ts        # Custom API layer
│   ├── entrypoints/
│   │   ├── manifest.ts
│   │   └── entrypoint.ts           # Lifecycle hooks
│   ├── section/
│   │   ├── manifest.ts             # Section, menu, sidebar, dashboard
│   │   └── *.element.ts
│   ├── tree/
│   │   ├── manifest.ts             # Tree, treeItem, menuItem, repository
│   │   ├── repository.ts
│   │   ├── data-source.ts
│   │   └── types.ts
│   ├── settings/                   # Or any feature folder
│   │   ├── manifest.ts             # Workspace manifests
│   │   └── *.element.ts
│   └── [feature]/
│       ├── manifest.ts
│       └── *.element.ts
```

### Bundle Registration (Key Difference)
`umbraco-package.json` is minimal:
```json
{ "id": "Merchello", "name": "Merchello", "extensions": [
  { "type": "bundle", "alias": "Merchello.Bundle", "js": "/App_Plugins/Merchello/merchello.js" }
]}
```

`bundle.manifests.ts` aggregates TypeScript manifests:
```typescript
import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as section } from "./section/manifest.js";
import { manifests as tree } from "./tree/manifest.js";
import { manifests as settings } from "./settings/manifest.js";

export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...section,
  ...tree,
  ...settings,
];
```

### Entrypoint Pattern (Key Difference)
```typescript
// manifest.ts
{ type: 'backofficeEntryPoint', alias: 'Merchello.Entrypoint', js: () => import('./entrypoint.js') }

// entrypoint.ts
import type { UmbEntryPointOnInit } from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { setApiConfig } from "../api/merchello-api.js";

export const onInit: UmbEntryPointOnInit = (_host, _extensionRegistry) => {
  _host.consumeContext(UMB_AUTH_CONTEXT, async (authContext) => {
    const config = authContext?.getOpenApiConfiguration();
    setApiConfig({ token: config?.token, baseUrl: config?.base ?? "", credentials: config?.credentials ?? "same-origin" });
  });
};
```

### Custom API Layer (Key Difference)
```typescript
// merchello-api.ts
const API_BASE = "umbraco/merchello/api/v1";
let apiConfig = { token: undefined, baseUrl: "", credentials: "same-origin" };
export function setApiConfig(config) { apiConfig = { ...apiConfig, ...config }; }

async function apiGet<T>(endpoint: string): Promise<{ data?: T; error?: Error }> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiConfig.token) { const t = await apiConfig.token(); if (t) headers["Authorization"] = `Bearer ${t}`; }
  try {
    const res = await fetch(`${apiConfig.baseUrl}/${API_BASE}/${endpoint}`, { method: "GET", credentials: apiConfig.credentials, headers });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return { data: await res.json() };
  } catch (error) { return { error: error as Error }; }
}

export const MerchelloApi = {
  ping: () => apiGet<string>("ping"),
  getProducts: () => apiGet<Product[]>("products"),
};
```

### Adding New Features
1. Create folder: `src/[feature]/`
2. Create `manifest.ts` exporting manifests array
3. Create `*.element.ts` components
4. Import and spread into `src/bundle.manifests.ts`

### Build Commands
```bash
cd src/Merchello/Client
npm install
npm run watch  # dev
npm run build  # prod
```
Output: `src/Merchello/wwwroot/App_Plugins/Merchello/`

### Key Differences from Standard
| Aspect | Standard | Merchello |
|--------|----------|-----------|
| Manifests | JSON (`umbraco-package.json`) | TypeScript files |
| API | `tryExecute` + generated client | Custom fetch wrapper |
| Init | Implicit | Explicit `backofficeEntryPoint` |
