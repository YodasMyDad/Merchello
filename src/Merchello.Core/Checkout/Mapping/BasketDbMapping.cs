using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Checkout.Mapping;

public class BasketDbMapping : IEntityTypeConfiguration<Basket>
{
    public void Configure(EntityTypeBuilder<Basket> builder)
    {
        builder.ToTable("merchelloBaskets");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.LineItems).ToJsonConversion(3000);
        builder.Property(x => x.BillingAddress).ToJsonConversion(500);
        builder.Property(x => x.ShippingAddress).ToJsonConversion(500);
        builder.Property(x => x.Currency).HasMaxLength(10);
        builder.Property(x => x.CurrencySymbol).HasMaxLength(3);
        builder.Property(x => x.AdjustedSubTotal).HasPrecision(18, 4);
        builder.Property(x => x.Discount).HasPrecision(18, 4);
        builder.Property(x => x.SubTotal).HasPrecision(18, 4);
        builder.Property(x => x.Tax).HasPrecision(18, 4);
        builder.Property(x => x.Total).HasPrecision(18, 4);
        builder.Property(x => x.Shipping).HasPrecision(18, 4);
        builder.Property(x => x.DateCreated).IsRequired();
        builder.Property(x => x.DateUpdated).IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasMaxLength(36).IsConcurrencyToken();

        builder.Ignore(x => x.Errors);
        builder.Ignore(x => x.AvailableShippingQuotes);
        builder.Ignore(x => x.EffectiveShippingTaxRate);
    }
}
