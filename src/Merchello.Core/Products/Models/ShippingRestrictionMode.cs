namespace Merchello.Core.Products.Models;

/// <summary>
/// Defines how shipping restrictions are applied to a product
/// </summary>
public enum ShippingRestrictionMode
{
    /// <summary>
    /// No restrictions - product can use all warehouse shipping options
    /// </summary>
    None = 0,

    /// <summary>
    /// Allow list - product can ONLY ship via options in AllowedShippingOptions
    /// </summary>
    AllowList = 1,

    /// <summary>
    /// Exclude list - product can ship via any option EXCEPT those in ExcludedShippingOptions
    /// </summary>
    ExcludeList = 2
}

