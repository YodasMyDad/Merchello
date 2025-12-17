namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Result DTO for shipping provider test results
/// </summary>
public class TestShippingProviderResultDto
{
    /// <summary>
    /// Provider key that was tested
    /// </summary>
    public required string ProviderKey { get; set; }

    /// <summary>
    /// Provider display name
    /// </summary>
    public required string ProviderName { get; set; }

    /// <summary>
    /// Whether the test was successful (provider returned rates without errors)
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Service levels returned by the provider
    /// </summary>
    public List<TestShippingServiceLevelDto> ServiceLevels { get; set; } = [];

    /// <summary>
    /// Any errors encountered during the test
    /// </summary>
    public List<string> Errors { get; set; } = [];
}
