# Umbraco V17 Backoffice Extension Development

## Architecture
- Web Components + TypeScript + Lit + Vite
- Extension manifest system (TS-based registration)
- Import from `@umbraco-cms/backoffice/*`
- Base classes: `UmbElementMixin(LitElement)` | `UmbLitElement`
- Context API: `consumeContext(TOKEN, callback)` for DI

> Uses TypeScript manifest registration. See [Merchello Patterns](#merchello-project-patterns).
> Consult https://docs.umbraco.com/umbraco-cms for additional reference.

## Manifest Common Properties
```typescript
{ type, alias, name, js?: () => import('./file.js'), api?: () => import('./file.js'),
  weight?: number, meta?: object, conditions?: Array, kind?: string }
```
Use `js` for lazy-loading elements/views, `api` for context/action classes, `element` for direct references.

## Extension Types Reference

| Type | Required Meta | Kind | Common Conditions |
|------|--------------|------|-------------------|
| `section` | `label`, `pathname` | — | `Umb.Condition.SectionUserPermission` |
| `menu` | — | — | — |
| `dashboard` | `label`, `pathname` | — | `Umb.Condition.SectionAlias` |
| `propertyEditorUi` | `label`, `propertyEditorSchemaAlias`, `icon`, `group` | — | — |
| `tree` | `repositoryAlias` | `default`* | — |
| `treeItem` | — (`forEntityTypes`) | `default` | — |
| `menuItem` | `label`, `menus`, `treeAlias` (if kind:'tree') | `tree` | — |
| `workspace` | `entityType`, `headline` (if default) | `default`\|`routable` | — |
| `workspaceView` | `label`, `pathname`, `icon` | — | `Umb.Condition.WorkspaceAlias` |
| `workspaceAction` | `label`, `icon` | `default` | `Umb.Condition.WorkspaceAlias` |
| `entityAction` | `label`, `icon` (`forEntityTypes`) | — | `Umb.Condition.UserPermission` |
| `entityBulkAction` | `label`, `repositoryAlias` (`forEntityTypes`) | — | `Umb.Condition.CollectionAlias` |
| `collection` | `repositoryAlias` | — | — |
| `collectionView` | `label`, `icon`, `pathName` | — | `Umb.Condition.CollectionAlias` |
| `sectionView` | `label`, `pathname`, `icon` | — | `Umb.Condition.SectionAlias` |
| `sectionSidebarApp` | `label`, `menu` (if kind:'menu') | `menu` | `Umb.Condition.SectionAlias` |
| `headerApp` | — | — | — |
| `workspaceFooterApp` | — | — | `Umb.Condition.WorkspaceAlias` |
| `propertyAction` | `label`, `icon` (`forPropertyEditorUis`) | — | — |
| `searchProvider` | `label` | — | — |
| `globalContext` | — | — | — |
| `workspaceContext` | — | — | `Umb.Condition.WorkspaceAlias` |
| `condition` | — | — | — |
| `store` | — | — | — |
| `repository` | — | — | — |
| `icons` | — (`js`) | — | — |
| `localization` | `culture` (`js`) | — | — |
| `backofficeEntryPoint` | — | — | — |
| `ufmFilter` | `alias` (meta) | — | — |
| `ufmComponent` | `alias` (meta) | — | — |
| `entitySign` | `forEntityTypes`, `forEntityFlags` (meta: `iconName`, `label`, `iconColorAlias`) | `icon` | — |

## UFM (Umbraco Form Markup)

Custom filters and components to transform/render values in Umbraco's markup syntax.

### UFM Filter
Transforms value with optional parameters:
```typescript
// manifest.ts
{ type: 'ufmFilter', alias: 'My.DateFormat.Filter', name: 'Date Format Filter',
  api: () => import('./date-format-filter.js'), meta: { alias: 'dateFormat' } }
// Usage: {= value | dateFormat: 'yyyy-MM-dd' =}

// date-format-filter.ts
import { UmbUfmFilterBase } from '@umbraco-cms/backoffice/ufm';
export class DateFormatFilter extends UmbUfmFilterBase {
  filter(value: unknown, ...args: Array<unknown>): unknown {
    if (!value) return '';
    const format = args[0] as string ?? 'yyyy-MM-dd';
    return formatDate(value as string, format);
  }
}
export { DateFormatFilter as api };
```

### UFM Component
Renders custom markup from token:
```typescript
// manifest.ts
{ type: 'ufmComponent', alias: 'My.Tag.Component', name: 'Tag Component',
  api: () => import('./tag-component.js'), meta: { alias: 'tag' } }
// Usage: {tag color="blue"}Label{/tag}

// tag-component.ts
import { UmbUfmComponentBase } from '@umbraco-cms/backoffice/ufm';
export class TagComponent extends UmbUfmComponentBase {
  render(token: unknown): string {
    const attrs = this.getAttributes(token);
    const color = attrs?.color ?? 'default';
    return `<span class="tag tag-${color}">${token.text}</span>`;
    // For async: return `<ufm-my-tag data-id="${token.text}"></ufm-my-tag>`;
  }
}
export { TagComponent as api };
```

### UFM Web Element (async operations)
```typescript
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UMB_UFM_RENDER_CONTEXT } from '@umbraco-cms/backoffice/ufm';

@customElement('ufm-my-tag')
export class UfmMyTagElement extends UmbLitElement {
  constructor() {
    super();
    this.consumeContext(UMB_UFM_RENDER_CONTEXT, (ctx) => {
      this.observe(ctx.value, (value) => { /* render based on value */ });
    });
  }
}
```

### UFM Naming
- Extension aliases: Dot notation (`My.DateFormat.Filter`)
- UFM aliases (meta): camelCase (`dateFormat`)
- Web component tags: kebab-case with prefix (`<ufm-my-tag>`)

## Entity Signs (Visual Indicators)

Visual indicators on content items in trees/collections without JS implementation.

### Architecture
- **C# Backend**: `IFlagProvider` determines which items receive flags
- **TS Manifest**: `entitySign` extension defines visual appearance
- Flagging is purely C# concern - no separate TS files needed

### C# Flag Provider
```csharp
using Umbraco.Cms.Core.Models.ContentEditing;
using Umbraco.Cms.Core.Signs;

public class LockedDocumentFlagProvider : IFlagProvider {
    public async Task PopulateFlagsAsync(FlagProviderContext context) {
        foreach (var item in context.Items) {
            if (item is DocumentTreeItemResponseModel doc && doc.DocumentType.Alias == "lockedPage")
                item.Flags.Add("locked");
        }
    }
}

// Registration (Composer)
public class MyComposer : IComposer {
    public void Compose(IUmbracoBuilder builder) {
        builder.SignProviders().Append<LockedDocumentFlagProvider>();
    }
}
```

### Manifest
```typescript
{ type: "entitySign", kind: "icon", alias: "My.LockedSign", name: "Locked Document Sign",
  forEntityTypes: ["document"], forEntityFlags: ["locked"], weight: 100,
  meta: { iconName: "icon-lock", label: "Locked", iconColorAlias: "danger" } }
```
Color aliases: `danger`, `warning`, `positive`, etc.

Use cases: locked/protected content, workflow states, special conditions, validation warnings.

## Full Extension Examples

### Custom Section with Tree
```typescript
// section/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  { type: "section", alias: "My.Section", name: "My Section",
    meta: { label: "My Section", pathname: "my-section" },
    conditions: [{ alias: "Umb.Condition.SectionUserPermission", match: "My.Section" }] },
  { type: "menu", alias: "My.Menu", name: "My Menu" },
  { type: "sectionSidebarApp", kind: "menu", alias: "My.SidebarApp", name: "My Sidebar", weight: 100,
    meta: { label: "My Menu", menu: "My.Menu" },
    conditions: [{ alias: "Umb.Condition.SectionAlias", match: "My.Section" }] },
  { type: "dashboard", alias: "My.Dashboard", name: "My Dashboard",
    js: () => import("./my-dashboard.element.js"), weight: 100,
    meta: { label: "Dashboard", pathname: "dashboard" },
    conditions: [{ alias: "Umb.Condition.SectionAlias", match: "My.Section" }] },
];

// tree/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  { type: "repository", alias: "My.Tree.Repository", name: "My Tree Repository",
    api: () => import("./repository.js") },
  { type: "tree", kind: "default", alias: "My.Tree", name: "My Tree",
    meta: { repositoryAlias: "My.Tree.Repository" } },
  { type: "treeItem", kind: "default", alias: "My.TreeItem", name: "My Tree Item",
    forEntityTypes: ["my-root", "my-item"] },
  { type: "menuItem", kind: "tree", alias: "My.MenuItem", name: "My Menu Item", weight: 100,
    meta: { label: "My Tree", menus: ["My.Menu"], treeAlias: "My.Tree" } },
];

// workspace/manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  { type: "workspace", kind: "default", alias: "My.Root.Workspace", name: "My Root Workspace",
    meta: { entityType: "my-root", headline: "My Section" } },
  { type: "workspace", kind: "default", alias: "My.Item.Workspace", name: "My Item Workspace",
    meta: { entityType: "my-item", headline: "Item" } },
  { type: "workspaceView", alias: "My.Item.Workspace.View", name: "My Item View",
    js: () => import("./my-item-view.element.js"), weight: 100,
    meta: { label: "Details", pathname: "details", icon: "icon-settings" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "My.Item.Workspace" }] },
];
```

### Dashboard
```typescript
{ type: 'dashboard', alias: 'My.Dashboard', js: () => import('./dashboard.element.js'), weight: 100,
  meta: { label: 'My Dashboard', pathname: 'my-dashboard' },
  conditions: [{ alias: 'Umb.Condition.SectionAlias', match: 'Umb.Section.Content' }] }
```

### Property Editor UI
```typescript
{ type: 'propertyEditorUi', alias: 'My.PropertyEditor', js: () => import('./editor.element.js'),
  meta: { label: 'My Editor', propertyEditorSchemaAlias: 'Umbraco.Plain.String', icon: 'icon-code', group: 'common',
    settings: {
      properties: [{ alias: 'config1', label: 'Config', propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox' }],
      defaultData: [{ alias: 'config1', value: 'default' }]
    }
  }
}
```

### EntityAction
```typescript
{ type: 'entityAction', alias: 'My.EntityAction', forEntityTypes: ['document'],
  api: () => import('./action.js'), meta: { label: 'My Action', icon: 'icon-edit' },
  conditions: [{ alias: 'Umb.Condition.UserPermission', allOf: ['Umb.User.Permission.Update'] }] }
```

## Compact Extension Skeletons

```typescript
// Section
{ type: 'section', alias: 'My.Section', meta: { label: 'My Section', pathname: 'my-section' },
  conditions: [{ alias: 'Umb.Condition.SectionUserPermission', match: 'My.Section' }] }

// Menu (required for trees in custom sections)
{ type: 'menu', alias: 'My.Menu', name: 'My Menu' }

// Tree (kind: 'default' required!)
{ type: 'tree', kind: 'default', alias: 'My.Tree', name: 'My Tree',
  meta: { repositoryAlias: 'My.Tree.Repository' } }

// TreeItem
{ type: 'treeItem', kind: 'default', alias: 'My.TreeItem', forEntityTypes: ['my-root', 'my-item'] }

// MenuItem (tree kind)
{ type: 'menuItem', kind: 'tree', alias: 'My.MenuItem', weight: 100,
  meta: { label: 'My Tree', menus: ['My.Menu'], treeAlias: 'My.Tree' } }

// Workspace (simple)
{ type: 'workspace', kind: 'default', alias: 'My.Workspace',
  meta: { entityType: 'my-entity', headline: 'My Workspace' } }

// Workspace (routable - CRUD)
{ type: 'workspace', kind: 'routable', alias: 'My.Workspace',
  api: () => import('./workspace-context.js'), meta: { entityType: 'my-entity' } }

// WorkspaceView (use 'js' not 'element')
{ type: 'workspaceView', alias: 'My.View', js: () => import('./view.element.js'), weight: 100,
  meta: { label: 'View', pathname: 'view', icon: 'icon-document' },
  conditions: [{ alias: 'Umb.Condition.WorkspaceAlias', match: 'My.Workspace' }] }

// WorkspaceAction
{ type: 'workspaceAction', kind: 'default', alias: 'My.Action', api: () => import('./action.js'),
  weight: 100, meta: { label: 'Action', look: 'primary', color: 'positive' },
  conditions: [{ alias: 'Umb.Condition.WorkspaceAlias', match: 'My.Workspace' }] }

// SectionSidebarApp
{ type: 'sectionSidebarApp', kind: 'menu', alias: 'My.Sidebar', weight: 100,
  meta: { label: 'Menu', menu: 'My.Menu' },
  conditions: [{ alias: 'Umb.Condition.SectionAlias', match: 'My.Section' }] }

// Repository, Store, Context, Condition
{ type: 'repository', alias: 'My.Repository', api: () => import('./repository.js') }
{ type: 'store', alias: 'My.Store', api: () => import('./store.js') }
{ type: 'globalContext', alias: 'My.Context', api: () => import('./context.js') }
{ type: 'condition', alias: 'My.Condition', api: () => import('./condition.js') }

// Icons, Localization
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
  #onClick() { this.#notificationContext?.peek('positive', { data: { headline: 'Success!' } }); }
  render() {
    return html`<uui-box headline="My Dashboard">
      <uui-button @click=${this.#onClick} look="primary" label="Click"></uui-button>
    </uui-box>`;
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
  set config(config: UmbPropertyEditorConfigCollection | undefined) { /* config?.getValueByAlias('key') */ }
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

### Tree Repository
```typescript
// types.ts
import type { UmbTreeItemModel, UmbTreeRootModel } from "@umbraco-cms/backoffice/tree";

export interface MyTreeItemModel extends UmbTreeItemModel {
  entityType: string; unique: string; name: string; hasChildren: boolean; isFolder: boolean; icon?: string;
  parent: { unique: string | null; entityType: string };
}
export interface MyTreeRootModel extends UmbTreeRootModel {
  entityType: string; unique: null; name: string; hasChildren: boolean; isFolder: boolean;
}
export const MY_ROOT_ENTITY_TYPE = "my-root";
export const MY_ITEM_ENTITY_TYPE = "my-item";

// data-source.ts
import type { UmbTreeAncestorsOfRequestArgs, UmbTreeChildrenOfRequestArgs, UmbTreeDataSource, UmbTreeRootItemsRequestArgs } from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { MyTreeItemModel } from "./types.js";
import { MY_ROOT_ENTITY_TYPE, MY_ITEM_ENTITY_TYPE } from "./types.js";

export class MyTreeDataSource extends UmbControllerBase implements UmbTreeDataSource<MyTreeItemModel> {
  async getRootItems(_args: UmbTreeRootItemsRequestArgs) {
    const rootItems: Array<MyTreeItemModel> = [{
      entityType: MY_ITEM_ENTITY_TYPE, unique: "item-1", name: "My Item",
      hasChildren: false, isFolder: false, icon: "icon-settings",
      parent: { unique: null, entityType: MY_ROOT_ENTITY_TYPE },
    }];
    return { data: { items: rootItems, total: rootItems.length } };
  }
  async getChildrenOf(_args: UmbTreeChildrenOfRequestArgs) { return { data: { items: [], total: 0 } }; }
  async getAncestorsOf(_args: UmbTreeAncestorsOfRequestArgs) { return { data: [] }; }
}

// repository.ts
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UmbTreeRepositoryBase, type UmbTreeRepository } from "@umbraco-cms/backoffice/tree";
import type { MyTreeItemModel, MyTreeRootModel } from "./types.js";
import { MY_ROOT_ENTITY_TYPE } from "./types.js";
import { MyTreeDataSource } from "./data-source.js";

export class MyTreeRepository extends UmbTreeRepositoryBase<MyTreeItemModel, MyTreeRootModel>
  implements UmbTreeRepository, UmbApi {
  constructor(host: UmbControllerHost) { super(host, MyTreeDataSource); }
  async requestTreeRoot() {
    const root: MyTreeRootModel = { unique: null, entityType: MY_ROOT_ENTITY_TYPE,
      name: "My Root", hasChildren: true, isFolder: true };
    return { data: root };
  }
}
export { MyTreeRepository as api };
```

### Action Skeletons
```typescript
// Workspace Action
import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
export class MyAction extends UmbWorkspaceActionBase {
  async execute() { const ctx = await this.getContext(UMB_WORKSPACE_CONTEXT); }
}
export const api = MyAction;

// Entity Action
import { UmbEntityActionBase } from '@umbraco-cms/backoffice/entity-action';
export class MyAction extends UmbEntityActionBase {
  async execute() { const { unique } = this.args; }
}
export const api = MyAction;

// Entity Bulk Action
import { UmbEntityBulkActionBase } from '@umbraco-cms/backoffice/entity-bulk-action';
export class MyBulkAction extends UmbEntityBulkActionBase {
  async execute() { for (const unique of this.selection) { /* bulk op */ } }
}
export const api = MyBulkAction;
```

### Custom Context
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

### Modal Usage
```typescript
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalToken } from '@umbraco-cms/backoffice/modal';

