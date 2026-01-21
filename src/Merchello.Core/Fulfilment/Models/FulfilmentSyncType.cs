namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Type of fulfilment sync operation.
/// </summary>
public enum FulfilmentSyncType
{
    /// <summary>
    /// Products pushed out to the 3PL
    /// </summary>
    ProductsOut = 0,

    /// <summary>
    /// Inventory pulled in from the 3PL
    /// </summary>
    InventoryIn = 1
}
