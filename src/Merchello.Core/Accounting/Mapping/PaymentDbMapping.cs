using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class PaymentDbMapping : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("merchelloPayments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.PaymentMethod).HasMaxLength(350);
        builder.Property(x => x.TransactionId).HasMaxLength(350);
        builder.Property(x => x.FraudResponse).HasMaxLength(500);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.Amount).HasPrecision(18, 2);

        // New fields for payment provider support
        builder.Property(x => x.PaymentProviderAlias).HasMaxLength(100);
        builder.Property(x => x.PaymentType).HasDefaultValue(PaymentType.Payment);
        builder.Property(x => x.RefundReason).HasMaxLength(1000);

        // Invoice relationship
        builder.HasOne(d => d.Invoice)
            .WithMany(p => p.Payments)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Self-referential relationship for refunds
        builder.HasOne(x => x.ParentPayment)
            .WithMany(x => x.Refunds)
            .HasForeignKey(x => x.ParentPaymentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Index for efficient payment status calculations in invoice queries
        builder.HasIndex(x => new { x.InvoiceId, x.PaymentSuccess });
    }
}