export const MY_MODAL = new UmbModalToken<MyData, MyResult>('My.Modal', { modal: { type: 'sidebar', size: 'small' } });

// In component
#modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
constructor() { super(); this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => { this.#modalManager = ctx; }); }
async #open() { const result = await this.#modalManager?.open(this, MY_MODAL, { data: {} }); }
```

### Confirm Modal Pattern

Use `UMB_CONFIRM_MODAL` for delete confirmations and destructive actions. **Important:** The modal's `onSubmit()` promise resolves on confirm and rejects on cancel - do NOT check the result value.

```typescript
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UMB_CONFIRM_MODAL } from '@umbraco-cms/backoffice/modal';

// Open confirm modal
const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
  data: {
    headline: 'Delete Item',
    content: 'Are you sure you want to delete this item?',
    confirmLabel: 'Delete',
    color: 'danger',
  },
});

// ✅ CORRECT: Use try-catch - onSubmit() resolves on confirm, rejects on cancel
try {
  await modalContext?.onSubmit();
} catch {
  return; // User cancelled
}
// User confirmed - proceed with deletion

// ❌ WRONG: Do NOT check the result value - it's always undefined/empty
// const result = await modalContext?.onSubmit().catch(() => undefined);
// if (!result) return; // BUG: Always returns because result is always falsy
```

### Custom Condition
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
      this.observe(ctx?.currentUser, (user) => { this._currentUser = user; }, '_currentUser');
    });
  }
  render() { return html`<p>Welcome, ${this._currentUser?.name}</p>`; }
}
```

