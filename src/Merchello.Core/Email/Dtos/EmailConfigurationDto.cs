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

/// <summary>
/// DTO for email configuration detail view.
/// </summary>
public class EmailConfigurationDetailDto : EmailConfigurationDto
{
    public string? CcExpression { get; set; }
    public string? BccExpression { get; set; }
    public string? FromExpression { get; set; }
}

/// <summary>
/// DTO for creating a new email configuration.
/// </summary>
public class CreateEmailConfigurationDto
{
    public required string Name { get; set; }
    public required string Topic { get; set; }
    public required string TemplatePath { get; set; }
    public required string ToExpression { get; set; }
    public required string SubjectExpression { get; set; }
    public bool Enabled { get; set; } = true;
    public string? CcExpression { get; set; }
    public string? BccExpression { get; set; }
    public string? FromExpression { get; set; }
    public string? Description { get; set; }
}

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

/// <summary>
/// DTO for toggling email configuration enabled status.
/// </summary>
public class ToggleEmailConfigurationDto
{
    public bool Enabled { get; set; }
}

/// <summary>
/// DTO for sending a test email.
/// </summary>
public class SendTestEmailDto
{
    public required string Recipient { get; set; }
}
