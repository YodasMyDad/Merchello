---
description: General developer documentation
globs:
alwaysApply: true
---

# Merchello Core - Developer Guidelines

## Overview

Enterprise ecommerce NuGet package. **Main ethos: making enterprise ecommerce simple.**

- **Modular/Plugin-based** - Use `ExtensionManager` for pluggable items (ShippingProviders, etc.)
- **Services** - Feature-grouped, minimal entry points, DI throughout, parameter models for extensibility
- **Factories** - All important classes instantiated via factories (Product, ProductRoot, TaxGroup, etc.)

## Feature Folder Structure

```
Products/
├── Factories/
├── Mapping/
├── ExtensionMethods/
├── Models/
└── Services/
    ├── Parameters/
    └── Interfaces/
```

## Product Options - Add-ons (Non-Variant)

- `ProductOption.IsVariant` (default true) → participates in variant generation
- When false → add-on/modifier, does NOT generate variants
- Add-on values: `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`
- Variant generation only considers `IsVariant == true` options

---

# .NET Development Rules

## Philosophy

- **Write simple, readable code** - Don't overcomplicate
- Be terse, accurate, thorough
- Give answers immediately, explain after
- No placeholders or TODOs - fully implement everything
- Focus on readability over performance

## Code Style

- Concise, idiomatic C# following .NET conventions
- Prefer LINQ/lambdas for collections
- Descriptive names: `IsUserSignedIn`, `CalculateTotal`
- Use `var` when type is obvious
- C# 13+ features: records, pattern matching, null-coalescing
- **Primary constructors**: `public class Handler(ILogger<Handler> logger)`
- **Collection expressions**: `[]` not `new List<T>()`
- Pattern matching: `.Where(e => e.Entity is Media or Actor)`

## Naming

| Style | Use For |
|-------|---------|
| PascalCase | classes, methods, public members |
| camelCase | locals, private fields |
| UPPERCASE | constants |
| I prefix | interfaces (`IUserService`) |

## Classes & Models

- **Never** put models/records in same file as services/handlers
- Models in separate files within nested `Models/` folder
- Never rename existing functions without permission

## Error Handling

- Exceptions for exceptional cases only, not control flow
- Proper logging via built-in .NET logging
- Data Annotations or FluentValidation
- Global exception middleware
- Appropriate HTTP status codes

## API Design

- RESTful principles, attribute routing
- API versioning, action filters
- Rate limiting consideration
- Minimize API calls to achieve result

## Performance

- async/await for I/O-bound operations
- IMemoryCache or distributed caching
- Efficient LINQ, avoid N+1 queries
- Pagination for large datasets

## Key Conventions

- DI for loose coupling/testability
- Repository pattern or EF Core directly (based on complexity)
- Custom mapping methods (no AutoMapper)
- IHostedService/BackgroundService for background tasks

## DbContext & Service Architecture

- **All DbContext queries must be performed in services** - Controllers should never access DbContext directly
- Controllers inject services and call service methods that encapsulate data access
- This separation ensures testability, reusability, and proper architectural boundaries

**Service Method Design:**
- Design methods for **reusability** - avoid single-purpose methods that only serve one specific use case
- Think about what parameters and return types would make the method useful across multiple scenarios
- Prefer composable, flexible methods over highly-specific ones
- If a query is needed in multiple places, it belongs in a shared service method

```csharp
// ❌ Bad - DbContext in controller
public class OrdersController(MerchelloDbContext db) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await db.Invoices.ToListAsync());
}

// ✅ Good - Service handles data access
public class OrdersController(IInvoiceService invoiceService) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await invoiceService.GetAllAsync());
}

// ❌ Bad - Overly specific service method
Task<List<Invoice>> GetUnpaidInvoicesForCustomerCreatedThisMonth(Guid customerId);

// ✅ Good - Reusable with flexible parameters
Task<List<Invoice>> QueryAsync(InvoiceQueryParameters parameters);
```

## Database Migrations

- **Always use `migrations.ps1`** script in root
- Never use `dotnet ef migrations` directly
- Script handles all providers (SQL Server, PostgreSQL, SQLite)

## Testing

- xUnit for unit tests
- Moq for mocking
- **Shouldly** for assertions: `result.ShouldBe(expected)`, `result.ShouldNotBeNull()`
- Integration tests for API endpoints
- Run tests after completing changes

## Security

- Authentication/Authorization middleware
- JWT for stateless API auth
- HTTPS/SSL enforcement
- CORS policies
- .NET Identity where needed

## API Documentation

- Swagger/OpenAPI (Swashbuckle.AspNetCore)
- XML comments on controllers/models

## Blazor

- Avoid EF Core directly in components
- If needed: inject `IServiceProvider`, use scoped context:
  ```csharp
  using var scope = ServiceProvider.CreateScope();
  ```
