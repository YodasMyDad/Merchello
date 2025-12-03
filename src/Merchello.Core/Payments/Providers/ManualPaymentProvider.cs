using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Built-in payment provider for recording manual/offline payments.
/// Supports cash, check, bank transfer, purchase order, and other offline payment methods.
/// </summary>
public class ManualPaymentProvider : PaymentProviderBase
{
    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "manual",
        DisplayName = "Manual Payment",
        Description = "Record offline payments (cash, check, bank transfer, purchase order)",
        Icon = "icon-wallet",
        IntegrationType = PaymentIntegrationType.DirectForm,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = false,
        RequiresWebhook = false,
        SetupInstructions = """
            ## Manual Payment Provider

            This provider is used to record offline/manual payments from the backoffice. It does not process actual payments through any gateway.

            ### Use Cases

            - **Cash payments** - Record cash received in-store
            - **Check payments** - Record check payments with check numbers
            - **Bank transfers** - Record wire transfers or direct deposits
            - **Purchase orders** - Record B2B purchase order payments
            - **Other** - Any other offline payment method

            ### How It Works

            1. **Backoffice Only**: This provider is typically hidden from checkout (uncheck "Show In Checkout")
            2. **Manual Recording**: Staff can record payments from the order detail screen
            3. **Reference Tracking**: Add check numbers, PO numbers, or transaction references
            4. **Notes**: Add any relevant notes about the payment

            ### Configuration

            No configuration is required for this provider. Simply install it and it's ready to use.

            ### Refunds

            Manual refunds can be recorded for any payment. These are tracked in the system but no actual refund is processed (since the original payment was offline).
            """
    };

    /// <inheritdoc />
    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = new PaymentSessionResult
        {
            Success = true,
            SessionId = Guid.NewGuid().ToString("N"),
            IntegrationType = PaymentIntegrationType.DirectForm,
            FormFields =
            [
                new CheckoutFormField
                {
                    Key = "paymentMethod",
                    Label = "Payment Method",
                    FieldType = CheckoutFieldType.Select,
                    IsRequired = true,
                    Options =
                    [
                        new SelectOption { Value = "cash", Label = "Cash" },
                        new SelectOption { Value = "check", Label = "Check" },
                        new SelectOption { Value = "bank_transfer", Label = "Bank Transfer" },
                        new SelectOption { Value = "purchase_order", Label = "Purchase Order" },
                        new SelectOption { Value = "other", Label = "Other" }
                    ]
                },
                new CheckoutFormField
                {
                    Key = "reference",
                    Label = "Reference Number",
                    Description = "Check number, PO number, or transaction reference",
                    FieldType = CheckoutFieldType.Text,
                    IsRequired = false,
                    Placeholder = "e.g., PO-12345"
                },
                new CheckoutFormField
                {
                    Key = "notes",
                    Label = "Notes",
                    FieldType = CheckoutFieldType.Textarea,
                    IsRequired = false
                }
            ]
        };

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var formData = request.FormData ?? new Dictionary<string, string>();

        var paymentMethod = formData.GetValueOrDefault("paymentMethod", "manual");
        var reference = formData.GetValueOrDefault("reference", "");
        var notes = formData.GetValueOrDefault("notes", "");

        // Generate a transaction ID for tracking
        var transactionId = $"manual_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";

        var result = new PaymentResult
        {
            Success = true,
            TransactionId = transactionId,
            Status = PaymentResultStatus.Completed,
            Amount = request.Amount,
            ProviderData = new Dictionary<string, object>
            {
                ["paymentMethod"] = paymentMethod,
                ["reference"] = reference,
                ["notes"] = notes
            }
        };

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public override Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        // Manual refunds are just recorded, no external API call needed
        var refundTransactionId = $"manual_refund_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";

        return Task.FromResult(new RefundResult
        {
            Success = true,
            RefundTransactionId = refundTransactionId,
            AmountRefunded = request.Amount
        });
    }
}
