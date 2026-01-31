using Merchello.Core.Auditing.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Auditing.Mapping;

public class AuditTrailEntryDbMapping : IEntityTypeConfiguration<AuditTrailEntry>
{
    public void Configure(EntityTypeBuilder<AuditTrailEntry> builder)
    {
        builder.ToTable("merchelloAuditTrailEntries");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // What changed
        builder.Property(x => x.EntityType).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EntityReference).HasMaxLength(100);

        // Action
        builder.Property(x => x.ActionDescription).HasMaxLength(500);

        // Field changes
        builder.Property(x => x.FieldName).HasMaxLength(100);
        builder.Property(x => x.OldValue).HasMaxLength(4000);
        builder.Property(x => x.NewValue).HasMaxLength(4000);
        builder.Property(x => x.ChangesJson);

        // Who
        builder.Property(x => x.UserName).HasMaxLength(255);
        builder.Property(x => x.UserEmail).HasMaxLength(255);
        builder.Property(x => x.IpAddress).HasMaxLength(45);
        builder.Property(x => x.UserAgent).HasMaxLength(500);

        // Context
        builder.Property(x => x.Source).HasMaxLength(50);
        builder.Property(x => x.ParentEntityType).HasMaxLength(100);

        // ExtendedData as JSON (null columnSize = nvarchar(max))
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // Indexes
        builder.HasIndex(x => x.EntityType);
        builder.HasIndex(x => x.EntityId);
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.DateCreated);
        builder.HasIndex(x => x.CorrelationId);
        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.DateCreated });
    }
}
