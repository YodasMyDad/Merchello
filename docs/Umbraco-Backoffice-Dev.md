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
| `workspaceContext` | — | — | `Umb.Condition.WorkspaceAlias` |
| `condition` | — | — | — |
| `store` | — | — | — |
| `repository` | — | — | — |
| `icons` | — (uses `js`) | — | — |
| `localization` | `culture` (uses `js`) | — | — |
| `backofficeEntryPoint` | — | — | — |
| `ufmFilter` | `alias` (meta) | — | — |
| `ufmComponent` | `alias` (meta) | — | — |
| `entitySign` | `forEntityTypes`, `forEntityFlags` (meta: `iconName`, `label`, `iconColorAlias`) | `icon` | — |

## UFM (Umbraco Form Markup) Development

UFM allows custom filters and components to transform/render values in Umbraco's markup syntax.

### UFM Filter
Transforms a value with optional parameters:

```typescript
// manifest.ts
{
  type: 'ufmFilter',
  alias: 'My.DateFormat.Filter',
  name: 'Date Format Filter',
  api: () => import('./date-format-filter.js'),
  meta: { alias: 'dateFormat' }  // Used as: {= value | dateFormat: 'yyyy-MM-dd' =}
}

// date-format-filter.ts
import { UmbUfmFilterBase } from '@umbraco-cms/backoffice/ufm';

export class DateFormatFilter extends UmbUfmFilterBase {
  filter(value: unknown, ...args: Array<unknown>): unknown {
    if (!value) return '';
    const format = args[0] as string ?? 'yyyy-MM-dd';
    // Transform and return the value
    return formatDate(value as string, format);
  }
}

export { DateFormatFilter as api };
```

### UFM Component
Renders custom markup from a token:

```typescript
// manifest.ts
{
  type: 'ufmComponent',
  alias: 'My.Tag.Component',
  name: 'Tag Component',
  api: () => import('./tag-component.js'),
  meta: { alias: 'tag' }  // Used as: {tag color="blue"}Label{/tag}
}

// tag-component.ts
import { UmbUfmComponentBase } from '@umbraco-cms/backoffice/ufm';

export class TagComponent extends UmbUfmComponentBase {
  render(token: unknown): string {
    // For simple cases, return HTML string directly
    const attrs = this.getAttributes(token);
    const color = attrs?.color ?? 'default';
    return `<span class="tag tag-${color}">${token.text}</span>`;

    // For async operations, delegate to a web element:
    // return `<ufm-my-tag data-id="${token.text}"></ufm-my-tag>`;
  }
}

export { TagComponent as api };
```

### UFM Web Element (for async operations)
When a UFM component needs async data, delegate to a web element:

```typescript
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UMB_UFM_RENDER_CONTEXT } from '@umbraco-cms/backoffice/ufm';

@customElement('ufm-my-tag')
export class UfmMyTagElement extends UmbLitElement {
  constructor() {
    super();
    this.consumeContext(UMB_UFM_RENDER_CONTEXT, (context) => {
      // Access block property values reactively
      this.observe(context.value, (value) => { /* render based on value */ });
    });
  }
}
```

### UFM Naming Conventions
- **Extension aliases**: Dot notation (`My.DateFormat.Filter`)
- **UFM aliases** (in meta): camelCase (`dateFormat`, `tag`)
- **Web component tags**: kebab-case with prefix (`<ufm-my-tag>`)

## Entity Signs (Visual Indicators)

Entity signs display visual indicators (icons/badges) on content items in trees and collections without requiring JavaScript implementation.

### Architecture
- **C# Backend**: `IFlagProvider` determines which items receive flags
- **TypeScript Manifest**: `entitySign` extension defines the visual appearance
- Key insight: "Flagging is purely a C# concern" - no separate TypeScript files needed

### C# Flag Provider

```csharp
using Umbraco.Cms.Core.Models.ContentEditing;
using Umbraco.Cms.Core.Signs;

public class LockedDocumentFlagProvider : IFlagProvider
{
    public async Task PopulateFlagsAsync(FlagProviderContext context)
    {
        foreach (var item in context.Items)
        {
            if (ShouldAddFlag(item))
            {
                item.Flags.Add("locked");  // Flag alias referenced in manifest
            }
        }
    }

    private bool ShouldAddFlag(IFlaggable item)
    {
        // Works with DocumentTreeItemResponseModel, DocumentCollectionResponseModel, DocumentItemResponseModel
        return item switch
        {
            DocumentTreeItemResponseModel doc => doc.DocumentType.Alias == "lockedPage",
            _ => false
        };
    }
}
```

### Registration (Composer)

```csharp
public class MyComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.SignProviders().Append<LockedDocumentFlagProvider>();
    }
}
```

### Manifest

```typescript
{
  type: "entitySign",
  kind: "icon",
  alias: "My.LockedSign",
  name: "Locked Document Sign",
  forEntityTypes: ["document"],      // Entity types to apply to
  forEntityFlags: ["locked"],        // Must match flag alias from C# provider
  weight: 100,
  meta: {
    iconName: "icon-lock",
    label: "Locked",
    iconColorAlias: "danger"         // Uses UUI color aliases: danger, warning, positive, etc.
  }
}
```

### Use Cases
- Indicating locked/protected content
- Showing workflow states (pending review, approved)
- Marking items with special conditions (expired, scheduled)
- Displaying validation warnings

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
import type { UmbCurrentUserModel } from '@umbraco-cms/backoffice/current-user';

