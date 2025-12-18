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

        builder.Property(x => x.DiscountId)
            .IsRequired();
        builder.HasIndex(x => x.DiscountId);

        builder.Property(x => x.InvoiceId)
            .IsRequired();
        builder.HasIndex(x => x.InvoiceId);

        builder.Property(x => x.CustomerId);
        builder.HasIndex(x => x.CustomerId);

        builder.Property(x => x.DiscountAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.DiscountAmountInStoreCurrency)
            .HasPrecision(18, 4);

        builder.Property(x => x.CurrencyCode)
            .IsRequired()
            .HasMaxLength(3);

        builder.Property(x => x.DateUsed)
            .IsRequired();
        builder.HasIndex(x => x.DateUsed);
    }
}
