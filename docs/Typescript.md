These rules apply to **Umbraco v17 backoffice extensions** built with:

- **TypeScript**
- **Vite**
- **Lit web components**

------

## General Principles

- Prefer **small, focused web components**; keep logic in separate **pure functions**.
- **No classes** except the Lit element itself.
- Avoid duplication; extract **shared helpers** and **types**.
- Use **Receive an Object, Return an Object (RORO)** for non-trivial functions.
- All code must be **TypeScript, strict mode enabled**.

------

## TypeScript Rules

- Use `function` keyword for helpers and utilities; use semicolons.
- Prefer **`interface` over `type`** for object shapes and public contracts.
- Use **explicit return types** on exported functions.
- Use **descriptive names with auxiliary verbs** for booleans (`isLoading`, `hasError`, `shouldFetch`).
- Enforce **no `any`** in production code.

------

## Lit Component Rules

- One Lit element per file where possible.
- Class name: `PascalCase`; tag name: **kebab-case with prefix** (e.g. `<umb-content-picker>`).
- Use `@property` and `@state` with explicit types.
- Keep `render()` declarative:
  - Handle **error / loading first**, then happy path.
  - Delegate to small render helpers (e.g. `renderList()`, `renderEmptyState()`).
- Communicate **outwards via custom events** with typed `detail`.
- Avoid `innerHTML`; if unavoidable, sanitize input first.

------

## Vite & Project Structure

- Use Vite with:

  - `strict: true` in `tsconfig`
  - Path aliases (e.g. `@api`, `@orders`, `@shared`)

- **Feature-based structure** at top level, with consistent sub-folders:

  ```
  src/
    api/                          # Shared API layer
      merchello-api.ts
      store-settings.ts
    
    shared/                       # Cross-feature utilities
      utils/
        validation.ts
        formatting.ts
      types/
        common.types.ts
    
    orders/                       # Feature folder
      components/
        orders-list.element.ts
        order-detail.element.ts
      modals/
        fulfillment-modal.element.ts
        fulfillment-modal.token.ts
      contexts/
        order-detail-workspace.context.ts
      services/
        order-service.ts
      types/
        order.types.ts
      manifest.ts                 # Feature manifest
    
    payment-providers/            # Another feature
      components/
        payment-providers-list.element.ts
      modals/
        payment-provider-config-modal.element.ts
        payment-provider-config-modal.token.ts
      types/
        payment-provider.types.ts
      manifest.ts
    
    entrypoints/
      entrypoint.ts
      manifest.ts
    
    bundle.manifests.ts           # Root manifest aggregator
  ```

- **Naming conventions**:
  - Elements: `{name}.element.ts`
  - Modal tokens: `{name}-modal.token.ts`
  - Contexts: `{name}.context.ts`
  - Types: `{name}.types.ts` or `types.ts`
  - Manifests: `manifest.ts`

- Enable **code splitting** for rarely used components.

- Only expose a **small, well-defined entry file** for Umbraco to load.

------

## Error Handling

- Handle **invalid inputs and edge cases at the top** of functions (guard clauses + early returns).
- Use **typed error shapes** (`code`, `message`, optional `correlationId`).
- Components show:
  - Clear error state
  - Clear empty state
  - Non-blocking loading where possible
- Never swallow errors silently; log with enough context (operation + key params).

------

## Enterprise Standards

**Security**

- No secrets or API keys in client code.
- Prefer **fetch via typed service modules** over calling URLs directly in components.
- Sanitize user input; avoid unsafe HTML.
- Respect existing Umbraco auth; do not bypass authorization checks.

**Testing**

- Unit test:
  - Pure functions (`utils`, `services` response mappers, validation).
- Component tests for critical UI (basic render + key interactions).

**Accessibility**

- Keyboard accessible: focus order, focusable controls, no keyboard traps.
- Use proper ARIA roles/labels for custom controls.
- Respect color contrast guidelines.

**Performance**

- Avoid unnecessary re-renders (keep reactive state minimal).
- Use **lazy-loaded** / dynamically imported components for heavy or rarely used features.
- Keep bundles small; regularly review Vite bundle output.