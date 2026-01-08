namespace Merchello.Core.Email.Dtos;

/// <summary>
/// Result of sending a test email.
/// </summary>
public class EmailSendTestResultDto
{
    /// <summary>
    /// Whether the test email was sent successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The recipient the test was sent to.
    /// </summary>
    public string? Recipient { get; set; }

    /// <summary>
    /// Error message if the send failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// The delivery ID if queued.
    /// </summary>
    public Guid? DeliveryId { get; set; }
}
