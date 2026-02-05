using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShipmentDbMapping : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("merchelloShipments");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Address).ToJsonConversion(1500);
        builder.Property(x => x.LineItems).ToJsonConversion(null);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);
        builder.Property(x => x.Status).HasDefaultValue(ShipmentStatus.Preparing);
        // DateCreated uses C# default (DateTime.UtcNow) - no SQL default needed for cross-db compatibility
        // ShippedDate is nullable, set when shipment status transitions to Shipped

        builder.HasOne(x => x.Order)
            .WithMany(x => x.Shipments)
            .HasForeignKey(d => d.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(d => d.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
