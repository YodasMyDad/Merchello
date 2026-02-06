using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace Merchello.Tests.TestInfrastructure;

public class MockSessionFeature(ISession session) : ISessionFeature
{
    public ISession Session { get; set; } = session;
}
