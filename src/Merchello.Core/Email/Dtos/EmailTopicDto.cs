using Merchello.Core.Email.Models;

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

/// <summary>
/// DTO for email topic categories.
/// </summary>
public class EmailTopicCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public List<EmailTopicDto> Topics { get; set; } = [];
}

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

/// <summary>
/// Extension methods for mapping email models to DTOs.
/// </summary>
public static class EmailDtoExtensions
{
    public static TokenInfoDto ToDto(this TokenInfo token) => new()
    {
        Path = token.Path,
        DisplayName = token.DisplayName,
        Description = token.Description,
        DataType = token.DataType
    };

    public static EmailTemplateDto ToDto(this EmailTemplateInfo template) => new()
    {
        Path = template.Path,
        DisplayName = template.DisplayName,
        FullPath = template.FullPath,
        LastModified = template.LastModified
    };
}
