using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Resolves token expressions (e.g., {{order.customerEmail}}) to actual values.
/// </summary>
public interface IEmailTokenResolver
{
    /// <summary>
    /// Resolves all tokens in a template string.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="template">Template string containing {{token}} expressions.</param>
    /// <param name="model">The email model containing notification and store context.</param>
    /// <returns>The template with tokens replaced with actual values.</returns>
    string ResolveTokens<TNotification>(string template, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification;

    /// <summary>
    /// Gets all available tokens for a notification type.
    /// </summary>
    /// <param name="topic">The email topic.</param>
    /// <returns>List of available tokens.</returns>
    IReadOnlyList<TokenInfo> GetAvailableTokens(string topic);

    /// <summary>
    /// Gets all available tokens for a notification type.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <returns>List of available tokens.</returns>
    IReadOnlyList<TokenInfo> GetAvailableTokens<TNotification>()
        where TNotification : MerchelloNotification;

    /// <summary>
    /// Resolves a single token path to its value.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="path">The token path (e.g., "order.customerEmail").</param>
    /// <param name="model">The email model.</param>
    /// <returns>The resolved value as a string, or null if not found.</returns>
    string? ResolveToken<TNotification>(string path, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification;
}
