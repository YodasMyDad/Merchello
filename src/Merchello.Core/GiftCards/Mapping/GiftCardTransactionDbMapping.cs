using Merchello.Core.GiftCards.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.GiftCards.Mapping;

public class GiftCardTransactionDbMapping : IEntityTypeConfiguration<GiftCardTransaction>
{
    public void Configure(EntityTypeBuilder<GiftCardTransaction> builder)
    {
        builder.ToTable("merchelloGiftCardTransactions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Amount).HasPrecision(18, 4);
        builder.Property(x => x.BalanceAfter).HasPrecision(18, 4);

        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.TransactionReference).HasMaxLength(200);
        builder.Property(x => x.PerformedBy).HasMaxLength(255);

        // Relationship
        builder.HasOne(x => x.GiftCard)
            .WithMany(g => g.Transactions)
            .HasForeignKey(x => x.GiftCardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.GiftCardId);
    }
}
