using System.Text.RegularExpressions;
using Merchello.Core.Webhooks.Handlers;
using Shouldly;
using Umbraco.Cms.Core.Events;
using Xunit;

namespace Merchello.Tests.Webhooks;

public class WebhookStartupRegistrationDriftTests
{
    [Fact]
    public void Startup_ShouldRegisterAllWebhookHandlerNotificationInterfaces()
    {
        var handledNotificationTypeNames = typeof(WebhookNotificationHandler)
            .GetInterfaces()
            .Where(x => x.IsGenericType && x.GetGenericTypeDefinition() == typeof(INotificationAsyncHandler<>))
            .Select(x => x.GetGenericArguments()[0].Name)
            .Distinct(StringComparer.Ordinal)
            .ToHashSet(StringComparer.Ordinal);

        var startupFilePath = ResolveStartupPath();
        var startupText = File.ReadAllText(startupFilePath);

        var registrationPattern = new Regex(
            @"AddNotificationAsyncHandler<\s*(?<notification>[^,>]+)\s*,\s*WebhookNotificationHandler\s*>",
            RegexOptions.Compiled);

        var registeredNotificationTypeNames = registrationPattern
            .Matches(startupText)
            .Select(match => ExtractTypeName(match.Groups["notification"].Value))
            .ToHashSet(StringComparer.Ordinal);

        var missingRegistrations = handledNotificationTypeNames
            .Except(registeredNotificationTypeNames, StringComparer.Ordinal)
            .OrderBy(x => x)
            .ToList();

        missingRegistrations.ShouldBeEmpty(
            $"Missing Startup registrations for WebhookNotificationHandler: {string.Join(", ", missingRegistrations)}");
    }

    [Fact]
    public void Startup_ShouldConfigureNamedWebhooksHttpClientWithInfiniteTimeout()
    {
        var startupFilePath = ResolveStartupPath();
        var startupText = File.ReadAllText(startupFilePath);

        var clientConfigurationPattern = new Regex(
            @"AddHttpClient\(\s*""Webhooks""[\s\S]*?Timeout\s*=\s*Timeout\.InfiniteTimeSpan",
            RegexOptions.Compiled);

        clientConfigurationPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must configure a named Webhooks HttpClient with Timeout.InfiniteTimeSpan so subscription timeouts are enforced by per-request cancellation.");
    }

    private static string ResolveStartupPath()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var startupPath = Path.Combine(current.FullName, "src", "Merchello", "Startup.cs");
            if (File.Exists(startupPath))
            {
                return startupPath;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("Unable to locate src/Merchello/Startup.cs from test base directory.");
    }

    private static string ExtractTypeName(string typeExpression)
    {
        var cleaned = typeExpression.Trim();
        var segments = cleaned.Split('.');
        return segments[^1];
    }
}
