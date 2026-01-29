using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for UpsellStatusJob background status transitions.
/// </summary>
[Collection("Integration Tests")]
public class UpsellStatusJobTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellService _upsellService;

    public UpsellStatusJobTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _upsellService = fixture.GetService<IUpsellService>();
    }

    [Fact]
    public async Task UpdateExpiredUpsellsAsync_TransitionsActiveToExpired()
    {
        // Create a rule with a past EndsAt
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Should expire",
            Heading = "Expiring",
            StartsAt = DateTime.UtcNow.AddDays(-7),
            EndsAt = DateTime.UtcNow.AddDays(-1),
        });

        var rule = result.ResultObject!;
        await _upsellService.ActivateAsync(rule.Id);

        // Run the status update
        await _upsellService.UpdateExpiredUpsellsAsync();

        // Verify it transitioned to Expired
        var updated = await _upsellService.GetByIdAsync(rule.Id);
        updated.ShouldNotBeNull();
        updated.Status.ShouldBe(UpsellStatus.Expired);
    }

    [Fact]
    public async Task UpdateExpiredUpsellsAsync_ScheduledToActive_WhenStartsAtReached()
    {
        // Create a scheduled rule with a past StartsAt
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Should activate",
            Heading = "Activating",
            StartsAt = DateTime.UtcNow.AddDays(7), // Future at creation time
        });

        var rule = result.ResultObject!;
        rule.Status.ShouldBe(UpsellStatus.Scheduled);

        // Simulate time passing by updating StartsAt to the past
        await _upsellService.UpdateAsync(rule.Id, new UpdateUpsellParameters
        {
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
        });

        // Run the status update
        await _upsellService.UpdateExpiredUpsellsAsync();

        // Verify transition
        var updated = await _upsellService.GetByIdAsync(rule.Id);
        updated.ShouldNotBeNull();
        updated.Status.ShouldBe(UpsellStatus.Active);
    }

    [Fact]
    public async Task UpdateExpiredUpsellsAsync_ActiveWithNoEndsAt_RemainsActive()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "No expiry",
            Heading = "Permanent",
        });

        await _upsellService.ActivateAsync(result.ResultObject!.Id);
        await _upsellService.UpdateExpiredUpsellsAsync();

        var updated = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        updated.ShouldNotBeNull();
        updated.Status.ShouldBe(UpsellStatus.Active);
    }

    [Fact]
    public async Task UpdateExpiredUpsellsAsync_DraftRule_NotTransitioned()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Draft rule",
            Heading = "Draft",
            EndsAt = DateTime.UtcNow.AddDays(-1),
        });

        await _upsellService.UpdateExpiredUpsellsAsync();

        var updated = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        updated.ShouldNotBeNull();
        updated.Status.ShouldBe(UpsellStatus.Draft);
    }

    [Fact]
    public async Task UpdateExpiredUpsellsAsync_DisabledRule_NotTransitioned()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Disabled rule",
            Heading = "Disabled",
            EndsAt = DateTime.UtcNow.AddDays(-1),
        });

        await _upsellService.ActivateAsync(result.ResultObject!.Id);
        await _upsellService.DeactivateAsync(result.ResultObject!.Id);

        var disabled = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        disabled!.Status.ShouldBe(UpsellStatus.Disabled);

        await _upsellService.UpdateExpiredUpsellsAsync();

        var updated = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        updated!.Status.ShouldBe(UpsellStatus.Disabled);
    }
}
