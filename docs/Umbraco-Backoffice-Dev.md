# Umbraco Backoffice UI/UX Guide (Merchello)

Source audited against:
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\node_modules\@umbraco-ui`
- `https://uui.umbraco.com` (Storybook docs/index)
- Audit date: February 18, 2026

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

### UUI control label contract (critical)
The UUI controls used in backoffice commonly warn in dev mode when `label` is missing.

Applies to common controls such as:
- `uui-button`
- `uui-select`
- `uui-toggle`
- `uui-checkbox`
- `uui-textarea`

Rules:
- Do not rely only on surrounding wrapper labels (`umb-property-layout`) for UUI control accessibility names.
- Set a `label` on UUI controls that require it.
- For `uui-select`, `label` is required but not rendered as visible label text (it maps to accessible naming).
- For icon-only `uui-button`, still set `label`; the slotted icon remains the visible content.
- For toggles/checkboxes/radios in dense tables or long lists, do not render visible inline label text like `label="Select ..."`.
- In dense list/table selection columns, prefer `aria-label` on `uui-checkbox`/`uui-radio` to keep controls accessible without layout text noise.

Hidden-label pattern for boolean controls:
```ts
<uui-toggle label=${this.localize.term('general_select')}>
  <uui-visually-hidden>${this.localize.term('general_select')}</uui-visually-hidden>
</uui-toggle>
```

Dense list/table selection pattern:
```ts
<uui-checkbox aria-label="Select all variants"></uui-checkbox>
<uui-checkbox aria-label="Select ${variant.name || variant.id} variant"></uui-checkbox>
<uui-radio aria-label="Set ${variant.name || 'Unnamed'} as default variant"></uui-radio>
```

Warning/visibility tradeoff:
- `label="Select ..."` on checkbox/radio renders visible text next to each control and will break dense table layouts.
- `aria-label` keeps the UI clean and accessible for long-list selection controls.
- If you must satisfy `label` contract warnings on a dense control, use hidden-label slot content (do not show plain visible `label` text).

Batch select guidance:
- For table row selection, use dedicated selection controls (`umb-table`) and keep explicit accessibility naming.
- Keep click handlers from bubbling where selection controls are inside clickable rows.
- Header multi-select checkbox must support `indeterminate` state.
- Row checkbox labels should include row identity (`name` or fallback `id`) via `aria-label`.
- Row radios (for default selection) should use `aria-label` per row and remain inside the row selection event guard.

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

### Dialog writing style (UUI style guide)
- Headline should be short and action-oriented.
- Description should explain effect and consequence, not repeat the headline.
- Avoid filler confirmation text like "Are you sure...".
- Action button text should use the exact action verb (`Delete`, `Publish`, `Transfer`) and remain short.
- Keep action wording consistent with headline/description terminology.

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
- `uui-visually-hidden`: visually hidden but screen-reader-accessible labels/content.

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

### Status badge contrast contract (critical)
For compact status badges/chips used in tables, workspace headers, and order/invoice cards:
- Warning-like statuses (`unfulfilled`, `partial`, `awaiting`, `warning`) must render white text.
- Use warning background: `var(--merchello-color-warning-status-background, #8a6500)`.
- Use text color: `#fff`.
- Apply this consistently across list and detail surfaces so the same status class does not switch between black/white text by page.
- Do not use `var(--uui-color-warning-contrast)` for these compact status badges; theme contrast values can render dark text and reduce readability.

Scope note:
- This rule is for compact status badges/chips.
- Larger warning callouts/panels can still use standard UUI warning tokens when appropriate.

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

### Collection toolbar layout
Search input and action buttons must share the same row on collection/list pages.

Shared styles: `src/Merchello/Client/src/shared/styles/collection-layout.styles.ts`.

Structure:
```ts
<div class="filters">
  <div class="filters-top">
    <div class="search-box">
      <uui-input type="search" ...></uui-input>
    </div>
    <div class="header-actions">
      <uui-button look="primary" color="positive" ...>Add Item</uui-button>
    </div>
  </div>
  <!-- optional: uui-tab-group below -->
</div>
```

Rules:
- `.header-actions` goes inside `.filters-top`, not as a standalone sibling above `.filters`.
- `.header-actions` uses `margin-left: auto` and `flex-shrink: 0` (provided by shared styles) to push buttons to the right.
- `.search-box` uses `flex: 1 1 auto` with `max-width` to share the row.
- On mobile (`< 768px`), `.filters-top` is column layout and items stack naturally.
- On desktop (`>= 768px`), `.filters-top` is row layout with `flex-wrap: wrap`.
- If search is conditionally rendered, always render `.filters-top` with `.header-actions`; conditionally render `.search-box` inside it.
- Optional filter dropdowns and tab groups remain siblings within `.filters-top` or `.filters` respectively.

