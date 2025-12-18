using Merchello.Core.Customers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Customers.Mapping;

/// <summary>
/// EF Core mapping configuration for the CustomerTag entity.
/// </summary>
public class CustomerTagDbMapping : IEntityTypeConfiguration<CustomerTag>
{
    public void Configure(EntityTypeBuilder<CustomerTag> builder)
    {
        builder.ToTable("merchelloCustomerTags");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Foreign key
        builder.Property(x => x.CustomerId).IsRequired();

        // Tag value
        builder.Property(x => x.Tag)
            .HasMaxLength(100)
            .IsRequired();

        // Timestamp
        builder.Property(x => x.DateAdded);

        // Indexes for performance
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Tag);

        // Unique constraint - a customer can only have a tag once
        builder.HasIndex(x => new { x.CustomerId, x.Tag })
            .IsUnique();

        // Relationship to Customer
        builder.HasOne(x => x.Customer)
            .WithMany(c => c.CustomerTags)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
