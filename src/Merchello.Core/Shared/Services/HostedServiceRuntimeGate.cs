using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Helper for hosted services that must not execute before Umbraco reaches RuntimeLevel.Run.
/// </summary>
public static class HostedServiceRuntimeGate
{
    /// <summary>
    /// Waits until Umbraco runtime level is Run, or returns false if cancellation is requested first.
    /// </summary>
    public static async Task<bool> WaitForRunLevelAsync(
        IRuntimeState runtimeState,
        ILogger logger,
        string serviceName,
        CancellationToken cancellationToken)
    {
        if (runtimeState.Level == RuntimeLevel.Run)
        {
            return true;
        }

        logger.LogInformation(
            "{ServiceName} waiting for Umbraco runtime level Run (current: {RuntimeLevel})",
            serviceName,
            runtimeState.Level);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));

        while (!cancellationToken.IsCancellationRequested)
        {
            if (runtimeState.Level == RuntimeLevel.Run)
            {
                logger.LogInformation("{ServiceName} detected runtime level Run", serviceName);
                return true;
            }

            try
            {
                await timer.WaitForNextTickAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }

        return false;
    }
}
