using Merchello.Core.Customers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Customers.Mapping;

/// <summary>
/// EF Core mapping configuration for the Customer entity.
/// </summary>
public class CustomerDbMapping : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("merchelloCustomers");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Email - primary identifier, unique, required
        builder.Property(x => x.Email)
            .IsRequired()
            .HasMaxLength(254);
        builder.HasIndex(x => x.Email)
            .IsUnique();

        // Optional Umbraco Member link
        builder.Property(x => x.MemberKey);
        builder.HasIndex(x => x.MemberKey)
            .HasFilter("[MemberKey] IS NOT NULL");

        // Name fields
        builder.Property(x => x.FirstName).HasMaxLength(200);
        builder.Property(x => x.LastName).HasMaxLength(200);

        // Timestamps
        builder.Property(x => x.DateCreated);
        builder.Property(x => x.DateUpdated);

        // Navigation: One Customer -> Many Invoices
        builder.HasMany(x => x.Invoices)
            .WithOne()
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);  // Don't cascade delete invoices
    }
}
