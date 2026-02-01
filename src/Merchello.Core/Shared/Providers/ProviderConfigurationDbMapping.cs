using Merchello.Core.AddressLookup.Models;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Tax.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Shared.Providers;

public class ProviderConfigurationDbMapping : IEntityTypeConfiguration<ProviderConfiguration>
{
    public void Configure(EntityTypeBuilder<ProviderConfiguration> builder)
    {
        builder.ToTable("merchelloProviderConfigurations");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.ProviderKey).IsRequired();
        builder.Property(x => x.DisplayName);
        builder.Property(x => x.IsEnabled);
        builder.Property(x => x.SortOrder);
        builder.Property(x => x.SettingsJson);
        builder.Property(x => x.CreateDate);
        builder.Property(x => x.UpdateDate);

        builder.HasDiscriminator<string>("ProviderType")
            .HasValue<ShippingProviderConfiguration>(ProviderConfigurationTypes.Shipping)
            .HasValue<PaymentProviderSetting>(ProviderConfigurationTypes.Payment)
            .HasValue<FulfilmentProviderConfiguration>(ProviderConfigurationTypes.Fulfilment)
            .HasValue<TaxProviderSetting>(ProviderConfigurationTypes.Tax)
            .HasValue<ExchangeRateProviderSetting>(ProviderConfigurationTypes.ExchangeRate)
            .HasValue<AddressLookupProviderSetting>(ProviderConfigurationTypes.AddressLookup);
    }
}
