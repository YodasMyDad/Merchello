using Merchello.Core.Accounting.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class TaxGroupRateDbMapping : IEntityTypeConfiguration<TaxGroupRate>
{
    public void Configure(EntityTypeBuilder<TaxGroupRate> builder)
    {
        builder.ToTable("merchelloTaxGroupRates");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.RegionCode)
            .HasColumnName("StateOrProvinceCode")
            .HasMaxLength(50);

        builder.Property(x => x.TaxPercentage)
            .HasPrecision(5, 2);

        builder.HasOne(x => x.TaxGroup)
            .WithMany(tg => tg.Rates)
            .HasForeignKey(x => x.TaxGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one rate per country+region per tax group
        builder.HasIndex(x => new { x.TaxGroupId, x.CountryCode, x.RegionCode })
            .IsUnique();
    }
}
