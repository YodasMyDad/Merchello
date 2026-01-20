namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email topic information.
/// </summary>
public class EmailTopicDto
{
    public string Topic { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public List<TokenInfoDto> AvailableTokens { get; set; } = [];
}
