using Merchello.Core.Discounts.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Background service that updates expired discount statuses.
/// Runs periodically to set Active discounts with passed EndsAt to Expired status.
/// </summary>
public class DiscountStatusJob(
    IServiceScopeFactory serviceScopeFactory,
    ILogger<DiscountStatusJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("DiscountStatusJob started");

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await UpdateExpiredDiscountsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error updating expired discounts");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when stoppingToken is cancelled
                break;
            }
        }

        logger.LogInformation("DiscountStatusJob stopped");
    }

    private async Task UpdateExpiredDiscountsAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var discountService = scope.ServiceProvider.GetRequiredService<IDiscountService>();

        await discountService.UpdateExpiredDiscountsAsync(stoppingToken);
    }
}
