# Umbraco Backoffice UI/UX Guide (Merchello)

Source audited against:
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client`
- Audit date: February 17, 2026

This guide is the source of truth for how we build Merchello backoffice UI so it matches Umbraco patterns and behaves like native backoffice features.

## Scope
- Backoffice admin views and editors.
- Workspace pages, workspace views, modals, and collection views.
- Field composition, spacing, labels, validation, routing, and table/list behavior.
- Property Actions (critical for product fields).

## Golden Rules
- Use Umbraco primitives first: `umb-workspace-editor`, `umb-body-layout`, `uui-box`, `umb-property-layout`, `umb-table`.
- Do not build custom layout systems when core components already provide the pattern.
- Prefer `umb-property`/`umb-property-type-based-property` for editable business fields; do not default to raw `uui-input` for those surfaces.
- Keep route construction in path pattern constants (`UmbPathPattern`), not ad-hoc string concatenation.
- Use localization keys for labels/headlines in manifests and components.
- Use standard modal action patterns: neutral cancel/close plus right-most primary action (`look="primary"` with semantic color).

## Layout Patterns

### Workspace shell
Use `umb-workspace-editor` for entity editing surfaces.

What it already does:
- Wraps content in `umb-body-layout`.
- Handles header slots, action menu slot, navigation tabs, and footer/actions slots.
- Builds workspace-view routes from `workspaceView` manifests (`meta.pathname`).
- Adds default empty-path route and `**` not-found route.

Use:
- `headline` for workspace title.
- `back-path` for explicit back navigation.
- `enforceNoFooter` only when footer must be suppressed.

### Body layout
Use `umb-body-layout` for section views, collection pages, and modals.

Key attributes:
- `main-no-padding`: remove default main padding.
- `header-transparent`: transparent header that becomes elevated on scroll.
- `header-fit-height`: allow flexible header content height.
- `header-no-padding`: remove header slot padding.

Default behavior to remember:
- Main area scrolls (`overflow-y: auto`).
- Default main padding is applied unless `main-no-padding` is set.

### Content grouping
Use `uui-box` for major groups/sections in a view.

Common spacing from core usage:
- Host wrapper: `margin` or `padding` with `var(--uui-size-layout-1)` or `var(--uui-size-space-6)`.
- Box stacking: `uui-box { margin-top: var(--uui-size-layout-1); }`.

## Field and Form Composition

### Workspace field rows
Use `umb-property-layout` for label/description/editor rows.

Behavior from core:
- Default is horizontal (label column plus editor column).
- At narrow widths it stacks automatically.
- `orientation="vertical"` forces label-above-editor layout.
- Supports `mandatory` and `invalid` states.
- Description is rendered consistently via UFM-aware renderer.

Pattern:
```ts
<uui-box>
  <umb-property-layout label="Name" description="Visible to admins" mandatory>
    <uui-input slot="editor" .value=${this._name ?? ''} @input=${this.#onNameInput}></uui-input>
  </umb-property-layout>
</uui-box>
```

Use `uui-form-layout-item` inside `slot="editor"` only when you need nested grouped inputs in the editor area.

### Modal forms
For modal data entry, follow this structure:
- `umb-body-layout` as outer shell.
- `uui-form` + native `<form>`.
- `uui-form-layout-item` with `uui-label slot="label"` and matching `for`/`id`.
- Submit via `form.checkValidity()` before action.

Pattern:
```ts
<umb-body-layout headline="Rename">
  <uui-box>
    <uui-form>
      <form id="RenameForm" @submit=${this.#onSubmit}>
        <uui-form-layout-item>
          <uui-label slot="label" for="name" required>Name</uui-label>
          <uui-input id="name" name="name" required></uui-input>
        </uui-form-layout-item>
      </form>
    </uui-form>
  </uui-box>

  <uui-button slot="actions" @click=${this._rejectModal} label="Cancel"></uui-button>
  <uui-button slot="actions" form="RenameForm" type="submit" look="primary" color="positive" label="Rename"></uui-button>
</umb-body-layout>
```

### Labels and input width
- Always provide a real label (not placeholder-only UX).
- In workspace rows: label belongs to `umb-property-layout`.
- In modal forms: label belongs to `uui-label slot="label"`.
- Ensure text inputs/selects generally span full width where expected (`width: 100%`).

## Modal and Dialog Standards

### Modal shell choice
Use `uui-dialog-layout` for compact confirmation/choice dialogs.

Use `umb-body-layout` for complex dialogs:
- Multi-field forms.
- Picker flows.
- Any dialog with substantial body content or toolbar-like header behavior.

Both patterns are first-class in Umbraco source. Choose based on complexity, not personal preference.

### Action bar placement and order
- Put modal action buttons in `slot="actions"`.
- Standard order is neutral action first (`Cancel`/`Close`) then primary confirm action.
- Primary action should be the final/right-most action.
- For form dialogs, use `form="MyForm"` + `type="submit"` on the primary button.

### Button look and color semantics
Use this matrix consistently:

| Intent | Button pattern |
| --- | --- |
| Close/dismiss only | default look, no color override |
| Cancel (non-destructive) | default or `look="secondary"` |
| Save/create/submit success path | `look="primary" color="positive"` |
| Destructive confirm (delete/discard/trash) | `look="primary" color="danger"` |
| Optional tertiary inline controls | `look="secondary"` or `look="outline"`/`look="placeholder"` |

Notes from source:
- `UmbConfirmModalData` supports `color: 'positive' | 'danger' | 'warning'`.
- `warning` is available but less common; use only for genuinely cautionary confirms.

### Labels and localization in dialogs
Use existing localization terms for common actions:
- `general_close`
- `general_cancel`
- `buttons_save`
- `general_delete`

Avoid inventing synonyms when a standard term exists.

### Icon usage in dialogs and actions
- Use `umb-icon` for backoffice extension/entity icons (manifest or entity-associated icon names).
- Use `uui-icon` for generic UI glyphs inside controls (search, add, navigation arrows, etc.).
- In menu actions, place icon in `slot="icon"` for `uui-menu-item`.
- For action buttons, include icon only when it adds meaning; do not replace a required text label with icon-only controls for primary/destructive actions.

### Focus and submit behavior
- Validate form-backed dialogs with `form.checkValidity()` before submit.
- Use `_submitModal()` and `_rejectModal()` through `UmbModalBaseElement` in modal components.
- Give initial focus to the primary form control (for example `umbFocus()`).
- For confirm dialogs, focus primary confirm action when appropriate.

## Property Actions (Critical for Product Fields)

This section is mandatory for Merchello product editor surfaces.

### How property actions are resolved
- Property action manifests (`type: 'propertyAction'`) target editor UIs via `forPropertyEditorUis`.
- `umb-property` renders `umb-property-action-menu` and resolves matching actions from the active `property-editor-ui-alias`.
- `umb-property` consumes property dataset context (`UMB_PROPERTY_DATASET_CONTEXT`) to read/write values.

### Required implementation pattern for product fields
If a product field must support property actions:
1. Host fields in `umb-property-dataset` (or in an equivalent dataset context owner).
2. Render field through `umb-property` (or `umb-property-type-based-property` that renders `umb-property` internally).
3. Set stable `alias` and correct `property-editor-ui-alias`.
4. Keep alias naming consistent between dataset values, manifests, and action logic.

Do not:
- Render action-enabled product fields as raw `uui-input`/`uui-select` only.
- Change aliases between DTO/UI layers.
- Omit dataset hosting for `umb-property`.

### Product field pattern
```ts
<umb-property-dataset .value=${this._productValues} @change=${this.#onDatasetChange}>
  <umb-property
    alias="sku"
    label="SKU"
    property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
    .config=${[]}>
  </umb-property>

  <umb-property
    alias="shortDescription"
    label="Short description"
    property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"
    .config=${[]}>
  </umb-property>
</umb-property-dataset>
```

### Property action manifest pattern
```ts
{
  type: 'propertyAction',
  kind: 'default',
  alias: 'Merchello.PropertyAction.ProductFieldExample',
  name: 'Product Field Action',
  api: () => import('./product-field-action.js'),
  forPropertyEditorUis: ['Umb.PropertyEditorUi.TextBox'],
  meta: { label: 'Run Action', icon: 'icon-wand' }
}
```

### Property action verification checklist
- Field is rendered by `umb-property`, not only raw UUI input.
- Field has stable `alias`.
- `property-editor-ui-alias` matches `forPropertyEditorUis`.
- Field is under dataset context.
- Action appears in property action menu on the field.
- Action executes without breaking value changes.

## Component Selection (UUI + Umbraco)

Use this as the approved component playbook for Merchello backoffice.

### Core layout and structure
- `umb-workspace-editor`: entity edit shell (header/navigation/footer actions).
- `umb-body-layout`: section views, collection pages, complex modals.
- `uui-box`: grouped content blocks.
- `umb-router-slot`: routed child views.

### Property and form system
- `umb-property-layout`: standard label/description/editor row in pages and advanced forms.
- `umb-property`: action-enabled property host (with property editor integration).
- `umb-property-dataset`: required dataset host for `umb-property`.
- `uui-form`, `uui-form-layout-item`, `uui-label`: modal and non-property form layouts.

### Inputs and selectors
- Use UUI inputs for primitive controls:
  - `uui-input`, `uui-textarea`, `uui-select`, `uui-toggle`, `uui-checkbox`, `uui-radio`, `uui-combobox`.
- Prefer Umbraco entity inputs for backoffice entities:
  - `umb-input-document`, `umb-input-media`, `umb-input-document-type`, `umb-input-media-type`, `umb-input-language`, `umb-user-group-input`, etc.

### Actions, menus, and status
- `uui-button`, `uui-button-group`: primary actions and split-button patterns.
- `uui-menu-item`: list/menu actions (with optional `slot="icon"`).
- `uui-badge`, `uui-tag`: status/hint metadata.
- `uui-loader`, `uui-loader-bar`, `uui-loader-circle`: loading states.

### Collections and tables
- `umb-table`: standard collection/list table with selection/sort integration.
- `uui-table`: only for simple static/informational tables when collection behavior is not needed.

### Modal/dialog surfaces
- `uui-dialog-layout`: compact dialogs/confirmation.
- `umb-body-layout`: larger modal flows and form/picker dialogs.

### Component choice rules
- Prefer Umbraco wrappers when available (`umb-*`) for backoffice integrations.
- Use raw UUI components for low-level controls and simple layout atoms.
- Avoid duplicating behavior that Umbraco wrapper components already provide.

## Tables and Collections

### Collection list views
Prefer `umb-table` for backoffice collection/table views.

Why:
- Built-in selection mode.
- Built-in ordering events.
- Works with Umbraco collection contexts and selection managers.
- Supports custom column renderers via `elementName`.

Canonical usage:
- Bind `.config`, `.columns`, `.items`, `.selection`.
- Handle `@selected`, `@deselected`, `@ordered`.

Use raw `uui-table` only for simple ad-hoc static tables (for example dashboard detail displays), not standard collection pages.

### Sorter quirk
If using `UmbSorterController`:
- Keep the configured `containerSelector` element present in DOM whenever sorter is enabled.
- Disable sorter in non-sortable modes.
- Re-enable and reset model when returning to sortable mode.

This avoids runtime errors such as missing sorter container element.

## Routing and Workspace Conventions

### Manifest route metadata
- `workspaceView`/`sectionView`/`dashboard` use `meta.pathname`.
- `collectionView` uses `meta.pathName` (capital N).

This casing difference is real and important.

### Workspace manifests
Use:
- `type: 'workspace'`, `meta.entityType`.
- `kind: 'routable'` for most entity detail workspaces.
- `workspaceView` with `meta: { label, pathname, icon }`.
- `workspaceAction` with `meta: { label, look, color, href, additionalOptions }` as needed.

Note:
- In Umbraco source, `workspaceView` commonly uses `element: () => import(...)`.
- `js: () => import(...)` also exists and is valid, but is less common in current code.

### Router slot usage
Use `umb-router-slot` and wire events:
- `@init` to capture router base path (`absoluteRouterPath`).
- `@change` to track active path (`localActiveViewPath` or `absoluteActiveViewPath` as needed).

Recommended routing setup pattern:
1. Build explicit routes.
2. Add first route clone with `path: ''` as default.
3. Add `path: '**'` not-found route.

### Path generation
Define constants with `UmbPathPattern` and generate paths from them.

Do not hardcode:
- `section/.../workspace/...` URL strings inline in components.

## Spacing and Visual Tokens

Use UUI spacing tokens, not custom pixel systems:
- Layout rhythm: `--uui-size-layout-1`, `--uui-size-layout-2`.
- Component spacing: `--uui-size-space-1` through `--uui-size-space-6`.

Most-used spacing in audited source:
- `--uui-size-layout-1`
- `--uui-size-space-2`
- `--uui-size-space-3`
- `--uui-size-space-4`
- `--uui-size-space-5`

Use color/border tokens from UUI:
- `--uui-color-border`
- `--uui-color-divider`
- `--uui-color-surface`
- `--uui-color-text-alt`

## Localization and Text
- In manifests, use localization keys for labels when available (for example `#general_content`).
- In components, use `this.localize.term(...)` and `this.localize.string(...)`.
- Keep wording consistent with Umbraco terminology.

## Do/Do Not Quick Reference

Do:
- Use `uui-box` + `umb-property-layout` for workspace forms.
- Use `uui-form-layout-item` for modal forms.
- Use `uui-dialog-layout` for compact confirm dialogs and `umb-body-layout` for complex dialog flows.
- Put modal actions in `slot="actions"` with neutral action first and primary confirm last.
- Use `umb-table` in collection views.
- Use `UmbPathPattern` constants for workspace paths.
- Keep product action-enabled fields on `umb-property`.

Do not:
- Build standalone label/input stacks with custom divs when `umb-property-layout` applies.
- Mix `pathname` and `pathName`.
- Bypass dataset context for `umb-property`.
- Use raw UUI inputs for product fields that need property actions.
- Use non-standard button semantics (for example danger-colored non-destructive primary actions).
- Ship icon-only primary/destructive dialog actions.

## Implementation Checklist (Before PR)
- Layout uses Umbraco primitives (`umb-body-layout`/`umb-workspace-editor`/`uui-box`).
- Fields use `umb-property-layout` for consistent label/description stacking.
- Product fields that need actions use `umb-property` + dataset context.
- Modal shell is appropriate (`uui-dialog-layout` vs `umb-body-layout`).
- Modal button bar follows semantic patterns (cancel/close + primary action color/look).
- Dialog labels/icons follow localization and icon rules.
- Collection views use `umb-table` + collection context wiring.
- Routing uses constants and route fallback (`''`, `**`).
- Manifest metadata casing is correct (`pathname` vs `pathName`).
- Spacing uses UUI tokens only.
- Labels/localization are present and consistent.

## Audit Reference Files
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\components\workspace-editor\workspace-editor.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\components\body-layout\body-layout.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\property\property-dataset\property-dataset.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\property\components\property\property.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\property\components\property-layout\property-layout.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\content\content\components\property-type-based-property\property-type-based-property.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\property-action\property-action.extension.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\property-action\components\property-action-menu\property-action-menu.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\components\table\table.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\collection\default\collection-default.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\collection\view\collection-view.extension.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\documents\documents\workspace\manifests.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\documents\documents\paths.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\paths.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\section\extensions\section.extension.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\section\extensions\section-view.extension.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\modal\component\modal-base.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\modal\common\confirm\confirm-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\modal\common\confirm\confirm-modal.token.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\modal\common\discard-changes\discard-changes-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\folder\modal\folder-modal-element-base.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\server-file-system\rename\modal\rename-server-file-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\relations\relations\entity-actions\delete\modal\delete-with-relation-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\documents\documents\entity-actions\culture-and-hostnames\modal\culture-and-hostnames-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\user\user\invite\modal\invite\user-invite-modal.element.ts`
