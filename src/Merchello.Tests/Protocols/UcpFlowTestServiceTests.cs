using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Dtos.Testing;
using Merchello.Core.Protocols.UCP.Services;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Settings.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class UcpFlowTestServiceTests
{
    [Fact]
    public async Task GetDiagnosticsAsync_WhenBaseUrlIsLoopback_StrictModeIsUnavailable()
    {
        var service = CreateService(protocolSettings: new ProtocolSettings
        {
            PublicBaseUrl = "https://localhost:443",
            RequireHttps = true,
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

        var diagnostics = await service.GetDiagnosticsAsync();

        diagnostics.StrictModeAvailable.ShouldBeFalse();
        diagnostics.StrictModeBlockReason.ShouldNotBeNullOrWhiteSpace();
        diagnostics.StrictFallbackMode.ShouldBe("adapter");
    }

    [Fact]
    public async Task ExecuteCompleteSessionAsync_DryRun_SkipsExecutionAndReturnsPreview()
    {
        var protocolManagerMock = new Mock<ICommerceProtocolManager>();
        var service = CreateService(
            protocolManagerMock: protocolManagerMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://localhost",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var request = new UcpTestCompleteSessionRequestDto
        {
            ModeRequested = "adapter",
            SessionId = "session-1",
            DryRun = true,
            Request = new UcpFlowTestCompleteSessionPayloadDto
            {
                PaymentHandlerId = "manual:manual"
            }
        };

        var result = await service.ExecuteCompleteSessionAsync(request);

        result.Success.ShouldBeTrue();
        result.ModeRequested.ShouldBe("adapter");
        result.ModeExecuted.ShouldBe("adapter");
        result.DryRun.ShouldBeTrue();
        result.DryRunSkippedExecution.ShouldBeTrue();
        result.Response.ShouldNotBeNull();
        result.Response.StatusCode.ShouldBe(200);

        protocolManagerMock.Verify(x => x.GetAdaptersAsync(It.IsAny<CancellationToken>()), Times.Never);
        protocolManagerMock.Verify(x => x.GetAdapter(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteCreateSessionAsync_StrictRequestedAndBlocked_FallsBackToAdapter()
    {
        var adapterMock = new Mock<ICommerceProtocolAdapter>();
        adapterMock
            .Setup(x => x.CreateSessionAsync(
                It.IsAny<object>(),
                It.IsAny<Core.Protocols.Authentication.AgentIdentity>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ProtocolResponse.Created(new
            {
                id = "session-123",
                status = "incomplete"
            }));

        var protocolManagerMock = new Mock<ICommerceProtocolManager>();
        protocolManagerMock
            .Setup(x => x.GetAdaptersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([adapterMock.Object]);
        protocolManagerMock
            .Setup(x => x.GetAdapter(ProtocolAliases.Ucp))
            .Returns(adapterMock.Object);

        var service = CreateService(
            protocolManagerMock: protocolManagerMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://localhost",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var request = new UcpTestCreateSessionRequestDto
        {
            ModeRequested = "strict",
            Request = new UcpFlowTestCreateSessionPayloadDto
            {
                LineItems =
                [
                    new UcpFlowTestLineItemDto
                    {
                        Id = "li-1",
                        Quantity = 1,
                        Item = new UcpFlowTestItemInfoDto
                        {
                            Id = Guid.NewGuid().ToString(),
                            Title = "Test",
                            Price = 1000
                        }
                    }
                ]
            }
        };

        var result = await service.ExecuteCreateSessionAsync(request);

        result.Success.ShouldBeTrue();
        result.ModeRequested.ShouldBe("strict");
        result.ModeExecuted.ShouldBe("adapter");
        result.FallbackApplied.ShouldBeTrue();
        result.FallbackReason.ShouldNotBeNullOrWhiteSpace();
        result.SessionId.ShouldBe("session-123");

        protocolManagerMock.Verify(x => x.GetAdaptersAsync(It.IsAny<CancellationToken>()), Times.Once);
        protocolManagerMock.Verify(x => x.GetAdapter(ProtocolAliases.Ucp), Times.Once);
        adapterMock.Verify(
            x => x.CreateSessionAsync(
                It.IsAny<object>(),
                It.IsAny<Core.Protocols.Authentication.AgentIdentity>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteManifestAsync_StrictAvailable_UsesStrictHttpExecution()
    {
        var httpHandler = new MockHttpMessageHandler
        {
            ResponseContent = """{"ucp":{"version":"2026-01-23"}}"""
        };
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock
            .Setup(x => x.CreateClient("UcpFlowStrict"))
            .Returns(new HttpClient(httpHandler));

        var service = CreateService(
            httpClientFactoryMock: httpClientFactoryMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://example.com",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var result = await service.ExecuteManifestAsync(new UcpTestManifestRequestDto
        {
            ModeRequested = "strict",
            AgentId = "agent-1"
        });

        result.Success.ShouldBeTrue();
        result.ModeRequested.ShouldBe("strict");
        result.ModeExecuted.ShouldBe("strict");
        result.Request.ShouldNotBeNull();
        result.Request.Url.ShouldBe("https://example.com/.well-known/ucp");
        result.Response.ShouldNotBeNull();
        result.Response.StatusCode.ShouldBe(200);

        httpHandler.ReceivedRequests.Count.ShouldBe(1);
        httpHandler.ReceivedRequests[0].Method.ShouldBe(HttpMethod.Get);
        httpHandler.ReceivedRequests[0].Headers.Contains(ProtocolHeaders.UcpAgent).ShouldBeTrue();
    }

    [Fact]
    public async Task ExecuteGetSessionAsync_WhenAdapterThrows_ReturnsStructuredFailureResult()
    {
        var adapterMock = new Mock<ICommerceProtocolAdapter>();
        adapterMock
            .Setup(x => x.GetSessionAsync(
                It.IsAny<string>(),
                It.IsAny<Core.Protocols.Authentication.AgentIdentity>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("adapter boom"));

        var protocolManagerMock = new Mock<ICommerceProtocolManager>();
        protocolManagerMock
            .Setup(x => x.GetAdaptersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([adapterMock.Object]);
        protocolManagerMock
            .Setup(x => x.GetAdapter(ProtocolAliases.Ucp))
            .Returns(adapterMock.Object);

        var service = CreateService(
            protocolManagerMock: protocolManagerMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://localhost",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var result = await service.ExecuteGetSessionAsync(new UcpTestGetSessionRequestDto
        {
            ModeRequested = "adapter",
            SessionId = "session-1"
        });

        result.Success.ShouldBeFalse();
        result.ErrorCode.ShouldBe("adapter_execution_error");
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("adapter boom");
        result.Response.ShouldNotBeNull();
        result.Response.StatusCode.ShouldBe(500);
    }

    [Fact]
    public async Task GetDiagnosticsAsync_WhenDbUcpPublicBaseUrlIsSet_UsesItAsEffectiveBaseUrl()
    {
        var storeSettingsServiceMock = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsServiceMock
            .Setup(x => x.GetRuntimeSettingsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MerchelloStoreRuntimeSettings
            {
                Merchello = new MerchelloSettings
                {
                    Store = new StoreSettings
                    {
                        WebsiteUrl = "https://store.example.com"
                    }
                },
                Ucp = new MerchelloStoreUcpSettings
                {
                    PublicBaseUrl = "https://ucp-override.example.com"
                }
            });

        var service = CreateService(
            storeSettingsServiceMock: storeSettingsServiceMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://appsettings-protocol.example.com",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var diagnostics = await service.GetDiagnosticsAsync();

        diagnostics.EffectiveBaseUrl.ShouldBe("https://ucp-override.example.com");
        diagnostics.PublicBaseUrl.ShouldBe("https://ucp-override.example.com");
        diagnostics.StrictModeAvailable.ShouldBeTrue();
    }

    [Fact]
    public async Task GetDiagnosticsAsync_WhenDbUcpPublicBaseUrlIsEmpty_FallsBackToProtocolSettings()
    {
        var storeSettingsServiceMock = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsServiceMock
            .Setup(x => x.GetRuntimeSettingsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MerchelloStoreRuntimeSettings
            {
                Merchello = new MerchelloSettings
                {
                    Store = new StoreSettings
                    {
                        WebsiteUrl = "https://store.example.com"
                    }
                },
                Ucp = new MerchelloStoreUcpSettings()
            });

        var service = CreateService(
            storeSettingsServiceMock: storeSettingsServiceMock,
            protocolSettings: new ProtocolSettings
            {
                PublicBaseUrl = "https://protocol.example.com",
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var diagnostics = await service.GetDiagnosticsAsync();

        diagnostics.EffectiveBaseUrl.ShouldBe("https://protocol.example.com");
        diagnostics.StrictModeAvailable.ShouldBeTrue();
    }

    [Fact]
    public async Task GetDiagnosticsAsync_WhenNoUcpOrProtocolBaseUrl_FallsBackToStoreWebsiteUrl()
    {
        var storeSettingsServiceMock = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsServiceMock
            .Setup(x => x.GetRuntimeSettingsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MerchelloStoreRuntimeSettings
            {
                Merchello = new MerchelloSettings
                {
                    Store = new StoreSettings
                    {
                        WebsiteUrl = "https://store.example.com"
                    }
                },
                Ucp = new MerchelloStoreUcpSettings()
            });

        var service = CreateService(
            storeSettingsServiceMock: storeSettingsServiceMock,
            protocolSettings: new ProtocolSettings
            {
                RequireHttps = true,
                Ucp = new UcpSettings { Version = "2026-01-23" }
            });

        var diagnostics = await service.GetDiagnosticsAsync();

        diagnostics.EffectiveBaseUrl.ShouldBe("https://store.example.com");
        diagnostics.StrictModeAvailable.ShouldBeTrue();
    }

    private static UcpFlowTestService CreateService(
        Mock<ICommerceProtocolManager>? protocolManagerMock = null,
        Mock<IHttpClientFactory>? httpClientFactoryMock = null,
        Mock<IMerchelloStoreSettingsService>? storeSettingsServiceMock = null,
        ProtocolSettings? protocolSettings = null,
        MerchelloSettings? merchelloSettings = null)
    {
        protocolManagerMock ??= new Mock<ICommerceProtocolManager>();
        httpClientFactoryMock ??= new Mock<IHttpClientFactory>();

        var signingKeyStoreMock = new Mock<ISigningKeyStore>();
        signingKeyStoreMock
            .Setup(x => x.GetCurrentKeyIdAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync("key-1");

        var webhookSignerMock = new Mock<IWebhookSigner>();
        webhookSignerMock
            .Setup(x => x.SignAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("signed");

        if (storeSettingsServiceMock == null)
        {
            storeSettingsServiceMock = new Mock<IMerchelloStoreSettingsService>();
            storeSettingsServiceMock
                .Setup(x => x.GetRuntimeSettingsAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MerchelloStoreRuntimeSettings
                {
                    Merchello = new MerchelloSettings
                    {
                        Store = new StoreSettings
                        {
                            WebsiteUrl = "https://runtime.example.com"
                        }
                    }
                });
        }

        protocolSettings ??= new ProtocolSettings
        {
            PublicBaseUrl = "https://example.com",
            RequireHttps = true,
            Ucp = new UcpSettings { Version = "2026-01-23" }
        };

        merchelloSettings ??= new MerchelloSettings
        {
            Store = new StoreSettings
            {
                WebsiteUrl = "https://appsettings.example.com"
            }
        };

        return new UcpFlowTestService(
            protocolManagerMock.Object,
            signingKeyStoreMock.Object,
            webhookSignerMock.Object,
            httpClientFactoryMock.Object,
            Options.Create(protocolSettings),
            Options.Create(merchelloSettings),
            storeSettingsServiceMock.Object,
            Mock.Of<ILogger<UcpFlowTestService>>());
    }
}