@customElement('my-element')
export class MyElement extends UmbElementMixin(LitElement) {
  @state() private _currentUser?: UmbCurrentUserModel;

  constructor() {
    super();
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (ctx) => {
      this.observe(ctx?.currentUser, (user) => {
        this._currentUser = user;
      }, '_currentUser');
    });
  }

  render() {
    return html`<p>Welcome, ${this._currentUser?.name}</p>`;
  }
}
```

### UmbCurrentUserModel Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | User's display name |
| `email` | `string` | User's email address |
| `allowedSections` | `string[]` | Section aliases user can access (e.g., `"Umb.Section.Content"`) |
| `fallbackPermissions` | `string[]` | Default permissions (e.g., `"Umb.Document.Create"`) |
| `avatarUrls` | `string[]` | User avatar image URLs |
| `documentStartNodeUniques` | `string[]` | Document start node GUIDs |
| `hasDocumentRootAccess` | `boolean` | Whether user can access document root |
| `hasMediaRootAccess` | `boolean` | Whether user can access media root |
| `mediaStartNodeUniques` | `string[]` | Media start node GUIDs |
| `unique` | `string` | User's unique identifier (GUID) |
| `userName` | `string` | User's login username |
| `languageIsoCode` | `string` | User's preferred language (e.g., `"en-US"`) |

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

### uui-select (IMPORTANT)
The `<uui-select>` component does **NOT** support native `<option>` children. Options must be passed via the `.options` property:

```typescript
// WRONG - will render empty dropdown
html`
  <uui-select>
    <option value="1">Option 1</option>
  </uui-select>
`

// CORRECT - use .options property
const options = [
  { name: "Select...", value: "" },
  { name: "Option 1", value: "1" },
  { name: "Option 2", value: "2", selected: true }
];

html`<uui-select .options=${options} @change=${this.handleChange}></uui-select>`
```

| Property | Type | Description |
|----------|------|-------------|
| `.options` | `Array<{name: string, value: string, selected?: boolean}>` | **Required** - Array of options |
| `@change` | `UUISelectEvent` | Change event, use `e.target.value` to get selected value |
| `label` | `string` | Accessibility label |
| `placeholder` | `string` | Placeholder text when no selection |

### CSS Variables
- Spacing: `--uui-size-space-1` to `-6`, Layout: `--uui-size-layout-1` to `-5`
- Colors: `--uui-color-text`, `--uui-color-background`
- Text classes: `uui-h1`, `uui-h2`, `uui-text`, `uui-lead` (import `UmbTextStyles` from `@umbraco-cms/backoffice/style`)

### Filter Tabs (List Views)

For filtering list views (e.g., Orders, Outstanding invoices), use `<uui-tab-group>` with `<uui-tab>` components. This provides consistent styling, accessibility, and matches Umbraco's design language.

```typescript
type FilterTab = "all" | "pending" | "completed";

@state() private _activeTab: FilterTab = "all";

private _handleTabClick(tab: FilterTab): void {
  this._activeTab = tab;
  this._page = 1;
  this._loadData();
}

private _renderTabs() {
  return html`
    <uui-tab-group>
      <uui-tab
        label="All"
        ?active=${this._activeTab === "all"}
        @click=${() => this._handleTabClick("all")}>
        All
      </uui-tab>
      <uui-tab
        label="Pending"
        ?active=${this._activeTab === "pending"}
        @click=${() => this._handleTabClick("pending")}>
        Pending
      </uui-tab>
      <uui-tab
        label="Completed"
        ?active=${this._activeTab === "completed"}
        @click=${() => this._handleTabClick("completed")}>
        Completed
      </uui-tab>
    </uui-tab-group>
  `;
}
```

**Key Points:**
- Use `?active` binding for active state (not CSS classes)
- Set both `label` attribute (accessibility) and inner text (display)
- Reset pagination when changing tabs
- No custom CSS needed - UUI handles styling

**Do NOT use custom button-based tabs** - this creates inconsistent styling across the application.

### Data Tables (List Views)

For displaying tabular data (e.g., orders, invoices, customers), use `<uui-table>` with UUI table components. This provides consistent styling with a white background container, borders, and hover states.

```typescript
private _renderTable() {
  return html`
    <div class="table-container">
      <uui-table class="my-table">
        <uui-table-head>
          <uui-table-head-cell class="checkbox-col">
            <uui-checkbox
              .checked=${this._allSelected}
              @change=${this._handleSelectAll}
              label="Select all">
            </uui-checkbox>
          </uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Date</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
        </uui-table-head>
        ${this._items.map((item) => this._renderRow(item))}
      </uui-table>
    </div>
  `;
}

private _renderRow(item: MyItem) {
  return html`
    <uui-table-row
      class="clickable"
      @click=${() => this._handleRowClick(item)}>
      <uui-table-cell class="checkbox-col" @click=${(e: Event) => e.stopPropagation()}>
        <uui-checkbox
          .checked=${this._selectedIds.has(item.id)}
          @change=${() => this._handleSelect(item.id)}
          label="Select ${item.name}">
        </uui-checkbox>
      </uui-table-cell>
      <uui-table-cell>${item.name}</uui-table-cell>
      <uui-table-cell>${formatRelativeDate(item.date)}</uui-table-cell>
      <uui-table-cell>
        <span class="badge badge-positive">${item.status}</span>
      </uui-table-cell>
    </uui-table-row>
  `;
}
```

**Required CSS for table container:**
```css
.table-container {
  overflow-x: auto;
  background: var(--uui-color-surface);
  border: 1px solid var(--uui-color-border);
  border-radius: var(--uui-border-radius);
}

