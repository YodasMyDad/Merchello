using Merchello.Core.ProductSync.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.ProductSync.Mapping;

public class ProductSyncRunDbMapping : IEntityTypeConfiguration<ProductSyncRun>
{
    public void Configure(EntityTypeBuilder<ProductSyncRun> builder)
    {
        builder.ToTable("merchelloProductSyncRuns");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Direction).IsRequired();
        builder.Property(x => x.Profile).IsRequired();
        builder.Property(x => x.Status).HasDefaultValue(ProductSyncRunStatus.Queued);

        builder.Property(x => x.RequestedByUserId).HasMaxLength(100);
        builder.Property(x => x.RequestedByUserName).HasMaxLength(256);

        builder.Property(x => x.InputFileName).HasMaxLength(500);
        builder.Property(x => x.InputFilePath).HasMaxLength(2000);
        builder.Property(x => x.OutputFileName).HasMaxLength(500);
        builder.Property(x => x.OutputFilePath).HasMaxLength(2000);
        builder.Property(x => x.OptionsJson);

        builder.Property(x => x.ItemsProcessed).HasDefaultValue(0);
        builder.Property(x => x.ItemsSucceeded).HasDefaultValue(0);
        builder.Property(x => x.ItemsFailed).HasDefaultValue(0);
        builder.Property(x => x.WarningCount).HasDefaultValue(0);
        builder.Property(x => x.ErrorCount).HasDefaultValue(0);

        builder.Property(x => x.StartedAtUtc).IsRequired(false);
        builder.Property(x => x.CompletedAtUtc).IsRequired(false);
        builder.Property(x => x.DateCreatedUtc).IsRequired();
        builder.Property(x => x.ErrorMessage);

        builder.HasMany(x => x.Issues)
            .WithOne(x => x.Run)
            .HasForeignKey(x => x.RunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Direction);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.DateCreatedUtc);
        builder.HasIndex(x => x.StartedAtUtc);
    }
}
