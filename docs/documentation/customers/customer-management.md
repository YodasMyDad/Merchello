# Customer Management

Merchello customers are created automatically during checkout -- you do not need to build any customer registration or creation logic for your storefront.

## How It Works

At checkout, `ICustomerService.GetOrCreateByEmailAsync(...)` ([ICustomerService.cs:61](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Customers/Services/Interfaces/ICustomerService.cs#L61)) checks for an existing customer record matching the billing email address. If one exists, the invoice is linked to it. If not, a new customer record is created from the billing address details.

This means guest checkout works out of the box. Returning guests are matched by email to their previous orders automatically without needing to sign in.

## Logged-In Members

Merchello `Customer` and Umbraco `Member` are separate concepts:

- A `Customer` represents the buyer from Merchello's perspective (invoices, addresses, tags, segments).
- An Umbraco `Member` is a site login.
- A customer can optionally be linked to an Umbraco Member via `Customer.MemberKey`, which enables order history, saved addresses and other personalized experiences once the member is logged in.
- Guest checkout creates customers without any member link -- they are reachable only by email lookup.

## Accessing Customer Data in Storefront Code

Inject [`ICustomerService`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Customers/Services/Interfaces/ICustomerService.cs) to look up customers from Razor controllers or view components:

```csharp
public class AccountController(ICustomerService customerService)
{
    public async Task<IActionResult> OrderHistory(Guid memberKey, CancellationToken ct)
    {
        var customer = await customerService.GetByMemberKeyAsync(memberKey, ct);
        if (customer is null)
        {
            return NotFound();
        }

        // Use customer.Id to look up invoices, addresses, etc.
        return View(customer);
    }
}
```

Key lookup methods:

| Method | Use case |
|--------|----------|
| `GetByEmailAsync(email)` | Find customer by email |
| `GetByMemberKeyAsync(key)` | Find customer linked to an Umbraco Member |
| `GetByIdAsync(id)` | Find customer by Merchello ID |
| `GetOrCreateByEmailAsync(parameters)` | Checkout-time lookup-or-create (usually you should not call this directly from storefront code -- the checkout pipeline does) |

> **Do not mutate customer records from storefront controllers.** Mutation-capable methods (`CreateAsync`, `UpdateAsync`, `DeleteAsync`, tag and segment management) return `CrudResult<T>` and live on the same service, but storefront pages should stay read-only on customer data. All customer edits belong in the backoffice.

## Backoffice Management

Customer records, tags, account terms (B2B), credit limits, segment membership, and flagging are all managed through the Merchello backoffice. See the backoffice documentation for details on admin-side customer management.

## Related Topics

- [Customer Segments](customer-segments.md) -- grouping customers for discount eligibility
- [Discounts Overview](../discounts/discounts-overview.md) -- how segments gate discount eligibility
- [Checkout Overview](../checkout/) -- where `GetOrCreateByEmailAsync` runs in the checkout pipeline
