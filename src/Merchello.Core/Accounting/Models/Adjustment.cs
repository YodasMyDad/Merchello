namespace Merchello.Core.Accounting.Models;

public class Adjustment
{
    /// <summary>
    ///     Create adjustment was created
    /// </summary>
    public DateTime Created { get; set; } = DateTime.UtcNow;

    /// <summary>
    ///     Amount of the adjustment
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    ///     Type of adjustment
    /// </summary>
    public AdjustmentType AdjustmentType { get; set; } = AdjustmentType.Percentage;

    /// <summary>
    ///     General use extended data, for storing data related to this line item
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
