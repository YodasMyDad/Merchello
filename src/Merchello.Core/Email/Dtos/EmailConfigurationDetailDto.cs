namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email configuration detail view.
/// </summary>
public class EmailConfigurationDetailDto : EmailConfigurationDto
{
    public string? CcExpression { get; set; }
    public string? BccExpression { get; set; }
    public string? FromExpression { get; set; }
}
