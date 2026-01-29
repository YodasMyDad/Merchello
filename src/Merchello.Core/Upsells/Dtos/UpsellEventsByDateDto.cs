namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Analytics events aggregated by date.
/// </summary>
public class UpsellEventsByDateDto
{
    public DateOnly Date { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int Conversions { get; set; }
    public decimal Revenue { get; set; }
}
