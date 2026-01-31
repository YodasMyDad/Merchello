using Merchello.Core.Subscriptions.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Subscriptions.Mapping;

public class SubscriptionInvoiceDbMapping : IEntityTypeConfiguration<SubscriptionInvoice>
{
    public void Configure(EntityTypeBuilder<SubscriptionInvoice> builder)
    {
        builder.ToTable("merchelloSubscriptionInvoices");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.ProviderInvoiceId).HasMaxLength(200);

        // Relationships
        builder.HasOne(x => x.Subscription)
            .WithMany(s => s.SubscriptionInvoices)
            .HasForeignKey(x => x.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SubscriptionId);
    }
}
