namespace Merchello.Core.Webhooks.Models.Enums;

/// <summary>
/// Payload format for webhook delivery.
/// </summary>
public enum WebhookFormat
{
    /// <summary>
    /// JSON format (application/json).
    /// </summary>
    Json = 1,

    /// <summary>
    /// Form URL encoded (application/x-www-form-urlencoded).
    /// </summary>
    FormUrlEncoded = 2
}
