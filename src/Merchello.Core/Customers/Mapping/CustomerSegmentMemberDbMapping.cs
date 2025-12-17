using Merchello.Core.Customers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Customers.Mapping;

/// <summary>
/// EF Core mapping configuration for the CustomerSegmentMember entity.
/// </summary>
public class CustomerSegmentMemberDbMapping : IEntityTypeConfiguration<CustomerSegmentMember>
{
    public void Configure(EntityTypeBuilder<CustomerSegmentMember> builder)
    {
        builder.ToTable("merchelloCustomerSegmentMembers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Foreign keys
        builder.Property(x => x.SegmentId).IsRequired();
        builder.Property(x => x.CustomerId).IsRequired();

        // Unique constraint - a customer can only be in a segment once
        builder.HasIndex(x => new { x.SegmentId, x.CustomerId })
            .IsUnique();

        // Index for querying by customer
        builder.HasIndex(x => x.CustomerId);

        // Timestamps
        builder.Property(x => x.DateAdded);

        // Added by
        builder.Property(x => x.AddedBy);

        // Notes
        builder.Property(x => x.Notes)
            .HasMaxLength(1000);
    }
}
