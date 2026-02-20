using Merchello.Controllers;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class WellKnownControllerTests
{
    [Fact]
    public async Task GetUcpTestAgentProfile_ReturnsProfileWithSigningKeysAndCapabilities()
    {
        var protocolManagerMock = new Mock<ICommerceProtocolManager>();
        var signingKeyStoreMock = new Mock<ISigningKeyStore>();
        signingKeyStoreMock
            .Setup(x => x.GetPublicKeysAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new JsonWebKey
                {
                    Kty = "EC",
                    Kid = "key-1",
                    Crv = "P-256",
                    X = "x-value",
                    Y = "y-value",
                    Use = "sig",
                    Alg = "ES256"
                }
            ]);

        var settings = Options.Create(new ProtocolSettings
        {
            ManifestCacheDurationMinutes = 60,
            Ucp = new UcpSettings
            {
                Version = "2026-01-23",
                Capabilities = new UcpCapabilitySettings
                {
                    Checkout = true,
                    Order = true
                },
                Extensions = new UcpExtensionSettings
                {
                    Discount = true,
                    Fulfillment = true
                }
            }
        });

        var controller = new WellKnownController(
            protocolManagerMock.Object,
            signingKeyStoreMock.Object,
            settings);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var result = await controller.GetUcpTestAgentProfile("agent-test", CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var profile = ok.Value.ShouldBeOfType<UcpAgentProfile>();

        profile.Name.ShouldNotBeNull();
        profile.Name.ShouldContain("agent-test");
        profile.Ucp.ShouldNotBeNull();
        profile.Ucp.Version.ShouldBe("2026-01-23");
        profile.Ucp.Capabilities.ShouldNotBeNull();
        profile.Ucp.Capabilities.Count.ShouldBeGreaterThan(0);
        profile.Ucp.Capabilities.Select(x => x.Name).ShouldContain(UcpCapabilityNames.Checkout);
        profile.Ucp.Capabilities.Select(x => x.Name).ShouldContain(UcpCapabilityNames.Order);
        profile.SigningKeys.ShouldNotBeNull();
        profile.SigningKeys.Count.ShouldBe(1);
        profile.SigningKeys[0].Kid.ShouldBe("key-1");

        controller.Response.Headers.CacheControl.ToString().ShouldContain("max-age");
    }

    [Fact]
    public async Task GetUcpTestAgentProfile_WithBlankAgentId_ReturnsBadRequest()
    {
        var controller = new WellKnownController(
            Mock.Of<ICommerceProtocolManager>(),
            Mock.Of<ISigningKeyStore>(),
            Options.Create(new ProtocolSettings()));

        var result = await controller.GetUcpTestAgentProfile(" ", CancellationToken.None);

        result.ShouldBeOfType<BadRequestObjectResult>();
    }
}
