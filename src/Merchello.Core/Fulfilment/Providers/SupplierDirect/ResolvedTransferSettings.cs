using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

internal sealed record ResolvedTransferSettings
{
    public required FtpConnectionSettings ConnectionSettings { get; init; }
    public bool OverwriteExistingFiles { get; init; }
}