### UmbCurrentUserModel Properties
| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name |
| `email` | `string` | Email address |
| `allowedSections` | `string[]` | Section aliases (e.g., `"Umb.Section.Content"`) |
| `fallbackPermissions` | `string[]` | Default permissions |
| `avatarUrls` | `string[]` | Avatar image URLs |
| `documentStartNodeUniques` | `string[]` | Document start node GUIDs |
| `hasDocumentRootAccess` | `boolean` | Can access document root |
| `hasMediaRootAccess` | `boolean` | Can access media root |
| `mediaStartNodeUniques` | `string[]` | Media start node GUIDs |
| `unique` | `string` | User GUID |
| `userName` | `string` | Login username |
| `languageIsoCode` | `string` | Preferred language |

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
html`<uui-box headline="Title">
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
</uui-box>`
```

### Component Properties
| Component | Key Properties |
|-----------|---------------|
| `uui-button` | `label`, `look` (primary/secondary/outline/placeholder), `color` (default/positive/warning/danger) |
| `uui-input` | `.value`, `placeholder`, `?readonly`, `@input` |
| `uui-box` | `headline` |
| `uui-badge` | `color`, `look` |

### uui-select
Does NOT support `<option>` children. Use `.options` property:
```typescript
const options = [
  { name: "Select...", value: "" },
  { name: "Option 1", value: "1" },
  { name: "Option 2", value: "2", selected: true }
];
html`<uui-select .options=${options} @change=${this.handleChange}></uui-select>`
```
| Property | Type | Description |
|----------|------|-------------|
| `.options` | `Array<{name, value, selected?}>` | Required array |
| `@change` | `UUISelectEvent` | Use `e.target.value` |
| `label` | `string` | Accessibility label |
| `placeholder` | `string` | Placeholder text |

> **IMPORTANT: Always include the `label` attribute**
>
> The `uui-select` component requires a `label` attribute for accessibility. Missing it logs a console warning.
>
> **Pattern for dynamic options** (reference: `service-region-modal.element.ts`):
> ```typescript
> // Simple getter method that computes options from state
> private _getOptions(): Array<{ name: string; value: string; selected?: boolean }> {
>   return [
>     { name: "Select...", value: "", selected: !this._selectedValue },
>     ...this._items.map((item) => ({
>       name: item.name,
>       value: item.value,
>       selected: item.value === this._selectedValue,
>     })),
>   ];
> }
>
> // Change handler updates source state; getter recomputes on next render
> private _handleChange(e: Event): void {
>   this._selectedValue = (e.target as HTMLSelectElement).value;
> }
>
> render() {
>   return html`<uui-select
>     label="Select option"
>     .options=${this._getOptions()}
>     @change=${this._handleChange}>
>   </uui-select>`;
> }
> ```
>
> Do NOT use `.value` with `uui-select` — use only `.options` with `selected: true` on the appropriate option.

### CSS Variables
- Spacing: `--uui-size-space-1` to `-6`, Layout: `--uui-size-layout-1` to `-5`
- Colors: `--uui-color-text`, `--uui-color-background`
- Text classes: `uui-h1`, `uui-h2`, `uui-text`, `uui-lead` (import `UmbTextStyles` from `@umbraco-cms/backoffice/style`)

### Filter Tabs (List Views)
```typescript
type FilterTab = "all" | "pending" | "completed";
@state() private _activeTab: FilterTab = "all";

private _handleTabClick(tab: FilterTab): void {
  this._activeTab = tab;
  this._page = 1;
  this._loadData();
}

private _renderTabs() {
  return html`<uui-tab-group>
    <uui-tab label="All" ?active=${this._activeTab === "all"} @click=${() => this._handleTabClick("all")}>All</uui-tab>
    <uui-tab label="Pending" ?active=${this._activeTab === "pending"} @click=${() => this._handleTabClick("pending")}>Pending</uui-tab>
    <uui-tab label="Completed" ?active=${this._activeTab === "completed"} @click=${() => this._handleTabClick("completed")}>Completed</uui-tab>
  </uui-tab-group>`;
}
```
Use `?active` binding, set `label` and inner text, reset pagination on tab change. Do NOT use custom button-based tabs.

### Data Tables
```typescript
private _renderTable() {
  return html`<div class="table-container"><uui-table class="my-table">
    <uui-table-head>
      <uui-table-head-cell class="checkbox-col">
        <uui-checkbox .checked=${this._allSelected} @change=${this._handleSelectAll} label="Select all"></uui-checkbox>
      </uui-table-head-cell>
      <uui-table-head-cell>Name</uui-table-head-cell>
      <uui-table-head-cell>Date</uui-table-head-cell>
      <uui-table-head-cell>Status</uui-table-head-cell>
    </uui-table-head>
    ${this._items.map((item) => html`<uui-table-row class="clickable" @click=${() => this._handleRowClick(item)}>
      <uui-table-cell class="checkbox-col" @click=${(e: Event) => e.stopPropagation()}>
        <uui-checkbox .checked=${this._selectedIds.has(item.id)} @change=${() => this._handleSelect(item.id)} label="Select ${item.name}"></uui-checkbox>
      </uui-table-cell>
      <uui-table-cell>${item.name}</uui-table-cell>
      <uui-table-cell>${formatRelativeDate(item.date)}</uui-table-cell>
      <uui-table-cell><span class="badge badge-positive">${item.status}</span></uui-table-cell>
    </uui-table-row>`)}
  </uui-table></div>`;
}
```

Required CSS:
```css
.table-container { overflow-x: auto; background: var(--uui-color-surface);
  border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
.my-table { width: 100%; }
uui-table-head-cell, uui-table-cell { white-space: nowrap; }
.checkbox-col { width: 40px; }
uui-table-row.clickable { cursor: pointer; }
uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }
```
Wrap `<uui-table>` in `.table-container`, stop propagation on checkbox clicks. Do NOT use raw `<table>` elements.

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
this.observe(myContext.counter, (value) => { this.#counter = value; }, '_counter');
```