.my-table {
  width: 100%;
}

uui-table-head-cell,
uui-table-cell {
  white-space: nowrap;
}

.checkbox-col {
  width: 40px;
}

uui-table-row.clickable {
  cursor: pointer;
}

uui-table-row.clickable:hover {
  background: var(--uui-color-surface-emphasis);
}
```

**Key Points:**
- Always wrap `<uui-table>` in a `.table-container` div with white background, border, and radius
- Use `<uui-table-head>` for header row, `<uui-table-head-cell>` for header cells
- Use `<uui-table-row>` for data rows, `<uui-table-cell>` for data cells
- Add `.clickable` class to rows that navigate on click
- Stop propagation on checkbox clicks to prevent row click

**Do NOT use raw HTML `<table>` elements** - they lack consistent styling and the white card background.

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

## Context Communication

### How Contexts Work

A **Context** is a Controller that is provided for a certain scope. The scope is defined by the DOM hierarchy—components can only communicate with contexts that exist within their ancestor chain.

**Key principles:**
- Contexts are **DOM-scoped**: A component can only consume contexts provided by its ancestors
- **Automatic lifecycle**: Contexts initialize when navigating to their scope and destroy when leaving
- **Workspace isolation**: Multiple workspace instances maintain separate context scopes (no cross-contamination)

### Workspace Context Extension

Use `workspaceContext` to provide a context automatically when entering a specific workspace:

```typescript
// manifest.ts
{
  type: "workspaceContext",
  alias: "My.Counter.Context",
  name: "Counter Context",
  api: () => import("./counter-context.js"),
  conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
}
```

### Complete Integration Example

A working example showing context + action + view communication:

```typescript
// counter-context.ts
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbNumberState } from "@umbraco-cms/backoffice/observable-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";

export const COUNTER_CONTEXT = new UmbContextToken<CounterContext>("CounterContext");

export class CounterContext extends UmbControllerBase {
  #count = new UmbNumberState(0);
  readonly count = this.#count.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, COUNTER_CONTEXT.toString());
    this.provideContext(COUNTER_CONTEXT, this);
  }

  increment() {
    this.#count.setValue(this.#count.getValue() + 1);
  }

  reset() {
    this.#count.setValue(0);
  }
}

export { CounterContext as api };

// counter-action.ts (workspace action that triggers context)
import { UmbWorkspaceActionBase } from "@umbraco-cms/backoffice/workspace";
import { COUNTER_CONTEXT } from "./counter-context.js";

export class IncrementAction extends UmbWorkspaceActionBase {
  async execute() {
    const context = await this.getContext(COUNTER_CONTEXT);
    context?.increment();
  }
}

export { IncrementAction as api };

