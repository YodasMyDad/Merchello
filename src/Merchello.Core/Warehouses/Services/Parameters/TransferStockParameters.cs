namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for transferring stock between warehouses
/// </summary>
public class TransferStockParameters
{
    /// <summary>
    /// The product ID
    /// </summary>
    public required Guid ProductId { get; init; }

    /// <summary>
    /// The source warehouse ID
    /// </summary>
    public required Guid FromWarehouseId { get; init; }

    /// <summary>
    /// The destination warehouse ID
    /// </summary>
    public required Guid ToWarehouseId { get; init; }

    /// <summary>
    /// The quantity to transfer
    /// </summary>
    public required int Quantity { get; init; }
}
