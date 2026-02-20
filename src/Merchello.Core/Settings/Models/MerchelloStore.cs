using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Settings.Models;

/// <summary>
/// Persisted store-scoped configuration. Uses a singleton store key for now.
/// </summary>
public class MerchelloStore
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    public string StoreKey { get; set; } = "default";

    public string InvoiceNumberPrefix { get; set; } = "INV-";

    public bool DisplayPricesIncTax { get; set; } = true;

    public bool ShowStockLevels { get; set; } = true;

    public int LowStockThreshold { get; set; } = 5;

    public string StoreName { get; set; } = "Acme Store";

    public string? StoreEmail { get; set; }

    public string? StoreSupportEmail { get; set; }

    public string? StorePhone { get; set; }

    public Guid? StoreLogoMediaKey { get; set; }

    public string? StoreWebsiteUrl { get; set; }

    public string StoreAddress { get; set; } = "123 Commerce Street\nNew York, NY 10001\nUnited States";

    public MerchelloStoreUcpSettings Ucp { get; set; } = new();

    public MerchelloStoreInvoiceRemindersSettings InvoiceReminders { get; set; } = new();

    public MerchelloStorePoliciesSettings Policies { get; set; } = new();

    public MerchelloStoreCheckoutSettings Checkout { get; set; } = new();

    public MerchelloStoreAbandonedCheckoutSettings AbandonedCheckout { get; set; } = new();

    public MerchelloStoreEmailSettings Email { get; set; } = new();

    public DateTime DateCreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime DateUpdatedUtc { get; set; } = DateTime.UtcNow;
}
