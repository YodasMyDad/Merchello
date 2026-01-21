using Merchello.Core.Fulfilment.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Fulfilment.Mapping;

public class FulfilmentSyncLogDbMapping : IEntityTypeConfiguration<FulfilmentSyncLog>
{
    public void Configure(EntityTypeBuilder<FulfilmentSyncLog> builder)
    {
        builder.ToTable("merchelloFulfilmentSyncLogs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.ProviderConfigurationId).IsRequired();
        builder.Property(x => x.SyncType).IsRequired();
        builder.Property(x => x.Status).HasDefaultValue(FulfilmentSyncStatus.Pending);
        builder.Property(x => x.ItemsProcessed).HasDefaultValue(0);
        builder.Property(x => x.ItemsSucceeded).HasDefaultValue(0);
        builder.Property(x => x.ItemsFailed).HasDefaultValue(0);
        builder.Property(x => x.ErrorMessage);
        builder.Property(x => x.StartedAt).IsRequired(false);
        builder.Property(x => x.CompletedAt).IsRequired(false);

        builder.HasOne(x => x.ProviderConfiguration)
            .WithMany()
            .HasForeignKey(x => x.ProviderConfigurationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.ProviderConfigurationId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.StartedAt);
    }
}
