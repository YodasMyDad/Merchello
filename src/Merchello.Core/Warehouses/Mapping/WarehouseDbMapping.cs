using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Warehouses.Mapping;

public class WarehouseDbMapping : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.ToTable("MerchWarehouses");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(250);
        builder.Property(x => x.Address).ToJsonConversion(500);
        builder.Property(x => x.ExtendedData).ToJsonConversion(1000);
        builder.Property(x => x.AutomationMethod).HasMaxLength(1000);
    }
}
