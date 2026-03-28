# Customer Statements

For B2B customers who pay on account, Merchello generates **customer statements** that show invoices, payments, and running balances over a time period. This is essential for account management, collections, and providing customers with their account history.

## What Is a Statement?

A statement is a chronological list of financial transactions for a customer:

```
STATEMENT - Jane's Hardware Ltd
Period: 01/01/2026 - 31/03/2026

Opening Balance:                    250.00

Date        Type      Reference    Debit     Credit    Balance
15/01       Invoice   INV-0089     430.00              680.00
22/01       Payment   INV-0089               250.00    430.00
01/02       Invoice   INV-0102     280.00              710.00
15/02       Payment   INV-0089               430.00    280.00
01/03       Invoice   INV-0115     195.00              475.00
10/03       Refund    INV-0102      50.00              525.00

Closing Balance:                    525.00
```

## Generating Statement Data

Use `IStatementService.GetStatementDataAsync()` to get statement data:

```csharp
var statement = await statementService.GetStatementDataAsync(
    new GenerateStatementParameters
    {
        CustomerId = customerId,
        PeriodStart = new DateTime(2026, 1, 1),
        PeriodEnd = new DateTime(2026, 3, 31)
    },
    cancellationToken);
```

If you don't specify a period, it defaults to all history up to the current date.

## Statement Data Structure

The `CustomerStatementDto` includes:

| Property | Description |
|----------|-------------|
| Customer details | Name, email, address |
| `OpeningBalance` | Unpaid balance at the start of the period |
| `Lines` | Chronological list of transactions |
| `ClosingBalance` | Balance at the end of the period |
| Currency information | Currency code and formatting |

Each statement line contains:

| Property | Description |
|----------|-------------|
| `Date` | Transaction date |
| `Type` | "Invoice", "Payment", or "Refund" |
| `Reference` | Invoice number |
| `Description` | Details (invoice description or payment method) |
| `Debit` | Amount owed (invoices, refunds) |
| `Credit` | Amount paid (payments) |
| `Balance` | Running balance after this transaction |

## How Balances Are Calculated

### Opening balance

The opening balance is the sum of all unpaid amounts from invoices created **before** the period start:

```
For each invoice before period start:
    opening += invoice.Total - payments_before_period_start
```

This means the opening balance reflects only what was still outstanding at the beginning of the statement period.

### Running balance

Each transaction adjusts the running balance:
- **Invoice**: adds to the balance (debit)
- **Payment**: reduces the balance (credit)
- **Refund**: adds back to the balance (debit)

### Transaction ordering

All transactions (invoices, payments, refunds) within the period are sorted chronologically. This gives a clear picture of how the balance changed over time.

## PDF Generation

Statements can be exported as PDF documents:

```csharp
var pdfBytes = await statementService.GenerateStatementPdfAsync(
    new GenerateStatementParameters
    {
        CustomerId = customerId,
        PeriodStart = periodStart,
        PeriodEnd = periodEnd
    },
    cancellationToken);
```

The PDF is generated using PdfSharp and includes:
- Store branding (from store settings)
- Customer details and address
- Full transaction table with running balance
- Opening and closing balance summaries

> **Tip:** The PDF generation uses `IPdfService` for rendering. Store settings (name, logo, address) are pulled from `IMerchelloStoreSettingsService` when available.

## Outstanding Invoices

Beyond statements, you can query for outstanding (unpaid or partially paid) invoices:

```csharp
var outstandingInvoices = await invoiceService.QueryAsync(new InvoiceQueryParameters
{
    CustomerId = customerId,
    PaymentStatus = "Unpaid", // or "PartiallyPaid"
    PageSize = 50
});
```

This powers the "Outstanding Balance" view in the backoffice.

## Integration with Account Terms

Statements work hand-in-hand with customer account terms:

- `Customer.HasAccountTerms = true` enables account ordering
- `Customer.PaymentTermsDays` sets the default due date for new invoices
- `Invoice.DueDate` tracks when payment is expected
- Statements show which invoices are past due

> **Tip:** Use statement data combined with `DueDate` to build aged debtor reports -- group outstanding invoices by age (current, 30 days, 60 days, 90+ days).

## Paged Queries

For customers with many transactions, statement queries are pageable:

```csharp
var statement = await statementService.GetStatementDataAsync(
    new GenerateStatementParameters
    {
        CustomerId = customerId,
        PeriodStart = periodStart,
        PeriodEnd = periodEnd,
        PageNumber = 1,
        PageSize = 50
    },
    cancellationToken);
```
