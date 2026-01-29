using Merchello.Core.Upsells.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Upsells.Mapping;

/// <summary>
/// EF Core mapping configuration for the UpsellEvent entity.
/// </summary>
public class UpsellEventDbMapping : IEntityTypeConfiguration<UpsellEvent>
{
    public void Configure(EntityTypeBuilder<UpsellEvent> builder)
    {
        builder.ToTable("merchelloUpsellEvents");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        // UpsellRule relationship
        builder.Property(x => x.UpsellRuleId).IsRequired();
        builder.HasOne(x => x.UpsellRule)
            .WithMany()
            .HasForeignKey(x => x.UpsellRuleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.UpsellRuleId)
            .HasDatabaseName("IX_merchelloUpsellEvents_UpsellRuleId");

        builder.HasIndex(x => new { x.UpsellRuleId, x.EventType })
            .HasDatabaseName("IX_merchelloUpsellEvents_UpsellRuleId_EventType");

        // Event data
        builder.Property(x => x.EventType).IsRequired();
        builder.Property(x => x.ProductId);
        builder.Property(x => x.BasketId);
        builder.Property(x => x.CustomerId);
        builder.Property(x => x.InvoiceId);

        builder.Property(x => x.Amount)
            .HasPrecision(18, 4);

        builder.Property(x => x.DisplayLocation).IsRequired();

        builder.Property(x => x.DateCreated).IsRequired();
        builder.HasIndex(x => x.DateCreated)
            .HasDatabaseName("IX_merchelloUpsellEvents_DateCreated");
    }
}
