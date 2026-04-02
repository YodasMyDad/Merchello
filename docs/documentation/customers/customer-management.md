# Customer Management

Merchello customers are created automatically during checkout -- you do not need to build any customer registration or creation logic for your storefront.

## How It Works

When a customer completes checkout, Merchello checks for an existing customer record matching the billing email address. If one exists, the invoice is linked to it. If not, a new customer record is created from the billing address details.

This means guest checkout works out of the box. Returning guests are matched by email to their previous orders automatically.

## Logged-In Members

Merchello Customers and Umbraco Members are separate concepts. A customer can optionally be linked to an Umbraco Member via `MemberKey`, which enables personalized experiences for logged-in users. Guest checkout creates customers without any member link.

## Accessing Customer Data in Storefront Code

If you need customer data (e.g., to show order history or saved addresses for a logged-in member), inject `ICustomerService`:

```csharp
public class AccountController(ICustomerService customerService)
{
    public async Task<IActionResult> OrderHistory(Guid memberKey, CancellationToken ct)
    {
        var customer = await customerService.GetByMemberKeyAsync(memberKey, ct);
        // Use customer to look up invoices, addresses, etc.
    }
}
```

Key lookup methods:

| Method | Use case |
|--------|----------|
| `GetByEmailAsync(email)` | Find customer by email |
| `GetByMemberKeyAsync(key)` | Find customer linked to an Umbraco Member |
| `GetByIdAsync(id)` | Find customer by Merchello ID |

## Backoffice Management

Customer records, tags, account terms (B2B), credit limits, and flagging are all managed through the Merchello backoffice. See the backoffice documentation for details on admin-side customer management.
