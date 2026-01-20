namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for updating an email configuration.
/// </summary>
public class UpdateEmailConfigurationDto
{
    public required string Name { get; set; }
    public required string Topic { get; set; }
    public required string TemplatePath { get; set; }
    public required string ToExpression { get; set; }
    public required string SubjectExpression { get; set; }
    public bool Enabled { get; set; }
    public string? CcExpression { get; set; }
    public string? BccExpression { get; set; }
    public string? FromExpression { get; set; }
    public string? Description { get; set; }
}
