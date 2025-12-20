using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductRootDbMapping : IEntityTypeConfiguration<ProductRoot>
{
    public void Configure(EntityTypeBuilder<ProductRoot> builder)
    {
        builder.ToTable("merchelloProductRoots");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.HasOne(d => d.ProductType)
            .WithMany(p => p.Products)
            .HasForeignKey(d => d.ProductTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TaxGroup)
            .WithMany(x => x.Products)
            .HasForeignKey(x => x.TaxGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.ProductOptions).ToJsonConversion(3000);
        builder.Property(x => x.RootImages).ToJsonConversion(3000);
        builder.Property(x => x.GoogleShoppingFeedCategory).HasMaxLength(1000);
        builder.Property(x => x.RootUrl).HasMaxLength(1000);
        builder.Property(x => x.DefaultPackageConfigurations).ToJsonConversion(4000);

        // SEO fields
        builder.Property(x => x.Description).HasMaxLength(5000);
        builder.Property(x => x.MetaDescription).HasMaxLength(200);
        builder.Property(x => x.PageTitle).HasMaxLength(100);
        builder.Property(x => x.OpenGraphImage).HasMaxLength(50);
        builder.Property(x => x.CanonicalUrl).HasMaxLength(1000);

        // Element Type property data (stores JSON from configured Element Type)
        builder.Property(x => x.ElementPropertyData);

        // View selection for front-end rendering
        builder.Property(x => x.ViewAlias).HasMaxLength(200);

        // Index for front-end URL routing performance
        builder.HasIndex(x => x.RootUrl);
        builder.HasIndex(x => x.ProductTypeId);
    }
}
