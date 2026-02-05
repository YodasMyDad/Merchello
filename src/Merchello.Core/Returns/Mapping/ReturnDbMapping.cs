using Merchello.Core.Returns.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Returns.Mapping;

public class ReturnDbMapping : IEntityTypeConfiguration<Return>
{
    public void Configure(EntityTypeBuilder<Return> builder)
    {
        builder.ToTable("merchelloReturns");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // RMA tracking
        builder.Property(x => x.RmaNumber).IsRequired().HasMaxLength(50);

        // Notes
        builder.Property(x => x.CustomerNotes).HasMaxLength(2000);
        builder.Property(x => x.StaffNotes).HasMaxLength(2000);

        // Processing
        builder.Property(x => x.ApprovedBy).HasMaxLength(255);
        builder.Property(x => x.RejectionReason).HasMaxLength(1000);
        builder.Property(x => x.TrackingNumber).HasMaxLength(200);
        builder.Property(x => x.Carrier).HasMaxLength(200);

        // Financial
        builder.Property(x => x.RefundAmount).HasPrecision(18, 4);
        builder.Property(x => x.RestockingFee).HasPrecision(18, 4);
        builder.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3);
        builder.Property(x => x.RefundAmountInStoreCurrency).HasPrecision(18, 4);

        // Extended data
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // Relationships
        builder.HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Order)
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RefundPayment)
            .WithMany()
            .HasForeignKey(x => x.RefundPaymentId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(x => x.RmaNumber).IsUnique();
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.InvoiceId);
    }
}
