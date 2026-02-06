using Merchello.Core.Accounting.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class ShippingTaxOverrideDbMapping : IEntityTypeConfiguration<ShippingTaxOverride>
{
    public void Configure(EntityTypeBuilder<ShippingTaxOverride> builder)
    {
        builder.ToTable("merchelloShippingTaxOverrides");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.RegionCode)
            .HasColumnName("StateOrProvinceCode")
            .HasMaxLength(50);

        builder.HasOne(x => x.ShippingTaxGroup)
            .WithMany()
            .HasForeignKey(x => x.ShippingTaxGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        // Unique constraint: one override per country+region combination
        builder.HasIndex(x => new { x.CountryCode, x.RegionCode })
            .IsUnique();
    }
}
