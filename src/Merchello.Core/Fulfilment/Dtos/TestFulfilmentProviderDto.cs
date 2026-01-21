namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Result of testing a fulfilment provider connection.
/// </summary>
public class TestFulfilmentProviderDto
{
    public bool Success { get; set; }
    public string? ProviderVersion { get; set; }
    public string? AccountName { get; set; }
    public int? WarehouseCount { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ErrorCode { get; set; }
}
