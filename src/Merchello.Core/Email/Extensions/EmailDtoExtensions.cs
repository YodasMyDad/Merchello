using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Models;

namespace Merchello.Core.Email.Extensions;

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
