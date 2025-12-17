using Merchello.Core.Customers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Customers.Mapping;

/// <summary>
/// EF Core mapping configuration for the CustomerSegment entity.
/// </summary>
public class CustomerSegmentDbMapping : IEntityTypeConfiguration<CustomerSegment>
{
    public void Configure(EntityTypeBuilder<CustomerSegment> builder)
    {
        builder.ToTable("merchelloCustomerSegments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Name - required, indexed
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(300);
        builder.HasIndex(x => x.Name);

        // Description - optional
        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        // Segment type
        builder.Property(x => x.SegmentType)
            .IsRequired();
        builder.HasIndex(x => x.SegmentType);

        // Criteria JSON for automated segments - EF Core will use nvarchar(max) on SQL Server, TEXT on SQLite
        builder.Property(x => x.CriteriaJson);

        // Match mode
        builder.Property(x => x.MatchMode)
            .IsRequired();

        // Status flags
        builder.Property(x => x.IsActive)
            .IsRequired();
        builder.HasIndex(x => x.IsActive);

        builder.Property(x => x.IsSystemSegment)
            .IsRequired();

        // Timestamps
        builder.Property(x => x.DateCreated);
        builder.Property(x => x.DateUpdated);

        // Created by
        builder.Property(x => x.CreatedBy);

        // Navigation: One Segment -> Many Members
        builder.HasMany(x => x.Members)
            .WithOne(x => x.Segment)
            .HasForeignKey(x => x.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