// counter-view.element.ts (workspace view that observes context)
import { html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { COUNTER_CONTEXT } from "./counter-context.js";

@customElement("my-counter-view")
export class CounterView extends UmbLitElement {
  @state() private _count = 0;

  constructor() {
    super();
    this.consumeContext(COUNTER_CONTEXT, (context) => {
      this.observe(context.count, (value) => {
        this._count = value;
      });
    });
  }

  render() {
    return html`<uui-box headline="Counter"><p>Count: ${this._count}</p></uui-box>`;
  }
}

export default CounterView;
```

```typescript
// manifest.ts - Register all pieces
export const manifests: Array<UmbExtensionManifest> = [
  // 1. Context (provided when entering workspace)
  {
    type: "workspaceContext",
    alias: "My.Counter.Context",
    name: "Counter Context",
    api: () => import("./counter-context.js"),
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
  },
  // 2. Action (button that triggers context method)
  {
    type: "workspaceAction",
    kind: "default",
    alias: "My.Counter.Increment",
    name: "Increment Counter",
    api: () => import("./counter-action.js"),
    meta: { label: "Increment", look: "primary" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
  },
  // 3. View (displays context state)
  {
    type: "workspaceView",
    alias: "My.Counter.View",
    name: "Counter View",
    js: () => import("./counter-view.element.js"),
    meta: { label: "Counter", pathname: "counter", icon: "icon-calculator" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
  },
];
```

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

## Workspace View Scrolling (Important!)

Workspace views that have scrollable content **must** use `umb-body-layout` to get proper internal scrolling. Without it, content will overflow the viewport without a scrollbar.

### Pattern
```typescript
override render() {
  return html`
    <umb-body-layout header-fit-height main-no-padding>
      <div class="my-content">
        <!-- Your scrollable content here -->
      </div>
    </umb-body-layout>
  `;
}

static override styles = [css`
  :host {
    display: block;
    height: 100%;  /* Required for umb-body-layout to fill container */
  }
  
  .my-content {
    padding: var(--uui-size-layout-1);  /* Add padding here since main-no-padding removes it */
  }
`];
```

### Why This Works
- `umb-body-layout` has an internal `#main` div with `overflow-y: auto` and `flex: 1`
- The `:host` must have `height: 100%` to give `umb-body-layout` a height constraint
- `header-fit-height` makes the header shrink to content (useful when you have your own header)
- `main-no-padding` removes default padding so you can control it in your content

### Common Mistakes
1. **Missing `height: 100%` on `:host`** - `umb-body-layout` needs a height constraint to enable scrolling
2. **Not using `umb-body-layout`** - Content will overflow without a scrollbar
3. **Padding on `:host` instead of content** - Can cause layout issues with the body layout

---

## Routable Workspaces (Detail/Edit Views)

Routable workspaces are used for CRUD operations where you need to navigate to a specific entity (e.g., edit a document, view order details).

### URL Pattern
```
section/{sectionPathname}/workspace/{entityType}/{routePath}
```

Example: `section/merchello/workspace/merchello-orders/edit/orders/9cd851e3-da06-4563-be6a-b3a700b565fd`

> **Note**: For tree selection to persist when navigating to detail views, the `routePath` must include the tree item's `unique` value. See "Common Mistakes" section for details.

### Manifest Setup
```typescript
// 1. Routable workspace manifest
{
  type: "workspace",
  kind: "routable",
  alias: "My.Item.Detail.Workspace",
  name: "Item Detail Workspace",
  api: () => import("./item-detail-workspace.context.js"),
  meta: {
    entityType: "my-item",  // Must match the URL pattern
  },
}
```

### Workspace Context (CRITICAL)
The workspace context **must** set up routes using `this.routes.setRoutes()`:

```typescript
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";

export class MyItemDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "My.Item.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #itemId?: string;
  #item = new UmbObjectState<MyItemDto | undefined>(undefined);
  readonly item = this.#item.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // CRITICAL: Must set up routes - without this, navigation won't work!
    // IMPORTANT: For tree selection to persist, routes must be nested under the list path.
    // The tree item's path is: section/{section}/workspace/{entityType}/edit/{unique}
    // Detail routes must contain this path for the tree item to remain highlighted.
    this.routes.setRoutes([
      {
        // Matches URL: .../workspace/my-item/edit/items/{id}
        // Since tree item unique="items", this path contains "/edit/items/" so tree stays selected
        path: "edit/items/:id",
        component: () => import("./item-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.load(id);
        },
      },
      {
        // List view at: .../workspace/my-item/edit/items
        path: "edit/items",
        component: () => import("./items-list.element.js"),
      },
      {
        path: "",
        redirectTo: "edit/items",
      },
    ]);
  }

  getEntityType(): string {
    return "my-item";
  }

  getUnique(): string | undefined {
    return this.#itemId;
  }

  async load(unique: string): Promise<void> {
    this.#itemId = unique;
    const { data, error } = await MyApi.getItem(unique);
    if (error) {
      console.error("Failed to load item:", error);
      return;
    }
    this.#item.setValue(data);
  }
}

export { MyItemDetailWorkspaceContext as api };
```

### Navigation (from list to detail)
Use `href` attributes on elements - **never use `window.location.hash` or `window.location.href`**:

```typescript
// In your list element - use relative paths for SPA routing
private _getItemHref(id: string): string {
  // Pattern: section/{sectionPathname}/workspace/{entityType}/{routePath}
  // Note: NO leading slash, NO /umbraco/ prefix - must be relative!
  // IMPORTANT: Route must include the list path (e.g., "edit/items/") for tree selection to work
  return `section/my-section/workspace/my-item/edit/items/${id}`;
}

render() {
  return html`
    <table>
      ${this._items.map(item => html`
        <tr>
          <td><a href=${this._getItemHref(item.id)}>${item.name}</a></td>
        </tr>
      `)}
    </table>
  `;
}
```

### Common Mistakes

1. **Missing `routes.setRoutes()`** - The workspace context creates `UmbWorkspaceRouteManager` but never defines routes
2. **Wrong URL pattern** - Using `window.location.hash = '#/...'` instead of `href` attribute
3. **Including hash in href** - Use `section/...` not `#/section/...`
4. **EntityType mismatch** - The `entityType` in manifest must match what's in the URL
5. **Absolute paths cause full page reloads** - Use relative paths like `section/...`, NOT `/umbraco/section/...`
6. **Using `window.location.href`** - Causes full page reload; use `history.pushState()` or navigation helpers instead
7. **Tree selection not persisting on detail views** - Routes must be nested under the list path. The tree uses `location.includes(path)` to determine if a tree item is active. If your tree item has `unique="items"`, its path is `.../edit/items`. A detail route of `edit/:id` creates URLs like `.../edit/{guid}` which doesn't contain `/edit/items/`. Fix by nesting: `edit/items/:id` creates `.../edit/items/{guid}` which contains `/edit/items/`

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

### Navigation (CRITICAL)

**Never use `window.location.href` for navigation** - it causes a full page reload and resets the sidebar tree state.

Use the navigation utilities in `@shared/utils/navigation.js`:

```typescript
import {
  getOrderDetailHref,           // For href attributes
  navigateToOrderDetail,        // For programmatic navigation
  getMerchelloWorkspaceHref,    // Generic - any entity type (for href)
  navigateToMerchelloWorkspace  // Generic - any entity type (programmatic)
} from "@shared/utils/navigation.js";
```

**IMPORTANT:** All paths are **relative** (e.g., `section/merchello/workspace/...`) to work with Umbraco's SPA router. Never use absolute paths with `/umbraco/` prefix.

**Two patterns:**

1. **href attributes** (preferred for links/buttons):
```typescript
// Use get*Href() functions - returns relative path for SPA routing
html`<a href=${getOrderDetailHref(order.id)}>${order.name}</a>`

// Or generic version for any entity type
html`<a href=${getMerchelloWorkspaceHref("merchello-product", `edit/${product.id}`)}>
  ${product.name}
</a>`
```

2. **Programmatic navigation** (after modal submit, etc.):
```typescript
// Use navigateTo*() functions - uses History API, no page reload
const result = await modal.onSubmit();
if (result?.created) {
  navigateToOrderDetail(result.invoiceId);
}

// Or generic version
navigateToMerchelloWorkspace("merchello-product", `edit/${productId}`);
```

**Adding new entity navigation helpers:**

In `src/shared/utils/navigation.ts`, add convenience wrappers:
```typescript
export const PRODUCT_ENTITY_TYPE = "merchello-product";

export function getProductDetailHref(productId: string): string {
  return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}

export function navigateToProductDetail(productId: string): void {
  navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}
```

---

## Workspace Editor Layout Pattern

When creating edit/detail views that need to match Umbraco's content editor look and feel (for consistency and future property editor reuse), follow these patterns:

### Component Hierarchy

```
umb-body-layout (outer - header-fit-height main-no-padding)
├── slot="header"
│   ├── uui-button (back button)
│   └── div#header
│       ├── umb-icon (entity type icon)
│       └── uui-input (name input - transparent style)
├── umb-body-layout (inner - header-fit-height header-no-padding)
│   ├── slot="header"
│   │   └── uui-tab-group (content tabs with href routing)
│   └── main content (has default padding)
│       └── div.tab-content (flex column with gap)
│           └── uui-box containers (property groups)
└── slot="footer"
    └── umb-footer-layout
        └── slot="actions" (save button)
```

**Key attributes:**
- Outer `umb-body-layout`: `main-no-padding` - prevents double padding around inner layout
- Inner `umb-body-layout`: `header-no-padding` - tabs sit flush without extra padding

### Header Layout

The header should have a back button, entity icon, and name input:

```typescript
render() {
  return html`
    <umb-body-layout header-fit-height main-no-padding>
      <!-- Back button -->
      <uui-button slot="header" compact href=${getBackHref()} label="Back" class="back-button">
        <uui-icon name="icon-arrow-left"></uui-icon>
      </uui-button>

      <!-- Entity icon + name input -->
      <div id="header" slot="header">
        <umb-icon name="icon-box"></umb-icon>
        <uui-input
          id="name-input"
          .value=${this._formData.name || ""}
          @input=${this._handleNameChange}
          placeholder="Enter name..."
          ?invalid=${!!this._fieldErrors.name}>
        </uui-input>
      </div>

      <!-- Inner layout with tabs + content -->
      <umb-body-layout header-fit-height header-no-padding>
        ${this._renderTabs()}  <!-- tabs go in slot="header" -->

        <!-- Router slot for URL tracking (hidden via CSS) -->
        <umb-router-slot .routes=${this._routes} @init=${...} @change=${...}></umb-router-slot>

        <!-- Tab content rendered in main slot (has default padding) -->
        <div class="tab-content">
          ${this._renderActiveTabContent()}  <!-- uui-box containers go here -->
        </div>
      </umb-body-layout>

      <!-- Footer -->
      <umb-footer-layout slot="footer">
        <uui-button slot="actions" look="primary" color="positive" @click=${this._handleSave}>
          Save
        </uui-button>
      </umb-footer-layout>
    </umb-body-layout>
  `;
}
```

### Header Styling

```css
#header {
  display: flex;
  align-items: center;
  gap: var(--uui-size-space-3);
  flex: 1;
  padding: var(--uui-size-space-4) 0;  /* Vertical padding for breathing room */
}

#header umb-icon {
  font-size: 24px;
  color: var(--uui-color-text-alt);
}

#name-input {
  flex: 1 1 auto;
  --uui-input-border-color: transparent;
  --uui-input-background-color: transparent;
  font-size: var(--uui-type-h5-size);
  font-weight: 700;
}

#name-input:hover,
#name-input:focus-within {
  --uui-input-border-color: var(--uui-color-border);
  --uui-input-background-color: var(--uui-color-surface);
}

.back-button {
  margin-right: var(--uui-size-space-2);
}
```

### Tab Navigation with URL Routing

Use `href` on tabs for URL-based routing (enables deep-linking):

```typescript
private _renderTabs(): unknown {
  return html`
    <uui-tab-group slot="header">
      <uui-tab
        label="Details"
        href="${this._routerPath}/tab/details"
        ?active=${this._activePath.includes("tab/details")}>
        Details
        ${this._hasDetailsErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
      </uui-tab>
      <uui-tab
        label="Settings"
        href="${this._routerPath}/tab/settings"
        ?active=${this._activePath.includes("tab/settings")}>
        Settings
      </uui-tab>
    </uui-tab-group>
  `;
}
```

### Tab Styling

```css
:host {
  --uui-tab-background: var(--uui-color-surface);
}

uui-tab-group {
  --uui-tab-divider: var(--uui-color-border);
  width: 100%;
}

/* Hide router-slot - we use it only for URL tracking, content is rendered inline */
umb-router-slot {
  display: none;
}
```

**Note:** The `umb-router-slot` is hidden because we only use it for URL tracking (so tab URLs work for deep-linking). The actual tab content is rendered inline based on the active path from router events.

### Property Layout (umb-property-layout)

Use `umb-property-layout` for 2-column label/editor layout. This gives you:
- 200px label column + flexible editor column
- Sticky labels on scroll (horizontal mode)
- Support for mandatory and invalid states

```typescript
html`
  <umb-property-layout
    label="Product Type"
    description="Categorize your product for reporting"
    ?mandatory=${true}
    ?invalid=${!!this._fieldErrors.productType}>
    <uui-select
      slot="editor"
      .options=${this._getProductTypeOptions()}
      @change=${this._handleProductTypeChange}>
    </uui-select>
  </umb-property-layout>
`
```

**Attributes:**
- `label`: Property name displayed in left column
- `description`: Help text shown below label
- `mandatory`: Shows required asterisk
- `invalid`: Shows error badge indicator
- `orientation`: `'horizontal'` (default) or `'vertical'` (label above editor)

### Property Grouping with uui-box

Wrap related properties in `<uui-box headline="Group Name">`:

```typescript
html`
  <uui-box headline="Basic Information">
    <umb-property-layout label="Name" ...></umb-property-layout>
    <umb-property-layout label="Description" ...></umb-property-layout>
  </uui-box>

  <uui-box headline="Pricing">
    <umb-property-layout label="Price" ...></umb-property-layout>
    <umb-property-layout label="Tax Group" ...></umb-property-layout>
  </uui-box>
`
```

**Box Styling:**
```css
uui-box {
  --uui-box-default-padding: var(--uui-size-space-5);  /* Padding on all sides */
}

/* Use .tab-content wrapper with gap instead of margins on boxes */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--uui-size-space-5);  /* Consistent spacing between boxes */
}
```

### Validation Hints on Tabs

Display validation state on tabs using badges in the `extra` slot:

```typescript
// For errors (red, attention-grabbing)
${hasErrors ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}

// For warnings (yellow)
${hasWarnings ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
```

### Footer Breadcrumb Navigation

For child entities (e.g., a variant of a product, an item within a parent), add breadcrumb navigation in the footer to show hierarchy and enable quick navigation back to the parent:

```typescript
private _renderFooter(): unknown {
  return html`
    <umb-footer-layout slot="footer">
      <!-- Breadcrumb in default slot (before actions) -->
      <uui-breadcrumbs>
        <uui-breadcrumb-item href=${getParentDetailHref(this._parentId)}>
          ${this._parentName || "Parent"}
        </uui-breadcrumb-item>
        <uui-breadcrumb-item>
          ${this._currentItemName || "Current Item"}
        </uui-breadcrumb-item>
      </uui-breadcrumbs>

      <!-- Save button in actions slot -->
      <uui-button
        slot="actions"
        look="primary"
        color="positive"
        @click=${this._handleSave}
        ?disabled=${this._isSaving}>
        ${this._isSaving ? "Saving..." : "Save Changes"}
      </uui-button>
    </umb-footer-layout>
  `;
}
```

**Key points:**
- Place `<uui-breadcrumbs>` in the default slot (no slot attribute needed)
- Use `href` on breadcrumb items for navigation (enables Ctrl+Click to open in new tab)
- The last item (current page) should NOT have an href - it represents the current location
- Combine with a back button in the header for dual navigation options

**Breadcrumb styling:**
```css
uui-breadcrumbs {
  font-size: 0.875rem;
}
```

### Complete Example

See [product-detail.element.ts](../src/Merchello/Client/src/products/components/product-detail.element.ts) for a complete implementation of the workspace editor pattern.

See [variant-detail.element.ts](../src/Merchello/Client/src/products/components/variant-detail.element.ts) for an example of a child entity view with breadcrumb navigation in the footer.

---

## Using Umbraco Property Editors with DataType Configuration

When you want to use Umbraco's built-in property editors (like TipTap Rich Text, Media Picker, etc.) in your custom components with configuration from a DataType, follow this pattern.

### Why Use DataType Configuration?

- Users can customize the editor through Settings > Data Types (toolbar options, allowed extensions, etc.)
- Consistent with how Umbraco content editors work
- Configuration is stored in Umbraco and can be changed without code changes

### Step 1: Import the Property Editor Package (CRITICAL!)

Custom elements must be imported before they can be used. Without this, the element renders as empty.

```typescript
// Import the package to register the custom element
import "@umbraco-cms/backoffice/tiptap";  // For umb-input-tiptap
import "@umbraco-cms/backoffice/media";   // For umb-input-media (if needed)
```

### Step 2: Load DataType Configuration

Use `UmbDataTypeDetailRepository` to fetch the DataType configuration. This handles authentication automatically.

```typescript
import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type { UmbPropertyEditorConfigCollection as UmbPropertyEditorConfigCollectionType } from "@umbraco-cms/backoffice/property-editor";

@customElement("my-editor")
export class MyEditor extends UmbElementMixin(LitElement) {
  // State to hold the configuration
  @state() private _editorConfig: UmbPropertyEditorConfigCollectionType | undefined = undefined;

  // Repository for loading DataType configuration
  #dataTypeRepository = new UmbDataTypeDetailRepository(this);

  async connectedCallback() {
    super.connectedCallback();
    
    // Load the DataType configuration
    // The dataTypeKey should come from your API/settings
    const dataTypeKey = "your-datatype-guid-here";
    await this._loadDataTypeConfig(dataTypeKey);
  }

  private async _loadDataTypeConfig(dataTypeKey: string): Promise<void> {
    try {
      // Request the DataType through Umbraco's repository (handles auth)
      const { data } = await this.#dataTypeRepository.requestByUnique(dataTypeKey);
      
      if (!data) {
        console.error("DataType not found:", dataTypeKey);
        this._setFallbackConfig();
        return;
      }

      // Observe the DataType to get its configuration reactively
      this.observe(
        await this.#dataTypeRepository.byUnique(dataTypeKey),
        (dataType) => {
          if (!dataType) return;
          
          // Create the config collection from the DataType's values
          // Values is an array like: [{alias: "extensions", value: [...]}, {alias: "toolbar", value: [...]}]
          this._editorConfig = new UmbPropertyEditorConfigCollection(dataType.values);
        },
        '_observeDataType',
      );
    } catch (error) {
      console.error("Failed to load DataType configuration:", error);
      this._setFallbackConfig();
    }
  }

  private _setFallbackConfig(): void {
    // Provide sensible defaults if DataType cannot be loaded
    this._editorConfig = new UmbPropertyEditorConfigCollection([
      { alias: "extensions", value: ["Umb.Tiptap.Bold", "Umb.Tiptap.Italic"] },
      { alias: "toolbar", value: [[["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic"]]] },
    ]);
  }
}
```

### Step 3: Render the Property Editor

Pass the configuration to the property editor component:

```typescript
private _renderEditor(): unknown {
  // Show loading state while config is being fetched
  if (!this._editorConfig) {
    return html`<uui-loader-bar></uui-loader-bar>`;
  }

  return html`
    <umb-input-tiptap
      .configuration=${this._editorConfig}
      .value=${this._value || ""}
      @change=${this._handleChange}>
    </umb-input-tiptap>
  `;
}

private _handleChange(e: Event): void {
  const target = e.target as HTMLElement & { value?: string };
  this._value = target?.value || "";
}
```

### DataType Values Structure

The DataType's `values` property is an array of `{alias, value}` pairs. Different property editors expect different aliases:

**TipTap Rich Text Editor:**
```typescript
[
  {
    alias: "extensions",
    value: [
      "Umb.Tiptap.RichTextEssentials",
      "Umb.Tiptap.Bold",
      "Umb.Tiptap.Italic",
      "Umb.Tiptap.Link",
      // ... more extension aliases
    ]
  },
  {
    alias: "toolbar",
    value: [
      [  // Rows
        [  // Groups
          "Umb.Tiptap.Toolbar.Bold",
          "Umb.Tiptap.Toolbar.Italic"
        ],
        [
          "Umb.Tiptap.Toolbar.Link",
          "Umb.Tiptap.Toolbar.Unlink"
        ]
      ]
    ]
  },
  { alias: "maxImageSize", value: 800 },
  { alias: "overlaySize", value: "medium" }
]
```

### Backend: Ensure DataType Exists

For a robust solution, create a service that ensures your DataType exists on startup:

```csharp
// MerchelloDataTypeInitializer.cs
public class MerchelloDataTypeInitializer
{
    private readonly IDataTypeService _dataTypeService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _serializer;

    public async Task EnsureDataTypeExistsAsync()
    {
        // Check if DataType already exists
        var dataType = await _dataTypeService.GetAsync(YOUR_DATATYPE_KEY);
        if (dataType != null) return;

        // Get the property editor (e.g., Rich Text)
        if (!_propertyEditors.TryGet("Umbraco.RichText", out var propertyEditor))
            return;

        // Create DataType with configuration
        dataType = new DataType(propertyEditor, _serializer, -1)
        {
            Name = "My Rich Text Editor",
            EditorUiAlias = "Umb.PropertyEditorUi.Tiptap",
            ConfigurationData = new Dictionary<string, object>
            {
                { "extensions", new[] { "Umb.Tiptap.Bold", "Umb.Tiptap.Italic", /* ... */ } },
                { "toolbar", new[] { new[] { new[] { "Umb.Tiptap.Toolbar.Bold" } } } },
            }
        };

        await _dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);
    }
}
```

### Backend: Expose DataType Key via API

Create an endpoint to expose the DataType key to the frontend:

```csharp
[HttpGet("settings/description-editor")]
public IActionResult GetDescriptionEditorSettings()
{
    return Ok(new {
        DataTypeKey = _initializer.GetDataTypeKey(),
        PropertyEditorUiAlias = "Umb.PropertyEditorUi.Tiptap"
    });
}
```

### Common Mistakes

1. **Forgetting to import the package** - The custom element won't be registered, rendering blank:
   ```typescript
   // WRONG - element renders empty
   html`<umb-input-tiptap .configuration=${config}></umb-input-tiptap>`
   
   // CORRECT - import package first
   import "@umbraco-cms/backoffice/tiptap";
   html`<umb-input-tiptap .configuration=${config}></umb-input-tiptap>`
   ```

2. **Using plain fetch instead of repository** - Will get 401 Unauthorized because auth token isn't included:
   ```typescript
   // WRONG - no auth token
   const response = await fetch(`/umbraco/management/api/v1/data-type/${key}`);
   
   // CORRECT - repository handles auth
   const { data } = await this.#dataTypeRepository.requestByUnique(key);
   ```

3. **Not checking if config is loaded** - Component may render before config is ready:
   ```typescript
   // WRONG - may render with undefined config
   return html`<umb-input-tiptap .configuration=${this._config}></umb-input-tiptap>`;
   
   // CORRECT - show loading state
   if (!this._config) return html`<uui-loader-bar></uui-loader-bar>`;
   return html`<umb-input-tiptap .configuration=${this._config}></umb-input-tiptap>`;
   ```

4. **Wrong value structure for config** - Must be array of `{alias, value}` objects:
   ```typescript
   // WRONG - plain object
   new UmbPropertyEditorConfigCollection({ extensions: [...], toolbar: [...] });
   
   // CORRECT - array of alias/value pairs
   new UmbPropertyEditorConfigCollection([
     { alias: "extensions", value: [...] },
     { alias: "toolbar", value: [...] }
   ]);
   ```

### Available Property Editor Components

| Component | Package Import | Property Editor UI Alias |
|-----------|---------------|-------------------------|
| `umb-input-tiptap` | `@umbraco-cms/backoffice/tiptap` | `Umb.PropertyEditorUi.Tiptap` |
| `umb-input-media` | `@umbraco-cms/backoffice/media` | `Umb.PropertyEditorUi.MediaPicker` |
| `umb-input-content-picker` | `@umbraco-cms/backoffice/content` | `Umb.PropertyEditorUi.ContentPicker` |
| `umb-input-date-time` | `@umbraco-cms/backoffice/datetime` | `Umb.PropertyEditorUi.DatePicker` |

### Complete Example

See [product-detail.element.ts](../src/Merchello/Client/src/products/components/product-detail.element.ts) for a complete implementation using TipTap with DataType configuration.

---

## Programmatic Block List Creation (C#)

When importing content or programmatically creating Block List/Block Grid data from C#, you need to understand the JSON structure.

### Block List Data Structure

Block Lists consist of three components:

```json
{
  "layout": {
    "Umbraco.BlockList": [
      { "contentUdi": "umb://element/guid-here" }
    ]
  },
  "contentData": [
    {
      "udi": "umb://element/guid-here",
      "contentTypeKey": "element-type-guid",
      "propertyAlias": "value"
    }
  ],
  "settingsData": []
}
```

| Component | Purpose |
|-----------|---------|
| `layout` | Defines block order, ties each item to a UDI |
| `contentData` | Holds actual block content with properties matching element type |
| `settingsData` | Optional settings element (must exist in JSON even if empty array) |

### Creating Blocks Programmatically

```csharp
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using System.Text.Json;

public class BlockListImporter
{
    private readonly IContentService _contentService;
    private readonly IContentTypeService _contentTypeService;

    public BlockListImporter(IContentService contentService, IContentTypeService contentTypeService)
    {
        _contentService = contentService;
        _contentTypeService = contentTypeService;
    }

    public void ImportBlocks(IContent page, string propertyAlias, List<BlockItemDto> items)
    {
        // Get the element type GUID
        var elementType = _contentTypeService.Get("myBlockElementType");
        if (elementType == null) return;

        var layout = new List<object>();
        var contentData = new List<object>();

        foreach (var item in items)
        {
            // Generate unique UDI for each block
            var blockGuid = Guid.NewGuid();
            var udi = Udi.Create("element", blockGuid);

            // Add to layout (defines order)
            layout.Add(new { contentUdi = udi.ToString() });

            // Add to contentData (actual content)
            contentData.Add(new
            {
                udi = udi.ToString(),
                contentTypeKey = elementType.Key,
                // Property aliases must match your element type definition
                title = item.Title,
                description = item.Description,
                // Add more properties as needed
            });
        }

        // Build the complete Block List structure
        var blockListValue = new
        {
            layout = new { Umbraco.BlockList = layout },
            contentData = contentData,
            settingsData = Array.Empty<object>()  // Required even if empty
        };

        // Serialize and assign to content
        var json = JsonSerializer.Serialize(blockListValue);
        page.SetValue(propertyAlias, json);

        // Save and optionally publish
        _contentService.Save(page);
        // _contentService.Publish(page, ["*"]);  // Publish all cultures
    }
}
```

### Key Points

1. **UDI Generation**: Use `Udi.Create("element", Guid.NewGuid())` for each block
2. **Element Type Key**: Get via `_contentTypeService.Get("alias").Key`
3. **Property Aliases**: Must exactly match the element type's property aliases
4. **Settings Data**: Always include `settingsData` array (even if empty)
5. **Layout Key**: Use `"Umbraco.BlockList"` for Block List, `"Umbraco.BlockGrid"` for Block Grid

### Block Grid Differences

Block Grid uses the same structure but with additional positioning data:

```csharp
layout.Add(new
{
    contentUdi = udi.ToString(),
    columnSpan = 12,  // Grid column span
    rowSpan = 1,      // Grid row span
    areas = Array.Empty<object>()  // Nested areas if applicable
});
```

### Required Services

| Service | Purpose |
|---------|---------|
| `IContentService` | Create, save, publish content |
| `IContentTypeService` | Get element type definitions and GUIDs |
| `IMediaService` | If blocks reference media items |