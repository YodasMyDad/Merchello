using Merchello.Core.Accounting.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class OrderDbMapping : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("merchelloOrders");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.HasOne(d => d.Invoice)
            .WithMany(p => p.Orders)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.WarehouseId).IsRequired();
        builder.Property(x => x.ShippingOptionId).IsRequired();
        builder.Property(x => x.ShippingCost).HasPrecision(18, 4);
        builder.Property(x => x.ShippingCostInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.DeliveryDateSurcharge).HasPrecision(18, 4);
        builder.Property(x => x.DeliveryDateSurchargeInStoreCurrency).HasPrecision(18, 4);

        // Status fields
        builder.Property(x => x.Status).IsRequired().HasDefaultValue(OrderStatus.Pending);
        builder.Property(x => x.ProcessingStartedDate).IsRequired(false);
        builder.Property(x => x.ShippedDate).IsRequired(false);
        builder.Property(x => x.CompletedDate).IsRequired(false);
        builder.Property(x => x.CancelledDate).IsRequired(false);
        builder.Property(x => x.CancellationReason).HasMaxLength(1000);
        builder.Property(x => x.InternalNotes).HasMaxLength(2000);

        // Indexes for fulfillment queries
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.WarehouseId);
    }
}
