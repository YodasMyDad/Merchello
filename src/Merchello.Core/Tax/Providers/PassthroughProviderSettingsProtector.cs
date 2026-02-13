using Merchello.Core.Tax.Providers.Interfaces;

namespace Merchello.Core.Tax.Providers;

/// <summary>
/// Fallback no-op protector used when host apps do not register a secure implementation.
/// </summary>
public class PassthroughProviderSettingsProtector : IProviderSettingsProtector
{
    public string Protect(string plaintext) => plaintext;

    public string Unprotect(string protectedPayload) => protectedPayload;

    public bool IsProtected(string payload) => false;
}
