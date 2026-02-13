namespace Merchello.Core.Tax.Providers.Interfaces;

/// <summary>
/// Encrypts and decrypts provider settings payloads.
/// </summary>
public interface IProviderSettingsProtector
{
    string Protect(string plaintext);

    string Unprotect(string protectedPayload);

    bool IsProtected(string payload);
}
