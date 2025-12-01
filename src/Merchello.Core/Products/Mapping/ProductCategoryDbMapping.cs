using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductCategoryDbMapping : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> builder)
    {
        builder.ToTable("MerchProductCategories");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).IsRequired().HasMaxLength(500);
        builder
            .HasMany(x => x.Products)
            .WithMany(x => x.Categories)
            .UsingEntity<Dictionary<string, object>>(
                "MerchProductRootCategories", // Name of the join table
                j => j
                    .HasOne<ProductRoot>() // Specify the target entity
                    .WithMany()
                    .HasForeignKey("ProductRootId") // Specify the foreign key
                    .OnDelete(DeleteBehavior.Cascade), // Set the deletion behavior
                j => j
                    .HasOne<ProductCategory>()
                    .WithMany()
                    .HasForeignKey("CategoryId")
                    .OnDelete(DeleteBehavior.Cascade)
            );
    }
}
