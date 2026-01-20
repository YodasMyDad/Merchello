namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for token information.
/// </summary>
public class TokenInfoDto
{
    public string Path { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DataType { get; set; } = string.Empty;
}
