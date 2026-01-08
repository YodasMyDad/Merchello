using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Service for managing email configurations.
/// </summary>
public interface IEmailConfigurationService
{
    /// <summary>
    /// Gets an email configuration by ID.
    /// </summary>
    Task<EmailConfiguration?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets all email configurations for a specific topic.
    /// </summary>
    Task<IReadOnlyList<EmailConfiguration>> GetByTopicAsync(string topic, CancellationToken ct = default);

    /// <summary>
    /// Gets all enabled email configurations for a specific topic.
    /// </summary>
    Task<IReadOnlyList<EmailConfiguration>> GetEnabledByTopicAsync(string topic, CancellationToken ct = default);

    /// <summary>
    /// Queries email configurations with filtering and pagination.
    /// </summary>
    Task<PaginatedList<EmailConfiguration>> QueryAsync(
        EmailConfigurationQueryParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Creates a new email configuration.
    /// </summary>
    Task<CrudResult<EmailConfiguration>> CreateAsync(
        CreateEmailConfigurationParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Updates an existing email configuration.
    /// </summary>
    Task<CrudResult<EmailConfiguration>> UpdateAsync(
        UpdateEmailConfigurationParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes an email configuration.
    /// </summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Toggles the enabled status of an email configuration.
    /// </summary>
    Task<CrudResult<EmailConfiguration>> ToggleEnabledAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Increments the sent count for an email configuration.
    /// </summary>
    Task IncrementSentCountAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Increments the failed count for an email configuration.
    /// </summary>
    Task IncrementFailedCountAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets email configurations grouped by topic category.
    /// </summary>
    Task<IReadOnlyDictionary<string, IReadOnlyList<EmailConfiguration>>> GetByCategoryAsync(
        CancellationToken ct = default);
}
