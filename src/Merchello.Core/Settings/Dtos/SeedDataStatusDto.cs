namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Seed data installation status for the backoffice UI.
/// </summary>
public class SeedDataStatusDto
{
    /// <summary>
    /// True when manual seed-data install is enabled in configuration.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// True when seed data has already been installed.
    /// </summary>
    public bool IsInstalled { get; set; }
}
