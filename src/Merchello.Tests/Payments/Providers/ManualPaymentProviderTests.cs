using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.BuiltIn;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

public class ManualPaymentProviderTests
{
    private readonly Mock<IInvoiceService> _invoiceServiceMock;
    private readonly ManualPaymentProvider _provider;

    public ManualPaymentProviderTests()
    {
        _invoiceServiceMock = new Mock<IInvoiceService>();
        _provider = new ManualPaymentProvider(_invoiceServiceMock.Object);
    }

    [Fact]
    public void Metadata_HasCorrectValues()
    {
        _provider.Metadata.Alias.ShouldBe("manual");
        _provider.Metadata.DisplayName.ShouldBe("Manual Payment");
        _provider.Metadata.SupportsRefunds.ShouldBeTrue();
        _provider.Metadata.SupportsPartialRefunds.ShouldBeTrue();
        _provider.Metadata.RequiresWebhook.ShouldBeFalse();
    }

    [Fact]
    public void GetAvailablePaymentMethods_ReturnsBothMethods()
    {
        var methods = _provider.GetAvailablePaymentMethods();

        methods.Count.ShouldBe(2);

        // Manual method - hidden from checkout
        var manualMethod = methods.First(m => m.Alias == "manual");
        manualMethod.DisplayName.ShouldBe("Manual Payment");
        manualMethod.ShowInCheckoutByDefault.ShouldBeFalse();
        manualMethod.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);

