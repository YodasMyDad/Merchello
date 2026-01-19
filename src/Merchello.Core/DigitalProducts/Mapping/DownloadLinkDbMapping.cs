using Merchello.Core.DigitalProducts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.DigitalProducts.Mapping;

/// <summary>
/// Entity Framework mapping configuration for DownloadLink.
/// </summary>
public class DownloadLinkDbMapping : IEntityTypeConfiguration<DownloadLink>
{
    public void Configure(EntityTypeBuilder<DownloadLink> builder)
    {
        builder.ToTable("merchelloDownloadLinks");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Token).HasMaxLength(200).IsRequired();
        builder.Property(x => x.MediaId).HasMaxLength(50).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(500);
        builder.Property(x => x.DateCreated).HasDefaultValueSql("GETUTCDATE()");

        // Indexes for efficient lookups
        builder.HasIndex(x => x.Token).IsUnique();
        builder.HasIndex(x => x.InvoiceId);
        builder.HasIndex(x => x.CustomerId);

        // Ignore computed/runtime properties
        builder.Ignore(x => x.IsValid);
        builder.Ignore(x => x.DownloadUrl);
    }
}
