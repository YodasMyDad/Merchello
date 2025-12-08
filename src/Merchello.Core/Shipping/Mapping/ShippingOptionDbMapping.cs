using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShippingOptionDbMapping : IEntityTypeConfiguration<ShippingOption>
{
    public void Configure(EntityTypeBuilder<ShippingOption> builder)
    {
        builder.ToTable("merchelloShippingOptions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        //builder.Property(x => x.CountryCosts).ToJsonConversion(2000);
        builder.Property(x => x.CalculationMethod).HasMaxLength(1500);
        builder.Property(x => x.Name).HasMaxLength(350);
        builder.Property(x => x.FixedCost).HasPrecision(18, 2);

        builder.Property(x => x.ProviderKey)
            .HasMaxLength(50)
            .HasDefaultValue("flat-rate");

        // ProviderSettings is a JSON string - EF Core will use nvarchar(max) on SQL Server, TEXT on SQLite
        builder.Property(x => x.ProviderSettings);

        builder.Property(x => x.IsEnabled)
            .HasDefaultValue(true);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.ShippingOptions)
            .HasForeignKey(d => d.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasMany(x => x.Products)
            .WithMany(x => x.ShippingOptions)
            .UsingEntity<Dictionary<string, object>>(
                "merchelloProductRootShippingOptions", // Name of the join table
                j => j
                    .HasOne<Product>() // Specify the target entity
                    .WithMany()
                    .HasForeignKey("ProductRootId") // Specify the foreign key
                    .OnDelete(DeleteBehavior.Cascade), // Set the deletion behavior
                j => j
                    .HasOne<ShippingOption>()
                    .WithMany()
                    .HasForeignKey("ShippingOptionId")
                    .OnDelete(DeleteBehavior.Cascade)
            );
    }
}
