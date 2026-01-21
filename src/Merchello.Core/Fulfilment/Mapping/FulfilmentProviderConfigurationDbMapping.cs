using Merchello.Core.Fulfilment.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Fulfilment.Mapping;

public class FulfilmentProviderConfigurationDbMapping : IEntityTypeConfiguration<FulfilmentProviderConfiguration>
{
    public void Configure(EntityTypeBuilder<FulfilmentProviderConfiguration> builder)
    {
        builder.ToTable("merchelloFulfilmentProviderConfigurations");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.ProviderKey).IsRequired().HasMaxLength(256);
        builder.Property(x => x.DisplayName).HasMaxLength(256);
        builder.Property(x => x.IsEnabled).HasDefaultValue(false);
        builder.Property(x => x.InventorySyncMode).HasDefaultValue(InventorySyncMode.Full);
        builder.Property(x => x.SettingsJson).HasMaxLength(4000);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreateDate).HasConversion(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        builder.Property(x => x.UpdateDate).HasConversion(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.HasIndex(x => x.ProviderKey);
    }
}
