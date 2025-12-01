using Merchello.Core.Accounting.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class PaymentDbMapping : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("MerchPayments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.PaymentMethod).HasMaxLength(350);
        builder.Property(x => x.TransactionId).HasMaxLength(350);
        builder.Property(x => x.FraudResponse).HasMaxLength(500);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.Amount).HasPrecision(18, 2);

        builder.HasOne(d => d.Invoice)
            .WithMany(p => p.Payments)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
