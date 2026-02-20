using Merchello.Controllers;
using Merchello.Core.Protocols.UCP.Dtos.Testing;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class UcpTestApiControllerTests
{
    [Fact]
    public async Task GetDiagnostics_ReturnsOk()
    {
        var serviceMock = new Mock<IUcpFlowTestService>();
        serviceMock
            .Setup(x => x.GetDiagnosticsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UcpFlowDiagnosticsDto
            {
                ProtocolVersion = "2026-01-23",
                StrictFallbackMode = "adapter",
                SimulatedAgentId = "agent-1"
            });

        var controller = new UcpTestApiController(serviceMock.Object);

        var result = await controller.GetDiagnostics(CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        ok.Value.ShouldBeOfType<UcpFlowDiagnosticsDto>();
    }

    [Fact]
    public async Task GetSession_WithMissingSessionId_ReturnsBadRequest()
    {
        var controller = new UcpTestApiController(Mock.Of<IUcpFlowTestService>());

        var result = await controller.GetSession(new UcpTestGetSessionRequestDto
        {
            SessionId = string.Empty
        }, CancellationToken.None);

        result.ShouldBeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CompleteSession_RealModeWithoutPaymentHandler_ReturnsBadRequest()
    {
        var controller = new UcpTestApiController(Mock.Of<IUcpFlowTestService>());

        var result = await controller.CompleteSession(new UcpTestCompleteSessionRequestDto
        {
            SessionId = "session-1",
            DryRun = false,
            Request = new UcpFlowTestCompleteSessionPayloadDto()
        }, CancellationToken.None);

        result.ShouldBeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public void RouteAttributes_ContainExpectedTemplates()
    {
        GetRouteTemplates(nameof(UcpTestApiController.GetDiagnostics)).ShouldContain("ucp-test/diagnostics");
        GetRouteTemplates(nameof(UcpTestApiController.Manifest)).ShouldContain("ucp-test/manifest");
        GetRouteTemplates(nameof(UcpTestApiController.CreateSession)).ShouldContain("ucp-test/sessions/create");
        GetRouteTemplates(nameof(UcpTestApiController.GetSession)).ShouldContain("ucp-test/sessions/get");
        GetRouteTemplates(nameof(UcpTestApiController.UpdateSession)).ShouldContain("ucp-test/sessions/update");
        GetRouteTemplates(nameof(UcpTestApiController.CompleteSession)).ShouldContain("ucp-test/sessions/complete");
        GetRouteTemplates(nameof(UcpTestApiController.CancelSession)).ShouldContain("ucp-test/sessions/cancel");
        GetRouteTemplates(nameof(UcpTestApiController.GetOrder)).ShouldContain("ucp-test/orders/get");
    }

    private static IReadOnlyList<string> GetRouteTemplates(string methodName)
    {
        var method = typeof(UcpTestApiController).GetMethod(methodName);
        method.ShouldNotBeNull();

        return method!
            .GetCustomAttributes(typeof(HttpMethodAttribute), false)
            .OfType<HttpMethodAttribute>()
            .Select(x => x.Template ?? string.Empty)
            .ToList();
    }
}
