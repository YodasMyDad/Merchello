using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Providers.BuiltIn;

/// <summary>
/// Built-in payment provider for manual/offline payments and purchase orders.
/// Offers two payment methods:
/// - Manual Payment: For backoffice recording of cash, check, bank transfer (hidden from checkout)
/// - Purchase Order: For checkout, allows customers to pay via PO number
/// </summary>
public class ManualPaymentProvider(IInvoiceService invoiceService) : PaymentProviderBase
{
    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = Constants.PaymentProviders.Aliases.Manual,
        DisplayName = "Manual Payment",
        Description = "Record offline payments and purchase orders",
        Icon = Constants.PaymentProviders.Icons.Wallet,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = false,
        RequiresWebhook = false,
        SetupInstructions = """
            ## Manual Payment Provider

            This provider supports two payment methods:

            ### 1. Manual Payment (Backoffice Only)
            Record offline payments from the order detail screen in the backoffice.

            **Use Cases:**
            - **Cash payments** - Record cash received in-store
            - **Check payments** - Record check payments with check numbers
            - **Bank transfers** - Record wire transfers or direct deposits

            ### 2. Purchase Order (Checkout)
            Allow customers to complete checkout using a purchase order number.

            **Use Cases:**
            - **B2B Orders** - Allow business customers to pay via purchase order
            - **Net Terms** - Customers with established credit can order on account
            - **Government/Education** - Institutions that require PO-based purchasing

            ### Configuration
            No configuration is required. This provider is automatically enabled on startup.

            ### Refunds
            Refunds can be recorded for any payment. These are tracked in the system for accounting purposes.
            """
    };

    /// <inheritdoc />
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = Constants.PaymentProviders.Aliases.Manual,
            DisplayName = "Manual Payment",
            Icon = Constants.PaymentProviders.Icons.Wallet,
            Description = "Record offline payments (cash, check, bank transfer)",
            IntegrationType = PaymentIntegrationType.DirectForm,
            IsExpressCheckout = false,
            DefaultSortOrder = 100,
            ShowInCheckoutByDefault = false,  // Hidden from checkout - backoffice only
            MethodType = PaymentMethodType.Manual
        },
        new PaymentMethodDefinition
        {
            Alias = Constants.PaymentProviders.Aliases.PurchaseOrder,
            DisplayName = "Purchase Order",
            Icon = Constants.PaymentProviders.Icons.Document,
            Description = "Enter your purchase order number to complete the order",
            IntegrationType = PaymentIntegrationType.DirectForm,
            IsExpressCheckout = false,
            DefaultSortOrder = 50,
            ShowInCheckoutByDefault = true,  // Visible in checkout
            MethodType = PaymentMethodType.Manual
        }
    ];

    /// <inheritdoc />
    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var methodAlias = request.MethodAlias ?? Constants.PaymentProviders.Aliases.Manual;

        var result = new PaymentSessionResult
        {
            Success = true,
            SessionId = Guid.NewGuid().ToString("N"),
            IntegrationType = PaymentIntegrationType.DirectForm,
            FormFields = methodAlias == Constants.PaymentProviders.Aliases.PurchaseOrder
                ? GetPurchaseOrderFormFields()
                : GetManualPaymentFormFields()
        };

        return Task.FromResult(result);
    }

    private static List<CheckoutFormField> GetPurchaseOrderFormFields() =>
    [
        new CheckoutFormField
        {
            Key = Constants.FormFields.PurchaseOrderNumber,
            Label = "Purchase Order Number",
            Description = "Enter your company's purchase order number",
            FieldType = CheckoutFieldType.Text,
            IsRequired = true,
            Placeholder = "e.g., PO-12345",
            ValidationMessage = "Purchase order number is required"
        }
    ];

    private static List<CheckoutFormField> GetManualPaymentFormFields() =>
    [
        new CheckoutFormField
        {
            Key = Constants.FormFields.PaymentMethod,
            Label = "Payment Method",
            FieldType = CheckoutFieldType.Select,
            IsRequired = true,
            Options =
            [
                new SelectOption { Value = "cash", Label = "Cash" },
                new SelectOption { Value = "check", Label = "Check" },
                new SelectOption { Value = "bank_transfer", Label = "Bank Transfer" },
                new SelectOption { Value = "credit_card_manual", Label = "Credit Card (Manual)" },
                new SelectOption { Value = "paypal_manual", Label = "PayPal (Manual)" },
                new SelectOption { Value = "other", Label = "Other" }
            ]
        },
        new CheckoutFormField
        {
            Key = Constants.FormFields.Reference,
            Label = "Reference Number",
            Description = "Check number, transaction reference, etc.",
            FieldType = CheckoutFieldType.Text,
            IsRequired = false,
            Placeholder = "e.g., CHK-12345"
        },
        new CheckoutFormField
        {
            Key = Constants.FormFields.Notes,
            Label = "Notes",
            FieldType = CheckoutFieldType.Textarea,
            IsRequired = false
        }
    ];

    /// <inheritdoc />
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var methodAlias = request.MethodAlias ?? Constants.PaymentProviders.Aliases.Manual;

        return methodAlias == Constants.PaymentProviders.Aliases.PurchaseOrder
            ? await ProcessPurchaseOrderAsync(request, cancellationToken)
            : ProcessManualPayment(request);
    }

    private async Task<PaymentResult> ProcessPurchaseOrderAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var formData = request.FormData ?? [];
        var poNumber = formData.GetValueOrDefault(Constants.FormFields.PurchaseOrderNumber, "").Trim();

        // Validate PO number is not empty
        if (string.IsNullOrWhiteSpace(poNumber))
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = "Purchase order number is required."
            };
        }

        // Save PO number to invoice
        var updateResult = await invoiceService.UpdatePurchaseOrderAsync(
            request.InvoiceId,
            poNumber,
            cancellationToken);

        if (!updateResult.Successful)
        {
            return new PaymentResult
            {
                Success = false,
                ErrorMessage = "Failed to save purchase order number."
            };
        }

        var transactionId = $"po_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";

        return new PaymentResult
        {
            Success = true,
            TransactionId = transactionId,
            Status = PaymentResultStatus.Completed,
            Amount = request.Amount,
            ProviderData = new Dictionary<string, object>
            {
                ["purchaseOrderNumber"] = poNumber
            }
        };
    }

    private static PaymentResult ProcessManualPayment(ProcessPaymentRequest request)
    {
        var formData = request.FormData ?? [];

        var paymentMethod = formData.GetValueOrDefault(Constants.FormFields.PaymentMethod, Constants.PaymentProviders.Aliases.Manual);
        var reference = formData.GetValueOrDefault(Constants.FormFields.Reference, "");
        var notes = formData.GetValueOrDefault(Constants.FormFields.Notes, "");

        var transactionId = $"manual_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";

        return new PaymentResult
        {
            Success = true,
            TransactionId = transactionId,
            Status = PaymentResultStatus.Completed,
            Amount = request.Amount,
            ProviderData = new Dictionary<string, object>
            {
                [Constants.FormFields.PaymentMethod] = paymentMethod,
                [Constants.FormFields.Reference] = reference,
                [Constants.FormFields.Notes] = notes
            }
        };
    }

    /// <inheritdoc />
    public override Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        var refundTransactionId = $"manual_refund_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";

        return Task.FromResult(new RefundResult
        {
            Success = true,
            RefundTransactionId = refundTransactionId,
            AmountRefunded = request.Amount
        });
    }
}