> **CRITICAL: Always provide an alias (third parameter) when using `this.observe()` inside `consumeContext` callbacks.**
>
> Without an alias, each time `consumeContext` fires (which can happen multiple times during component lifecycle), a new subscription is created without canceling the previous one. This causes:
> - **Infinite API loops** from duplicate observers triggering the same fetch
> - **Memory leaks** from unreleased subscriptions
> - **Duplicate event handlers** firing multiple times
>
> ```typescript
> // ❌ BAD: Missing alias - creates duplicate subscriptions
> this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
>   this.observe(context.data, (data) => { this._data = data; });
> });
>
> // ✅ GOOD: Alias prevents duplicate subscriptions
> this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
>   this.observe(context.data, (data) => { this._data = data; }, '_data');
> });
> ```

### Property Dataset (Form Builder)
```typescript
html`<umb-property-dataset .value=${this.data} @change=${(e) => { this.data = e.target.value; }}>
  <umb-property label="Name" alias="name" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
</umb-property-dataset>`
```

## Conditions Reference
`Umb.Condition.SectionAlias`, `.WorkspaceAlias`, `.CollectionAlias`, `.UserPermission`, `.UserPermission.Document`, `.UserPermission.Media`, `.SectionUserPermission`, `.WorkspaceEntityType`

## Extension Kinds

| Type | Kind | Description |
|------|------|-------------|
| `tree` | `default`* | Required - standard tree behavior |
| `treeItem` | `default` | Standard tree item rendering |
| `workspace` | `default` | Simple (no routing/CRUD) |
| `workspace` | `routable` | Complex with routing for CRUD |
| `menuItem` | `tree` | Menu item displaying a tree |
| `sectionSidebarApp` | `menu` | Sidebar displaying a menu |
| `workspaceAction` | `default` | Standard action button |
| `workspaceView` | `collection` | View displaying collection |

`kind` provides pre-configured behavior. Omitting required values causes features to fail.

## Context Communication

Contexts are Controllers provided for a scope defined by DOM hierarchy. Components only communicate with contexts in their ancestor chain.

- **DOM-scoped**: Consume contexts provided by ancestors only
- **Auto lifecycle**: Initialize when navigating to scope, destroy when leaving
- **Workspace isolation**: Multiple instances maintain separate scopes

### Workspace Context Extension
```typescript
{ type: "workspaceContext", alias: "My.Counter.Context", name: "Counter Context",
  api: () => import("./counter-context.js"),
  conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }] }
```

