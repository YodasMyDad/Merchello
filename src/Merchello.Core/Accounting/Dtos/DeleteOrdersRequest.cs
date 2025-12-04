namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request to soft-delete multiple orders/invoices
/// </summary>
public class DeleteOrdersRequest
{
    /// <summary>
    /// The IDs of the invoices to delete
    /// </summary>
    public List<Guid> Ids { get; set; } = [];
}

