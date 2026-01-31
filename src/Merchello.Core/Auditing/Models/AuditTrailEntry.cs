using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Auditing.Models;

public class AuditTrailEntry
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // What changed
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? EntityReference { get; set; }

    // What action
    public AuditAction Action { get; set; }
    public string? ActionDescription { get; set; }

    // What values changed
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? ChangesJson { get; set; }

    // Who made the change
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // When
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    // Context
    public Guid? CorrelationId { get; set; }
    public string? Source { get; set; }

    // Navigation (for related entity queries)
    public Guid? ParentEntityId { get; set; }
    public string? ParentEntityType { get; set; }

    // Flexible metadata
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
