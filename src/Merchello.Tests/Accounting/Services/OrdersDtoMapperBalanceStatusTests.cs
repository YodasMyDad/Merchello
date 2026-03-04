using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Services;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Integration tests verifying that OrdersDtoMapper correctly derives
/// BalanceStatus, BalanceStatusCssClass, BalanceStatusLabel, and CreditDue
/// from payment data. These tests cover the tuple-pattern balance status
/// logic that was previously dead code (BalanceDue &lt; 0 was unreachable).
/// </summary>
[Collection("Integration Tests")]
public class OrdersDtoMapperBalanceStatusTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly OrdersDtoMapper _mapper;

    public OrdersDtoMapperBalanceStatusTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _mapper = new OrdersDtoMapper(
            fixture.GetService<IPaymentService>(),
            fixture.GetService<ICurrencyService>(),
            fixture.GetService<ILocalityCatalog>(),
            fixture.GetService<IFulfilmentService>(),
            fixture.GetService<IWarehouseService>());
    }

    [Fact]
    public async Task MapToDetailAsync_ExactPayment_BalanceStatusIsBalanced()
    {
        // Arrange - Invoice total matches payment
        var invoice = CreateInvoiceWithPayments(total: 100m, paymentAmounts: [100m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Balanced");
        dto.BalanceStatusCssClass.ShouldBe("balanced");
        dto.BalanceStatusLabel.ShouldBe("");
        dto.CreditDue.ShouldBe(0m);
        dto.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public async Task MapToDetailAsync_Underpayment_BalanceStatusIsUnderpaid()
    {
        // Arrange - Partial payment
        var invoice = CreateInvoiceWithPayments(total: 100m, paymentAmounts: [40m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Underpaid");
        dto.BalanceStatusCssClass.ShouldBe("underpaid");
        dto.BalanceStatusLabel.ShouldBe("Balance Due");
        dto.BalanceDue.ShouldBe(60m);
        dto.CreditDue.ShouldBe(0m);
    }

    [Fact]
    public async Task MapToDetailAsync_Overpayment_BalanceStatusIsOverpaid()
    {
        // Arrange - Payment exceeds invoice total (product removal scenario)
        var invoice = CreateInvoiceWithPayments(total: 60m, paymentAmounts: [100m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Overpaid");
        dto.BalanceStatusCssClass.ShouldBe("overpaid");
        dto.BalanceStatusLabel.ShouldBe("Credit Due");
        dto.BalanceDue.ShouldBe(0m);
        dto.CreditDue.ShouldBe(40m);
    }

    [Fact]
    public async Task MapToDetailAsync_ZeroInvoiceTotal_BalanceStatusIsOverpaid()
    {
        // Arrange - All products removed, total is 0 but payment exists
        var invoice = CreateInvoiceWithPayments(total: 0m, paymentAmounts: [100m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Overpaid");
        dto.CreditDue.ShouldBe(100m);
    }

    [Fact]
    public async Task MapToDetailAsync_PartialRefundStillOverpaid_BalanceStatusIsOverpaid()
    {
        // Arrange - Paid 100, refunded 15, invoice total dropped to 60
        // Net = 85, credit due = 85 - 60 = 25
        var invoice = CreateInvoiceWithPayments(
            total: 60m,
            paymentAmounts: [100m],
            refundAmounts: [15m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Overpaid");
        dto.BalanceStatusLabel.ShouldBe("Credit Due");
        dto.CreditDue.ShouldBe(25m);
        dto.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public async Task MapToDetailAsync_RefundResolvesOverpayment_BalanceStatusIsBalanced()
    {
        // Arrange - Paid 100, refunded 40, invoice total dropped to 60
        // Net = 60, matches total exactly
        var invoice = CreateInvoiceWithPayments(
            total: 60m,
            paymentAmounts: [100m],
            refundAmounts: [40m]);

        // Act
        var dto = await _mapper.MapToDetailAsync(
            invoice,
            new Dictionary<Guid, string>(),
            new Dictionary<Guid, string?>());

        // Assert
        dto.BalanceStatus.ShouldBe("Balanced");
        dto.BalanceStatusCssClass.ShouldBe("balanced");
        dto.CreditDue.ShouldBe(0m);
        dto.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public async Task MapToListItem_Overpayment_ListItemShowsCorrectStatus()
    {
        // Arrange - Verify the list item mapper also works (uses same calculation)
        var invoice = CreateInvoiceWithPayments(total: 60m, paymentAmounts: [100m]);

        // Act
        var dto = _mapper.MapToListItem(invoice);

        // Assert - List item uses payment status enum, not balance status strings
        dto.PaymentStatus.ShouldBe(InvoicePaymentStatus.Paid);
    }

    /// <summary>
    /// Creates an in-memory Invoice with Payment objects attached.
    /// The mapper calls CalculatePaymentStatus internally using invoice.Payments,
    /// so this tests the full chain without needing DB persistence.
    /// </summary>
    private static Invoice CreateInvoiceWithPayments(
        decimal total,
        decimal[] paymentAmounts,
        decimal[]? refundAmounts = null)
    {
        var invoiceId = Guid.NewGuid();
        var payments = new List<Payment>();

        foreach (var amount in paymentAmounts)
        {
            payments.Add(new Payment
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                Amount = amount,
                PaymentType = PaymentType.Payment,
                PaymentSuccess = true,
                PaymentMethod = "Manual",
                CurrencyCode = "GBP",
                DateCreated = DateTime.UtcNow
            });
        }

        if (refundAmounts != null)
        {
            foreach (var amount in refundAmounts)
            {
                payments.Add(new Payment
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoiceId,
                    Amount = -amount,
                    PaymentType = PaymentType.PartialRefund,
                    PaymentSuccess = true,
                    PaymentMethod = "Manual",
                    CurrencyCode = "GBP",
                    DateCreated = DateTime.UtcNow
                });
            }
        }

        return new Invoice
        {
            Id = invoiceId,
            InvoiceNumber = "TEST-001",
            Total = total,
            CurrencyCode = "GBP",
            CurrencySymbol = "£",
            StoreCurrencyCode = "GBP",
            DateCreated = DateTime.UtcNow,
            Payments = payments,
            Orders = []
        };
    }
}
