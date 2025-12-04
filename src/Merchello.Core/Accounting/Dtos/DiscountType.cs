namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Type of discount calculation
/// </summary>
public enum DiscountType
{
    /// <summary>
    /// Fixed amount discount (e.g., £5 off)
    /// </summary>
    Amount,

    /// <summary>
    /// Percentage discount (e.g., 10% off)
    /// </summary>
    Percentage
}

