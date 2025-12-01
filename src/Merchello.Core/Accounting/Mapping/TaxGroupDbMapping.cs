using Merchello.Core.Accounting.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class TaxGroupDbMapping : IEntityTypeConfiguration<TaxGroup>
{
    public void Configure(EntityTypeBuilder<TaxGroup> builder)
    {
        builder.ToTable("MerchTaxGroups");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(300);
        builder.Property(x => x.TaxPercentage).HasPrecision(5, 2);
    }
}
