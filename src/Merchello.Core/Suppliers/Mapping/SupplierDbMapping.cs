using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Suppliers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Suppliers.Mapping;

public class SupplierDbMapping : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("merchelloSuppliers");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(250).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(100);
        builder.Property(x => x.Address).ToJsonConversion(500);
        builder.Property(x => x.ContactName).HasMaxLength(250);
        builder.Property(x => x.ContactEmail).HasMaxLength(250);
        builder.Property(x => x.ContactPhone).HasMaxLength(50);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);
        builder.Property(x => x.DefaultFulfilmentProviderConfigurationId).IsRequired(false);

        // One-to-many relationship with Warehouses
        builder.HasMany(x => x.Warehouses)
            .WithOne(w => w.Supplier)
            .HasForeignKey(w => w.SupplierId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.DefaultFulfilmentProviderConfiguration)
            .WithMany()
            .HasForeignKey(x => x.DefaultFulfilmentProviderConfigurationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
