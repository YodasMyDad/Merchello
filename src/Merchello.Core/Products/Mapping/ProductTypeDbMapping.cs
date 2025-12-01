using Merchello.Core.Products.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Products.Mapping;

public class ProductTypeDbMapping : IEntityTypeConfiguration<ProductType>
{
    public void Configure(EntityTypeBuilder<ProductType> builder)
    {
        builder.ToTable("MerchProductTypes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
    }
}