### Complete Integration Example
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
  increment() { this.#count.setValue(this.#count.getValue() + 1); }
  reset() { this.#count.setValue(0); }
}
export { CounterContext as api };

// counter-action.ts
import { UmbWorkspaceActionBase } from "@umbraco-cms/backoffice/workspace";
import { COUNTER_CONTEXT } from "./counter-context.js";

export class IncrementAction extends UmbWorkspaceActionBase {
  async execute() { const context = await this.getContext(COUNTER_CONTEXT); context?.increment(); }
}
export { IncrementAction as api };

// counter-view.element.ts
import { html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { COUNTER_CONTEXT } from "./counter-context.js";

@customElement("my-counter-view")
export class CounterView extends UmbLitElement {
  @state() private _count = 0;
  constructor() {
    super();
    this.consumeContext(COUNTER_CONTEXT, (ctx) => {
      this.observe(ctx.count, (value) => { this._count = value; });
    });
  }
  render() { return html`<uui-box headline="Counter"><p>Count: ${this._count}</p></uui-box>`; }
}
export default CounterView;

// manifest.ts
export const manifests: Array<UmbExtensionManifest> = [
  { type: "workspaceContext", alias: "My.Counter.Context", name: "Counter Context",
    api: () => import("./counter-context.js"),
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }] },
  { type: "workspaceAction", kind: "default", alias: "My.Counter.Increment", name: "Increment Counter",
    api: () => import("./counter-action.js"), meta: { label: "Increment", look: "primary" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }] },
  { type: "workspaceView", alias: "My.Counter.View", name: "Counter View",
    js: () => import("./counter-view.element.js"),
    meta: { label: "Counter", pathname: "counter", icon: "icon-calculator" },
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }] },
];
```

## Best Practices
1. Lazy imports: `js: () => import('./file.js')` for elements
2. `api: () => import('./file.js')` for context/action classes
3. Export `default` for elements, `api` for classes
4. Declare global types: `HTMLElementTagNameMap`
5. Contexts over direct imports
6. Keep observables private, expose via `asObservable()`
7. Higher weight = appears first
8. Use UUI components for consistency
9. Naming: `Umb` prefix for core, your prefix for custom
10. Tree items need `parent: { unique, entityType }` structure

## UI/UX Design Standards

Every Merchello backoffice screen should feel like a native part of Umbraco — polished, predictable, and respectful of the admin's time. These standards apply to all backoffice UI.

### Design Principles

1. **Show, don't tell** — Use visual cues (badges, icons, colour) over long explanations. An admin should understand status at a glance.
2. **Immediate feedback** — Every action gets a visible response. Save → toast. Delete → confirmation then toast. Error → inline message at the field, not a generic alert.
3. **Progressive disclosure** — Show the common case first. Advanced options hide behind toggles, collapsible sections, or secondary tabs. Don't front-load complexity.
4. **Recover gracefully** — Errors should explain what went wrong and what to do next. Never show raw API errors, stack traces, or empty screens with no guidance.
5. **Respect the flow** — After creating something, navigate to it. After deleting, return to the list. After saving, stay on the same screen. Never leave the admin stranded.

### Empty States

Every list view and data-dependent section needs an empty state. Never show a blank screen or an empty table with just headers.

```typescript
private _renderEmptyState() {
  return html`<div class="empty-state">
    <uui-icon name="icon-trending-up" class="empty-state-icon"></uui-icon>
    <h3 class="empty-state-heading">No upsell rules yet</h3>
    <p class="empty-state-message">
      Upsell rules recommend products when trigger conditions are met in a customer's basket.
    </p>
    <uui-button look="primary" label="Create your first upsell rule"
      @click=${this._handleCreate}>Create Upsell Rule</uui-button>
  </div>`;
}
```

```css
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--uui-size-layout-4) var(--uui-size-layout-2); text-align: center;
}
.empty-state-icon { font-size: 48px; color: var(--uui-color-text-alt); margin-bottom: var(--uui-size-space-5); }
.empty-state-heading { margin: 0 0 var(--uui-size-space-3); color: var(--uui-color-text); }
.empty-state-message { margin: 0 0 var(--uui-size-space-5); color: var(--uui-color-text-alt); max-width: 420px; }
```

**Guidelines:**

- **Icon**: Relevant to the feature (not a generic "empty" icon)
- **Heading**: State what's missing ("No upsell rules yet", not "Nothing here")
- **Message**: One sentence explaining what the feature does and why the admin should care
- **Action**: Primary button to create the first item — reduce friction to zero
- **Filtered empty**: When a search/filter yields no results, show "No results match your filters" with a "Clear filters" button — distinct from the true empty state

### Loading States

Never show a blank screen while data loads. Use the appropriate loading pattern for the context.

**Full page load (initial visit):**
```typescript
private _renderLoading() {
  return html`<uui-loader-bar></uui-loader-bar>`;
}
```

**Inline refresh (pagination, filtering, tab switch):**
```typescript
// Dim existing content, don't replace it — avoids layout shift
render() {
  return html`<div class="content-area ${this._isLoading ? 'loading' : ''}">
    ${this._renderTable()}
  </div>`;
}
```
```css
.content-area.loading { opacity: 0.5; pointer-events: none; }
```

**Button actions (save, delete, activate):**
```typescript
html`<uui-button look="primary" color="positive"
  @click=${this._handleSave}
  ?disabled=${this._isSaving}
  .state=${this._isSaving ? "waiting" : undefined}>
  ${this._isSaving ? "Saving..." : "Save"}
</uui-button>`
```

**Guidelines:**

- First load: `<uui-loader-bar>` at the top of the content area
- Subsequent loads: Dim existing content rather than replacing with a loader — avoids jarring layout shifts
- Buttons: Disable and show "Saving..." / "Deleting..." text with `state="waiting"` during async operations
- Never block the entire screen for a non-blocking operation

### Error States

Errors should be specific, helpful, and appear where the admin can act on them.

**Field-level validation:**
```typescript
html`<umb-property-layout label="Name" mandatory
  ?invalid=${!!this._fieldErrors.name}
  description=${this._fieldErrors.name || "Internal identifier for this rule"}>
  <uui-input slot="editor" .value=${this._formData.name || ""}
    @input=${this._handleNameChange}
    ?invalid=${!!this._fieldErrors.name}></uui-input>
</umb-property-layout>`
```

**API error (save/load failure):**
```typescript
private _renderApiError() {
  if (!this._error) return nothing;
  return html`<uui-box class="error-box">
    <div class="error-content">
      <uui-icon name="icon-alert"></uui-icon>
      <div>
        <strong>${this._error.headline}</strong>
        <p>${this._error.message}</p>
      </div>
      ${this._error.retryable
        ? html`<uui-button look="secondary" label="Try again" @click=${this._retry}>Try again</uui-button>`
        : nothing}
    </div>
  </uui-box>`;
}
```

**Guidelines:**

- **Field errors**: Show on the field itself using `invalid` property and update the `description` to the error message. Use `<uui-badge>` on tabs to flag which tab has errors.
- **API errors**: Show an inline error box near the action that failed, not a modal. Include a retry button when the action is retryable.
- **Load failures**: Show the error in the content area with a retry option. Never show a blank screen.
- **Error messages**: Describe the problem in the admin's language ("Couldn't save — the name is already in use"), not technical language ("409 Conflict: unique constraint violation").
- **Never swallow errors silently**: If something fails, the admin must know.

### Feedback & Notifications

Every mutating action (create, save, delete, activate, deactivate) must produce visible feedback.

**Success — toast notification:**
```typescript
this.#notificationContext?.peek("positive", {
  data: { headline: "Upsell rule saved", message: "Changes have been saved successfully." },
});
```

**Destructive action — confirm first, then toast:**
```typescript
const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
  data: {
    headline: "Delete upsell rule",
    content: `"${rule.name}" will be permanently deleted. This cannot be undone.`,
    confirmLabel: "Delete",
    color: "danger",
  },
});
try {
  await modalContext?.onSubmit();
} catch {
  return; // Cancelled
}
await this._deleteRule(rule.id);
this.#notificationContext?.peek("positive", {
  data: { headline: "Upsell rule deleted" },
});
```

**Guidelines:**

- **Create**: Toast "Created" → navigate to the detail view
- **Save**: Toast "Saved" → stay on same screen, data refreshes
- **Delete**: Confirm modal (danger colour) → toast "Deleted" → navigate to list
- **Activate/Deactivate**: Toast "Activated" / "Deactivated" → refresh status in place
- **Bulk actions**: Toast with count ("3 rules activated")
- **Toast style**: Use `peek` (auto-dismiss) for success. Use `stay` for errors that need attention.
- **Confirm modals**: Always state the item name. Use danger colour for destructive actions. Confirm label should be the verb ("Delete", "Deactivate"), not "OK" or "Yes".

### List View UX

List views are the most-visited screens. They need to be fast, scannable, and actionable.

**Structure:**

```text
┌─────────────────────────────────────────────────────┐
│ [Create Button]                          [Search]    │
├─────────────────────────────────────────────────────┤
│ Tab: All | Active | Draft | Scheduled | ...          │
├─────────────────────────────────────────────────────┤
│ ☐ │ Name ▼    │ Status  │ Key Info  │ Date         │
│ ☐ │ Item 1    │ 🟢 Act  │ ...       │ Jan 28       │
│ ☐ │ Item 2    │ 🟡 Dra  │ ...       │ Jan 27       │
├─────────────────────────────────────────────────────┤
│ ← 1 2 3 ... →                        Showing 1-20   │
└─────────────────────────────────────────────────────┘
```

**Guidelines:**

- **Create button**: Top-right, primary look, always visible. If a creation flow uses a modal, open the modal. If inline, navigate directly.
- **Search**: Debounced (300ms), searches on name by default. Placeholder: "Search by name..."
- **Filter tabs**: Use `<uui-tab-group>` for status filtering (All, Active, Draft, etc.). Reset page to 1 on tab change. "All" tab always first.
- **Table rows**: Clickable (entire row navigates to detail). Checkbox column for bulk actions. Stop propagation on checkbox clicks.
- **Status badges**: Consistent colour mapping across the entire application — use `statusColor` from the DTO, never hardcode colours client-side.
- **Key columns first**: Name (always first, always a link), Status (visual badge), then context-specific columns, Date (always last or near-last).
- **Bulk actions**: Appear when items are selected. Common: activate, deactivate, delete. Always confirm destructive bulk actions.
- **Pagination**: Below the table. Show "Showing X-Y of Z". Reset to page 1 on search/filter change.
- **Sort**: Clickable column headers where sorting is supported. Visual indicator for current sort direction.

### Detail/Editor View UX

Detail views are where admins spend time creating and editing. They must be organised, forgiving, and efficient.

**Guidelines:**

- **Name field**: Always at the top in the header area, matching Umbraco's content editor pattern. Large font, transparent border until hover/focus.
- **Tab organisation**: Group related fields. Most important/frequently edited tab first. Read-only or advanced tabs last.
  - **Tab 1**: Core identity fields (name, description, status, key settings)
  - **Middle tabs**: Configuration (rules, display options, scheduling)
  - **Last tab**: Read-only data (analytics, audit, performance)
- **Tab error indicators**: When validation fails, show `<uui-badge slot="extra" color="danger" attention>!</uui-badge>` on tabs that contain errors so admins know where to look.
- **Save button**: Always in the footer (sticky), primary + positive colour. Shows "Saving..." during async. Disabled when no changes or when saving.
- **Back navigation**: Back arrow button in the header. Uses `href` (not `window.location`). Returns to the list view.
- **Unsaved changes**: If the admin navigates away with unsaved changes, warn them. (Use browser `beforeunload` or a workspace-level guard.)
- **Field layout**: Use `<umb-property-layout>` for consistent 2-column label/editor layout. Labels on the left, inputs on the right. Add `description` for non-obvious fields. Mark required fields with `mandatory`.
- **Grouping**: Use `<uui-box headline="...">` to group related fields within a tab. Keep groups to 3-6 fields.
- **Defaults**: Pre-fill sensible defaults for new entities. Priority: 1000. Max products: 4. Suppress if in cart: on. This reduces friction for the common case.

### Modal UX

Modals interrupt flow — use them deliberately.

**When to use modals:**

- **Create**: Quick-create with minimal fields (name + key options), then navigate to the full editor
- **Confirm**: Destructive actions (delete, deactivate)
- **Picker**: Selecting entities from a list (products, customers, segments)
- **Configuration**: Single-purpose settings that don't warrant a full page

**When NOT to use modals:**

- Editing complex data (use a full page instead)
- Showing read-only information (use an inline expandable section)
- Multi-step wizards longer than 2-3 steps

**Guidelines:**

- **Size**: Use `small` for confirmations and simple inputs. Use `medium` for pickers and forms. Avoid `large` unless absolutely necessary.
- **Create modals**: Collect only what's needed to create (name, maybe type), then redirect to the full detail editor. Don't front-load all fields into the modal.
- **Picker modals**: Include search, show name + helpful context (type, status), support multi-select where appropriate.
- **Close behaviour**: ESC and backdrop click should close (cancel). Don't trap the admin.
- **Focus**: Auto-focus the first input when the modal opens.

### Status Representation

Status badges must be visually consistent across every feature (orders, discounts, upsells, etc.).

**Status colour mapping (from DTO `statusColor` field):**

| Colour | CSS Class | Use For |
|--------|-----------|---------|
| `positive` | `badge-positive` | Active, Completed, Paid, Published |
| `warning` | `badge-warning` | Draft, Pending, Scheduled, Awaiting |
| `danger` | `badge-danger` | Expired, Failed, Cancelled, Overdue |
| `default` | `badge-default` | Disabled, Archived, Unknown |

```typescript
html`<span class="badge badge-${item.statusColor}">${item.statusLabel}</span>`
```

**Rule**: Always use `statusLabel` and `statusColor` from the backend DTO. Never derive badge colour from status enum values on the client — the backend is the source of truth.

### Microcopy & Help Text

Words in the UI are part of the design. They should be clear, concise, and consistent.

**Field labels:**

- Use sentence case ("Display location", not "Display Location")
- Be specific ("Maximum products to show", not "Max")
- Avoid jargon the admin wouldn't know

**Descriptions (help text below labels):**

- Explain *why*, not just *what*. "Lower number = higher priority. Rules are evaluated in priority order." vs "Enter the priority."
- Include examples for non-obvious fields. "e.g., 'Complete your bedroom' — shown to customers above the recommended products"
- Keep to one sentence where possible, two maximum

**Placeholder text:**

- Show format or example: `placeholder="e.g., Bed → Pillow Upsell"`
- Never repeat the label as placeholder text

**Confirmation dialogs:**

- Headline: Action + object ("Delete upsell rule")
- Body: Name the specific item + state the consequence. `"Bed → Pillow Upsell" will be permanently deleted. This cannot be undone.`
- Confirm button: Verb matching the action ("Delete"), not "OK" or "Confirm"

**Toast notifications:**

- Headline: Past tense of the action ("Upsell rule saved", "Rule activated")
- Message (optional): Only add if there's useful context ("Changes will take effect immediately")

**Empty states:**

- Heading: State what's missing ("No upsell rules yet")
- Message: One sentence on what the feature does
- Action: Verb phrase ("Create your first upsell rule")

### Rule Builders & Complex Inputs

Features like discounts and upsells have rule builders — complex, multi-part inputs. These need extra care.

**Guidelines:**

- **Visual structure**: Use a card-style layout for each rule. Clear visual boundary (border/background) separating rules from each other.
- **Add/Remove**: "Add rule" button below existing rules. Remove button (icon, not text) on each rule card. Confirm before removing if the rule has data.
- **OR/AND logic**: State the logic explicitly between rules. "Any of these triggers will activate this upsell" is clearer than showing "OR" between cards.
- **Entity selection**: Show selected entities as removable tags/chips. Display resolved names (not GUIDs). Include an entity count ("3 product types selected").
- **Dependent fields**: When a toggle reveals additional options (e.g., "Match trigger filters" → filter group picker), animate the reveal smoothly. Don't shift the entire layout jarringly.
- **Validation**: Require at least one rule where business logic demands it. Show inline errors ("Add at least one trigger rule") rather than blocking save with a generic error.
- **Guidance**: Include a brief sentence above the rule builder explaining what it does and how the logic works. First-time users shouldn't need to read docs.

```text
┌─────────────────────────────────────────────────┐
│ WHEN basket contains: (any match activates)      │
│                                                   │
│ ┌─ Rule 1 ──────────────────────────────── [×] ─┐│
│ │ Type: [Product Types ▼]                        ││
│ │ Selected: [Wooden Bed ×] [Metal Bed ×]         ││
│ │ ☐ Extract filter values from: [Size Group ×]   ││
│ └────────────────────────────────────────────────┘│
│                                                   │
│ [+ Add trigger rule]                              │
├───────────────────────────────────────────────────┤
│ THEN recommend:                                   │
│                                                   │
│ ┌─ Rule 1 ──────────────────────────────── [×] ─┐│
│ │ Type: [Product Types ▼]                        ││
│ │ Selected: [Coil Mattress ×] [Memory Mattress ×]││
│ │ ☑ Match trigger filter values                  ││
│ │   Matching groups: All extracted groups         ││
│ └────────────────────────────────────────────────┘│
│                                                   │
│ [+ Add recommendation rule]                       │
└───────────────────────────────────────────────────┘
```

### Accessibility

Accessibility is not optional. Every component must be usable with keyboard alone and work with screen readers.

- **Keyboard navigation**: All interactive elements reachable via Tab. Enter/Space to activate buttons and toggles. Escape to close modals.
- **Labels**: Every `<uui-button>` needs a `label` attribute. Every `<uui-input>` needs an associated label (via `<umb-property-layout>` or `aria-label`). Every `<uui-checkbox>` needs a `label`.
- **Focus management**: When a modal opens, focus the first input. When a modal closes, return focus to the trigger element. When deleting a list item, focus the next item or the list.
- **Colour**: Never use colour alone to convey status. Always pair with text labels or icons. The status badge shows both a colour and a text label.
- **ARIA**: Use `aria-live="polite"` for dynamic content updates (loading states, search results count). Use `role="status"` for toast notifications.

### Performance Perception

Actual speed matters, but perceived speed matters more. The UI should always feel responsive.

- **Optimistic updates**: For toggles (activate/deactivate), update the UI immediately and revert on failure. Don't wait for the API response to update the badge.
- **Debounce search**: 300ms debounce on search input. Show a subtle loading indicator in the search field during the debounce/fetch.
- **Pagination over infinite scroll**: Backoffice admins need predictable navigation. Use pagination with page size options (20, 50, 100).
- **Cache list state**: When navigating back from a detail view to the list, preserve the previous page, search, and filter state. Don't reset to page 1.
- **Lazy load tabs**: Only fetch data for a tab when the admin navigates to it. The Performance/Analytics tab shouldn't slow down the Details tab.

### Consistent Patterns Across Features

Every Merchello feature (Products, Orders, Discounts, Upsells, etc.) should use the same interaction patterns. An admin who learns one feature should intuitively know how to use the others.

| Pattern | Standard |
|---------|----------|
| List → Detail navigation | Click row → navigate to detail editor |
| Create flow | Button → Modal (name + minimal fields) → Navigate to detail |
| Save | Footer button, primary+positive, toast on success |
| Delete | Confirm modal (danger), toast on success, navigate to list |
| Status change | Button or toggle, toast on success, refresh in place |
| Back navigation | Header back arrow, `href` to list view |
| Search | Top-right, debounced, "Search by name..." placeholder |
| Filter | `<uui-tab-group>` for status/category, reset page on change |
| Pagination | Below table, "Showing X-Y of Z", page size options |
| Status display | Badge with `statusColor` + `statusLabel` from DTO |
| Error display | Inline at field level, badge on tab, toast for API errors |
| Empty state | Icon + heading + message + CTA button |

## Workspace View Scrolling

Views with scrollable content must use `umb-body-layout`:
```typescript
override render() {
  return html`<umb-body-layout header-fit-height main-no-padding>
    <div class="my-content"><!-- scrollable content --></div>
  </umb-body-layout>`;
}
static override styles = [css`
  :host { display: block; height: 100%; }
  .my-content { padding: var(--uui-size-layout-1); }
`];
```
- `umb-body-layout` has internal `#main` div with `overflow-y: auto` and `flex: 1`
- `:host` must have `height: 100%` for scroll constraint
- `header-fit-height`: header shrinks to content
- `main-no-padding`: removes default padding for custom control

