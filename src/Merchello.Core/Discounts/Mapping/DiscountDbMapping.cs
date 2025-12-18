using Merchello.Core.Discounts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Discounts.Mapping;

/// <summary>
/// EF Core mapping configuration for the Discount entity.
/// </summary>
public class DiscountDbMapping : IEntityTypeConfiguration<Discount>
{
    public void Configure(EntityTypeBuilder<Discount> builder)
    {
        builder.ToTable("merchelloDiscounts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Basic Info
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.Status)
            .IsRequired();
        builder.HasIndex(x => x.Status);

        // Type & Method
        builder.Property(x => x.Category)
            .IsRequired();

        builder.Property(x => x.Method)
            .IsRequired();

        builder.Property(x => x.Code)
            .HasMaxLength(50);
        builder.HasIndex(x => x.Code)
            .IsUnique()
            .HasFilter("[Code] IS NOT NULL");

        // Value
        builder.Property(x => x.ValueType)
            .IsRequired();

        builder.Property(x => x.Value)
            .HasPrecision(18, 4);

        // Scheduling
        builder.Property(x => x.StartsAt)
            .IsRequired();

        builder.Property(x => x.EndsAt);

        builder.HasIndex(x => new { x.StartsAt, x.EndsAt });

        builder.Property(x => x.Timezone)
            .HasMaxLength(100);

        // Limits
        builder.Property(x => x.TotalUsageLimit);
        builder.Property(x => x.PerCustomerUsageLimit);
        builder.Property(x => x.PerOrderUsageLimit);
        builder.Property(x => x.CurrentUsageCount);

        // Requirements
        builder.Property(x => x.RequirementType)
            .IsRequired();

        builder.Property(x => x.RequirementValue)
            .HasPrecision(18, 4);

        // Combinations
        builder.Property(x => x.CanCombineWithProductDiscounts);
        builder.Property(x => x.CanCombineWithOrderDiscounts);
        builder.Property(x => x.CanCombineWithShippingDiscounts);

        // Priority
        builder.Property(x => x.Priority);

        // Audit
        builder.Property(x => x.DateCreated);
        builder.Property(x => x.DateUpdated);
        builder.Property(x => x.CreatedBy);

        // Navigation: One Discount -> Many TargetRules
        builder.HasMany(x => x.TargetRules)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation: One Discount -> Many EligibilityRules
        builder.HasMany(x => x.EligibilityRules)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation: One Discount -> Many Usages
        builder.HasMany(x => x.Usages)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation: One Discount -> One BuyXGetYConfig
        builder.HasOne(x => x.BuyXGetYConfig)
            .WithOne(x => x.Discount)
            .HasForeignKey<DiscountBuyXGetYConfig>(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation: One Discount -> One FreeShippingConfig
        builder.HasOne(x => x.FreeShippingConfig)
            .WithOne(x => x.Discount)
            .HasForeignKey<DiscountFreeShippingConfig>(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
