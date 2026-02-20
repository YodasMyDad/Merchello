using Merchello.Core.Accounting;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Email;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Settings.Models;

/// <summary>
/// Runtime snapshot with migrated DB-backed values overlaid on base appsettings models.
/// </summary>
public class MerchelloStoreRuntimeSettings
{
    public MerchelloSettings Merchello { get; init; } = new();

    public CheckoutSettings Checkout { get; init; } = new();

    public AbandonedCheckoutSettings AbandonedCheckout { get; init; } = new();

    public InvoiceReminderSettings InvoiceReminders { get; init; } = new();

    public EmailSettings Email { get; init; } = new();

    public MerchelloStorePoliciesSettings Policies { get; init; } = new();

    public MerchelloStoreUcpSettings Ucp { get; init; } = new();
}
