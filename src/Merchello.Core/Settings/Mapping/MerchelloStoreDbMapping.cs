using Merchello.Core.Settings.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Settings.Mapping;

public class MerchelloStoreDbMapping : IEntityTypeConfiguration<MerchelloStore>
{
    public void Configure(EntityTypeBuilder<MerchelloStore> builder)
    {
        builder.ToTable("merchelloStores");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.StoreKey)
            .IsRequired()
            .HasMaxLength(64)
            .HasDefaultValue("default");

        builder.HasIndex(x => x.StoreKey).IsUnique();

        builder.Property(x => x.InvoiceNumberPrefix)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("INV-");

        builder.Property(x => x.DisplayPricesIncTax).HasDefaultValue(true);
        builder.Property(x => x.ShowStockLevels).HasDefaultValue(true);
        builder.Property(x => x.LowStockThreshold).HasDefaultValue(5);

        builder.Property(x => x.StoreName)
            .IsRequired()
            .HasMaxLength(200)
            .HasDefaultValue("Acme Store");

        builder.Property(x => x.StoreEmail).HasMaxLength(254);
        builder.Property(x => x.StorePhone).HasMaxLength(50);
        builder.Property(x => x.StoreWebsiteUrl).HasMaxLength(500);
        builder.Property(x => x.StoreAddress)
            .IsRequired()
            .HasMaxLength(2000)
            .HasDefaultValue("123 Commerce Street\nNew York, NY 10001\nUnited States");
        builder.Property(x => x.Ucp)
            .HasColumnName("UcpJson")
            .ToJsonConversion(null);

        builder.Property(x => x.InvoiceReminders)
            .HasColumnName("InvoiceRemindersJson")
            .ToJsonConversion(null);

        builder.Property(x => x.Policies)
            .HasColumnName("PoliciesJson")
            .ToJsonConversion(null);

        builder.Property(x => x.Checkout)
            .HasColumnName("CheckoutJson")
            .ToJsonConversion(null);

        builder.Property(x => x.AbandonedCheckout)
            .HasColumnName("AbandonedCheckoutJson")
            .ToJsonConversion(null);

        builder.Property(x => x.Email)
            .HasColumnName("EmailJson")
            .ToJsonConversion(null);

        builder.Property(x => x.DateCreatedUtc)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateUpdatedUtc)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
    }
}
