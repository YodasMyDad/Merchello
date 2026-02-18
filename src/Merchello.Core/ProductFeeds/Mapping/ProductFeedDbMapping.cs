using Merchello.Core.ProductFeeds.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.ProductFeeds.Mapping;

public class ProductFeedDbMapping : IEntityTypeConfiguration<ProductFeed>
{
    public void Configure(EntityTypeBuilder<ProductFeed> builder)
    {
        builder.ToTable("merchelloProductFeeds");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Slug).IsRequired().HasMaxLength(200);
        builder.Property(x => x.CountryCode).IsRequired().HasMaxLength(2);
        builder.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3);
        builder.Property(x => x.LanguageCode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.IncludeTaxInPrice);

        builder.Property(x => x.FilterConfigJson);
        builder.Property(x => x.CustomLabelsJson);
        builder.Property(x => x.CustomFieldsJson);
        builder.Property(x => x.ManualPromotionsJson);

        builder.Property(x => x.LastSuccessfulProductFeedXml);
        builder.Property(x => x.LastSuccessfulPromotionsFeedXml);
        builder.Property(x => x.LastGenerationError).HasMaxLength(4000);

        builder.Property(x => x.DateCreated).IsRequired();
        builder.Property(x => x.DateUpdated).IsRequired();

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => x.IsEnabled);
    }
}
