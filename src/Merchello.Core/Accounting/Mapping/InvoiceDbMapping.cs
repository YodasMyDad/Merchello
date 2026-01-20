using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class InvoiceDbMapping : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("merchelloInvoices");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // Invoice number and channel
        builder.Property(x => x.InvoiceNumber).HasMaxLength(50);
        builder.Property(x => x.Channel).HasMaxLength(100);
        builder.Property(x => x.PurchaseOrder).HasMaxLength(100);

        builder.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3);
        builder.Property(x => x.CurrencySymbol).IsRequired().HasMaxLength(10);
        builder.Property(x => x.StoreCurrencyCode).IsRequired().HasMaxLength(3);

        builder.Property(x => x.PricingExchangeRate).HasPrecision(18, 8);
        builder.Property(x => x.PricingExchangeRateSource).HasMaxLength(50);
        builder.Property(x => x.PricingExchangeRateTimestampUtc);

        // Billing address (owned entity with column prefix)
        builder.OwnsOne(x => x.BillingAddress, addr =>
        {
            addr.Property(a => a.Name).HasColumnName("BillingName").HasMaxLength(200);
            addr.Property(a => a.Company).HasColumnName("BillingCompany").HasMaxLength(200);
            addr.Property(a => a.AddressOne).HasColumnName("BillingAddressOne").HasMaxLength(500);
            addr.Property(a => a.AddressTwo).HasColumnName("BillingAddressTwo").HasMaxLength(500);
            addr.Property(a => a.TownCity).HasColumnName("BillingTownCity").HasMaxLength(200);
            addr.Property(a => a.PostalCode).HasColumnName("BillingPostalCode").HasMaxLength(20);
            addr.Property(a => a.Country).HasColumnName("BillingCountry").HasMaxLength(100);
            addr.Property(a => a.CountryCode).HasColumnName("BillingCountryCode").HasMaxLength(10);
            addr.Property(a => a.Email).HasColumnName("BillingEmail").HasMaxLength(254);
            addr.Property(a => a.Phone).HasColumnName("BillingPhone").HasMaxLength(50);
            addr.OwnsOne(a => a.CountyState, cs =>
            {
                cs.Property(c => c.Name).HasColumnName("BillingCountyStateName").HasMaxLength(200);
                cs.Property(c => c.RegionCode).HasColumnName("BillingCountyStateCode").HasMaxLength(10);
            });
        });

        // Shipping address (owned entity with column prefix)
        builder.OwnsOne(x => x.ShippingAddress, addr =>
        {
            addr.Property(a => a.Name).HasColumnName("ShippingName").HasMaxLength(200);
            addr.Property(a => a.Company).HasColumnName("ShippingCompany").HasMaxLength(200);
            addr.Property(a => a.AddressOne).HasColumnName("ShippingAddressOne").HasMaxLength(500);
            addr.Property(a => a.AddressTwo).HasColumnName("ShippingAddressTwo").HasMaxLength(500);
            addr.Property(a => a.TownCity).HasColumnName("ShippingTownCity").HasMaxLength(200);
            addr.Property(a => a.PostalCode).HasColumnName("ShippingPostalCode").HasMaxLength(20);
            addr.Property(a => a.Country).HasColumnName("ShippingCountry").HasMaxLength(100);
            addr.Property(a => a.CountryCode).HasColumnName("ShippingCountryCode").HasMaxLength(10);
            addr.Property(a => a.Email).HasColumnName("ShippingEmail").HasMaxLength(254);
            addr.Property(a => a.Phone).HasColumnName("ShippingPhone").HasMaxLength(50);
            addr.OwnsOne(a => a.CountyState, cs =>
            {
                cs.Property(c => c.Name).HasColumnName("ShippingCountyStateName").HasMaxLength(200);
                cs.Property(c => c.RegionCode).HasColumnName("ShippingCountyStateCode").HasMaxLength(10);
            });
        });

        // JSON conversions
        builder.Property(x => x.Notes).ToJsonConversion(3000);
        builder.Property(x => x.ExtendedData).ToJsonConversion(3000);
        builder.Property(x => x.Source).ToNullableJsonConversion(1000);

        // Decimal precision
        builder.Property(x => x.AdjustedSubTotal).HasPrecision(18, 4);
        builder.Property(x => x.Discount).HasPrecision(18, 4);
        builder.Property(x => x.SubTotal).HasPrecision(18, 4);
        builder.Property(x => x.Tax).HasPrecision(18, 4);
        builder.Property(x => x.Total).HasPrecision(18, 4);

        builder.Property(x => x.SubTotalInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.DiscountInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.TaxInStoreCurrency).HasPrecision(18, 4);
        builder.Property(x => x.TotalInStoreCurrency).HasPrecision(18, 4);

        // Soft delete
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DateDeleted).IsRequired(false);

        // Cancellation
        builder.Property(x => x.IsCancelled).HasDefaultValue(false);
        builder.Property(x => x.DateCancelled).IsRequired(false);
        builder.Property(x => x.CancellationReason).HasMaxLength(1000);
        builder.Property(x => x.CancelledBy).HasMaxLength(200);

        // Payment due date for account customers
        builder.Property(x => x.DueDate).IsRequired(false);
        builder.HasIndex(x => x.DueDate).HasFilter("[DueDate] IS NOT NULL");

        // Indexes for efficient filtering
        builder.HasIndex(x => x.IsDeleted);
        builder.HasIndex(x => x.IsCancelled);
        builder.HasIndex(x => x.CurrencyCode);
        builder.HasIndex(x => x.DateCreated);
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => x.Channel);

        // Composite index for time-series analytics queries
        builder.HasIndex(x => new { x.IsDeleted, x.DateCreated });
    }
}
