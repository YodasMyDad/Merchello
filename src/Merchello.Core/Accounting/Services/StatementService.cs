using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PdfSharp.Drawing;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

/// <summary>
/// Service for generating customer statements, account management, and outstanding balance tracking.
/// </summary>
public class StatementService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IPaymentService paymentService,
    ICurrencyService currencyService,
    IPdfService pdfService,
    IOptions<MerchelloSettings> settings,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IStatementService
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    /// <inheritdoc />
    public async Task<CustomerStatementDto> GetStatementDataAsync(
        GenerateStatementParameters parameters,
        CancellationToken ct = default)
    {
        var periodEnd = parameters.PeriodEnd ?? DateTime.UtcNow;
        var periodStart = parameters.PeriodStart ?? DateTime.MinValue;
        var now = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get customer details
            var customer = await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == parameters.CustomerId, ct);

            if (customer == null)
            {
                throw new InvalidOperationException($"Customer {parameters.CustomerId} not found.");
            }

            // Get all invoices for this customer (including before period for opening balance)
            var invoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Where(i => i.CustomerId == parameters.CustomerId && !i.IsDeleted && !i.IsCancelled)
                .OrderBy(i => i.DateCreated)
                .ToListAsync(ct);

            var currencyCode = invoices.FirstOrDefault()?.CurrencyCode ?? _settings.StoreCurrencyCode;

            // Calculate opening balance (unpaid amount before period start)
            decimal openingBalance = 0;
            foreach (var invoice in invoices.Where(i => i.DateCreated < periodStart))
            {
                var invoiceTotal = invoice.Total;
                var paymentsBeforePeriod = (invoice.Payments ?? [])
                    .Where(p => p.PaymentSuccess && p.DateCreated < periodStart)
                    .Sum(p => p.Amount);
                openingBalance += invoiceTotal - paymentsBeforePeriod;
            }

            // Build statement lines for transactions within the period
            var lines = new List<StatementLineDto>();
            decimal runningBalance = openingBalance;

            // Get all transactions in period, ordered by date
            var transactions = new List<(DateTime Date, string Type, string Reference, string Description, decimal? Debit, decimal? Credit)>();

            foreach (var invoice in invoices)
            {
                // Add invoice if created within period
                if (invoice.DateCreated >= periodStart && invoice.DateCreated <= periodEnd)
                {
                    transactions.Add((
                        Date: invoice.DateCreated,
                        Type: "Invoice",
                        Reference: invoice.InvoiceNumber,
                        Description: GetInvoiceDescription(invoice),
                        Debit: invoice.Total,
                        Credit: null
                    ));
                }

                // Add payments from this invoice if within period
                foreach (var payment in (invoice.Payments ?? []).Where(p => p.PaymentSuccess))
                {
                    if (payment.DateCreated >= periodStart && payment.DateCreated <= periodEnd)
                    {
                        var isRefund = payment.PaymentType is PaymentType.Refund or PaymentType.PartialRefund;
                        transactions.Add((
                            Date: payment.DateCreated,
                            Type: isRefund ? "Refund" : "Payment",
                            Reference: invoice.InvoiceNumber,
                            Description: payment.PaymentMethod ?? payment.PaymentProviderAlias ?? "Payment",
                            Debit: isRefund ? Math.Abs(payment.Amount) : null,
                            Credit: isRefund ? null : payment.Amount
                        ));
                    }
                }
            }

            // Sort all transactions chronologically and build statement lines
            foreach (var tx in transactions.OrderBy(t => t.Date))
            {
                if (tx.Debit.HasValue)
                    runningBalance += tx.Debit.Value;
                if (tx.Credit.HasValue)
                    runningBalance -= tx.Credit.Value;

                lines.Add(new StatementLineDto
                {
                    Date = tx.Date,
                    Type = tx.Type,
                    Reference = tx.Reference,
                    Description = tx.Description,
                    Debit = tx.Debit,
                    Credit = tx.Credit,
                    Balance = runningBalance
                });
            }

            // Calculate aging buckets based on unpaid invoices at period end
            var aging = CalculateAging(invoices, now);

            // Get billing address from most recent invoice
            var latestInvoice = invoices.OrderByDescending(i => i.DateCreated).FirstOrDefault();
            var billingAddress = latestInvoice?.BillingAddress != null
                ? new StatementAddressDto
                {
                    Company = latestInvoice.BillingAddress.Company,
                    AddressOne = latestInvoice.BillingAddress.AddressOne,
                    AddressTwo = latestInvoice.BillingAddress.AddressTwo,
                    TownCity = latestInvoice.BillingAddress.TownCity,
                    CountyState = latestInvoice.BillingAddress.CountyState?.Name,
                    PostalCode = latestInvoice.BillingAddress.PostalCode,
                    Country = latestInvoice.BillingAddress.CountryCode
                }
                : null;

            return new CustomerStatementDto
            {
                CustomerId = customer.Id,
                CustomerName = GetCustomerName(customer.FirstName, customer.LastName, customer.Email),
                CustomerEmail = customer.Email,
                BillingAddress = billingAddress,
                StatementDate = now,
                PeriodStart = periodStart == DateTime.MinValue ? invoices.MinBy(i => i.DateCreated)?.DateCreated ?? now : periodStart,
                PeriodEnd = periodEnd,
                OpeningBalance = openingBalance,
                Lines = lines,
                ClosingBalance = runningBalance,
                Aging = aging,
                CurrencyCode = currencyCode,
                PaymentTermsDays = customer.PaymentTermsDays,
                CreditLimit = customer.CreditLimit
            };
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateStatementPdfAsync(
        GenerateStatementParameters parameters,
        CancellationToken ct = default)
    {
        var statement = await GetStatementDataAsync(parameters, ct);
        var effectiveStore = await GetEffectiveStoreSettingsAsync(ct);
        return GeneratePdf(statement, parameters.CompanyName, parameters.CompanyAddress, effectiveStore);
    }

    private byte[] GeneratePdf(
        CustomerStatementDto statement,
        string? companyName,
        string? companyAddress,
        StoreSettings effectiveStore)
    {
        var document = pdfService.CreateDocument("Customer Statement");
        var (page, graphics) = pdfService.AddPage(document);

        var y = pdfService.DrawHeader(
            graphics,
            page,
            "Customer Statement",
            companyName ?? effectiveStore.Name ?? "Store",
            companyAddress ?? effectiveStore.Address);

        // Statement info section
        y = DrawStatementInfo(graphics, page, statement, y);

        // Customer address section
        if (statement.BillingAddress != null)
        {
            y = DrawCustomerAddress(graphics, statement.BillingAddress, y);
        }

        y += 10;

        // Account summary
        y = DrawAccountSummary(graphics, page, statement, y);

        y += 15;

        // Transaction table
        y = DrawTransactionTable(graphics, page, statement, y);

        // Aging summary (if there's outstanding balance)
        if (statement.Aging.Total > 0)
        {
            y += 15;
            y = DrawAgingSummary(graphics, page, statement, y);
        }

        // Footer
        pdfService.DrawFooter(graphics, page, 1, 1, statement.StatementDate);

        return pdfService.SaveToBytes(document);
    }

    private async Task<StoreSettings> GetEffectiveStoreSettingsAsync(CancellationToken ct)
    {
        if (_storeSettingsService == null)
        {
            return _settings.Store;
        }

        var runtimeSettings = await _storeSettingsService.GetRuntimeSettingsAsync(ct);
        return runtimeSettings.Merchello.Store ?? _settings.Store;
    }

    private double DrawStatementInfo(XGraphics graphics, PdfSharp.Pdf.PdfPage page, CustomerStatementDto statement, double startY)
    {
        var y = startY;
        var leftCol = pdfService.Margins.Left;
        var rightCol = page.Width.Point - pdfService.Margins.Right - 150;

        // Left side - Statement details
        pdfService.DrawText(graphics, "Statement Date:", leftCol, y, pdfService.Fonts.BodyBold);
        pdfService.DrawText(graphics, statement.StatementDate.ToString("dd MMM yyyy"), leftCol + 100, y);
        y += 15;

        pdfService.DrawText(graphics, "Period:", leftCol, y, pdfService.Fonts.BodyBold);
        var periodText = $"{statement.PeriodStart:dd MMM yyyy} - {statement.PeriodEnd:dd MMM yyyy}";
        pdfService.DrawText(graphics, periodText, leftCol + 100, y);
        y += 15;

        if (statement.PaymentTermsDays.HasValue)
        {
            pdfService.DrawText(graphics, "Payment Terms:", leftCol, y, pdfService.Fonts.BodyBold);
            pdfService.DrawText(graphics, $"Net {statement.PaymentTermsDays} days", leftCol + 100, y);
            y += 15;
        }

        // Right side - Customer details (drawn at startY)
        var rightY = startY;
        pdfService.DrawText(graphics, "Customer:", rightCol, rightY, pdfService.Fonts.BodyBold);
        rightY += 15;
        pdfService.DrawText(graphics, statement.CustomerName, rightCol, rightY);
        rightY += 12;
        pdfService.DrawText(graphics, statement.CustomerEmail, rightCol, rightY, pdfService.Fonts.Small);

        return Math.Max(y, rightY) + 10;
    }

    private double DrawCustomerAddress(XGraphics graphics, StatementAddressDto address, double startY)
    {
        var y = startY;
        var x = pdfService.Margins.Left;

        pdfService.DrawText(graphics, "Billing Address:", x, y, pdfService.Fonts.BodyBold);
        y += 15;

        if (!string.IsNullOrEmpty(address.Company))
        {
            pdfService.DrawText(graphics, address.Company, x, y, pdfService.Fonts.Small);
            y += 12;
        }
        if (!string.IsNullOrEmpty(address.AddressOne))
        {
            pdfService.DrawText(graphics, address.AddressOne, x, y, pdfService.Fonts.Small);
            y += 12;
        }
        if (!string.IsNullOrEmpty(address.AddressTwo))
        {
            pdfService.DrawText(graphics, address.AddressTwo, x, y, pdfService.Fonts.Small);
            y += 12;
        }

        var cityRegionPostal = string.Join(", ", new[]
        {
            address.TownCity,
            address.CountyState,
            address.PostalCode
        }.Where(s => !string.IsNullOrEmpty(s)));

        if (!string.IsNullOrEmpty(cityRegionPostal))
        {
            pdfService.DrawText(graphics, cityRegionPostal, x, y, pdfService.Fonts.Small);
            y += 12;
        }

        if (!string.IsNullOrEmpty(address.Country))
        {
            pdfService.DrawText(graphics, address.Country, x, y, pdfService.Fonts.Small);
            y += 12;
        }

        return y;
    }

    private double DrawAccountSummary(XGraphics graphics, PdfSharp.Pdf.PdfPage page, CustomerStatementDto statement, double startY)
    {
        var y = startY;
        var boxWidth = 160.0;
        var boxHeight = 50.0;
        var boxSpacing = 20.0;
        var startX = pdfService.Margins.Left;

        // Opening Balance box
        DrawSummaryBox(graphics, startX, y, boxWidth, boxHeight, "Opening Balance",
            currencyService.FormatAmount(statement.OpeningBalance, statement.CurrencyCode));

        // Closing Balance box
        DrawSummaryBox(graphics, startX + boxWidth + boxSpacing, y, boxWidth, boxHeight, "Closing Balance",
            currencyService.FormatAmount(statement.ClosingBalance, statement.CurrencyCode),
            statement.ClosingBalance > 0 ? XBrushes.DarkRed : XBrushes.DarkGreen);

        // Credit Limit box (if applicable)
        if (statement.CreditLimit.HasValue)
        {
            DrawSummaryBox(graphics, startX + (boxWidth + boxSpacing) * 2, y, boxWidth, boxHeight, "Credit Limit",
                currencyService.FormatAmount(statement.CreditLimit.Value, statement.CurrencyCode));
        }

        return y + boxHeight + 5;
    }

    private void DrawSummaryBox(XGraphics graphics, double x, double y, double width, double height, string label, string value, XBrush? valueBrush = null)
    {
        // Draw box background
        graphics.DrawRectangle(new XSolidBrush(XColor.FromGrayScale(0.95)), x, y, width, height);
        graphics.DrawRectangle(new XPen(XColors.LightGray, 0.5), x, y, width, height);

        // Draw label
        pdfService.DrawText(graphics, label, x + 10, y + 18, pdfService.Fonts.Small, XBrushes.Gray);

        // Draw value
        pdfService.DrawText(graphics, value, x + 10, y + 38, pdfService.Fonts.BodyBold, valueBrush ?? XBrushes.Black);
    }

    private double DrawTransactionTable(XGraphics graphics, PdfSharp.Pdf.PdfPage page, CustomerStatementDto statement, double startY)
    {
        var columns = new List<PdfTableColumn>
        {
            new("Date", 70),
            new("Type", 60),
            new("Reference", 90),
            new("Description", 140),
            new("Debit", 60, PdfTextAlignment.Right),
            new("Credit", 60, PdfTextAlignment.Right),
            new("Balance", 70, PdfTextAlignment.Right)
        };

        var rows = new List<string[]>();

        // Opening balance row
        rows.Add([
            "",
            "",
            "",
            "Opening Balance",
            "",
            "",
            currencyService.FormatAmount(statement.OpeningBalance, statement.CurrencyCode)
        ]);

        // Transaction rows
        foreach (var line in statement.Lines)
        {
            rows.Add([
                line.Date.ToString("dd/MM/yyyy"),
                line.Type,
                line.Reference,
                TruncateText(line.Description, 25),
                line.Debit.HasValue ? currencyService.FormatAmount(line.Debit.Value, statement.CurrencyCode) : "",
                line.Credit.HasValue ? currencyService.FormatAmount(line.Credit.Value, statement.CurrencyCode) : "",
                currencyService.FormatAmount(line.Balance, statement.CurrencyCode)
            ]);
        }

        return pdfService.DrawTable(graphics, startY, columns, rows, pdfService.Margins.Left);
    }

    private double DrawAgingSummary(XGraphics graphics, PdfSharp.Pdf.PdfPage page, CustomerStatementDto statement, double startY)
    {
        var y = startY;

        pdfService.DrawText(graphics, "Aging Summary", pdfService.Margins.Left, y, pdfService.Fonts.Subtitle);
        y += 20;

        var columns = new List<PdfTableColumn>
        {
            new("Current (0-30 days)", 120, PdfTextAlignment.Right),
            new("31-60 days", 100, PdfTextAlignment.Right),
            new("61-90 days", 100, PdfTextAlignment.Right),
            new("Over 90 days", 100, PdfTextAlignment.Right),
            new("Total Due", 100, PdfTextAlignment.Right)
        };

        var rows = new List<string[]>
        {
            new[]
            {
                currencyService.FormatAmount(statement.Aging.Current, statement.CurrencyCode),
                currencyService.FormatAmount(statement.Aging.ThirtyPlus, statement.CurrencyCode),
                currencyService.FormatAmount(statement.Aging.SixtyPlus, statement.CurrencyCode),
                currencyService.FormatAmount(statement.Aging.NinetyPlus, statement.CurrencyCode),
                currencyService.FormatAmount(statement.Aging.Total, statement.CurrencyCode)
            }
        };

        return pdfService.DrawTable(graphics, y, columns, rows, pdfService.Margins.Left);
    }

    private StatementAgingDto CalculateAging(List<Invoice> invoices, DateTime asOfDate)
    {
        decimal current = 0, thirtyPlus = 0, sixtyPlus = 0, ninetyPlus = 0;

        foreach (var invoice in invoices)
        {
            var paymentStatus = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
            {
                Payments = invoice.Payments ?? [],
                InvoiceTotal = invoice.Total,
                CurrencyCode = invoice.CurrencyCode
            });

            if (paymentStatus.BalanceDue <= 0) continue;

            var dueDate = invoice.DueDate ?? invoice.DateCreated;
            var daysOverdue = (asOfDate - dueDate).Days;

            if (daysOverdue <= 30)
                current += paymentStatus.BalanceDue;
            else if (daysOverdue <= 60)
                thirtyPlus += paymentStatus.BalanceDue;
            else if (daysOverdue <= 90)
                sixtyPlus += paymentStatus.BalanceDue;
            else
                ninetyPlus += paymentStatus.BalanceDue;
        }

        return new StatementAgingDto
        {
            Current = current,
            ThirtyPlus = thirtyPlus,
            SixtyPlus = sixtyPlus,
            NinetyPlus = ninetyPlus,
            Total = current + thirtyPlus + sixtyPlus + ninetyPlus
        };
    }

    private static string GetInvoiceDescription(Invoice invoice)
    {
        var orderCount = invoice.Orders?.Count ?? 0;
        return orderCount > 0
            ? $"Invoice for {orderCount} order{(orderCount > 1 ? "s" : "")}"
            : "Invoice";
    }

    private static string GetCustomerName(string? firstName, string? lastName, string email)
    {
        var name = $"{firstName} {lastName}".Trim();
        return string.IsNullOrEmpty(name) ? email : name;
    }

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;
        return text[..(maxLength - 3)] + "...";
    }

    #region Outstanding Balance Methods

    /// <inheritdoc />
    public async Task<List<OrderListItemDto>> GetOutstandingInvoicesForCustomerAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Where(i => i.CustomerId == customerId && !i.IsDeleted && !i.IsCancelled)
                .OrderBy(i => i.DueDate ?? i.DateCreated)
                .ToListAsync(cancellationToken);

            var outstandingInvoices = new List<OrderListItemDto>();

            foreach (var invoice in invoices)
            {
                var paymentStatus = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = invoice.Payments ?? [],
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });

                if (paymentStatus.BalanceDue <= 0) continue;

                outstandingInvoices.Add(MapOutstandingInvoice(invoice, paymentStatus, now));
            }

            return outstandingInvoices;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<OutstandingBalanceDto> GetOutstandingBalanceAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get customer for credit limit
            var customer = await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

            var invoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Where(i => i.CustomerId == customerId && !i.IsDeleted && !i.IsCancelled)
                .ToListAsync(cancellationToken);

            decimal totalOutstanding = 0;
            decimal totalOverdue = 0;
            int invoiceCount = 0;
            int overdueCount = 0;
            DateTime? nextDueDate = null;
            string currencyCode = _settings.StoreCurrencyCode;

            foreach (var invoice in invoices)
            {
                var paymentStatus = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = invoice.Payments ?? [],
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });

                if (paymentStatus.BalanceDue <= 0) continue;

                totalOutstanding += paymentStatus.BalanceDue;
                invoiceCount++;
                currencyCode = invoice.CurrencyCode;

                if (invoice.DueDate.HasValue)
                {
                    if (invoice.DueDate.Value < now)
                    {
                        totalOverdue += paymentStatus.BalanceDue;
                        overdueCount++;
                    }

                    if (nextDueDate == null || invoice.DueDate.Value < nextDueDate)
                    {
                        nextDueDate = invoice.DueDate.Value;
                    }
                }
            }

            return new OutstandingBalanceDto
            {
                TotalOutstanding = totalOutstanding,
                TotalOverdue = totalOverdue,
                InvoiceCount = invoiceCount,
                OverdueCount = overdueCount,
                NextDueDate = nextDueDate,
                CurrencyCode = currencyCode,
                CreditLimit = customer?.CreditLimit
            };
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<PaginatedList<OrderListItemDto>> GetOutstandingInvoicesPagedAsync(
        OutstandingInvoicesQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        // Normalize pagination
        if (parameters.Page < 1) parameters.Page = 1;
        if (parameters.PageSize < 1) parameters.PageSize = 50;
        if (parameters.PageSize > 200) parameters.PageSize = 200;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Where(i => !i.IsDeleted && !i.IsCancelled);

            // Filter by customer if specified
            if (parameters.CustomerId.HasValue)
            {
                query = query.Where(i => i.CustomerId == parameters.CustomerId.Value);
            }

            // Filter by account customers only
            if (parameters.AccountCustomersOnly)
            {
                var accountCustomerIds = await db.Customers
                    .AsNoTracking()
                    .Where(c => c.HasAccountTerms)
                    .Select(c => c.Id)
                    .ToListAsync(cancellationToken);

                query = query.Where(i => accountCustomerIds.Contains(i.CustomerId));
            }

            // Filter by due within days
            if (parameters.DueWithinDays.HasValue)
            {
                var cutoffDate = now.AddDays(parameters.DueWithinDays.Value);
                query = query.Where(i => i.DueDate.HasValue && i.DueDate.Value <= cutoffDate);
            }

            // Search filter
            if (!string.IsNullOrWhiteSpace(parameters.Search))
            {
                var searchTerm = parameters.Search.Trim().ToLower();
                query = query.Where(i =>
                    i.InvoiceNumber.ToLower().Contains(searchTerm) ||
                    i.BillingAddress.Name != null && i.BillingAddress.Name.ToLower().Contains(searchTerm) ||
                    i.BillingAddress.Email != null && i.BillingAddress.Email.ToLower().Contains(searchTerm));
            }

            var invoices = await query.ToListAsync(cancellationToken);

            // Filter for actually unpaid invoices and compute status
            var outstandingInvoices = new List<(Invoice Invoice, PaymentStatusDetails Status)>();

            foreach (var invoice in invoices)
            {
                var paymentStatus = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = invoice.Payments ?? [],
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });

                if (paymentStatus.BalanceDue <= 0) continue;

                var isOverdue = IsOverdue(invoice, paymentStatus, now);

                // Filter by overdue only if specified
                if (parameters.OverdueOnly == true && !isOverdue) continue;
                if (parameters.OverdueOnly == false && isOverdue) continue;

                outstandingInvoices.Add((invoice, paymentStatus));
            }

            // Sort
            var sorted = parameters.SortBy?.ToLower() switch
            {
                "total" => parameters.SortDirection?.ToLower() == "desc"
                    ? outstandingInvoices.OrderByDescending(x => x.Invoice.Total)
                    : outstandingInvoices.OrderBy(x => x.Invoice.Total),
                "customer" => parameters.SortDirection?.ToLower() == "desc"
                    ? outstandingInvoices.OrderByDescending(x => x.Invoice.BillingAddress.Name ?? x.Invoice.BillingAddress.Email)
                    : outstandingInvoices.OrderBy(x => x.Invoice.BillingAddress.Name ?? x.Invoice.BillingAddress.Email),
                "invoicenumber" => parameters.SortDirection?.ToLower() == "desc"
                    ? outstandingInvoices.OrderByDescending(x => x.Invoice.InvoiceNumber)
                    : outstandingInvoices.OrderBy(x => x.Invoice.InvoiceNumber),
                _ => parameters.SortDirection?.ToLower() == "desc"
                    ? outstandingInvoices
                        .OrderBy(x => x.Invoice.DueDate.HasValue ? 0 : 1)
                        .ThenByDescending(x => x.Invoice.DueDate ?? x.Invoice.DateCreated)
                    : outstandingInvoices
                        .OrderBy(x => x.Invoice.DueDate.HasValue ? 0 : 1)
                        .ThenBy(x => x.Invoice.DueDate ?? x.Invoice.DateCreated)
            };

            var totalCount = outstandingInvoices.Count;

            // Paginate
            var paged = sorted
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .Select(x => MapOutstandingInvoice(x.Invoice, x.Status, now))
                .ToList();

            return new PaginatedList<OrderListItemDto>(paged, totalCount, parameters.Page, parameters.PageSize);
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Calculates days until due date from now.
    /// </summary>
    private static int? CalculateDaysUntilDue(DateTime? dueDate, DateTime now)
        => dueDate.HasValue ? (int)(dueDate.Value.Date - now.Date).TotalDays : null;

    private static bool IsOverdue(Invoice invoice, PaymentStatusDetails paymentStatus, DateTime now)
        => invoice.DueDate.HasValue && invoice.DueDate.Value < now && paymentStatus.BalanceDue > 0;

    private OrderListItemDto MapOutstandingInvoice(Invoice invoice, PaymentStatusDetails paymentStatus, DateTime now)
    {
        var isOverdue = IsOverdue(invoice, paymentStatus, now);
        var daysUntilDue = CalculateDaysUntilDue(invoice.DueDate, now);

        return new OrderListItemDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            DateCreated = invoice.DateCreated,
            CustomerName = invoice.BillingAddress.Name ?? invoice.BillingAddress.Email ?? "",
            Channel = invoice.Channel,
            SourceType = invoice.Source?.Type,
            SourceName = invoice.Source?.SourceName ?? invoice.Source?.DisplayName,
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            StoreCurrencyCode = invoice.StoreCurrencyCode,
            StoreCurrencySymbol = currencyService.GetCurrency(invoice.StoreCurrencyCode).Symbol,
            Total = invoice.Total,
            TotalInStoreCurrency = invoice.TotalInStoreCurrency,
            IsMultiCurrency = invoice.CurrencyCode != invoice.StoreCurrencyCode,
            PaymentStatus = paymentStatus.Status,
            PaymentStatusDisplay = paymentStatus.StatusDisplay,
            PaymentStatusCssClass = paymentStatus.Status.GetPaymentStatusCssClass(),
            FulfillmentStatus = (invoice.Orders ?? []).GetFulfillmentStatus(),
            IsCancelled = invoice.IsCancelled,
            ItemCount = invoice.Orders?.SelectMany(o => o.LineItems ?? []).Sum(li => li.Quantity) ?? 0,
            DueDate = invoice.DueDate,
            IsOverdue = isOverdue,
            DaysUntilDue = daysUntilDue,
            MaxRiskScore = paymentStatus.MaxRiskScore,
            MaxRiskScoreSource = paymentStatus.MaxRiskScoreSource,
            RiskLevel = paymentStatus.RiskLevel
        };
    }

    #endregion
}
