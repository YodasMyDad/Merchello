using Merchello.Core.Caching.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Caching.Services;

/// <summary>
/// Unit tests for CacheService configuration.
/// Note: CacheService is a thin wrapper around Umbraco's AppCaches which cannot be
/// easily mocked due to constructor requirements. These tests focus on the configuration
/// options. Integration-level cache behavior is tested via the ServiceTestFixture
/// which provides a mocked ICacheService.
/// </summary>
public class CacheServiceTests
{
    [Fact]
    public void CacheOptions_HasSensibleDefaults()
    {
        // Arrange & Act
        var options = new CacheOptions();

        // Assert
        options.DefaultTtlSeconds.ShouldBeGreaterThan(0);
    }

    [Fact]
    public void CacheOptions_CanBeConfigured()
    {
        // Arrange
        var options = new CacheOptions
        {
            DefaultTtlSeconds = 600
        };

        // Assert
        options.DefaultTtlSeconds.ShouldBe(600);
    }

    [Fact]
    public void CacheOptions_DefaultTtl_IsReasonable()
    {
        // Arrange
        var options = new CacheOptions();

        // Assert - Default should be between 1 minute and 1 hour
        options.DefaultTtlSeconds.ShouldBeGreaterThanOrEqualTo(60);
        options.DefaultTtlSeconds.ShouldBeLessThanOrEqualTo(3600);
    }
}
