namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Result payload for manual seed-data installation.
/// </summary>
public class InstallSeedDataResultDto
{
    /// <summary>
    /// True when the install action completed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// True when seed data is currently installed.
    /// </summary>
    public bool IsInstalled { get; set; }

    /// <summary>
    /// User-facing result message.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}
