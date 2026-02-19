using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Webhooks.Interfaces;

namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Background service that enforces configured UCP signing key rotation policy.
/// </summary>
public class UcpSigningKeyRotationJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<ProtocolSettings> settings,
    IRuntimeState runtimeState,
    ILogger<UcpSigningKeyRotationJob> logger) : BackgroundService
{
    private readonly int _rotationDays = settings.Value.Ucp.SigningKeyRotationDays;
    private readonly TimeSpan _checkInterval = TimeSpan.FromDays(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(2);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(UcpSigningKeyRotationJob),
                stoppingToken))
        {
            return;
        }

        if (_rotationDays <= 0)
        {
            logger.LogInformation(
                "UCP signing key rotation job disabled because SigningKeyRotationDays is {RotationDays}",
                _rotationDays);
            return;
        }

        logger.LogInformation(
            "UCP signing key rotation job started. RotationDays={RotationDays}, CheckIntervalHours={CheckIntervalHours}",
            _rotationDays,
            _checkInterval.TotalHours);

        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RotateIfDueAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping UCP signing key rotation check");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while checking UCP signing key rotation policy");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        logger.LogInformation("UCP signing key rotation job stopped");
    }

    private async Task RotateIfDueAsync(CancellationToken ct)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var signingKeyStore = scope.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var rotated = await signingKeyStore.RotateKeysIfDueAsync(_rotationDays, ct);

        if (rotated)
        {
            logger.LogInformation(
                "UCP signing key rotation executed successfully using policy threshold of {RotationDays} days",
                _rotationDays);
        }
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}
