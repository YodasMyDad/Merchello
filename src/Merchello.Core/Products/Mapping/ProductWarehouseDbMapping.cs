using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductWarehouseDbMapping : IEntityTypeConfiguration<ProductWarehouse>
{
    public void Configure(EntityTypeBuilder<ProductWarehouse> builder)
    {
        builder.ToTable("merchelloProductWarehouse");

        // Composite key
        builder.HasKey(pw => new { pw.ProductId, pw.WarehouseId });

        // Relationship to Product
        builder
            .HasOne(pw => pw.Product)
            .WithMany(p => p.ProductWarehouses)
            .HasForeignKey(pw => pw.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Relationship to Warehouse
        builder
            .HasOne(pw => pw.Warehouse)
            .WithMany(w => w.ProductWarehouses)
            .HasForeignKey(pw => pw.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);

        // Required properties
        builder
            .Property(pw => pw.Stock)
            .IsRequired();

        builder
            .Property(pw => pw.TrackStock)
            .IsRequired()
            .HasDefaultValue(false);

        builder
            .Property(pw => pw.ReservedStock)
            .IsRequired()
            .HasDefaultValue(0);

        // Optional properties
        builder
            .Property(pw => pw.ReorderPoint)
            .IsRequired(false);

        builder
            .Property(pw => pw.ReorderQuantity)
            .IsRequired(false);

        // Concurrency token for optimistic locking - prevents race conditions
        // Note: Using IsConcurrencyToken only (not IsRowVersion) for cross-database compatibility.
        // IsRowVersion tells EF the value is database-generated, which works for SQL Server but fails
        // for SQLite since it doesn't auto-generate row versions. The value is set in the model
        // via the default initializer and must be updated on each save for concurrency to work.
        builder
            .Property(pw => pw.RowVersion)
            .IsRequired()
            .IsConcurrencyToken();
    }
}

