namespace Merchello.Core.Shared.Services.Interfaces;

/// <summary>
/// Tracks whether a seed-data installation is currently running.
/// </summary>
public interface ISeedDataInstallationState
{
    /// <summary>
    /// True while a seed-data installation is in progress.
    /// </summary>
    bool IsInstalling { get; }

    /// <summary>
    /// Attempts to begin a seed-data installation session.
    /// </summary>
    /// <returns>
    /// True when the caller acquired the installation session, otherwise false.
    /// </returns>
    bool TryBeginInstallation();

    /// <summary>
    /// Ends an active seed-data installation session.
    /// </summary>
    void EndInstallation();
}
