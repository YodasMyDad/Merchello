namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Response from soft-deleting orders/invoices
/// </summary>
public class DeleteOrdersResponse
{
    /// <summary>
    /// The number of invoices that were successfully deleted
    /// </summary>
    public int DeletedCount { get; set; }
}

