using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Mock HTTP context accessor for testing checkout flows that require session storage.
/// Provides an in-memory session implementation for test isolation.
/// </summary>
public class MockHttpContextAccessor : IHttpContextAccessor
{
    private readonly DefaultHttpContext _httpContext;
    private readonly MockSession _session;

    public MockHttpContextAccessor()
    {
        _session = new MockSession();
        _httpContext = new DefaultHttpContext();
        _httpContext.Features.Set<ISessionFeature>(new MockSessionFeature(_session));
    }

    public HttpContext? HttpContext
    {
        get => _httpContext;
        set { }
    }

    /// <summary>
    /// Clears all session data. Call this in test setup for isolation.
    /// </summary>
    public void ClearSession() => _session.Clear();

    /// <summary>
    /// Gets the mock session for direct access in tests.
    /// </summary>
    public ISession Session => _session;
}
