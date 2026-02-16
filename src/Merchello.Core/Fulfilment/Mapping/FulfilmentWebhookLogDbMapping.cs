using Merchello.Core.Fulfilment.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Fulfilment.Mapping;

public class FulfilmentWebhookLogDbMapping : IEntityTypeConfiguration<FulfilmentWebhookLog>
{
    public void Configure(EntityTypeBuilder<FulfilmentWebhookLog> builder)
    {
        builder.ToTable("merchelloFulfilmentWebhookLogs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.ProviderConfigurationId).IsRequired();
        builder.Property(x => x.MessageId).IsRequired().HasMaxLength(256);
        builder.Property(x => x.EventType).HasMaxLength(100);
        builder.Property(x => x.Payload);
        builder.Property(x => x.ProcessedAt).HasConversion(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        builder.Property(x => x.ExpiresAt).HasConversion(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.HasOne(x => x.ProviderConfiguration)
            .WithMany()
            .HasForeignKey(x => x.ProviderConfigurationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Composite index for deduplication (unique per provider)
        builder.HasIndex(x => new { x.ProviderConfigurationId, x.MessageId }).IsUnique();
        builder.HasIndex(x => x.ExpiresAt);
    }
}
