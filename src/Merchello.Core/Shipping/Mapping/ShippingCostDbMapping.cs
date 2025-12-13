using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShippingCostDbMapping : IEntityTypeConfiguration<ShippingCost>
{
    public void Configure(EntityTypeBuilder<ShippingCost> builder)
    {
        builder.ToTable("merchelloShippingCosts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10); // Assuming ISO country codes

        builder.Property(x => x.StateOrProvinceCode)
            .HasMaxLength(50); // State/province codes (e.g., "CA", "ON")

        builder.Property(x => x.Cost)
            .IsRequired()
            .HasColumnType("decimal(18,4)"); // Monetary values require more than 2dp for multi-currency support

        builder.HasOne(x => x.ShippingOption)
            .WithMany(so => so.ShippingCosts)
            .HasForeignKey(x => x.ShippingOptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
