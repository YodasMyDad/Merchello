using Merchello.Core.Payments.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Payments.Mapping;

/// <summary>
/// EF Core mapping configuration for PaymentMethodSetting entity.
/// </summary>
public class PaymentMethodSettingDbMapping : IEntityTypeConfiguration<PaymentMethodSetting>
{
    public void Configure(EntityTypeBuilder<PaymentMethodSetting> builder)
    {
        builder.ToTable("merchelloPaymentMethods");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.MethodAlias)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.DisplayNameOverride)
            .HasMaxLength(250);

        builder.Property(x => x.DateCreated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateUpdated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        // Foreign key relationship to PaymentProviderSetting
        builder.HasOne(x => x.ProviderSetting)
            .WithMany(x => x.MethodSettings)
            .HasForeignKey(x => x.PaymentProviderSettingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique index on provider + method alias combination
        builder.HasIndex(x => new { x.PaymentProviderSettingId, x.MethodAlias })
            .IsUnique();
    }
}
