using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the DiscountEligibilityRule entity.
/// </summary>
public class DiscountEligibilityRuleDbMapping : IEntityTypeConfiguration<DiscountEligibilityRule>
{
    public void Configure(EntityTypeBuilder<DiscountEligibilityRule> builder)
    {
        builder.ToTable("merchelloDiscountEligibilityRules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.DiscountId)
            .IsRequired();
        builder.HasIndex(x => x.DiscountId);

        builder.Property(x => x.EligibilityType)
            .IsRequired();

        // EligibilityIds stored as JSON string
        builder.Property(x => x.EligibilityIds);
    }
}
