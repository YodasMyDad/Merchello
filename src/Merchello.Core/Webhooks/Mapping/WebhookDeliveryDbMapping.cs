using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Webhooks.Mapping;

public class WebhookDeliveryDbMapping : IEntityTypeConfiguration<WebhookDelivery>
{
    public void Configure(EntityTypeBuilder<WebhookDelivery> builder)
    {
        builder.ToTable("merchelloWebhookDeliveries");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Topic)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.EntityType)
            .HasMaxLength(100);

        builder.Property(x => x.TargetUrl)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.RequestBody)
            .IsRequired();

        builder.Property(x => x.RequestHeaders)
            .HasMaxLength(4000);

        builder.Property(x => x.Status)
            .HasConversion<int>()
            .HasDefaultValue(WebhookDeliveryStatus.Pending);

        builder.Property(x => x.ResponseBody)
            .HasMaxLength(10000);

        builder.Property(x => x.ResponseHeaders)
            .HasMaxLength(4000);

        builder.Property(x => x.ErrorMessage)
            .HasMaxLength(2000);

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

        builder.HasIndex(x => x.SubscriptionId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.DateCreated);
        builder.HasIndex(x => x.NextRetryUtc);
        builder.HasIndex(x => new { x.Status, x.NextRetryUtc });
    }
}
