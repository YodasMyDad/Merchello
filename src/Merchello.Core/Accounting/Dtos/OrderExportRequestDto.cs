namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO for order export with date range filtering
/// </summary>
public class OrderExportRequestDto
{
    /// <summary>
    /// Start date for the export range (inclusive)
    /// </summary>
    public DateTime FromDate { get; set; }

    /// <summary>
    /// End date for the export range (inclusive)
    /// </summary>
    public DateTime ToDate { get; set; }
}
