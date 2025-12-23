using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.BuiltIn;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

public class ManualPaymentProviderTests
{
    private readonly ManualPaymentProvider _provider = new();

    [Fact]
    public async Task CreatePaymentSessionAsync_ReturnsDirectFormWithExpectedFields()
    {
        // Arrange
        var request = new PaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            Amount = 150m,
            Currency = "GBP",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await _provider.CreatePaymentSessionAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);
        result.SessionId.ShouldNotBeNullOrEmpty();
        result.FormFields.ShouldNotBeNull();

        var fields = result.FormFields!.ToList();
        fields.Count.ShouldBe(3);

        // Verify paymentMethod field
        var paymentMethodField = fields.FirstOrDefault(f => f.Key == "paymentMethod");
        paymentMethodField.ShouldNotBeNull();
        paymentMethodField!.FieldType.ShouldBe(CheckoutFieldType.Select);
        paymentMethodField.IsRequired.ShouldBeTrue();
        paymentMethodField.Options.ShouldNotBeNull();
        paymentMethodField.Options!.Count().ShouldBeGreaterThan(0);

        // Verify reference field
        var referenceField = fields.FirstOrDefault(f => f.Key == "reference");
        referenceField.ShouldNotBeNull();
        referenceField!.FieldType.ShouldBe(CheckoutFieldType.Text);
        referenceField.IsRequired.ShouldBeFalse();

        // Verify notes field
        var notesField = fields.FirstOrDefault(f => f.Key == "notes");
        notesField.ShouldNotBeNull();
        notesField!.FieldType.ShouldBe(CheckoutFieldType.Textarea);
    }

    [Fact]
    public async Task ProcessPaymentAsync_ReturnsCompletedStatusWithTransactionId()
    {
        // Arrange
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "manual",
            Amount = 200m,
            FormData = new Dictionary<string, string>
            {
                ["paymentMethod"] = "cash"
            }
        };

        // Act
        var result = await _provider.ProcessPaymentAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.Status.ShouldBe(PaymentResultStatus.Completed);
        result.TransactionId.ShouldNotBeNullOrEmpty();
        result.TransactionId.ShouldStartWith("manual_");
        result.Amount.ShouldBe(200m);
    }

    [Fact]
    public async Task ProcessPaymentAsync_IncludesFormDataInProviderData()
    {
        // Arrange
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "manual",
            Amount = 100m,
            FormData = new Dictionary<string, string>
            {
                ["paymentMethod"] = "purchase_order",
                ["reference"] = "PO-12345",
                ["notes"] = "Approved by finance"
            }
        };

        // Act
        var result = await _provider.ProcessPaymentAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.ProviderData.ShouldNotBeNull();
        result.ProviderData!["paymentMethod"].ShouldBe("purchase_order");
        result.ProviderData["reference"].ShouldBe("PO-12345");
        result.ProviderData["notes"].ShouldBe("Approved by finance");
    }

    [Fact]
    public async Task RefundPaymentAsync_ReturnsSuccessWithRefundTransactionId()
    {
        // Arrange
        var request = new RefundRequest
        {
            PaymentId = Guid.NewGuid(),
            TransactionId = "manual_20231215_abc123",
            Amount = 50m,
            Reason = "Customer requested refund"
        };

        // Act
        var result = await _provider.RefundPaymentAsync(request);

        // Assert
        result.Success.ShouldBeTrue();
        result.RefundTransactionId.ShouldNotBeNullOrEmpty();
        result.RefundTransactionId.ShouldStartWith("manual_refund_");
        result.AmountRefunded.ShouldBe(50m);
    }
}
