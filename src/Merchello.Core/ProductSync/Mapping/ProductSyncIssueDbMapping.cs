using Merchello.Core.ProductSync.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.ProductSync.Mapping;

public class ProductSyncIssueDbMapping : IEntityTypeConfiguration<ProductSyncIssue>
{
    public void Configure(EntityTypeBuilder<ProductSyncIssue> builder)
    {
        builder.ToTable("merchelloProductSyncIssues");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.RunId).IsRequired();
        builder.Property(x => x.Severity).IsRequired();
        builder.Property(x => x.Stage).IsRequired();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Message).IsRequired();
        builder.Property(x => x.RowNumber).IsRequired(false);
        builder.Property(x => x.Handle).HasMaxLength(500);
        builder.Property(x => x.Sku).HasMaxLength(200);
        builder.Property(x => x.Field).HasMaxLength(200);
        builder.Property(x => x.DateCreatedUtc).IsRequired();

        builder.HasIndex(x => x.RunId);
        builder.HasIndex(x => x.Severity);
        builder.HasIndex(x => x.Stage);
        builder.HasIndex(x => x.DateCreatedUtc);
    }
}
