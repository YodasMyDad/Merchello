namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result from soft-deleting orders/invoices
/// </summary>
public class DeleteOrdersResultDto
{
    /// <summary>
    /// The number of invoices that were successfully deleted
    /// </summary>
    public int DeletedCount { get; set; }
}
