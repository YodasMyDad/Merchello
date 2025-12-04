using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shipping.Mapping;

public class ShippingProviderConfigurationDbMapping : IEntityTypeConfiguration<ShippingProviderConfiguration>
{
    public void Configure(EntityTypeBuilder<ShippingProviderConfiguration> builder)
    {
        builder.ToTable("merchelloShippingProviderConfigurations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProviderKey)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.DisplayName)
            .HasMaxLength(256);

        builder.Property(x => x.SettingsJson)
            .HasMaxLength(4000);

        builder.Property(x => x.SortOrder)
            .HasDefaultValue(0);

        builder.Property(x => x.CreateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.UpdateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.HasIndex(x => x.ProviderKey).IsUnique();
    }
}