## Routable Workspaces (Detail/Edit Views)

For CRUD operations navigating to specific entities.

**URL Pattern:** `section/{sectionPathname}/workspace/{entityType}/{routePath}`
Example: `section/merchello/workspace/merchello-orders/edit/orders/9cd851e3-da06-4563-be6a-b3a700b565fd`

For tree selection to persist, `routePath` must include tree item's `unique` value.

### Manifest
```typescript
{ type: "workspace", kind: "routable", alias: "My.Item.Detail.Workspace", name: "Item Detail Workspace",
  api: () => import("./item-detail-workspace.context.js"), meta: { entityType: "my-item" } }
```

### Workspace Context
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
    // Routes must be nested under list path for tree selection to persist
    this.routes.setRoutes([
      { path: "edit/items/:id", component: () => import("./item-detail.element.js"),
        setup: (_component, info) => { this.load(info.match.params.id); } },
      { path: "edit/items", component: () => import("./items-list.element.js") },
      { path: "", redirectTo: "edit/items" },
    ]);
  }
  getEntityType(): string { return "my-item"; }
  getUnique(): string | undefined { return this.#itemId; }
  async load(unique: string): Promise<void> {
    this.#itemId = unique;
    const { data, error } = await MyApi.getItem(unique);
    if (error) { console.error("Failed to load item:", error); return; }
    this.#item.setValue(data);
  }
}
export { MyItemDetailWorkspaceContext as api };
```

### Navigation (list → detail)
Use `href` attributes - never `window.location.hash` or `window.location.href`:
```typescript
private _getItemHref(id: string): string {
  // Relative path, NO leading slash, NO /umbraco/ prefix
  // Route must include list path (e.g., "edit/items/") for tree selection
  return `section/my-section/workspace/my-item/edit/items/${id}`;
}
render() {
  return html`<table>${this._items.map(item => html`
    <tr><td><a href=${this._getItemHref(item.id)}>${item.name}</a></td></tr>
  `)}</table>`;
}
```

### Common Mistakes
- Missing `routes.setRoutes()` - navigation won't work
- `window.location.hash = '#/...'` instead of `href` attribute
- Including hash in href: use `section/...` not `#/section/...`
- EntityType mismatch in manifest vs URL
- Absolute paths (`/umbraco/section/...`) cause full page reloads
- `window.location.href` causes full reload; use `history.pushState()` or navigation helpers
- Tree selection not persisting: Routes must nest under list path. Tree uses `location.includes(path)` for active state.

