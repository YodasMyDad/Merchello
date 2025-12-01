using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Accounting.Mapping;

public class InvoiceDbMapping : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
            builder.ToTable("MerchInvoices");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).IsRequired();
            builder.Property(x => x.Adjustments).ToJsonConversion(3000);
            builder.Property(x => x.Notes).ToJsonConversion(3000);
            builder.Property(x => x.AdjustedSubTotal).HasPrecision(18, 2);
            builder.Property(x => x.Discount).HasPrecision(18, 2);
            builder.Property(x => x.SubTotal).HasPrecision(18, 2);
            builder.Property(x => x.Tax).HasPrecision(18, 2);
            builder.Property(x => x.Total).HasPrecision(18, 2);
    }
}
