using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductWarehousePriceOverrideDbMapping : IEntityTypeConfiguration<ProductWarehousePriceOverride>
{
    public void Configure(EntityTypeBuilder<ProductWarehousePriceOverride> builder)
    {
        builder.ToTable("MerchProductWarehousePriceOverride");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.HasOne(d => d.Warehouse)
            .WithMany(p => p.ProductWarehousePriceOverrides)
            .HasForeignKey(d => d.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.Product)
            .WithMany(p => p.ProductWarehousePriceOverrides)
            .HasForeignKey(d => d.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
