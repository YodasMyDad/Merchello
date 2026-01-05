using System.Text.Json;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Models.Enums;
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
            .HasConversion<int>()
            .HasDefaultValue(WebhookAuthType.HmacSha256);

        builder.Property(x => x.AuthHeaderName)
            .HasMaxLength(100);

        builder.Property(x => x.AuthHeaderValue)
            .HasMaxLength(1000);

        builder.Property(x => x.Format)
            .HasConversion<int>()
            .HasDefaultValue(WebhookFormat.Json);

        builder.Property(x => x.ApiVersion)
            .HasMaxLength(20);

        builder.Property(x => x.FilterExpression)
            .HasMaxLength(2000);

        builder.Property(x => x.Headers)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>())
            .HasMaxLength(4000);

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

        builder.Property(x => x.ExtendedData)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, object>())
            .HasMaxLength(4000);

        builder.HasMany(x => x.Deliveries)
            .WithOne(x => x.Subscription)
            .HasForeignKey(x => x.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Topic);
        builder.HasIndex(x => x.IsActive);
        builder.HasIndex(x => new { x.Topic, x.IsActive });
    }
}
