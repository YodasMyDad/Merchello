using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShippingOptionCountryDbMapping : IEntityTypeConfiguration<ShippingOptionCountry>
{
    public void Configure(EntityTypeBuilder<ShippingOptionCountry> builder)
    {
        builder.ToTable("MerchShippingOptionCountries");

        builder.HasKey(x => new { x.ShippingOptionId, x.CountryCode }); // Composite key

        builder.Property(x => x.CountryCode)
            .IsRequired()
            .HasMaxLength(10); // Assuming ISO country codes

        builder.HasOne(x => x.ShippingOption)
            .WithMany(so => so.ShippingOptionCountries)
            .HasForeignKey(x => x.ShippingOptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
