using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Warehouses.Mapping;

public class WarehouseServiceRegionDbMapping : IEntityTypeConfiguration<WarehouseServiceRegion>
{
    public void Configure(EntityTypeBuilder<WarehouseServiceRegion> builder)
    {
        builder.ToTable("MerchWarehouseServiceRegions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.StateOrProvinceCode)
            .HasMaxLength(50);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.ServiceRegions)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
