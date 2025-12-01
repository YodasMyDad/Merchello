using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class LineItemDbMapping : IEntityTypeConfiguration<LineItem>
{
    public void Configure(EntityTypeBuilder<LineItem> builder)
    {
        builder.ToTable("MerchLineItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Sku).HasMaxLength(100);
        builder.Property(x => x.Name).HasMaxLength(500);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.OriginalAmount).HasPrecision(18, 2);
        builder.Property(x => x.TaxRate).HasPrecision(5, 2);
        builder.Property(x => x.ExtendedData).ToJsonConversion(3000);
        builder.HasOne(d => d.Order)
            .WithMany(p => p.LineItems)
            .HasForeignKey(d => d.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
