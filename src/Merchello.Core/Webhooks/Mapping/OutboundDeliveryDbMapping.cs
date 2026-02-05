using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Webhooks.Mapping;

public class OutboundDeliveryDbMapping : IEntityTypeConfiguration<OutboundDelivery>
{
    public void Configure(EntityTypeBuilder<OutboundDelivery> builder)
    {
        // Rename table from merchelloWebhookDeliveries to merchelloOutboundDeliveries
        builder.ToTable("merchelloOutboundDeliveries");

        builder.HasKey(x => x.Id);

        // New field for delivery type
        builder.Property(x => x.DeliveryType)
            .HasConversion<int>()
            .HasDefaultValue(OutboundDeliveryType.Webhook);

        // Renamed from SubscriptionId to ConfigurationId
        builder.Property(x => x.ConfigurationId)
            .IsRequired();

        builder.Property(x => x.Topic)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.EntityType)
            .HasMaxLength(100);

        // Webhook-specific fields (nullable)
        builder.Property(x => x.TargetUrl)
            .HasMaxLength(2000);

        builder.Property(x => x.RequestBody);

        builder.Property(x => x.RequestHeaders)
            .HasMaxLength(4000);

        builder.Property(x => x.Status)
            .HasConversion<int>()
            .HasDefaultValue(OutboundDeliveryStatus.Pending);

        builder.Property(x => x.ResponseStatusCode);

        builder.Property(x => x.ResponseBody)
            .HasMaxLength(10000);

        builder.Property(x => x.ResponseHeaders)
            .HasMaxLength(4000);

        builder.Property(x => x.ErrorMessage)
            .HasMaxLength(2000);

        // Timestamps
        builder.Property(x => x.DateCreated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateSent)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.DateCompleted)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.NextRetryUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        // Email-specific fields (nullable)
        builder.Property(x => x.EmailRecipients)
            .HasMaxLength(2000);

        builder.Property(x => x.EmailSubject)
            .HasMaxLength(500);

        builder.Property(x => x.EmailFrom)
            .HasMaxLength(500);

        builder.Property(x => x.EmailBody);

        // Extended data
        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // OutboundDelivery now supports both webhook and email deliveries. The shared ConfigurationId
        // is not a reliable FK to WebhookSubscription for email rows, so ignore the navigation to
        // avoid enforcing a FK constraint that blocks email inserts.
        builder.Ignore(x => x.Subscription);

        // Indexes
        builder.HasIndex(x => x.DeliveryType);
        builder.HasIndex(x => x.ConfigurationId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.DateCreated);
        builder.HasIndex(x => x.NextRetryUtc);
        builder.HasIndex(x => new { x.Status, x.NextRetryUtc });
        builder.HasIndex(x => new { x.DeliveryType, x.Status });
    }
}
