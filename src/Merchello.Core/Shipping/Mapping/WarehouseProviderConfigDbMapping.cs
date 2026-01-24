using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class WarehouseProviderConfigDbMapping : IEntityTypeConfiguration<WarehouseProviderConfig>
{
    public void Configure(EntityTypeBuilder<WarehouseProviderConfig> builder)
    {
        builder.ToTable("merchelloWarehouseProviderConfigs");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.WarehouseId)
            .IsRequired();

        builder.Property(x => x.ProviderKey)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.IsEnabled)
            .HasDefaultValue(true);

        builder.Property(x => x.DefaultMarkupPercent)
            .HasPrecision(18, 4)
            .HasDefaultValue(0m);

        builder.Property(x => x.ServiceMarkupsJson)
            .HasMaxLength(4000);

        builder.Property(x => x.ExcludedServiceTypesJson)
            .HasMaxLength(4000);

        builder.Property(x => x.CreateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.UpdateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        // One config per provider per warehouse
        builder.HasIndex(x => new { x.WarehouseId, x.ProviderKey }).IsUnique();

        // Ignore computed properties
        builder.Ignore(x => x.ServiceMarkups);
        builder.Ignore(x => x.ExcludedServiceTypes);
    }
}
