using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Payments.Mapping;

/// <summary>
/// EF Core mapping configuration for SavedPaymentMethod entity.
/// </summary>
public class SavedPaymentMethodDbMapping : IEntityTypeConfiguration<SavedPaymentMethod>
{
    public void Configure(EntityTypeBuilder<SavedPaymentMethod> builder)
    {
        builder.ToTable("merchelloSavedPaymentMethods");

        builder.HasKey(x => x.Id);

        // =====================================================
        // Customer relationship with cascade delete
        // =====================================================

        builder.HasOne(x => x.Customer)
            .WithMany(c => c.SavedPaymentMethods)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.CustomerId);

        // =====================================================
        // Unique constraint: one provider method per customer
        // =====================================================

        builder.HasIndex(x => new { x.CustomerId, x.ProviderAlias, x.ProviderMethodId })
            .IsUnique();

        // =====================================================
        // Provider identifiers
        // =====================================================

        builder.Property(x => x.ProviderAlias)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.ProviderMethodId)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(x => x.ProviderCustomerId)
            .HasMaxLength(255);

        // =====================================================
        // Display metadata
        // =====================================================

        builder.Property(x => x.MethodType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(x => x.CardBrand)
            .HasMaxLength(50);

        builder.Property(x => x.Last4)
            .HasMaxLength(4);

        builder.Property(x => x.BillingName)
            .HasMaxLength(200);

        builder.Property(x => x.BillingEmail)
            .HasMaxLength(254);

        builder.Property(x => x.DisplayLabel)
            .IsRequired()
            .HasMaxLength(200);

        // =====================================================
        // Consent tracking
        // =====================================================

        builder.Property(x => x.ConsentIpAddress)
            .HasMaxLength(45); // IPv6 max length

        // =====================================================
        // Timestamps - convert to UTC on read
        // =====================================================

        builder.Property(x => x.DateCreated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateUpdated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateLastUsed)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.ConsentDateUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        // =====================================================
        // JSON column for extended data
        // =====================================================

        builder.Property(x => x.ExtendedData)
            .ToJsonConversion(null);
    }
}
