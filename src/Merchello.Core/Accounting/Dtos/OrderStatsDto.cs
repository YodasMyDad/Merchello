namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order statistics for dashboard
/// </summary>
public class OrderStatsDto
{
    public int OrdersToday { get; set; }
    public int ItemsOrderedToday { get; set; }
    public int OrdersFulfilledToday { get; set; }
    public int OrdersDeliveredToday { get; set; }
}
