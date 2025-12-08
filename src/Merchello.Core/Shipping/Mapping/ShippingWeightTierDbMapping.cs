using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShippingWeightTierDbMapping : IEntityTypeConfiguration<ShippingWeightTier>
{
    public void Configure(EntityTypeBuilder<ShippingWeightTier> builder)
    {
        builder.ToTable("merchelloShippingWeightTiers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.StateOrProvinceCode)
            .HasMaxLength(50);

        builder.Property(x => x.MinWeightKg)
            .IsRequired()
            .HasColumnType("decimal(18,4)");

        builder.Property(x => x.MaxWeightKg)
            .HasColumnType("decimal(18,4)");

        builder.Property(x => x.Surcharge)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.HasOne(x => x.ShippingOption)
            .WithMany(so => so.WeightTiers)
            .HasForeignKey(x => x.ShippingOptionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index for efficient lookups
        builder.HasIndex(x => new { x.ShippingOptionId, x.CountryCode, x.StateOrProvinceCode });
    }
}
