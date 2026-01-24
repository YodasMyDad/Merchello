using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.RateLimiting.Models;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

public class WebhookSecurityServiceTests
{
    private readonly Mock<IEFCoreScopeProvider<MerchelloDbContext>> _scopeProviderMock;
    private readonly Mock<IRateLimiter> _rateLimiterMock;
    private readonly Mock<ILogger<WebhookSecurityService>> _loggerMock;
    private readonly WebhookSecurityService _service;

    public WebhookSecurityServiceTests()
    {
        _scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        _rateLimiterMock = new Mock<IRateLimiter>();
        _loggerMock = new Mock<ILogger<WebhookSecurityService>>();
        _service = new WebhookSecurityService(
            _scopeProviderMock.Object,
            _rateLimiterMock.Object,
            _loggerMock.Object);
    }

    private string UniqueProvider() => $"provider-{Guid.NewGuid()}";
    private string UniqueEventId() => $"evt-{Guid.NewGuid()}";

    private void SetupScopeReturns(bool exists)
    {
        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
            .ReturnsAsync(exists);

        scopeMock.Setup(s => s.Complete());

        _scopeProviderMock
            .Setup(p => p.CreateScope())
            .Returns(scopeMock.Object);
    }

    #region IsRateLimited Tests

    [Fact]
    public void IsRateLimited_NullIp_ReturnsFalse()
    {
        // Arrange
        var provider = UniqueProvider();

        // Act
        var result = _service.IsRateLimited(provider, null);

        // Assert
        result.ShouldBeFalse();
        _rateLimiterMock.Verify(
            r => r.TryAcquire(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<TimeSpan>()),
            Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void IsRateLimited_NullOrEmptyIp_ReturnsFalse(string? ip)
    {
        // Arrange
        var provider = UniqueProvider();

        // Act
        var result = _service.IsRateLimited(provider, ip);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsRateLimited_RateLimiterAllows_ReturnsFalse()
    {
        // Arrange
        var provider = UniqueProvider();
        var ip = "192.168.1.1";
        var expectedKey = $"webhook_rate_{provider}_{ip}";

        _rateLimiterMock
            .Setup(r => r.TryAcquire(expectedKey, 60, TimeSpan.FromMinutes(1)))
            .Returns(RateLimitResult.Allowed(1, 60));

        // Act
        var result = _service.IsRateLimited(provider, ip);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsRateLimited_RateLimiterDenies_ReturnsTrue()
    {
        // Arrange
        var provider = UniqueProvider();
        var ip = "10.0.0.1";
        var expectedKey = $"webhook_rate_{provider}_{ip}";

        _rateLimiterMock
            .Setup(r => r.TryAcquire(expectedKey, 60, TimeSpan.FromMinutes(1)))
            .Returns(RateLimitResult.RateLimited(61, 60, TimeSpan.FromSeconds(30)));

        // Act
        var result = _service.IsRateLimited(provider, ip);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region HasBeenProcessedAsync Tests

    [Fact]
    public async Task HasBeenProcessedAsync_NoMatchingPayment_ReturnsFalse()
    {
        // Arrange
        SetupScopeReturns(false);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // Act
        var result = await _service.HasBeenProcessedAsync(provider, eventId);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task HasBeenProcessedAsync_PaymentExists_ReturnsTrue()
    {
        // Arrange
        SetupScopeReturns(true);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // Act
        var result = await _service.HasBeenProcessedAsync(provider, eventId);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region TryMarkAsProcessingAsync Tests

    [Fact]
    public async Task TryMarkAsProcessingAsync_NewWebhookEvent_ReturnsTrue()
    {
        // Arrange
        SetupScopeReturns(false);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // Act
        var result = await _service.TryMarkAsProcessingAsync(provider, eventId);

        // Assert
        result.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(provider, eventId);
    }

    [Fact]
    public async Task TryMarkAsProcessingAsync_AlreadyProcessingEvent_ReturnsFalse()
    {
        // Arrange
        SetupScopeReturns(false);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // First call should succeed
        var firstResult = await _service.TryMarkAsProcessingAsync(provider, eventId);
        firstResult.ShouldBeTrue();

        // Act - second call with same key
        var secondResult = await _service.TryMarkAsProcessingAsync(provider, eventId);

        // Assert
        secondResult.ShouldBeFalse();

        // Cleanup
        _service.ClearProcessingMarker(provider, eventId);
    }

    #endregion

    #region MarkAsProcessed Tests

    [Fact]
    public async Task MarkAsProcessed_ClearsProcessingMarker_AllowsReprocessing()
    {
        // Arrange
        SetupScopeReturns(false);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // Mark as processing
        var marked = await _service.TryMarkAsProcessingAsync(provider, eventId);
        marked.ShouldBeTrue();

        // Act - mark as processed (clears the in-flight marker)
        _service.MarkAsProcessed(provider, eventId);

        // Assert - should be able to mark as processing again
        var remarked = await _service.TryMarkAsProcessingAsync(provider, eventId);
        remarked.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(provider, eventId);
    }

    #endregion

    #region ClearProcessingMarker Tests

    [Fact]
    public async Task ClearProcessingMarker_AllowsReprocessing()
    {
        // Arrange
        SetupScopeReturns(false);
        var provider = UniqueProvider();
        var eventId = UniqueEventId();

        // Mark as processing
        var marked = await _service.TryMarkAsProcessingAsync(provider, eventId);
        marked.ShouldBeTrue();

        // Verify it's blocked
        var blocked = await _service.TryMarkAsProcessingAsync(provider, eventId);
        blocked.ShouldBeFalse();

        // Act - clear the marker
        _service.ClearProcessingMarker(provider, eventId);

        // Assert - can mark again
        var remarked = await _service.TryMarkAsProcessingAsync(provider, eventId);
        remarked.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(provider, eventId);
    }

    #endregion
}
