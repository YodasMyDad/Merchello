namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// DTO for submitting a test order directly to a fulfilment provider.
/// </summary>
public class TestFulfilmentOrderSubmissionDto
{
    /// <summary>
    /// Optional customer email for test request.
    /// </summary>
    public string? CustomerEmail { get; set; }

    /// <summary>
    /// Optional override order number for test request.
    /// </summary>
    public string? OrderNumber { get; set; }

    /// <summary>
    /// Test shipping address.
    /// </summary>
    public TestFulfilmentAddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Test line items.
    /// </summary>
    public List<TestFulfilmentLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Indicates whether the provider should send this to real sandbox/test environment.
    /// </summary>
    public bool UseRealSandbox { get; set; } = true;
}
