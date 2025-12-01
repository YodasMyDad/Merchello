using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductRootWarehouseDbMapping : IEntityTypeConfiguration<ProductRootWarehouse>
{
    public void Configure(EntityTypeBuilder<ProductRootWarehouse> builder)
    {
        builder.ToTable("MerchProductRootWarehouse");
        builder
            .HasKey(pw => new { pw.ProductRootId, pw.WarehouseId }); // Composite key

        builder
            .HasOne(pw => pw.ProductRoot)
            .WithMany(p => p.ProductRootWarehouses)
            .HasForeignKey(pw => pw.ProductRootId);

        builder
            .HasOne(pw => pw.Warehouse)
            .WithMany(w => w.ProductRootWarehouses)
            .HasForeignKey(pw => pw.WarehouseId);

        // Configure additional property
        builder
            .Property(pw => pw.PriorityOrder)
            .IsRequired();
    }
}
