using Merchello.Core.Email.Services.Interfaces;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Stub implementation of IEmailTemplateRenderer for integration tests.
/// Returns simple HTML without requiring actual Razor views.
/// </summary>
public class StubEmailTemplateRenderer : IEmailTemplateRenderer
{
    public Task<string> RenderAsync(string viewPath, object model, CancellationToken ct = default)
    {
        return Task.FromResult($"<html><body>Test email rendered from {viewPath}</body></html>");
    }

    public bool ViewExists(string viewPath)
    {
        return true;
    }
}
