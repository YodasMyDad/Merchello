using System.Net;
using System.Net.Http;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Mock HTTP message handler for testing webhook delivery.
/// Allows tests to configure expected responses and inspect outgoing requests.
/// </summary>
public class MockHttpMessageHandler : HttpMessageHandler
{
    public HttpStatusCode ResponseStatusCode { get; set; } = HttpStatusCode.OK;
    public string ResponseContent { get; set; } = "{}";
    public Exception? ExceptionToThrow { get; set; }
    public List<HttpRequestMessage> ReceivedRequests { get; } = [];
    public List<string> CapturedRequestBodies { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ReceivedRequests.Add(request);

        if (request.Content != null)
        {
            var body = await request.Content.ReadAsStringAsync(cancellationToken);
            CapturedRequestBodies.Add(body);
        }

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        return new HttpResponseMessage(ResponseStatusCode)
        {
            Content = new StringContent(ResponseContent)
        };
    }

    public void Reset()
    {
        ResponseStatusCode = HttpStatusCode.OK;
        ResponseContent = "{}";
        ExceptionToThrow = null;
        ReceivedRequests.Clear();
        CapturedRequestBodies.Clear();
    }
}