## Merchello Project Patterns

Merchello-specific differences only.

### Project Structure
```
src/Merchello/Client/
├── public/umbraco-package.json     # Minimal - loads bundle only
├── src/
│   ├── bundle.manifests.ts         # Entry point - aggregates manifests
│   ├── api/merchello-api.ts        # Custom API layer
│   ├── entrypoints/manifest.ts, entrypoint.ts
│   ├── section/manifest.ts, *.element.ts
│   ├── tree/manifest.ts, repository.ts, data-source.ts, types.ts
│   ├── settings/manifest.ts, *.element.ts
│   └── [feature]/manifest.ts, *.element.ts
```

### Bundle Registration
`umbraco-package.json`:
```json
{ "id": "Merchello", "name": "Merchello", "extensions": [
  { "type": "bundle", "alias": "Merchello.Bundle", "js": "/App_Plugins/Merchello/merchello.js" }
]}
```

`bundle.manifests.ts`:
```typescript
import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as section } from "./section/manifest.js";
import { manifests as tree } from "./tree/manifest.js";
import { manifests as settings } from "./settings/manifest.js";

export const manifests: Array<UmbExtensionManifest> = [...entrypoints, ...section, ...tree, ...settings];
```

### Entrypoint Pattern
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

### Custom API Layer
```typescript
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
1. Create `src/[feature]/`
2. Create `manifest.ts` exporting manifests array
3. Create `*.element.ts` components
4. Import and spread into `src/bundle.manifests.ts`

### Build Commands
```bash
cd src/Merchello/Client && npm install && npm run watch  # dev
npm run build  # prod
```
Output: `src/Merchello/wwwroot/App_Plugins/Merchello/`

### Key Differences
| Aspect | Standard | Merchello |
|--------|----------|-----------|
| Manifests | JSON | TypeScript |
| API | `tryExecute` + generated client | Custom fetch wrapper |
| Init | Implicit | Explicit `backofficeEntryPoint` |

### Navigation
Never use `window.location.href` - causes full reload and resets sidebar tree.

Use `@shared/utils/navigation.js`:
```typescript
import { getOrderDetailHref, navigateToOrderDetail, getMerchelloWorkspaceHref, navigateToMerchelloWorkspace } from "@shared/utils/navigation.js";
```

All paths are **relative** (`section/merchello/workspace/...`) for SPA routing.

**href attributes** (preferred):
```typescript
html`<a href=${getOrderDetailHref(order.id)}>${order.name}</a>`
html`<a href=${getMerchelloWorkspaceHref("merchello-product", `edit/${product.id}`)}>${product.name}</a>`
```

**Programmatic** (after modal submit, etc.):
```typescript
const result = await modal.onSubmit();
if (result?.created) { navigateToOrderDetail(result.invoiceId); }
navigateToMerchelloWorkspace("merchello-product", `edit/${productId}`);
```

**Adding new entity helpers** in `src/shared/utils/navigation.ts`:
```typescript
export const PRODUCT_ENTITY_TYPE = "merchello-product";
export function getProductDetailHref(productId: string): string {
  return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}
export function navigateToProductDetail(productId: string): void {
  navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}
```

## Workspace Editor Layout Pattern

For edit/detail views matching Umbraco's content editor look.

### Component Hierarchy
```
umb-body-layout (outer - header-fit-height main-no-padding)
├── slot="header" → uui-button (back), div#header (umb-icon + uui-input)
├── umb-body-layout (inner - header-fit-height header-no-padding)
│   ├── slot="header" → uui-tab-group (href routing)
│   └── main → div.tab-content (uui-box containers)
└── slot="footer" → umb-footer-layout → slot="actions" (save button)
```

- Outer: `main-no-padding` prevents double padding
- Inner: `header-no-padding` for flush tabs

### Header Layout
```typescript
render() {
  return html`<umb-body-layout header-fit-height main-no-padding>
    <uui-button slot="header" compact href=${getBackHref()} label="Back" class="back-button">
      <uui-icon name="icon-arrow-left"></uui-icon>
    </uui-button>
    <div id="header" slot="header">
      <umb-icon name="icon-box"></umb-icon>
      <uui-input id="name-input" .value=${this._formData.name || ""} @input=${this._handleNameChange}
        placeholder="Enter name..." ?invalid=${!!this._fieldErrors.name}></uui-input>
    </div>
    <umb-body-layout header-fit-height header-no-padding>
      ${this._renderTabs()}
      <umb-router-slot .routes=${this._routes} @init=${...} @change=${...}></umb-router-slot>
      <div class="tab-content">${this._renderActiveTabContent()}</div>
    </umb-body-layout>
    <umb-footer-layout slot="footer">
      <uui-button slot="actions" look="primary" color="positive" @click=${this._handleSave}>Save</uui-button>
    </umb-footer-layout>
  </umb-body-layout>`;
}
```

### Header Styling
```css
#header { display: flex; align-items: center; gap: var(--uui-size-space-3); flex: 1; padding: var(--uui-size-space-4) 0; }
#header umb-icon { font-size: 24px; color: var(--uui-color-text-alt); }
#name-input { flex: 1 1 auto; --uui-input-border-color: transparent; --uui-input-background-color: transparent;
  font-size: var(--uui-type-h5-size); font-weight: 700; }
#name-input:hover, #name-input:focus-within { --uui-input-border-color: var(--uui-color-border);
  --uui-input-background-color: var(--uui-color-surface); }
