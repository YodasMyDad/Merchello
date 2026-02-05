using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Warehouses.Mapping;

public class WarehouseDbMapping : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.ToTable("merchelloWarehouses");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.SupplierId).IsRequired(false);
        builder.Property(x => x.Name).HasMaxLength(250);
        builder.Property(x => x.Code).HasMaxLength(100);
        builder.Property(x => x.Address).ToJsonConversion(500);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);
        builder.Property(x => x.AutomationMethod).HasMaxLength(1000);
        builder.Property(x => x.ServiceRegionsJson);
        builder.Property(x => x.ProviderConfigsJson);
        builder.Property(x => x.FulfilmentProviderConfigurationId).IsRequired(false);

        // Unique constraint on warehouse code
        builder.HasIndex(x => x.Code).IsUnique();

        // Relationship to Supplier is configured in SupplierDbMapping

        builder.HasOne(x => x.FulfilmentProviderConfiguration)
            .WithMany()
            .HasForeignKey(x => x.FulfilmentProviderConfigurationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
