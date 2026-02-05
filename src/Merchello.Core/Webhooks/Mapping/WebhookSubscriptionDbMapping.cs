using Merchello.Core.Shared.Extensions;
using Merchello.Core.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Webhooks.Mapping;

public class WebhookSubscriptionDbMapping : IEntityTypeConfiguration<WebhookSubscription>
{
    public void Configure(EntityTypeBuilder<WebhookSubscription> builder)
    {
        builder.ToTable("merchelloWebhookSubscriptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Topic)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.TargetUrl)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.Secret)
            .HasMaxLength(500);

        builder.Property(x => x.AuthType)
            .HasConversion<int>();

        builder.Property(x => x.AuthHeaderName)
            .HasMaxLength(100);

        builder.Property(x => x.AuthHeaderValue)
            .HasMaxLength(1000);

        builder.Property(x => x.Format)
            .HasConversion<int>();

        builder.Property(x => x.ApiVersion)
            .HasMaxLength(20);

        builder.Property(x => x.FilterExpression)
            .HasMaxLength(2000);

        builder.Property(x => x.Headers).ToJsonConversion(4000);

        builder.Property(x => x.LastErrorMessage)
            .HasMaxLength(2000);

        builder.Property(x => x.DateCreated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateUpdated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.LastTriggeredUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.LastSuccessUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.LastFailureUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        // OutboundDelivery is shared by webhook + email deliveries. Do not enforce a FK on
        // ConfigurationId so email deliveries can point at EmailConfiguration IDs.
        builder.Ignore(x => x.Deliveries);

        builder.HasIndex(x => x.Topic);
        builder.HasIndex(x => x.IsActive);
        builder.HasIndex(x => new { x.Topic, x.IsActive });
    }
}
