namespace Merchello.Core.Protocols.Models;

/// <summary>
/// UCP capability toggles.
/// </summary>
public class UcpCapabilitySettings
{
    /// <summary>
    /// Enable Checkout capability.
    /// </summary>
    public bool Checkout { get; set; } = true;

    /// <summary>
    /// Enable Order capability.
    /// </summary>
    public bool Order { get; set; } = true;

    /// <summary>
    /// Enable Identity Linking capability.
    /// </summary>
    public bool IdentityLinking { get; set; } = false;

    /// <summary>
    /// Enable Cart capability (draft spec).
    /// </summary>
    public bool Cart { get; set; } = false;

    /// <summary>
    /// Enable Catalog Search capability (draft spec).
    /// </summary>
    public bool CatalogSearch { get; set; } = false;

    /// <summary>
    /// Enable Catalog Lookup capability (draft spec).
    /// </summary>
    public bool CatalogLookup { get; set; } = false;
}
