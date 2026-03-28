# Customer Management

Every order in Merchello is linked to a **Customer** record. Customers are automatically created during checkout based on the billing email address, but you can also create and manage them manually through the API or backoffice.

## How Customers Are Created

### Automatic creation (checkout)

When a customer completes checkout, Merchello checks if a customer record exists for the billing email:
- **Exists** -- the invoice is linked to the existing customer
- **Doesn't exist** -- a new customer record is created automatically with the name and email from the billing address

This means you don't need to worry about customer registration for guest checkout. Every order gets a customer record.

### Manual creation (API)

```csharp
var result = await customerService.CreateAsync(new CreateCustomerParameters
{
    Email = "jane@example.com",
    FirstName = "Jane",
    LastName = "Smith"
}, cancellationToken);
```

Email uniqueness is enforced. If you try to create a customer with an email that already exists, you will get an error.

## Customer Properties

| Property | Description |
|----------|-------------|
| `Id` | Unique identifier |
| `Email` | Primary identifier -- must be unique, used for matching during checkout |
| `FirstName` / `LastName` | Captured from first invoice billing address |
| `MemberKey` | Optional link to an Umbraco Member (for logged-in accounts) |
| `IsFlagged` | Flag to identify problem customers needing attention |
| `AcceptsMarketing` | Marketing opt-in status |
| `HasAccountTerms` | Whether this customer can order on account |
| `PaymentTermsDays` | Payment terms in days (e.g., 30 for Net 30) |
| `CreditLimit` | Optional credit limit (soft warning only) |
| `Tags` | List of tags for categorization and segment matching |
| `DateCreated` / `DateUpdated` | Audit timestamps (UTC) |

## Umbraco Members vs Merchello Customers

Merchello Customers and Umbraco Members are separate concepts that can be linked:

| Concept | Purpose |
|---------|---------|
| **Umbraco Member** | Authentication and login -- managed by Umbraco's membership system |
| **Merchello Customer** | Commerce data -- orders, addresses, payment history, account terms |

The connection is through `Customer.MemberKey`:

```
Umbraco Member (Key: abc-123)
    ↓ linked via MemberKey
Merchello Customer (MemberKey: abc-123)
    ↓ owns
Invoices, Payment Methods, Addresses
```

### Why are they separate?

Not every customer needs a login. Guest checkout creates Merchello Customers without any Umbraco Member link. This separation means:

- **Guest checkout** works without requiring account registration
- **Returning guests** are automatically matched by email to their existing customer record
- **Logged-in members** get their customer record linked via `MemberKey` for personalized experiences
- **B2B accounts** can have payment terms and credit limits without affecting Umbraco's member system

## Looking Up Customers

The `ICustomerService` provides several lookup methods:

```csharp
// By ID
var customer = await customerService.GetByIdAsync(customerId);

// By email (normalized to lowercase)
var customer = await customerService.GetByEmailAsync("jane@example.com");

// By Umbraco Member key
var customer = await customerService.GetByMemberKeyAsync(memberKey);
```

## Account Terms (B2B)

For B2B customers who pay on account:

```csharp
customer.HasAccountTerms = true;
customer.PaymentTermsDays = 30; // Net 30
customer.CreditLimit = 5000m;  // Optional soft limit
```

When `HasAccountTerms` is true, invoices created for this customer automatically get a `DueDate` calculated from `PaymentTermsDays`. The `CreditLimit` is a soft warning -- orders still proceed if exceeded, but it shows up for admin attention.

## Customer Tags

Tags are a flexible way to categorize customers. They are stored as JSON and can be used for segment criteria matching:

```csharp
customer.SetTags(["wholesale", "priority", "uk-based"]);
var tags = customer.Tags; // ["wholesale", "priority", "uk-based"]
```

Tags are especially useful with [Customer Segments](customer-segments.md) for targeting discounts and promotions.

## Notifications

Customer operations fire notifications:

| Operation | Before (Cancelable) | After |
|-----------|---------------------|-------|
| Create | `CustomerCreatingNotification` | `CustomerCreatedNotification` |

Use the `CustomerCreatingNotification` to validate or modify customer data before it is saved. For example, you could normalize phone numbers or apply default tags.

## Saved Payment Methods

Customers can save payment methods (credit cards, etc.) through payment providers that support vaulting. Saved methods are accessible via `Customer.SavedPaymentMethods` and include ownership checks to prevent one customer from using another's saved payment.

## Key Service Methods

| Method | Description |
|--------|-------------|
| `GetByIdAsync(id)` | Get customer by ID |
| `GetByEmailAsync(email)` | Get customer by email (case-insensitive) |
| `GetByMemberKeyAsync(key)` | Get customer by Umbraco Member key |
| `CreateAsync(parameters)` | Create a new customer |
| `GetDtoByIdAsync(id)` | Get customer DTO with order count |
