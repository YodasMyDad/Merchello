using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the DiscountTargetRule entity.
/// </summary>
public class DiscountTargetRuleDbMapping : IEntityTypeConfiguration<DiscountTargetRule>
{
    public void Configure(EntityTypeBuilder<DiscountTargetRule> builder)
    {
        builder.ToTable("merchelloDiscountTargetRules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.DiscountId)
            .IsRequired();
        builder.HasIndex(x => x.DiscountId);

        builder.Property(x => x.TargetType)
            .IsRequired();

        // TargetIds stored as JSON string
        builder.Property(x => x.TargetIds);

        builder.Property(x => x.IsExclusion)
            .IsRequired();
    }
}
