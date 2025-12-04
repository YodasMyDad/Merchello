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
        builder.Property(x => x.Videos).ToJsonConversion(500);
        builder.Property(x => x.RootImages).ToJsonConversion(3000);
        builder.Property(x => x.SellingPoints).ToJsonConversion(1500);
        builder.Property(x => x.GoogleShoppingFeedCategory).HasMaxLength(1000);
        builder.Property(x => x.RootUrl).HasMaxLength(1000);
        builder.Property(x => x.HsCode).HasMaxLength(10);
    }
}
