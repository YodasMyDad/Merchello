namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Inventory synchronization mode for fulfilment providers.
/// </summary>
public enum InventorySyncMode
{
    /// <summary>
    /// Full sync - overwrites inventory levels completely
    /// </summary>
    Full = 0,

    /// <summary>
    /// Delta sync - applies adjustments to existing levels
    /// </summary>
    Delta = 1
}