        // Purchase Order method - visible in checkout
        var poMethod = methods.First(m => m.Alias == "purchaseorder");
        poMethod.DisplayName.ShouldBe("Purchase Order");
        poMethod.ShowInCheckoutByDefault.ShouldBeTrue();
        poMethod.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);
    }

    #region Manual Payment Method Tests

    [Fact]
    public async Task CreatePaymentSession_ManualMethod_ReturnsManualFormFields()
    {
        var request = new PaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            MethodAlias = "manual",
            Amount = 150m,
            Currency = "GBP",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        var result = await _provider.CreatePaymentSessionAsync(request);

        result.Success.ShouldBeTrue();
        result.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);
        result.FormFields.ShouldNotBeNull();

        var fields = result.FormFields!.ToList();
        fields.Count.ShouldBe(3);

        // Payment method dropdown
        var paymentMethodField = fields.First(f => f.Key == "paymentMethod");
        paymentMethodField.FieldType.ShouldBe(CheckoutFieldType.Select);
        paymentMethodField.IsRequired.ShouldBeTrue();
        paymentMethodField.Options.ShouldNotBeNull();
        paymentMethodField.Options!.Count().ShouldBe(6); // cash, check, bank_transfer, credit_card_manual, paypal_manual, other

        // Reference field
        var referenceField = fields.First(f => f.Key == "reference");
        referenceField.FieldType.ShouldBe(CheckoutFieldType.Text);
        referenceField.IsRequired.ShouldBeFalse();

        // Notes field
        var notesField = fields.First(f => f.Key == "notes");
        notesField.FieldType.ShouldBe(CheckoutFieldType.Textarea);
    }

    [Fact]
    public async Task ProcessPayment_ManualMethod_ReturnsCompletedStatus()
    {
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "manual",
            MethodAlias = "manual",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["paymentMethod"] = "cash",
                ["reference"] = "RECEIPT-001",
                ["notes"] = "Paid in store"
            }
        };

        var result = await _provider.ProcessPaymentAsync(request);

        result.Success.ShouldBeTrue();
        result.Status.ShouldBe(PaymentResultStatus.Completed);
        result.TransactionId.ShouldStartWith("manual_");
        result.Amount.ShouldBe(200m);
        result.ProviderData!["paymentMethod"].ShouldBe("cash");
        result.ProviderData["reference"].ShouldBe("RECEIPT-001");
        result.ProviderData["notes"].ShouldBe("Paid in store");
    }

    #endregion

    #region Purchase Order Method Tests

    [Fact]
    public async Task CreatePaymentSession_PurchaseOrderMethod_ReturnsPOFormFields()
    {
        var request = new PaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            MethodAlias = "purchaseorder",
            Amount = 150m,
            Currency = "GBP",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        var result = await _provider.CreatePaymentSessionAsync(request);

        result.Success.ShouldBeTrue();
        result.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);
        result.FormFields.ShouldNotBeNull();

        var fields = result.FormFields!.ToList();
        fields.Count.ShouldBe(1);

        var poField = fields.First(f => f.Key == "purchaseOrderNumber");
        poField.FieldType.ShouldBe(CheckoutFieldType.Text);
        poField.IsRequired.ShouldBeTrue();
        poField.Label.ShouldBe("Purchase Order Number");
        poField.Placeholder.ShouldBe("e.g., PO-12345");
    }

    [Fact]
    public async Task ProcessPayment_PurchaseOrder_WithValidPO_ReturnsCompletedStatus()
    {
        var invoiceId = Guid.NewGuid();
        var request = new ProcessPaymentRequest
        {
            InvoiceId = invoiceId,
            ProviderAlias = "manual",
            MethodAlias = "purchaseorder",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["purchaseOrderNumber"] = "PO-12345"
            }
        };

        _invoiceServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(invoiceId, "PO-12345", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<string?> { ResultObject = "PO-12345" });

        var result = await _provider.ProcessPaymentAsync(request);

        result.Success.ShouldBeTrue();
        result.Status.ShouldBe(PaymentResultStatus.Completed);
        result.TransactionId.ShouldStartWith("po_");
        result.Amount.ShouldBe(200m);
        result.ProviderData!["purchaseOrderNumber"].ShouldBe("PO-12345");

        _invoiceServiceMock.Verify(
            x => x.UpdatePurchaseOrderAsync(invoiceId, "PO-12345", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ProcessPayment_PurchaseOrder_WithEmptyPO_ReturnsFailure()
    {
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "manual",
            MethodAlias = "purchaseorder",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["purchaseOrderNumber"] = ""
            }
        };

        var result = await _provider.ProcessPaymentAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldBe("Purchase order number is required.");

        _invoiceServiceMock.Verify(
            x => x.UpdatePurchaseOrderAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessPayment_PurchaseOrder_WhenInvoiceUpdateFails_ReturnsFailure()
    {
        var invoiceId = Guid.NewGuid();
        var request = new ProcessPaymentRequest
        {
            InvoiceId = invoiceId,
            ProviderAlias = "manual",
            MethodAlias = "purchaseorder",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["purchaseOrderNumber"] = "PO-12345"
            }
        };

        var failedResult = new CrudResult<string?>();
        failedResult.Messages.Add(new ResultMessage
        {
            Message = "Invoice not found",
            ResultMessageType = ResultMessageType.Error
        });

        _invoiceServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(invoiceId, "PO-12345", It.IsAny<CancellationToken>()))
            .ReturnsAsync(failedResult);

        var result = await _provider.ProcessPaymentAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldBe("Failed to save purchase order number.");
    }

    [Fact]
    public async Task ProcessPayment_PurchaseOrder_TrimsPONumber()
    {
        var invoiceId = Guid.NewGuid();
        var request = new ProcessPaymentRequest
        {
            InvoiceId = invoiceId,
            ProviderAlias = "manual",
            MethodAlias = "purchaseorder",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["purchaseOrderNumber"] = "  PO-12345  "
            }
        };

        _invoiceServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(invoiceId, "PO-12345", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<string?> { ResultObject = "PO-12345" });

        var result = await _provider.ProcessPaymentAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderData!["purchaseOrderNumber"].ShouldBe("PO-12345");

        _invoiceServiceMock.Verify(
            x => x.UpdatePurchaseOrderAsync(invoiceId, "PO-12345", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region Refund Tests

    [Fact]
    public async Task RefundPayment_ReturnsSuccessWithRefundTransactionId()
    {
        var request = new RefundRequest
        {
            PaymentId = Guid.NewGuid(),
            TransactionId = "manual_20231215_abc123",
            Amount = 50m,
            Reason = "Customer requested refund"
        };

        var result = await _provider.RefundPaymentAsync(request);

        result.Success.ShouldBeTrue();
        result.RefundTransactionId.ShouldStartWith("manual_refund_");
        result.AmountRefunded.ShouldBe(50m);
    }

    #endregion
}
