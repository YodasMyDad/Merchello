Service + Controller Deduplication Audit and Remediation

## Context
This codebase follows `docs/Architecture-Diagrams.md`.
Core principle: **“making enterprise ecommerce simple - no over-engineed code.”**
Services are the single layer for business logic and data access, using RORO request/response objects and parameter objects.

A duplication pattern exists in service methods and controller flows where behavior differs only by one or two filters or flags.

## Objective
Audit for duplication, then fix it.
You must include both:
1. Service interfaces and implementations
2. Controllers and their action-level orchestration

## Mandatory Execution Model
Work one service domain at a time in this order:
1. `IProductService`
2. `IInvoiceService`
3. `ICustomerService`
4. `IShippingService` / `IShippingQuoteService`
5. `IDiscountService`
6. `IWarehouseService`
7. Remaining services

For each domain, complete this full cycle before moving on:
1. Discovery (read-only)
2. Analysis (strategy + risk)
3. Consolidation (code changes)
4. Verification (build/tests/critical path checks)
5. Incremental report

Do not skip from discovery to next domain without fixing approved items in the current domain.

## Scope
Audit:
- `src/Merchello.Core/*/Services/` (interfaces + implementations)
- All `*Controller.cs` files under `src/**/Controllers/`
- Handlers, other services, and any consumers of affected methods

## Phase 1: Discovery
For each service/domain:
1. List all public methods in each interface and implementation.
2. Group methods by intent (query/list/get-by-id/search/update/etc).
3. Identify duplicate or near-duplicate methods where:
- Names are similar
- Return types are similar
- 70%+ implementation overlap
- Same entity queried with slightly different filters
- Difference can be represented by optional query parameters
4. Identify controller duplication:
- Multiple actions with same orchestration but minor filter differences
- Controllers applying business/query logic that should be in services
- Actions calling near-duplicate service methods for same entity
5. Document all callers for each candidate:
- Controllers
- Services
- Handlers/background jobs
- Caching paths/hooks

## Phase 2: Analysis
For each duplicate group, choose exactly one:
1. Add optional parameter(s)
2. Expand existing `*QueryParameters` object
3. Keep separate public methods but share private implementation
4. No action (with justification)

Risk classification:
- High: controllers, checkout, payment, order creation
- Medium: other services/handlers
- Low: few internal callers

## Phase 3: Consolidation
For each approved group:
1. Add/adjust parameter objects (RORO-first).
2. Update service interface and implementation.
3. Update controllers and all other callers.
4. Remove duplicate methods completely (no deprecated wrappers).
5. Remove duplicate DTOs used only by removed methods.
6. If controller business logic is discovered, move it into service methods and keep controller thin.

## Phase 4: Verification
After each domain:
1. Build succeeds.
2. All updated callers compile.
3. Existing tests pass.
4. Add/adjust tests where needed to lock pre-change behavior.
5. Manually trace critical paths when touched (checkout/payment/order creation).

## Controller Red Flags
- Duplicate controller actions differing only by one filter
- Controller-side query composition that belongs in service parameters
- Controller branching that maps to duplicate service methods
- Endpoint pairs like `GetXForY` when `QueryX(parameters)` should exist

## Service Red Flags
- `Get{Entity}For{Context}` while `Query{Entity}` exists
- Multiple methods returning same DTO with tiny filter differences
- Methods differing only by one boolean/include flag
- Overlapping parameter objects (`XQueryParameters` vs `YXQueryParameters`)
- Separate list/paged methods that should be unified with paging params

## Constraints
- Do not break public API contracts without explicit approval.
- Do not consolidate methods with truly different semantics.
- Do not create over-generic APIs that reduce clarity.
- Always trace all callers before removing any method.
- Always verify build/tests after each consolidation.

## Output Format (per domain)
## {ServiceName}

### Duplicate Group {N}: {Description}
**Methods:**
- `MethodA(params)` - `{file}:{line}`
- `MethodB(params)` - `{file}:{line}`

**Controller Actions Involved:**
- `{Controller}.{Action}` - `{file}:{line}`

**Similarity:** {what is duplicated}

**Differences:** {actual semantic differences}

**Callers:**
- `MethodA`: `{file}:{line}`, `{file}:{line}`
- `MethodB`: `{file}:{line}`

**Recommendation:** {strategy + why}

**Risk:** {High/Medium/Low}

### Applied Fixes
- `{exact change}` - `{file}:{line}`

### Verification
- Build: {pass/fail}
- Tests: {pass/fail + scope}
- Critical path trace: {done/not needed + note}

## Success Criteria
- No redundant service methods that can be represented by one query method + optional parameters.
- No controller action duplication that should be parameterized/delegated.
- No duplicate DTOs for the same conceptual entity.
- Consistent parameter-object usage in services and controller-to-service calls.
- Report includes code reduction summary (methods/files/lines removed).