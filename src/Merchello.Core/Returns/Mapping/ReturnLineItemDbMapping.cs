using Merchello.Core.Returns.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Returns.Mapping;

public class ReturnLineItemDbMapping : IEntityTypeConfiguration<ReturnLineItem>
{
    public void Configure(EntityTypeBuilder<ReturnLineItem> builder)
    {
        builder.ToTable("merchelloReturnLineItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Sku).HasMaxLength(100);
        builder.Property(x => x.Name).HasMaxLength(500);
        builder.Property(x => x.CustomerComments).HasMaxLength(2000);

        builder.Property(x => x.UnitPrice).HasPrecision(18, 4);
        builder.Property(x => x.RefundAmount).HasPrecision(18, 4);

        // Relationships
        builder.HasOne(x => x.Return)
            .WithMany(r => r.LineItems)
            .HasForeignKey(x => x.ReturnId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ReturnReason)
            .WithMany()
            .HasForeignKey(x => x.ReturnReasonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.ReturnId);
    }
}