.back-button { margin-right: var(--uui-size-space-2); }
```

### Tab Navigation with URL Routing
```typescript
private _renderTabs(): unknown {
  return html`<uui-tab-group slot="header">
    <uui-tab label="Details" href="${this._routerPath}/tab/details" ?active=${this._activePath.includes("tab/details")}>
      Details ${this._hasDetailsErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
    </uui-tab>
    <uui-tab label="Settings" href="${this._routerPath}/tab/settings" ?active=${this._activePath.includes("tab/settings")}>Settings</uui-tab>
  </uui-tab-group>`;
}
```

### Tab Styling
```css
:host { --uui-tab-background: var(--uui-color-surface); }
uui-tab-group { --uui-tab-divider: var(--uui-color-border); width: 100%; }
umb-router-slot { display: none; }  /* URL tracking only */
```

### Property Layout (umb-property-layout)
2-column label/editor layout (200px label + flexible editor, sticky labels, mandatory/invalid states):
```typescript
html`<umb-property-layout label="Product Type" description="Categorize for reporting" ?mandatory=${true} ?invalid=${!!this._fieldErrors.productType}>
  <uui-select slot="editor" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
</umb-property-layout>`
```
Attributes: `label`, `description`, `mandatory`, `invalid`, `orientation` ('horizontal'|'vertical')

### Property Grouping
```typescript
html`<uui-box headline="Basic Information">
  <umb-property-layout label="Name" ...></umb-property-layout>
  <umb-property-layout label="Description" ...></umb-property-layout>
</uui-box>
<uui-box headline="Pricing">
  <umb-property-layout label="Price" ...></umb-property-layout>
</uui-box>`
```
```css
uui-box { --uui-box-default-padding: var(--uui-size-space-5); }
.tab-content { display: flex; flex-direction: column; gap: var(--uui-size-space-5); }
```

### Validation Hints on Tabs
```typescript
${hasErrors ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
${hasWarnings ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
```

### Footer Breadcrumb Navigation
For child entities:
```typescript
private _renderFooter(): unknown {
  return html`<umb-footer-layout slot="footer">
    <uui-breadcrumbs>
      <uui-breadcrumb-item href=${getParentDetailHref(this._parentId)}>${this._parentName || "Parent"}</uui-breadcrumb-item>
      <uui-breadcrumb-item>${this._currentItemName || "Current Item"}</uui-breadcrumb-item>
    </uui-breadcrumbs>
    <uui-button slot="actions" look="primary" color="positive" @click=${this._handleSave} ?disabled=${this._isSaving}>
      ${this._isSaving ? "Saving..." : "Save Changes"}
    </uui-button>
  </umb-footer-layout>`;
}
```
Use `href` on breadcrumb items, last item (current page) has no href.

Examples: [product-detail.element.ts](../src/Merchello/Client/src/products/components/product-detail.element.ts), [variant-detail.element.ts](../src/Merchello/Client/src/products/components/variant-detail.element.ts)

## Using Umbraco Property Editors with DataType Configuration

For Umbraco's built-in editors (TipTap, Media Picker) with DataType config.

### Step 1: Import Package (required!)
```typescript
import "@umbraco-cms/backoffice/tiptap";  // For umb-input-tiptap
import "@umbraco-cms/backoffice/media";   // For umb-input-media
```

### Step 2: Load DataType Configuration
```typescript
import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type { UmbPropertyEditorConfigCollection as UmbPropertyEditorConfigCollectionType } from "@umbraco-cms/backoffice/property-editor";

@customElement("my-editor")
export class MyEditor extends UmbElementMixin(LitElement) {
  @state() private _editorConfig: UmbPropertyEditorConfigCollectionType | undefined = undefined;
  #dataTypeRepository = new UmbDataTypeDetailRepository(this);

  async connectedCallback() {
    super.connectedCallback();
    await this._loadDataTypeConfig("your-datatype-guid");
  }

  private async _loadDataTypeConfig(dataTypeKey: string): Promise<void> {
    try {
      const { data } = await this.#dataTypeRepository.requestByUnique(dataTypeKey);
      if (!data) { this._setFallbackConfig(); return; }
      this.observe(await this.#dataTypeRepository.byUnique(dataTypeKey), (dataType) => {
        if (!dataType) return;
        this._editorConfig = new UmbPropertyEditorConfigCollection(dataType.values);
      }, '_observeDataType');
    } catch { this._setFallbackConfig(); }
  }

  private _setFallbackConfig(): void {
    this._editorConfig = new UmbPropertyEditorConfigCollection([
      { alias: "extensions", value: ["Umb.Tiptap.Bold", "Umb.Tiptap.Italic"] },
      { alias: "toolbar", value: [[["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic"]]] },
    ]);
  }
}
```

### Step 3: Render Property Editor
```typescript
private _renderEditor(): unknown {
  if (!this._editorConfig) return html`<uui-loader-bar></uui-loader-bar>`;
  return html`<umb-input-tiptap .configuration=${this._editorConfig} .value=${this._value || ""} @change=${this._handleChange}></umb-input-tiptap>`;
}
private _handleChange(e: Event): void {
  this._value = (e.target as HTMLElement & { value?: string })?.value || "";
}
```

### DataType Values Structure
Array of `{alias, value}` pairs:
```typescript
// TipTap
[
  { alias: "extensions", value: ["Umb.Tiptap.RichTextEssentials", "Umb.Tiptap.Bold", "Umb.Tiptap.Italic", "Umb.Tiptap.Link"] },
  { alias: "toolbar", value: [[["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic"], ["Umb.Tiptap.Toolbar.Link"]]] },
  { alias: "maxImageSize", value: 800 },
  { alias: "overlaySize", value: "medium" }
]
```

### Backend: Ensure DataType Exists
```csharp
public class MerchelloDataTypeInitializer {
    private readonly IDataTypeService _dataTypeService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _serializer;

    public async Task EnsureDataTypeExistsAsync() {
        var dataType = await _dataTypeService.GetAsync(YOUR_DATATYPE_KEY);
        if (dataType != null) return;
        if (!_propertyEditors.TryGet("Umbraco.RichText", out var propertyEditor)) return;
        dataType = new DataType(propertyEditor, _serializer, -1) {
            Name = "My Rich Text Editor", EditorUiAlias = "Umb.PropertyEditorUi.Tiptap",
            ConfigurationData = new Dictionary<string, object> {
                { "extensions", new[] { "Umb.Tiptap.Bold", "Umb.Tiptap.Italic" } },
                { "toolbar", new[] { new[] { new[] { "Umb.Tiptap.Toolbar.Bold" } } } },
            }
        };
        await _dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);
    }
}
```

### Backend: Expose DataType Key
```csharp
[HttpGet("settings/description-editor")]
public IActionResult GetDescriptionEditorSettings() {
    return Ok(new { DataTypeKey = _initializer.GetDataTypeKey(), PropertyEditorUiAlias = "Umb.PropertyEditorUi.Tiptap" });
}
```

### Common Mistakes
- **No package import** → element renders empty. Import `@umbraco-cms/backoffice/tiptap` first.
- **Plain fetch instead of repository** → 401 Unauthorized. Use `#dataTypeRepository.requestByUnique(key)`.
- **Not checking config loaded** → undefined config. Show `<uui-loader-bar>` until ready.
- **Wrong value structure** → must be array of `{alias, value}` objects, not plain object.

### Property Editor Components
| Component | Package | UI Alias |
|-----------|---------|----------|
| `umb-input-tiptap` | `@umbraco-cms/backoffice/tiptap` | `Umb.PropertyEditorUi.Tiptap` |
| `umb-input-media` | `@umbraco-cms/backoffice/media` | `Umb.PropertyEditorUi.MediaPicker` |
| `umb-input-content-picker` | `@umbraco-cms/backoffice/content` | `Umb.PropertyEditorUi.ContentPicker` |
| `umb-input-date-time` | `@umbraco-cms/backoffice/datetime` | `Umb.PropertyEditorUi.DatePicker` |

Example: [product-detail.element.ts](../src/Merchello/Client/src/products/components/product-detail.element.ts)

## Programmatic Block List Creation (C#)

For importing content or creating Block List/Grid data programmatically.

### Block List Structure
```json
{
  "layout": { "Umbraco.BlockList": [{ "contentUdi": "umb://element/guid" }] },
  "contentData": [{ "udi": "umb://element/guid", "contentTypeKey": "element-type-guid", "propertyAlias": "value" }],
  "settingsData": []
}
```
| Component | Purpose |
|-----------|---------|
| `layout` | Block order, ties each item to UDI |
| `contentData` | Actual block content with properties matching element type |
| `settingsData` | Optional settings (must exist even if empty array) |

### Creating Blocks
```csharp
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using System.Text.Json;

public class BlockListImporter {
    private readonly IContentService _contentService;
    private readonly IContentTypeService _contentTypeService;

    public BlockListImporter(IContentService contentService, IContentTypeService contentTypeService) {
        _contentService = contentService; _contentTypeService = contentTypeService;
    }

    public void ImportBlocks(IContent page, string propertyAlias, List<BlockItemDto> items) {
        var elementType = _contentTypeService.Get("myBlockElementType");
        if (elementType == null) return;

        var layout = new List<object>();
        var contentData = new List<object>();

        foreach (var item in items) {
            var blockGuid = Guid.NewGuid();
            var udi = Udi.Create("element", blockGuid);
            layout.Add(new { contentUdi = udi.ToString() });
            contentData.Add(new { udi = udi.ToString(), contentTypeKey = elementType.Key, title = item.Title, description = item.Description });
        }

        var blockListValue = new {
            layout = new { Umbraco.BlockList = layout },
            contentData = contentData,
            settingsData = Array.Empty<object>()
        };

        page.SetValue(propertyAlias, JsonSerializer.Serialize(blockListValue));
        _contentService.Save(page);
    }
}
```

### Key Points
- **UDI**: `Udi.Create("element", Guid.NewGuid())` per block
- **Element Type Key**: `_contentTypeService.Get("alias").Key`
- **Property Aliases**: Must match element type definition exactly
- **Settings Data**: Always include (even empty array)
- **Layout Key**: `"Umbraco.BlockList"` | `"Umbraco.BlockGrid"`

### Block Grid Differences
```csharp
layout.Add(new { contentUdi = udi.ToString(), columnSpan = 12, rowSpan = 1, areas = Array.Empty<object>() });
```

### Required Services
| Service | Purpose |
|---------|---------|
| `IContentService` | Create, save, publish content |
| `IContentTypeService` | Get element type definitions/GUIDs |
| `IMediaService` | If blocks reference media items |
