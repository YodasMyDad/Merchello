using Merchello.Core.Upsells.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Upsells.Mapping;

/// <summary>
/// EF Core mapping configuration for the UpsellRule entity.
/// </summary>
public class UpsellRuleDbMapping : IEntityTypeConfiguration<UpsellRule>
{
    public void Configure(EntityTypeBuilder<UpsellRule> builder)
    {
        builder.ToTable("merchelloUpsellRules");
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
        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_merchelloUpsellRules_Status");

        // Customer-Facing Display
        builder.Property(x => x.Heading)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Message)
            .HasMaxLength(2000);

        // Configuration
        builder.Property(x => x.Priority);
        builder.Property(x => x.MaxProducts);
        builder.Property(x => x.SortBy).IsRequired();
        builder.Property(x => x.SuppressIfInCart);
        builder.Property(x => x.DisplayLocation).IsRequired();
        builder.Property(x => x.CheckoutMode).IsRequired();

        // Scheduling
        builder.Property(x => x.StartsAt).IsRequired();
        builder.Property(x => x.EndsAt);
        builder.HasIndex(x => new { x.StartsAt, x.EndsAt })
            .HasDatabaseName("IX_merchelloUpsellRules_StartsAt_EndsAt");

        builder.Property(x => x.Timezone)
            .HasMaxLength(100);

        // JSON Rule Columns
        builder.Property(x => x.TriggerRulesJson);
        builder.Property(x => x.RecommendationRulesJson);
        builder.Property(x => x.EligibilityRulesJson);

        // Audit
        builder.Property(x => x.DateCreated);
        builder.Property(x => x.DateUpdated);
        builder.Property(x => x.CreatedBy);

        // Ignore computed properties
        builder.Ignore(x => x.TriggerRules);
        builder.Ignore(x => x.RecommendationRules);
        builder.Ignore(x => x.EligibilityRules);
    }
}
