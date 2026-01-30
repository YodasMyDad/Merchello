using Merchello.Core.Shared.Providers;

namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Configuration for a fulfilment provider instance.
/// </summary>
public class FulfilmentProviderConfiguration : ProviderConfiguration
{
    /// <summary>
    /// Inventory sync mode (Full or Delta)
    /// </summary>
    public InventorySyncMode InventorySyncMode { get; set; } = InventorySyncMode.Full;

}
