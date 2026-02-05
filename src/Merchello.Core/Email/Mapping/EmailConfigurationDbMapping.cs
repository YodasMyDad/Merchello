using Merchello.Core.Email.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Email.Mapping;

public class EmailConfigurationDbMapping : IEntityTypeConfiguration<EmailConfiguration>
{
    public void Configure(EntityTypeBuilder<EmailConfiguration> builder)
    {
        builder.ToTable("merchelloEmailConfigurations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Topic)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.TemplatePath)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.ToExpression)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(x => x.CcExpression)
            .HasMaxLength(1000);

        builder.Property(x => x.BccExpression)
            .HasMaxLength(1000);

        builder.Property(x => x.FromExpression)
            .HasMaxLength(500);

        builder.Property(x => x.SubjectExpression)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Description)
            .HasMaxLength(2000);

        builder.Property(x => x.DateCreated)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.DateModified)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        builder.Property(x => x.LastSentUtc)
            .HasConversion(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null);

        builder.Property(x => x.ExtendedData).ToJsonConversion(null);

        builder.Property(x => x.AttachmentAliases).ToJsonConversion(2000);

        builder.HasIndex(x => x.Topic);
        builder.HasIndex(x => x.Enabled);
        builder.HasIndex(x => new { x.Topic, x.Enabled });
    }
}
