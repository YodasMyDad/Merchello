using Merchello.Core.Returns.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Returns.Mapping;

public class ReturnReasonDbMapping : IEntityTypeConfiguration<ReturnReason>
{
    public void Configure(EntityTypeBuilder<ReturnReason> builder)
    {
        builder.ToTable("merchelloReturnReasons");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
    }
}
