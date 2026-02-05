using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class LineItemDbMapping : IEntityTypeConfiguration<LineItem>
{
    public void Configure(EntityTypeBuilder<LineItem> builder)
    {
        builder.ToTable("merchelloLineItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Sku).HasMaxLength(100);
        builder.Property(x => x.Name).HasMaxLength(500);
        builder.Property(x => x.Amount).HasPrecision(18, 4);
        builder.Property(x => x.AmountInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.Cost).HasPrecision(18, 4);
        builder.Property(x => x.CostInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.OriginalAmount).HasPrecision(18, 4);
        builder.Property(x => x.OriginalAmountInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.TaxRate).HasPrecision(5, 2);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);
        builder.HasOne(d => d.Order)
            .WithMany(p => p.LineItems)
            .HasForeignKey(d => d.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index on LineItemType for efficient discount line item queries
        builder.HasIndex(x => x.LineItemType);
        builder.HasIndex(x => x.ProductId);

        // Index for addon/discount line item lookups
        builder.HasIndex(x => x.DependantLineItemSku);

        // Index for order lookups - best sellers, order detail loading
        builder.HasIndex(x => x.OrderId);

        // Index for tax group lookups
        builder.HasIndex(x => x.TaxGroupId);
    }
}