Do not place `.header-actions` as a separate block above `.filters` in collection views.

### Sorter quirk
If using `UmbSorterController`:
- Keep the configured `containerSelector` element present in DOM whenever sorter is enabled.
- Disable sorter in non-sortable modes.
- Re-enable and reset model when returning to sortable mode.

This avoids runtime errors such as missing sorter container element.

## Tree Interaction Contracts

### Ownership and extension resolution
- `umb-tree` is an extension host; default rendering is `umb-default-tree`.
- Tree item rendering is resolved by `entityType`; if no matching `treeItem` extension exists, Umbraco falls back to `umb-default-tree-item`.
- Selection and expansion state are owned by tree context managers, not by ad-hoc DOM state in custom tree items.

### Selection, open/close, and navigation behavior
- `umb-tree-item` interactions map to `uui-menu-item` events (`selected`, `deselected`, `show-children`, `hide-children`).
- In selectable contexts, navigation links are intentionally suppressed for non-edit selection workflows.
- Active state is calculated from route matching and propagated through the active chain manager.

### Root/start node behavior
- If `hideTreeRoot = false`, the root item is rendered as a normal tree item.
- If `hideTreeRoot = true`, root children render directly.
- `startNode` and `hideTreeRoot` change loading behavior and trigger tree reset + reload.
- `expandTreeRoot` controls root expansion behavior without custom tree item hacks.

### Pagination, retries, and fallback
- Tree child loading uses target pagination plus offset fallback.
- Load size defaults to `50` unless explicitly changed in manager/context.
- On missing target errors (`not found`), Umbraco retries with alternate targets.
- If retries fail, Umbraco falls back to safe offset pagination from top of list.
- On terminal load failure, Umbraco keeps UI stable and can notify user (`danger` peek notification).

### Reload event contract after mutations
After create/move/delete/sort, do not hand-mutate visible tree nodes. Dispatch reload events:
- `UmbRequestReloadChildrenOfEntityEvent` for current node children.
- `UmbRequestReloadStructureForEntityEvent` for parent/root structural refresh.
- Legacy `UmbRequestReloadTreeItemChildrenEvent` exists but is deprecated.

### Active-path edge case contract
- Tree item active checks use trailing-slash-safe path comparisons to avoid collisions such as `/path-1` vs `/path-1-2`.
- If `ancestors` are available on item models, they must be preserved for correct active-chain propagation/expansion behavior.

### Tree picker state behavior
- `umb-tree-picker-modal` wires selection + expansion through picker context.
- Expansion state is stored in interaction memory (`UmbTreeItemPickerExpansion`) and restored when present.
- `hideTreeRoot`, `expandTreeRoot`, `startNode`, `foldersOnly`, `filter`, and `pickableFilter` are first-class picker contracts.

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

### Workspace view ordering and fallback routes
- Workspace views are sorted by `weight` (descending).
- Default route behavior duplicates first view into `path: ''`.
- Catch-all not-found route (`path: '**'`) must remain last.
- `umb-workspace-editor` still has a slot fallback path when no routes are available; do not rely on mixed slot+route behavior for new implementation.

### Unsaved changes navigation guard
- Entity-detail workspaces listen to `willchangestate`.
- If navigating away with unpersisted changes, Umbraco prevents navigation and opens discard-changes modal.
- On confirm, Umbraco re-pushes target history state with an internal allow flag to avoid re-trigger loops.
- Do not bypass this with custom `history.pushState()` flows in feature code.

### New-entity redirect edge case
- New entity creation (`isNew -> false`) redirects create routes to `edit/:id`.
- Core uses delayed redirect timing to avoid modal-route race conditions after create/submit flows.
- Keep this redirect behavior centralized in workspace controllers.

### Split-view variant URL contract
- Split view encodes variants in URL path using delimiter `_&_`.
- Switching/opening/closing split view updates history while preserving additional sub-path when possible.
- Split view context provides variant-scoped dataset + validation context; do not duplicate this wiring in workspace views.

## Spacing and Visual Tokens

Use UUI spacing tokens, not custom pixel systems:
- Layout rhythm: `--uui-size-layout-1`, `--uui-size-layout-2`.
- Component spacing: `--uui-size-space-1` through `--uui-size-space-6`.
- UUI style guide baseline is a `6px` base unit; prefer token multiples to preserve rhythm.
- Keep related elements visually closer than unrelated groups; use spacing to communicate hierarchy.

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

