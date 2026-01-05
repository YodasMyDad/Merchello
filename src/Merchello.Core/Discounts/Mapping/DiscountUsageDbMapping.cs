using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the DiscountUsage entity.
/// </summary>
public class DiscountUsageDbMapping : IEntityTypeConfiguration<DiscountUsage>
{
    public void Configure(EntityTypeBuilder<DiscountUsage> builder)
    {
        builder.ToTable("merchelloDiscountUsages");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Discount relationship
        builder.Property(x => x.DiscountId).IsRequired();
        builder.HasOne(x => x.Discount)
            .WithMany()
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Invoice relationship
        builder.Property(x => x.InvoiceId).IsRequired();
        builder.HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: One discount per invoice (prevents duplicate applications)
        builder.HasIndex(x => new { x.DiscountId, x.InvoiceId })
            .IsUnique();

        // Index for per-customer usage queries
        builder.HasIndex(x => new { x.DiscountId, x.CustomerId });

        // Index for usage count queries
        builder.HasIndex(x => x.DiscountId);

        // Optional customer
        builder.Property(x => x.CustomerId).IsRequired(false);

        // Amount
        builder.Property(x => x.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        // Date
        builder.Property(x => x.DateCreated).IsRequired();
    }
}
