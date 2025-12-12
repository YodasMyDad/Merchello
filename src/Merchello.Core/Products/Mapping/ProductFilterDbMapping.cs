using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductFilterDbMapping : IEntityTypeConfiguration<ProductFilter>
{
    public void Configure(EntityTypeBuilder<ProductFilter> builder)
    {
        builder.ToTable("merchelloProductFilters");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.HexColour).HasMaxLength(150).IsRequired(false);

        builder.HasOne(d => d.ParentGroup)
            .WithMany(p => p.Filters)
            .HasForeignKey(d => d.ProductFilterGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasMany(x => x.Products)
            .WithMany(x => x.Filters)
            .UsingEntity<Dictionary<string, object>>(
                "merchelloProductFiltersProducts", // Name of the join table
                j => j
                    .HasOne<Product>() // Specify the target entity
                    .WithMany()
                    .HasForeignKey("ProductId") // Specify the foreign key
                    .OnDelete(DeleteBehavior.Cascade), // Set the deletion behavior
                j => j
                    .HasOne<ProductFilter>()
                    .WithMany()
                    .HasForeignKey("FilterId")
                    .OnDelete(DeleteBehavior.Cascade)
            );
    }
}
