using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the DiscountBuyXGetYConfig entity.
/// </summary>
public class DiscountBuyXGetYConfigDbMapping : IEntityTypeConfiguration<DiscountBuyXGetYConfig>
{
    public void Configure(EntityTypeBuilder<DiscountBuyXGetYConfig> builder)
    {
        builder.ToTable("merchelloDiscountBuyXGetYConfigs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.DiscountId)
            .IsRequired();

        // Customer Buys (Trigger)
        builder.Property(x => x.BuyTriggerType)
            .IsRequired();

        builder.Property(x => x.BuyTriggerValue)
            .HasPrecision(18, 4);

        builder.Property(x => x.BuyTargetType)
            .IsRequired();

        builder.Property(x => x.BuyTargetIds);

        // Customer Gets (Reward)
        builder.Property(x => x.GetQuantity)
            .IsRequired();

        builder.Property(x => x.GetTargetType)
            .IsRequired();

        builder.Property(x => x.GetTargetIds);

        builder.Property(x => x.GetValueType)
            .IsRequired();

        builder.Property(x => x.GetValue)
            .HasPrecision(18, 4);

        // Options
        builder.Property(x => x.SelectionMethod)
            .IsRequired();
    }
}
