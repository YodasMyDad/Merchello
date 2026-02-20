using System.Net;
using System.Net.Http;
using Merchello.Core.Fulfilment.Providers.ShipBob;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.ShipBob;

public class ShipBobApiClientTests
{
    [Fact]
    public async Task CancelShipmentAsync_PrimaryColonPath404_FallsBackToSlashPath()
    {
        // Arrange
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test",
            ChannelId = 12345,
            ApiVersion = "2026-01"
        };

        var handler = new SequenceHttpMessageHandler(
            [
                new HttpResponseMessage(HttpStatusCode.NotFound)
                {
                    Content = new StringContent("""{"message":"Not Found"}""")
                },
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{}")
                }
            ]);

        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.shipbob.test") };
        using var client = new ShipBobApiClient(httpClient, settings, NullLogger.Instance);

        // Act
        var result = await client.CancelShipmentAsync(123);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldBeTrue();
        handler.Requests.Count.ShouldBe(2);
        handler.Requests[0].Method.ShouldBe(HttpMethod.Post);
        handler.Requests[0].RequestUri!.PathAndQuery.ShouldBe("/2026-01/shipment/123:cancel");
        handler.Requests[1].Method.ShouldBe(HttpMethod.Post);
        handler.Requests[1].RequestUri!.PathAndQuery.ShouldBe("/2026-01/shipment/123/cancel");
    }

    [Fact]
    public async Task CancelShipmentAsync_PrimaryNonFallbackFailure_ReturnsFailureWithoutRetryPath()
    {
        // Arrange
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test",
            ChannelId = 12345,
            ApiVersion = "2026-01"
        };

        var handler = new SequenceHttpMessageHandler(
            [
                new HttpResponseMessage(HttpStatusCode.InternalServerError)
                {
                    Content = new StringContent("""{"message":"Server Error"}""")
                }
            ]);

        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.shipbob.test") };
        using var client = new ShipBobApiClient(httpClient, settings, NullLogger.Instance);

        // Act
        var result = await client.CancelShipmentAsync(987);

        // Assert
        result.Success.ShouldBeFalse();
        result.Data.ShouldBeFalse();
        handler.Requests.Count.ShouldBe(1);
        handler.Requests[0].RequestUri!.PathAndQuery.ShouldBe("/2026-01/shipment/987:cancel");
    }

    private sealed class SequenceHttpMessageHandler(IReadOnlyList<HttpResponseMessage> responses) : HttpMessageHandler
    {
        private int _index;

        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);

            if (_index >= responses.Count)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });
            }

            var response = responses[_index];
            _index++;
            return Task.FromResult(response);
        }
    }
}
