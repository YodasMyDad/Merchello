namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email topic categories.
/// </summary>
public class EmailTopicCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public List<EmailTopicDto> Topics { get; set; } = [];
}
