using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductCollectionDbMapping : IEntityTypeConfiguration<ProductCollection>
{
    public void Configure(EntityTypeBuilder<ProductCollection> builder)
    {
        builder.ToTable("merchelloProductCollections");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).IsRequired().HasMaxLength(500);
        builder
            .HasMany(x => x.Products)
            .WithMany(x => x.Collections)
            .UsingEntity<Dictionary<string, object>>(
                "merchelloProductRootCollections", // Name of the join table
                j => j
                    .HasOne<ProductRoot>() // Specify the target entity
                    .WithMany()
                    .HasForeignKey("ProductRootId") // Specify the foreign key
                    .OnDelete(DeleteBehavior.Cascade), // Set the deletion behavior
                j => j
                    .HasOne<ProductCollection>()
                    .WithMany()
                    .HasForeignKey("CollectionId")
                    .OnDelete(DeleteBehavior.Cascade)
            );
    }
}
