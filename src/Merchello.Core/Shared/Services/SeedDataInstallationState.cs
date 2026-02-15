using System.Threading;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Process-wide coordinator for seed-data installation activity.
/// </summary>
public class SeedDataInstallationState : ISeedDataInstallationState
{
    private int _isInstalling;

    /// <inheritdoc />
    public bool IsInstalling => Volatile.Read(ref _isInstalling) == 1;

    /// <inheritdoc />
    public bool TryBeginInstallation()
    {
        return Interlocked.CompareExchange(ref _isInstalling, 1, 0) == 0;
    }

    /// <inheritdoc />
    public void EndInstallation()
    {
        Interlocked.Exchange(ref _isInstalling, 0);
    }
}
