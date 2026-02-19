using System.Text.RegularExpressions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class ProtocolStartupRegistrationDriftTests
{
    [Fact]
    public void Startup_ShouldRegisterUcpSigningKeyRotationJob()
    {
        var startupFilePath = ResolveStartupPath();
        var startupText = File.ReadAllText(startupFilePath);

        var hostedServiceRegistrationPattern = new Regex(
            @"AddHostedService<\s*UcpSigningKeyRotationJob\s*>",
            RegexOptions.Compiled);

        hostedServiceRegistrationPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must register UcpSigningKeyRotationJob so SigningKeyRotationDays is enforced at runtime.");
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
}
