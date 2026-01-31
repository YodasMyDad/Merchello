using Merchello.Core.Search.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Search.Mapping;

public class SearchProviderSettingDbMapping : IEntityTypeConfiguration<SearchProviderSetting>
{
    public void Configure(EntityTypeBuilder<SearchProviderSetting> builder)
    {
        builder.ToTable("merchelloSearchProviderSettings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.ProviderKey).IsRequired().HasMaxLength(100);
        builder.Property(x => x.SettingsJson);

        builder.HasIndex(x => x.ProviderKey).IsUnique();
    }
}
