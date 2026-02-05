using Merchello.Core.Shared.Extensions;
using Merchello.Core.Subscriptions.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Subscriptions.Mapping;

public class SubscriptionDbMapping : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.ToTable("merchelloSubscriptions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Plan
        builder.Property(x => x.PlanName).IsRequired().HasMaxLength(200);

        // Provider tracking
        builder.Property(x => x.PaymentProviderAlias).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ProviderSubscriptionId).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ProviderCustomerId).HasMaxLength(200);
        builder.Property(x => x.ProviderPlanId).HasMaxLength(200);

        // Pricing
        builder.Property(x => x.Amount).HasPrecision(18, 4);
        builder.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3);
        builder.Property(x => x.AmountInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.Quantity).HasDefaultValue(1);

        // Cancellation
        builder.Property(x => x.CancellationReason).HasMaxLength(1000);

        // Extended data
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // Relationships
        builder.HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.PaymentProviderAlias);
        builder.HasIndex(x => x.NextBillingDate);
        builder.HasIndex(x => new { x.PaymentProviderAlias, x.ProviderSubscriptionId }).IsUnique();
    }
}
