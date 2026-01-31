using Merchello.Core.GiftCards.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.GiftCards.Mapping;

public class GiftCardDbMapping : IEntityTypeConfiguration<GiftCard>
{
    public void Configure(EntityTypeBuilder<GiftCard> builder)
    {
        builder.ToTable("merchelloGiftCards");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Card identification
        builder.Property(x => x.Code).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Pin).HasMaxLength(10);

        // Balance
        builder.Property(x => x.InitialBalance).HasPrecision(18, 4);
        builder.Property(x => x.CurrentBalance).HasPrecision(18, 4);
        builder.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3);

        // Recipient
        builder.Property(x => x.RecipientEmail).HasMaxLength(254);
        builder.Property(x => x.RecipientName).HasMaxLength(200);
        builder.Property(x => x.PersonalMessage).HasMaxLength(1000);

        // Physical card
        builder.Property(x => x.PhysicalCardNumber).HasMaxLength(50);
        builder.Property(x => x.BatchNumber).HasMaxLength(50);

        // Extended data
        builder.Property(x => x.ExtendedData).ToJsonConversion(3000);

        // Customer relationships (both optional, both to Customer)
        builder.HasOne(x => x.PurchasedByCustomer)
            .WithMany()
            .HasForeignKey(x => x.PurchasedByCustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.IssuedToCustomer)
            .WithMany()
            .HasForeignKey(x => x.IssuedToCustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.PurchasedByCustomerId);
        builder.HasIndex(x => x.IssuedToCustomerId);
    }
}
