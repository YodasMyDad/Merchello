namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Dashboard statistics with monthly metrics and percentage changes
/// </summary>
public class DashboardStatsDto
{
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencySymbol { get; set; } = string.Empty;

    public int OrdersThisMonth { get; set; }
    public decimal OrdersChangePercent { get; set; }

    public decimal RevenueThisMonth { get; set; }
    public decimal RevenueChangePercent { get; set; }

    public int ProductCount { get; set; }
    public int ProductCountChange { get; set; }

    public int CustomerCount { get; set; }
    public int CustomerCountChange { get; set; }
}
