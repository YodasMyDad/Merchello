using Merchello.Core.ExchangeRates.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.ExchangeRates.Mapping;

public class ExchangeRateProviderSettingDbMapping : IEntityTypeConfiguration<ExchangeRateProviderSetting>
{
    public void Configure(EntityTypeBuilder<ExchangeRateProviderSetting> builder)
    {
        builder.ToTable("merchelloExchangeRateProviders");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProviderAlias)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.ConfigurationJson)
            .HasMaxLength(4000);

        builder.Property(x => x.LastRatesJson)
            .HasMaxLength(4000);

        builder.Property(x => x.CreateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.UpdateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.LastFetchedAt)
            .HasConversion(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.HasIndex(x => x.ProviderAlias)
            .IsUnique();

        builder.HasIndex(x => x.IsActive);
    }
}

