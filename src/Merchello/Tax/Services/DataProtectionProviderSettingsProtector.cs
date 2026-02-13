using Merchello.Core.Tax.Providers.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace Merchello.Tax.Services;

/// <summary>
/// Data Protection-backed provider settings protector for tax provider configuration payloads.
/// </summary>
public class DataProtectionProviderSettingsProtector(IDataProtectionProvider dataProtectionProvider)
    : IProviderSettingsProtector
{
    private const string Prefix = "dp::v1::";
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector(
        "Merchello",
        "TaxProviders",
        "SettingsJson");

    public string Protect(string plaintext)
    {
        if (string.IsNullOrWhiteSpace(plaintext))
        {
            return plaintext;
        }

        if (IsProtected(plaintext))
        {
            return plaintext;
        }

        return Prefix + _protector.Protect(plaintext);
    }

    public string Unprotect(string protectedPayload)
    {
        if (string.IsNullOrWhiteSpace(protectedPayload))
        {
            return protectedPayload;
        }

        if (!IsProtected(protectedPayload))
        {
            return protectedPayload;
        }

        var cipherText = protectedPayload[Prefix.Length..];
        return _protector.Unprotect(cipherText);
    }

    public bool IsProtected(string payload)
    {
        return !string.IsNullOrWhiteSpace(payload) && payload.StartsWith(Prefix, StringComparison.Ordinal);
    }
}
