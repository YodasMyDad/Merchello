using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Tax.Handlers;

/// <summary>
/// Ensures shipping tax overrides for US states are seeded on application startup.
/// US states where shipping is NOT taxable are pre-populated based on 2025 tax rules.
/// </summary>
/// <remarks>
/// <para>
/// This handler runs once on first startup to seed US states where shipping is never taxable.
/// Sources: Zamp (2025), CereTax (2025)
/// </para>
/// <para>
/// Note: Tax rules change frequently. Users should verify current rules with their state's
/// Department of Revenue or a tax advisor. Overrides can be modified via the backoffice UI.
/// </para>
/// </remarks>
public class EnsureShippingTaxOverridesHandler(
    IServiceProvider serviceProvider,
    ILogger<EnsureShippingTaxOverridesHandler> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    /// <summary>
    /// US states where shipping is NOT taxable (consensus from multiple 2025 sources).
    /// These states will be seeded with ShippingTaxGroupId = null to indicate no shipping tax.
    /// </summary>
    /// <remarks>
    /// Sources: Zamp (2025), CereTax (2025)
    /// States without sales tax (AK, DE, MT, NH, OR) don't need overrides.
    /// </remarks>
    private static readonly string[] UsShippingExemptStates =
    [
        "AL", // Alabama
        "AZ", // Arizona
        "ID", // Idaho
        "IA", // Iowa
        "ME", // Maine
        "MA", // Massachusetts
        "NV", // Nevada
        "OK", // Oklahoma
        "UT", // Utah
        "VA", // Virginia
        "WY"  // Wyoming
    ];

    public async Task HandleAsync(
        UmbracoApplicationStartedNotification notification,
        CancellationToken cancellationToken)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var taxService = scope.ServiceProvider.GetRequiredService<ITaxService>();

            // Check if any overrides already exist
            var existing = await taxService.GetAllShippingTaxOverridesAsync(cancellationToken);
            if (existing.Count > 0)
            {
                logger.LogDebug(
                    "Shipping tax overrides already exist ({Count} found), skipping seed",
                    existing.Count);
                return;
            }

            // Seed US shipping-exempt states
            var seededCount = 0;
            foreach (var stateCode in UsShippingExemptStates)
            {
                var result = await taxService.CreateShippingTaxOverrideAsync(
                    new CreateShippingTaxOverrideDto
                    {
                        CountryCode = "US",
                        StateOrProvinceCode = stateCode,
                        ShippingTaxGroupId = null // No shipping tax in this state
                    },
                    cancellationToken);

                if (result.Successful)
                {
                    seededCount++;
                }
                else
                {
                    logger.LogWarning(
                        "Failed to seed shipping tax override for US-{StateCode}: {Error}",
                        stateCode,
                        result.Messages.FirstOrDefault()?.Message);
                }
            }

            logger.LogInformation(
                "Seeded {Count} US shipping tax overrides (states where shipping is not taxable)",
                seededCount);
        }
        catch (Exception ex)
        {
            // Don't fail startup if seeding fails - users can add overrides manually
            logger.LogError(ex, "Failed to seed shipping tax overrides");
        }
    }
}
