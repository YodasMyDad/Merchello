using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the DiscountFreeShippingConfig entity.
/// </summary>
public class DiscountFreeShippingConfigDbMapping : IEntityTypeConfiguration<DiscountFreeShippingConfig>
{
    public void Configure(EntityTypeBuilder<DiscountFreeShippingConfig> builder)
    {
        builder.ToTable("merchelloDiscountFreeShippingConfigs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.DiscountId)
            .IsRequired();

        builder.Property(x => x.CountryScope)
            .IsRequired();

        // CountryCodes stored as JSON string
        builder.Property(x => x.CountryCodes);

        builder.Property(x => x.ExcludeRatesOverAmount)
            .IsRequired();

        builder.Property(x => x.ExcludeRatesOverValue)
            .HasPrecision(18, 4);

        // AllowedShippingOptionIds stored as JSON string
        builder.Property(x => x.AllowedShippingOptionIds);
    }
}
