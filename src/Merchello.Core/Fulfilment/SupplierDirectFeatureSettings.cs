namespace Merchello.Core.Fulfilment;

/// <summary>
/// Feature flags for Supplier Direct fulfilment provider rollout.
/// </summary>
public sealed class SupplierDirectFeatureSettings
{
    /// <summary>
    /// Enables registration of the built-in "supplier-direct" provider.
    /// </summary>
    public bool Enabled { get; set; } = true;
}
