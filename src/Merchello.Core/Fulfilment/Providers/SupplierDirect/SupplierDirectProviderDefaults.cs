namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Default values and constants for the Supplier Direct fulfilment provider.
/// </summary>
public static class SupplierDirectProviderDefaults
{
    /// <summary>
    /// Unique key identifying this provider.
    /// </summary>
    public const string ProviderKey = "supplier-direct";

    /// <summary>
    /// Display name shown in the backoffice UI.
    /// </summary>
    public const string DisplayName = "Supplier Direct";

    /// <summary>
    /// Brief description of the provider's capabilities.
    /// </summary>
    public const string Description =
        "Send orders directly to suppliers via email, FTP, or SFTP. " +
        "Built-in provider for dropship and supplier-fulfilled orders.";

    /// <summary>
    /// Markdown-formatted setup instructions displayed in the configuration modal.
    /// </summary>
    public const string SetupInstructions = """
        ## Supplier Direct Setup

        This built-in provider sends orders directly to your suppliers when their warehouse is assigned to fulfill an order.

        ### Delivery Methods (Per Supplier)

        1. **Email** - Sends order details to that supplier's email address using a configurable email template
        2. **FTP** - Uploads order CSV file to that supplier's FTP server
        3. **SFTP** - Uploads order CSV file to that supplier's SFTP server (more secure, recommended)

        ### Configuration Model

        - Assign **Supplier Direct** as the supplier's default fulfilment provider (or warehouse override)
        - Configure a **Supplier Direct profile on each supplier**
        - Choose delivery method per supplier (`Email`, `Ftp`, `Sftp`) and set supplier-specific endpoint details
        - Supplier Direct has **no provider-level delivery defaults**

        ### Per-Supplier Settings

        Each supplier can have their own delivery configuration stored in their profile:
        - Custom email recipient address
        - Optional email CC addresses
        - Custom FTP/SFTP host and credentials
        - Custom remote upload path
        - Custom CSV column mapping and static columns (FTP/SFTP)

        Supplier Direct requires a supplier profile. Orders fail fast when a supplier has not been configured.
        The provider settings panel is intentionally minimal and does not hold supplier delivery config.
        """;

    /// <summary>
    /// Default email subject template.
    /// Supports placeholders: {OrderNumber}, {SupplierName}
    /// </summary>
    public const string DefaultEmailSubjectTemplate = "New Order: {OrderNumber}";

    /// <summary>
    /// Default FTP port.
    /// </summary>
    public const int DefaultFtpPort = 21;

    /// <summary>
    /// Default SFTP port.
    /// </summary>
    public const int DefaultSftpPort = 22;

    /// <summary>
    /// Default remote path for FTP/SFTP uploads.
    /// </summary>
    public const string DefaultRemotePath = "/orders";

    /// <summary>
    /// Default connection timeout in seconds.
    /// </summary>
    public const int DefaultTimeoutSeconds = 30;
}
