namespace Merchello.Core.Webhooks.Models.Enums;

/// <summary>
/// Authentication types for webhook delivery.
/// </summary>
public enum WebhookAuthType
{
    /// <summary>
    /// No authentication.
    /// </summary>
    None = 0,

    /// <summary>
    /// HMAC-SHA256 signature in X-Merchello-Hmac-SHA256 header.
    /// </summary>
    HmacSha256 = 1,

    /// <summary>
    /// HMAC-SHA512 signature in X-Merchello-Hmac-SHA512 header.
    /// </summary>
    HmacSha512 = 2,

    /// <summary>
    /// Bearer token in Authorization header.
    /// </summary>
    BearerToken = 3,

    /// <summary>
    /// API key in custom header.
    /// </summary>
    ApiKey = 4,

    /// <summary>
    /// Basic authentication in Authorization header.
    /// </summary>
    BasicAuth = 5
}
