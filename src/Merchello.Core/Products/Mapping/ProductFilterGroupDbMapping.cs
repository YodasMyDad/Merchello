using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductFilterGroupDbMapping : IEntityTypeConfiguration<ProductFilterGroup>
{
    public void Configure(EntityTypeBuilder<ProductFilterGroup> builder)
    {
        builder.ToTable("MerchProductFilterGroups");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
    }
}
