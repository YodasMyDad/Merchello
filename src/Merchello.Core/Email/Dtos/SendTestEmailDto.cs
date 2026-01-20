namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for sending a test email.
/// </summary>
public class SendTestEmailDto
{
    public required string Recipient { get; set; }
}
