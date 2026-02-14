using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductDbMapping : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("merchelloProducts");

        builder.HasOne(d => d.ProductRoot)
            .WithMany(p => p.Products)
            .HasForeignKey(d => d.ProductRootId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Name).HasMaxLength(500).IsRequired();

        builder.Property(x => x.CostOfGoods).IsRequired().HasPrecision(18, 4);
        builder.Property(x => x.Price).IsRequired().HasPrecision(18, 4);
        builder.Property(x => x.PreviousPrice).HasPrecision(18, 4);

        builder.Property(x => x.AvailableForPurchase).IsRequired();
        builder.Property(x => x.CanPurchase).IsRequired();

        builder.Property(x => x.Images).ToJsonConversion(null);
        builder.Property(x => x.Gtin).HasMaxLength(150);
        builder.Property(x => x.Sku).HasMaxLength(150);
        builder.Property(x => x.SupplierSku).HasMaxLength(150);

        builder.Property(x => x.DateCreated).IsRequired();
        builder.Property(x => x.DateUpdated).IsRequired();

        builder.Property(x => x.ShoppingFeedTitle).HasMaxLength(150);
        builder.Property(x => x.ShoppingFeedDescription).HasMaxLength(1000);
        builder.Property(x => x.ShoppingFeedColour).HasMaxLength(100);
        builder.Property(x => x.ShoppingFeedMaterial).HasMaxLength(100);
        builder.Property(x => x.ShoppingFeedSize).HasMaxLength(100);
        builder.Property(x => x.ShoppingFeedWidth).HasMaxLength(100);
        builder.Property(x => x.ShoppingFeedHeight).HasMaxLength(100);

        //builder.Property(x => x.VariantOptions).ToJsonConversion(2000);
        builder.Property(x => x.VariantOptionsKey).HasMaxLength(1500);

        builder.Property(x => x.Url).HasMaxLength(1000);

        // HS Code for customs/tariff classification (variant-level)
        builder.Property(x => x.HsCode).HasMaxLength(10);

        // Package configurations for shipping (overrides root if populated)
        builder.Property(x => x.PackageConfigurations).ToJsonConversion(4000);

        builder.HasIndex(e => e.Price);

        // Index for front-end URL routing performance
        builder.HasIndex(x => x.Url);

        // Index for SKU lookups during checkout and search
        builder.HasIndex(x => x.Sku);

        // Composite index for catalog availability queries
        builder.HasIndex(x => new { x.AvailableForPurchase, x.CanPurchase });

        // Configure shipping restriction mode
        builder.Property(x => x.ShippingRestrictionMode)
            .IsRequired()
            .HasDefaultValue(ShippingRestrictionMode.None);

        // Configure many-to-many relationship for AllowedShippingOptions
        builder.HasMany(p => p.AllowedShippingOptions)
            .WithMany()
            .UsingEntity(j => j.ToTable("merchelloProductAllowedShippingOptions"));

        // Configure many-to-many relationship for ExcludedShippingOptions
        builder.HasMany(p => p.ExcludedShippingOptions)
            .WithMany()
            .UsingEntity(j => j.ToTable("merchelloProductExcludedShippingOptions"));
    }
}
