using Merchello.Core.Protocols.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.Protocols.Webhooks.Mapping;

/// <summary>
/// EF Core mapping configuration for SigningKey entity.
/// </summary>
public class SigningKeyDbMapping : IEntityTypeConfiguration<SigningKey>
{
    public void Configure(EntityTypeBuilder<SigningKey> builder)
    {
        builder.ToTable("merchelloSigningKeys");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.KeyId)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.PrivateKeyPem)
            .IsRequired();

        builder.Property(x => x.PublicKeyX)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.PublicKeyY)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.Algorithm)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("ES256");

        builder.Property(x => x.CurveName)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("P-256");

        // Unique index on KeyId for fast lookup
        builder.HasIndex(x => x.KeyId)
            .IsUnique()
            .HasDatabaseName("IX_merchelloSigningKeys_KeyId");

        // Index on IsActive for finding the current key
        builder.HasIndex(x => x.IsActive)
            .HasDatabaseName("IX_merchelloSigningKeys_IsActive");

        // Index on ExpiredAt for cleanup queries
        builder.HasIndex(x => x.ExpiredAt)
            .HasDatabaseName("IX_merchelloSigningKeys_ExpiredAt");
    }
}
