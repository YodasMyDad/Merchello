namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Result DTO for testing a supplier FTP/SFTP connection.
/// </summary>
public class TestSupplierFtpConnectionResultDto
{
    /// <summary>
    /// Whether the connection test succeeded.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message for failed tests.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
