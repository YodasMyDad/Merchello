using Merchello.Core.Customers.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Customers.Mapping;

public class CustomerAddressDbMapping : IEntityTypeConfiguration<CustomerAddress>
{
    public void Configure(EntityTypeBuilder<CustomerAddress> builder)
    {
        builder.ToTable("merchelloCustomerAddresses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();

        builder.Property(x => x.Label).HasMaxLength(100);
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.Property(x => x.Company).HasMaxLength(200);
        builder.Property(x => x.AddressOne).HasMaxLength(500);
        builder.Property(x => x.AddressTwo).HasMaxLength(500);
        builder.Property(x => x.TownCity).HasMaxLength(200);
        builder.Property(x => x.CountyState).HasMaxLength(200);
        builder.Property(x => x.CountyStateCode).HasMaxLength(20);
        builder.Property(x => x.PostalCode).HasMaxLength(20);
        builder.Property(x => x.Country).HasMaxLength(100);
        builder.Property(x => x.CountryCode).HasMaxLength(10);
        builder.Property(x => x.Phone).HasMaxLength(50);

        builder.HasIndex(x => x.CustomerId);

        builder.HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
