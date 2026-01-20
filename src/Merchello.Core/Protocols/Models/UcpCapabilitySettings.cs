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
}
