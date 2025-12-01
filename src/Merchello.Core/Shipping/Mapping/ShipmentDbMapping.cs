using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShipmentDbMapping : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("MerchShipments");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Address).ToJsonConversion(1500);
        builder.Property(x => x.LineItems).ToJsonConversion(3000);

        builder.HasOne(x => x.Order)
            .WithMany(x => x.Shipments)
            .HasForeignKey(d => d.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(d => d.SupplierId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
