using Xunit;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Opt-in fact for live Avalara tests. Skips unless required environment variables are present.
/// </summary>
public sealed class AvalaraLiveFactAttribute : FactAttribute
{
    private const string EnableEnvVar = "MERCHELLO_AVALARA_LIVE_TESTS";
    private static readonly string[] RequiredEnvVars =
    [
        "MERCHELLO_AVALARA_ACCOUNT_ID",
        "MERCHELLO_AVALARA_LICENSE_KEY",
        "MERCHELLO_AVALARA_COMPANY_CODE"
    ];

    public AvalaraLiveFactAttribute()
    {
        var enabledRaw = Environment.GetEnvironmentVariable(EnableEnvVar);
        if (!bool.TryParse(enabledRaw, out var enabled) || !enabled)
        {
            Skip = $"Live Avalara tests are disabled. Set {EnableEnvVar}=true to run.";
            return;
        }

        var missing = RequiredEnvVars
            .Where(key => string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            .ToArray();

        if (missing.Length > 0)
        {
            Skip = $"Missing required env vars for live Avalara tests: {string.Join(", ", missing)}";
        }
    }
}