### Typography foundation (UUI docs)
- Storybook guidance exists in both `Design/Style Guide` (`?path=/docs/design-style-guide--docs`) and `Design/Css` (`?path=/docs/design-css--docs`).
- When outside Umbraco wrappers that already provide typography classes, use `uui-font` + `uui-text`.
- `uui-css.css` includes custom properties, font, and text styles in one import.
- Use `uui-lead` for lead paragraph styling where a short textual summary is needed.
- Keep backoffice typography token-driven; avoid standalone font stacks on admin surfaces.

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
- Keep tree state in tree context managers and trigger refresh via tree reload events after mutations.
- Use `UmbPathPattern` constants for workspace paths.
- Set `label` on UUI controls that require it, including icon-only buttons and selects inside wrapper layouts; use `aria-label` for dense table/list checkbox and radio selection controls.
- Keep product action-enabled fields on `umb-property`.
- Use the warning status badge contract for compact chips (`--merchello-color-warning-status-background` + white text).

Do not:
- Build standalone label/input stacks with custom divs when `umb-property-layout` applies.
- Mix `pathname` and `pathName`.
- Bypass dataset context for `umb-property`.
- Use raw UUI inputs for product fields that need property actions.
- Directly mutate tree DOM state after create/move/delete/sort operations.
- Rely on placeholder-only or wrapper-only labeling for `uui-select`/`uui-toggle`/`uui-button`.
- Use non-standard button semantics (for example danger-colored non-destructive primary actions).
- Ship icon-only primary/destructive dialog actions.
- Use `--uui-color-warning-contrast` for compact warning status badges/chips.

## Implementation Checklist (Before PR)
- Layout uses Umbraco primitives (`umb-body-layout`/`umb-workspace-editor`/`uui-box`).
- Fields use `umb-property-layout` for consistent label/description stacking.
- Product fields that need actions use `umb-property` + dataset context.
- Modal shell is appropriate (`uui-dialog-layout` vs `umb-body-layout`).
- Modal button bar follows semantic patterns (cancel/close + primary action color/look).
- Dialog labels/icons follow localization and icon rules.
- Collection views use `umb-table` + collection context wiring.
- Tree behaviors follow context contracts (`selectionConfiguration`, expansion, reload events).
- Routing uses constants and route fallback (`''`, `**`).
- Workspace edge cases are preserved (unsaved-change guard, is-new redirect, split-view route contract).
- Manifest metadata casing is correct (`pathname` vs `pathName`).
- Spacing uses UUI tokens only.
- UUI controls with label requirements have explicit `label` (or hidden-label pattern).
- Dense table/list checkbox and radio controls use `aria-label` (or hidden-label pattern), not visible `label="Select ..."` text.
- Labels/localization are present and consistent.
- Compact warning status badges/chips use `--merchello-color-warning-status-background` with white text (`#fff`).

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
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\components\workspace-editor\workspace-editor.context.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\controllers\workspace-is-new-redirect.controller.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\controllers\workspace-route-manager.controller.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\entity-detail\entity-detail-workspace-base.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\components\workspace-split-view\workspace-split-view.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\controllers\workspace-split-view-manager.controller.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\default\default-tree.context.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\default\default-tree.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\tree-item\tree-item-base\tree-item-context-base.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\tree-item\tree-item-base\tree-item-element-base.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\tree-item\tree-item-children.manager.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\tree-item-picker\tree-item-picker-expansion.manager.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\tree-picker-modal\tree-picker-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\workspace\components\workspace-action-menu\workspace-action-menu.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\webhook\webhook\workspace\views\webhook-details-workspace-view.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\node_modules\@umbraco-ui\uui-base\lib\mixins\index.js`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\node_modules\@umbraco-ui\uui-select\lib\index.js`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\node_modules\@umbraco-ui\uui-button\lib\index.js`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\node_modules\@umbraco-ui\uui-boolean-input\lib\index.js`
- `C:\Projects\Umbraco.UI\packages\uui-base\lib\mixins\LabelMixin.ts`
- `C:\Projects\Umbraco.UI\packages\uui-css\lib\guidelines.story.ts`
- `C:\Projects\Umbraco.UI\packages\uui-css\lib\uui-css.mdx`
- `C:\Projects\Umbraco.UI\packages\uui-button\lib\uui-button.story.ts`
- `C:\Projects\Umbraco.UI\packages\uui-select\lib\uui-select.story.ts`
- `C:\Projects\Umbraco.UI\packages\uui-toggle\lib\uui-toggle.story.ts`
- `C:\Projects\Umbraco.UI\packages\uui-checkbox\lib\uui-checkbox.story.ts`
- `C:\Projects\Umbraco.UI\packages\uui-visually-hidden\README.md`
- `https://uui.umbraco.com/index.json`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\tree\folder\modal\folder-modal-element-base.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\core\server-file-system\rename\modal\rename-server-file-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\relations\relations\entity-actions\delete\modal\delete-with-relation-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\documents\documents\entity-actions\culture-and-hostnames\modal\culture-and-hostnames-modal.element.ts`
- `C:\Projects\Umbraco-CMS\src\Umbraco.Web.UI.Client\src\packages\user\user\invite\modal\invite\user-invite-modal.element.ts`
