using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using Merchello.Core.Locality.Models;
using Shouldly;
using Umbraco.Cms.Core.Scoping;
using Xunit;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Tests.Accounting.Services;

public class StatementServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MerchelloDbContext _db;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<ICurrencyService> _currencyServiceMock;
    private readonly Mock<IPdfService> _pdfServiceMock;
    private readonly StatementService _service;
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly AddressFactory _addressFactory = new();
    private readonly CustomerFactory _customerFactory = new();
    private readonly InvoiceFactory _invoiceFactory;
    private readonly PaymentFactory _paymentFactory;

    public StatementServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new MerchelloDbContext(options);
        _db.Database.EnsureCreated();

        var scopeProvider = CreateScopeProvider(_db);

        _paymentServiceMock = new Mock<IPaymentService>();
        _paymentServiceMock
            .Setup(x => x.CalculatePaymentStatus(It.IsAny<CalculatePaymentStatusParameters>()))
            .Returns((CalculatePaymentStatusParameters p) =>
            {
                var totalPaid = p.Payments.Where(pay => pay.PaymentSuccess).Sum(pay => pay.Amount);
                var balance = p.InvoiceTotal - totalPaid;
                return new PaymentStatusDetails
                {
                    Status = balance <= 0 ? InvoicePaymentStatus.Paid : InvoicePaymentStatus.Unpaid,
                    StatusDisplay = balance <= 0 ? "Paid" : "Unpaid",
                    BalanceDue = Math.Max(0, balance),
                    TotalPaid = totalPaid
                };
            });

        _currencyServiceMock = new Mock<ICurrencyService>();
        _currencyServiceMock
            .Setup(x => x.FormatAmount(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => $"${amount:N2}");
        _currencyServiceMock
            .Setup(x => x.GetCurrency(It.IsAny<string>()))
            .Returns((string code) => new CurrencyInfo(code, "$", 2, true));
        _currencyServiceMock
            .Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => amount);

        _pdfServiceMock = new Mock<IPdfService>();

        var settings = Options.Create(new MerchelloSettings
        {
            StoreCurrencyCode = "USD",
            Store = new StoreSettings { Name = "Test Store" }
        });

        _invoiceFactory = new InvoiceFactory(_currencyServiceMock.Object);
        _paymentFactory = new PaymentFactory(_currencyServiceMock.Object);

        _service = new StatementService(scopeProvider, _paymentServiceMock.Object,
            _currencyServiceMock.Object, _pdfServiceMock.Object, settings);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    #region GetStatementDataAsync

    [Fact]
    public async Task GetStatementData_BasicInvoice_ReturnsCorrectLines()
    {
        await SeedCustomer();
        var invoice = CreateInvoice(total: 500m, dateCreated: DateTime.UtcNow.AddDays(-5));
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-10),
            PeriodEnd = DateTime.UtcNow
        });

        result.ShouldNotBeNull();
        result.CustomerId.ShouldBe(_customerId);
        result.Lines.Count.ShouldBe(1);
        result.Lines[0].Type.ShouldBe("Invoice");
        result.Lines[0].Debit.ShouldBe(500m);
        result.Lines[0].Credit.ShouldBeNull();
        result.ClosingBalance.ShouldBe(500m);
    }

    [Fact]
    public async Task GetStatementData_InvoiceWithPayment_ShowsBothLines()
    {
        await SeedCustomer();
        var invoice = CreateInvoice(total: 500m, dateCreated: DateTime.UtcNow.AddDays(-5));
        invoice.Payments =
        [
            CreatePayment(invoice.Id, 200m, DateTime.UtcNow.AddDays(-3))
        ];
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-10),
            PeriodEnd = DateTime.UtcNow
        });

        result.Lines.Count.ShouldBe(2);
        result.Lines[0].Type.ShouldBe("Invoice");
        result.Lines[0].Debit.ShouldBe(500m);
        result.Lines[1].Type.ShouldBe("Payment");
        result.Lines[1].Credit.ShouldBe(200m);
        result.ClosingBalance.ShouldBe(300m); // 500 - 200
    }

    [Fact]
    public async Task GetStatementData_Refund_ShowsAsDebit()
    {
        await SeedCustomer();
        var invoice = CreateInvoice(total: 500m, dateCreated: DateTime.UtcNow.AddDays(-5));
        invoice.Payments =
        [
            CreatePayment(invoice.Id, 500m, DateTime.UtcNow.AddDays(-4)),
            CreatePayment(invoice.Id, 100m, DateTime.UtcNow.AddDays(-2), PaymentType.Refund)
        ];
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-10),
            PeriodEnd = DateTime.UtcNow
        });

        var refundLine = result.Lines.FirstOrDefault(l => l.Type == "Refund");
        refundLine.ShouldNotBeNull();
        refundLine.Debit.ShouldBe(100m);
        refundLine.Credit.ShouldBeNull();
    }

    [Fact]
    public async Task GetStatementData_OpeningBalance_CalculatedFromPriorPeriod()
    {
        await SeedCustomer();

        // Invoice BEFORE the period
        var oldInvoice = CreateInvoice(total: 1000m, dateCreated: DateTime.UtcNow.AddDays(-20));
        oldInvoice.Payments =
        [
            CreatePayment(oldInvoice.Id, 400m, DateTime.UtcNow.AddDays(-18))
        ];
        _db.Invoices.Add(oldInvoice);

        // Invoice IN the period
        var currentInvoice = CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-3));
        _db.Invoices.Add(currentInvoice);
        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-7),
            PeriodEnd = DateTime.UtcNow
        });

        result.OpeningBalance.ShouldBe(600m); // 1000 - 400 unpaid from old invoice
        result.Lines.Count.ShouldBe(1); // Only the current period invoice
        result.ClosingBalance.ShouldBe(800m); // 600 opening + 200 new invoice
    }

    [Fact]
    public async Task GetStatementData_CustomerNotFound_Throws()
    {
        await Should.ThrowAsync<InvalidOperationException>(
            () => _service.GetStatementDataAsync(new GenerateStatementParameters
            {
                CustomerId = Guid.NewGuid()
            }));
    }

    [Fact]
    public async Task GetStatementData_ExcludesCancelledAndDeletedInvoices()
    {
        await SeedCustomer();

        _db.Invoices.Add(CreateInvoice(total: 100m, dateCreated: DateTime.UtcNow.AddDays(-3)));
        _db.Invoices.Add(CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-2), isCancelled: true));
        _db.Invoices.Add(CreateInvoice(total: 300m, dateCreated: DateTime.UtcNow.AddDays(-1), isDeleted: true));
        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-10),
            PeriodEnd = DateTime.UtcNow
        });

        result.Lines.Count.ShouldBe(1);
        result.ClosingBalance.ShouldBe(100m);
    }

    #endregion

    #region GetOutstandingBalanceAsync

    [Fact]
    public async Task GetOutstandingBalance_UnpaidInvoices_CalculatesCorrectly()
    {
        await SeedCustomer();

        // Fully paid
        var paidInvoice = CreateInvoice(total: 100m, dateCreated: DateTime.UtcNow.AddDays(-5));
        paidInvoice.Payments = [CreatePayment(paidInvoice.Id, 100m, DateTime.UtcNow.AddDays(-4))];
        _db.Invoices.Add(paidInvoice);

        // Partially paid
        var partialInvoice = CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-3));
        partialInvoice.Payments = [CreatePayment(partialInvoice.Id, 50m, DateTime.UtcNow.AddDays(-2))];
        _db.Invoices.Add(partialInvoice);

        // Unpaid
        var unpaidInvoice = CreateInvoice(total: 300m, dateCreated: DateTime.UtcNow.AddDays(-1));
        _db.Invoices.Add(unpaidInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetOutstandingBalanceAsync(_customerId);

        result.TotalOutstanding.ShouldBe(450m); // 150 + 300
        result.InvoiceCount.ShouldBe(2);
    }

    [Fact]
    public async Task GetOutstandingBalance_OverdueInvoices_TracksOverdueAmount()
    {
        await SeedCustomer();

        // Overdue (past due date)
        var overdueInvoice = CreateInvoice(total: 500m, dateCreated: DateTime.UtcNow.AddDays(-10));
        overdueInvoice.DueDate = DateTime.UtcNow.AddDays(-5);
        _db.Invoices.Add(overdueInvoice);

        // Not yet due
        var futureInvoice = CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-1));
        futureInvoice.DueDate = DateTime.UtcNow.AddDays(30);
        _db.Invoices.Add(futureInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetOutstandingBalanceAsync(_customerId);

        result.TotalOutstanding.ShouldBe(700m);
        result.TotalOverdue.ShouldBe(500m);
        result.OverdueCount.ShouldBe(1);
    }

    [Fact]
    public async Task GetOutstandingBalance_NoInvoices_ReturnsZeros()
    {
        await SeedCustomer();

        var result = await _service.GetOutstandingBalanceAsync(_customerId);

        result.TotalOutstanding.ShouldBe(0);
        result.InvoiceCount.ShouldBe(0);
        result.OverdueCount.ShouldBe(0);
    }

    #endregion

    #region GetOutstandingInvoicesForCustomerAsync

    [Fact]
    public async Task GetOutstandingInvoices_ReturnsOnlyUnpaid()
    {
        await SeedCustomer();

        var paidInvoice = CreateInvoice(total: 100m, dateCreated: DateTime.UtcNow.AddDays(-5));
        paidInvoice.Payments = [CreatePayment(paidInvoice.Id, 100m, DateTime.UtcNow)];
        _db.Invoices.Add(paidInvoice);

        var unpaidInvoice = CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-3));
        _db.Invoices.Add(unpaidInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetOutstandingInvoicesForCustomerAsync(_customerId);

        result.Count.ShouldBe(1);
        result[0].Total.ShouldBe(200m);
    }

    [Fact]
    public async Task GetOutstandingInvoices_OrderedByDueDate()
    {
        await SeedCustomer();

        var laterInvoice = CreateInvoice(total: 100m, dateCreated: DateTime.UtcNow.AddDays(-5));
        laterInvoice.DueDate = DateTime.UtcNow.AddDays(30);
        _db.Invoices.Add(laterInvoice);

        var earlierInvoice = CreateInvoice(total: 200m, dateCreated: DateTime.UtcNow.AddDays(-3));
        earlierInvoice.DueDate = DateTime.UtcNow.AddDays(7);
        _db.Invoices.Add(earlierInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetOutstandingInvoicesForCustomerAsync(_customerId);

        result.Count.ShouldBe(2);
        result[0].Total.ShouldBe(200m); // Earlier due date comes first
        result[1].Total.ShouldBe(100m);
    }

    #endregion

    #region Aging Calculation

    [Fact]
    public async Task GetStatementData_Aging_BucketsCorrectly()
    {
        await SeedCustomer();
        var now = DateTime.UtcNow;

        // Current (0-30 days overdue)
        var currentInvoice = CreateInvoice(total: 100m, dateCreated: now.AddDays(-20));
        currentInvoice.DueDate = now.AddDays(-10);
        _db.Invoices.Add(currentInvoice);

        // 31-60 days overdue
        var thirtyPlusInvoice = CreateInvoice(total: 200m, dateCreated: now.AddDays(-50));
        thirtyPlusInvoice.DueDate = now.AddDays(-45);
        _db.Invoices.Add(thirtyPlusInvoice);

        // 61-90 days overdue
        var sixtyPlusInvoice = CreateInvoice(total: 300m, dateCreated: now.AddDays(-80));
        sixtyPlusInvoice.DueDate = now.AddDays(-75);
        _db.Invoices.Add(sixtyPlusInvoice);

        // 90+ days overdue
        var ninetyPlusInvoice = CreateInvoice(total: 400m, dateCreated: now.AddDays(-120));
        ninetyPlusInvoice.DueDate = now.AddDays(-100);
        _db.Invoices.Add(ninetyPlusInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = now.AddDays(-365),
            PeriodEnd = now
        });

        result.Aging.Current.ShouldBe(100m);
        result.Aging.ThirtyPlus.ShouldBe(200m);
        result.Aging.SixtyPlus.ShouldBe(300m);
        result.Aging.NinetyPlus.ShouldBe(400m);
        result.Aging.Total.ShouldBe(1000m);
    }

    [Fact]
    public async Task GetStatementData_Aging_PaidInvoicesExcluded()
    {
        await SeedCustomer();

        var paidInvoice = CreateInvoice(total: 500m, dateCreated: DateTime.UtcNow.AddDays(-50));
        paidInvoice.DueDate = DateTime.UtcNow.AddDays(-45);
        paidInvoice.Payments = [CreatePayment(paidInvoice.Id, 500m, DateTime.UtcNow.AddDays(-40))];
        _db.Invoices.Add(paidInvoice);

        await _db.SaveChangesAsync();

        var result = await _service.GetStatementDataAsync(new GenerateStatementParameters
        {
            CustomerId = _customerId,
            PeriodStart = DateTime.UtcNow.AddDays(-365),
            PeriodEnd = DateTime.UtcNow
        });

        result.Aging.Total.ShouldBe(0m);
    }

    #endregion

    #region Helpers

    private async Task SeedCustomer()
    {
        var customer = _customerFactory.CreateFromEmail("john@test.com");
        customer.Id = _customerId;
        customer.FirstName = "John";
        customer.LastName = "Doe";
        customer.DateCreated = DateTime.UtcNow.AddMonths(-6);
        customer.DateUpdated = customer.DateCreated;

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
    }

    private Invoice CreateInvoice(decimal total, DateTime dateCreated, bool isCancelled = false, bool isDeleted = false)
    {
        var billingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Main St",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: "john@test.com");

        var shippingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Main St",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: "john@test.com");

        var invoice = _invoiceFactory.CreateManual(
            invoiceNumber: $"INV-{Guid.NewGuid().ToString()[..6]}",
            customerId: _customerId,
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "USD",
            subTotal: total,
            tax: 0m,
            total: total);

        invoice.TotalInStoreCurrency = total;
        invoice.DateCreated = dateCreated;
        invoice.DateUpdated = dateCreated;
        invoice.IsCancelled = isCancelled;
        invoice.IsDeleted = isDeleted;
        invoice.Payments ??= [];
        return invoice;
    }

    private Payment CreatePayment(Guid invoiceId, decimal amount, DateTime dateCreated, PaymentType paymentType = PaymentType.Payment, bool success = true)
    {
        var payment = _paymentFactory.CreateManualPayment(
            invoiceId: invoiceId,
            amount: amount,
            currencyCode: "USD",
            storeCurrencyCode: "USD",
            pricingExchangeRate: null,
            paymentMethod: "Test");

        payment.Amount = amount;
        payment.PaymentType = paymentType;
        payment.PaymentSuccess = success;
        payment.DateCreated = dateCreated;
        return payment;
    }

    private static IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider(MerchelloDbContext db)
    {
        var mock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        mock.Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                // Register all return types used by StatementService
                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<CustomerStatementDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<CustomerStatementDto>> func) => func(db));

                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<OrderListItemDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<OrderListItemDto>>> func) => func(db));

                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<OutstandingBalanceDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<OutstandingBalanceDto>> func) => func(db));

                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<OrderListItemDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<OrderListItemDto>>> func) => func(db));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose());

                return scopeMock.Object;
            });

        return mock.Object;
    }

    #endregion
}
