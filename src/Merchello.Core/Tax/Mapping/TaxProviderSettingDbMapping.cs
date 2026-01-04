using Merchello.Core.Tax.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Tax.Mapping;

public class TaxProviderSettingDbMapping : IEntityTypeConfiguration<TaxProviderSetting>
{
    public void Configure(EntityTypeBuilder<TaxProviderSetting> builder)
    {
        builder.ToTable("merchelloTaxProviders");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ProviderAlias)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.ConfigurationJson)
            .HasMaxLength(4000);

        builder.Property(x => x.CreateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.UpdateDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.HasIndex(x => x.ProviderAlias)
            .IsUnique();

        builder.HasIndex(x => x.IsActive);
    }
}
