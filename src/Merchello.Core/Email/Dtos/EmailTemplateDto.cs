namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email template information.
/// </summary>
public class EmailTemplateDto
{
    public string Path { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? FullPath { get; set; }
    public DateTime LastModified { get; set; }
}
