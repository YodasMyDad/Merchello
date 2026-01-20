namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email configuration list items.
/// </summary>
public class EmailConfigurationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? TopicDisplayName { get; set; }
    public string? TopicCategory { get; set; }
    public bool Enabled { get; set; }
    public string TemplatePath { get; set; } = string.Empty;
    public string ToExpression { get; set; } = string.Empty;
    public string SubjectExpression { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateModified { get; set; }
    public int TotalSent { get; set; }
    public int TotalFailed { get; set; }
    public DateTime? LastSentUtc { get; set; }
}
