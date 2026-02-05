using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Checkout.Mapping;

public class AbandonedCheckoutDbMapping : IEntityTypeConfiguration<AbandonedCheckout>
{
    public void Configure(EntityTypeBuilder<AbandonedCheckout> builder)
    {
        builder.ToTable("merchelloAbandonedCheckouts");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Email).HasMaxLength(254);
        builder.Property(x => x.RecoveryToken).HasMaxLength(64);
        builder.Property(x => x.CurrencyCode).HasMaxLength(10);
        builder.Property(x => x.CurrencySymbol).HasMaxLength(5);
        builder.Property(x => x.CustomerName).HasMaxLength(256);
        builder.Property(x => x.BasketTotal).HasPrecision(18, 4);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // Indexes for common query patterns
        builder.HasIndex(x => x.BasketId);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Email);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.DateAbandoned);
        builder.HasIndex(x => x.LastActivityUtc);

        // Unique index on RecoveryToken (filtered to non-null values)
        builder.HasIndex(x => x.RecoveryToken)
            .IsUnique()
            .HasFilter("[RecoveryToken] IS NOT NULL");

        // Navigation to Basket (optional - basket may be deleted after conversion)
        builder.HasOne(x => x.Basket)
            .WithMany()
            .HasForeignKey(x => x.BasketId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
