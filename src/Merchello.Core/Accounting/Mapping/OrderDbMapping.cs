using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class OrderDbMapping : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("merchelloOrders");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.HasOne(d => d.Invoice)
            .WithMany(p => p.Orders)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.WarehouseId).IsRequired();
        builder.Property(x => x.ShippingOptionId).IsRequired();
        builder.Property(x => x.ShippingProviderKey).HasMaxLength(100);
        builder.Property(x => x.ShippingServiceCode).HasMaxLength(100);
        builder.Property(x => x.ShippingServiceName).HasMaxLength(255);
        builder.Property(x => x.ShippingServiceCategory).IsRequired(false);
        builder.Property(x => x.ShippingCost).HasPrecision(18, 4);
        builder.Property(x => x.ShippingCostInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.QuotedShippingCost).HasPrecision(18, 4);
        builder.Property(x => x.QuotedAt).IsRequired(false);
        builder.Property(x => x.DeliveryDateSurcharge).HasPrecision(18, 4);
        builder.Property(x => x.DeliveryDateSurchargeInStoreCurrency).HasPrecision(18, 4);

        // Status fields
        builder.Property(x => x.Status).IsRequired().HasDefaultValue(OrderStatus.Pending);
        builder.Property(x => x.ProcessingStartedDate).IsRequired(false);
        builder.Property(x => x.ShippedDate).IsRequired(false);
        builder.Property(x => x.CompletedDate).IsRequired(false);
        builder.Property(x => x.CancelledDate).IsRequired(false);
        builder.Property(x => x.CancellationReason).HasMaxLength(1000);
        builder.Property(x => x.InternalNotes).HasMaxLength(2000);
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // Fulfilment provider fields
        builder.Property(x => x.FulfilmentProviderConfigurationId).IsRequired(false);
        builder.Property(x => x.FulfilmentProviderReference).HasMaxLength(255);
        builder.Property(x => x.FulfilmentSubmittedAt).IsRequired(false);
        builder.Property(x => x.FulfilmentErrorMessage);
        builder.Property(x => x.FulfilmentRetryCount).HasDefaultValue(0);

        builder.HasOne(x => x.FulfilmentProviderConfiguration)
            .WithMany()
            .HasForeignKey(x => x.FulfilmentProviderConfigurationId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes for fulfillment queries
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.WarehouseId);
        builder.HasIndex(x => x.FulfilmentProviderConfigurationId);
        builder.HasIndex(x => x.FulfilmentProviderReference);

        // Index for reporting queries on completed orders
        builder.HasIndex(x => x.CompletedDate);

        // Composite index for analytics queries on completed orders
        builder.HasIndex(x => new { x.Status, x.CompletedDate });
    }
}
