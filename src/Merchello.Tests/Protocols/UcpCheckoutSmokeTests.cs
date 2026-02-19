using System.Text.Json;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Tests.TestInfrastructure;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Smoke test for a full UCP checkout completion using a mocked payment provider.
/// Ensures the UCP adapter can create a session, select fulfillment, complete payment,
/// and return a retrievable order.
/// </summary>
[Collection("Integration Tests")]
public class UcpCheckoutSmokeTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;

    public UcpCheckoutSmokeTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public async Task FullCheckoutFlow_WithPaymentProvider_CompletesAndReturnsOrder()
    {
        _fixture.ResetMocks();
        try
        {
            ConfigureManualProviderForCheckout(PaymentResultStatus.Completed);

            var product = await CreateTestProductWithShipping();
            var agentIdentity = CreateTestAgentIdentity();

            var createRequest = new UcpCreateSessionRequestDto
            {
                Currency = "USD",
                LineItems =
                [
                    new UcpLineItemRequestDto
                    {
                        Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 2500 },
                        Quantity = 1
                    }
                ],
                Buyer = new UcpBuyerInfoDto
                {
                    Email = "smoke-test@example.com",
                    BillingAddress = new UcpAddressDto
                    {
                        GivenName = "Smoke",
                        FamilyName = "Tester",
                        AddressLine1 = "123 Test St",
                        Locality = "New York",
                        AdministrativeArea = "NY",
                        PostalCode = "10001",
                        CountryCode = "US"
                    },
                    ShippingSameAsBilling = true
                }
            };

            var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
            createResponse.Success.ShouldBeTrue("Session creation should succeed.");

            var sessionId = ExtractSessionId(createResponse.Data);
            sessionId.ShouldNotBeNullOrWhiteSpace("Session ID should be present.");

            // Fetch session to obtain fulfillment options
            var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
            getResponse.Success.ShouldBeTrue("Session retrieval should succeed.");

            var (groupId, optionId) = ExtractFirstFulfillmentSelection(getResponse.Data);
            groupId.ShouldNotBeNullOrWhiteSpace("Fulfillment group ID should be present.");
            optionId.ShouldNotBeNullOrWhiteSpace("Fulfillment option ID should be present.");

            var updateRequest = new UcpUpdateSessionRequestDto
            {
                Fulfillment = new UcpFulfillmentRequestDto
                {
                    Groups =
                    [
                        new UcpFulfillmentGroupSelectionDto
                        {
                            Id = groupId,
                            SelectedOptionId = optionId
                        }
                    ]
                }
            };

            var updateResponse = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);
            updateResponse.Success.ShouldBeTrue("Session update should succeed.");

            var completeRequest = new UcpCompleteSessionRequestDto
            {
                PaymentHandlerId = "manual:manual",
                PaymentInstrument = new UcpPaymentInstrumentDto
                {
                    Data = new Dictionary<string, object>
                    {
                        ["reference"] = "TEST-REF"
                    }
                }
            };

            var completeResponse = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);
            completeResponse.Success.ShouldBeTrue($"Session completion should succeed. Error: {completeResponse.Error?.Code} {completeResponse.Error?.Message}");

            var completionData = ExtractEnvelopeData(completeResponse.Data);
            completionData.ShouldNotBeNull("Completion response should contain data.");

            using var completionDoc = JsonDocument.Parse(JsonSerializer.Serialize(completionData));
            var completionRoot = completionDoc.RootElement;
            completionRoot.GetProperty("status").GetString().ShouldBe(ProtocolSessionStatuses.Completed);
            var orderId = completionRoot.GetProperty("order_id").GetString();
            orderId.ShouldNotBeNullOrWhiteSpace("Order ID should be returned on completion.");

            var orderResponse = await _adapter.GetOrderAsync(orderId!, agentIdentity);
            orderResponse.Success.ShouldBeTrue("Order retrieval should succeed.");
        }
        finally
        {
            _fixture.ResetMocks();
        }
    }

    [Fact]
    public async Task FullCheckoutFlow_WithPendingPayment_ReturnsCompleteInProgress()
    {
        _fixture.ResetMocks();
        try
        {
            ConfigureManualProviderForCheckout(PaymentResultStatus.Pending);

            var product = await CreateTestProductWithShipping();
            var agentIdentity = CreateTestAgentIdentity();

            var createRequest = new UcpCreateSessionRequestDto
            {
                Currency = "USD",
                LineItems =
                [
                    new UcpLineItemRequestDto
                    {
                        Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 2500 },
                        Quantity = 1
                    }
                ],
                Buyer = new UcpBuyerInfoDto
                {
                    Email = "pending-test@example.com",
                    BillingAddress = new UcpAddressDto
                    {
                        GivenName = "Pending",
                        FamilyName = "Tester",
                        AddressLine1 = "123 Test St",
                        Locality = "New York",
                        AdministrativeArea = "NY",
                        PostalCode = "10001",
                        CountryCode = "US"
                    },
                    ShippingSameAsBilling = true
                }
            };

            var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
            createResponse.Success.ShouldBeTrue("Session creation should succeed.");

            var sessionId = ExtractSessionId(createResponse.Data);
            sessionId.ShouldNotBeNullOrWhiteSpace("Session ID should be present.");

            var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
            getResponse.Success.ShouldBeTrue("Session retrieval should succeed.");

            var (groupId, optionId) = ExtractFirstFulfillmentSelection(getResponse.Data);
            groupId.ShouldNotBeNullOrWhiteSpace("Fulfillment group ID should be present.");
            optionId.ShouldNotBeNullOrWhiteSpace("Fulfillment option ID should be present.");

            var updateRequest = new UcpUpdateSessionRequestDto
            {
                Fulfillment = new UcpFulfillmentRequestDto
                {
                    Groups =
                    [
                        new UcpFulfillmentGroupSelectionDto
                        {
                            Id = groupId,
                            SelectedOptionId = optionId
                        }
                    ]
                }
            };

            var updateResponse = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);
            updateResponse.Success.ShouldBeTrue("Session update should succeed.");

            var completeRequest = new UcpCompleteSessionRequestDto
            {
                PaymentHandlerId = "manual:manual",
                PaymentInstrument = new UcpPaymentInstrumentDto
                {
                    Data = new Dictionary<string, object>
                    {
                        ["reference"] = "PENDING-REF"
                    }
                }
            };

            var completeResponse = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);
            completeResponse.Success.ShouldBeTrue($"Session completion should succeed. Error: {completeResponse.Error?.Code} {completeResponse.Error?.Message}");

            var completionData = ExtractEnvelopeData(completeResponse.Data);
            completionData.ShouldNotBeNull("Completion response should contain data.");

            using var completionDoc = JsonDocument.Parse(JsonSerializer.Serialize(completionData));
            var completionRoot = completionDoc.RootElement;
            completionRoot.GetProperty("status").GetString().ShouldBe(ProtocolSessionStatuses.CompleteInProgress);
            var orderId = completionRoot.GetProperty("order_id").GetString();
            orderId.ShouldNotBeNullOrWhiteSpace("Order ID should be returned on pending completion.");

            var sessionResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
            sessionResponse.Success.ShouldBeTrue("Session should remain available while completion is pending.");

            var orderResponse = await _adapter.GetOrderAsync(orderId!, agentIdentity);
            orderResponse.Success.ShouldBeTrue("Order should be retrievable while payment is pending.");
        }
        finally
        {
            _fixture.ResetMocks();
        }
    }

    [Fact]
    public async Task FullCheckoutFlow_WithRedirectHandler_MapsRedirectParams()
    {
        _fixture.ResetMocks();
        try
        {
            ProcessPaymentRequest? capturedRequest = null;
            ConfigureRedirectProviderForCheckout(PaymentResultStatus.Completed, request => capturedRequest = request);

            var product = await CreateTestProductWithShipping();
            var agentIdentity = CreateTestAgentIdentity();

            var createRequest = new UcpCreateSessionRequestDto
            {
                Currency = "USD",
                LineItems =
                [
                    new UcpLineItemRequestDto
                    {
                        Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 2500 },
                        Quantity = 1
                    }
                ],
                Buyer = new UcpBuyerInfoDto
                {
                    Email = "redirect-test@example.com",
                    BillingAddress = new UcpAddressDto
                    {
                        GivenName = "Redirect",
                        FamilyName = "Tester",
                        AddressLine1 = "123 Test St",
                        Locality = "New York",
                        AdministrativeArea = "NY",
                        PostalCode = "10001",
                        CountryCode = "US"
                    },
                    ShippingSameAsBilling = true
                }
            };

            var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
            createResponse.Success.ShouldBeTrue("Session creation should succeed.");

            var sessionId = ExtractSessionId(createResponse.Data);
            sessionId.ShouldNotBeNullOrWhiteSpace("Session ID should be present.");

            var completeRequest = new UcpCompleteSessionRequestDto
            {
                PaymentHandlerId = "redirectpay:redirect",
                PaymentInstrument = new UcpPaymentInstrumentDto
                {
                    Data = new Dictionary<string, object>
                    {
                        ["session_id"] = "sess_123",
                        ["token"] = "tok_456"
                    }
                }
            };

            var completeResponse = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);
            completeResponse.Success.ShouldBeTrue($"Session completion should succeed. Error: {completeResponse.Error?.Code} {completeResponse.Error?.Message}");

            capturedRequest.ShouldNotBeNull("Redirect handler should receive a ProcessPaymentRequest.");
            capturedRequest!.RedirectParams.ShouldNotBeNull("Redirect params should be forwarded to the payment request.");
            capturedRequest.RedirectParams!["session_id"].ShouldBe("sess_123");
            capturedRequest.RedirectParams["token"].ShouldBe("tok_456");
            capturedRequest.PaymentMethodToken.ShouldBeNull();
            capturedRequest.AuthorizationToken.ShouldBeNull();
            capturedRequest.FormData.ShouldBeNull();
        }
        finally
        {
            _fixture.ResetMocks();
        }
    }

    [Fact]
    public async Task DigitalCheckoutFlow_CompletesWithoutFulfillmentSelection()
    {
        _fixture.ResetMocks();
        try
        {
            ConfigureManualProviderForCheckout(PaymentResultStatus.Completed);

            var product = await CreateDigitalProductWithShipping();
            var agentIdentity = CreateTestAgentIdentity();

            var createRequest = new UcpCreateSessionRequestDto
            {
                Currency = "USD",
                LineItems =
                [
                    new UcpLineItemRequestDto
                    {
                        Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1500 },
                        Quantity = 1
                    }
                ],
                Buyer = new UcpBuyerInfoDto
                {
                    Email = "digital-test@example.com",
                    BillingAddress = new UcpAddressDto
                    {
                        GivenName = "Digital",
                        FamilyName = "Tester",
                        AddressLine1 = "123 Test St",
                        Locality = "New York",
                        AdministrativeArea = "NY",
                        PostalCode = "10001",
                        CountryCode = "US"
                    },
                    ShippingSameAsBilling = true
                }
            };

            var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
            createResponse.Success.ShouldBeTrue("Session creation should succeed.");

            var sessionId = ExtractSessionId(createResponse.Data);
            sessionId.ShouldNotBeNullOrWhiteSpace("Session ID should be present.");

            var completeRequest = new UcpCompleteSessionRequestDto
            {
                PaymentHandlerId = "manual:manual",
                PaymentInstrument = new UcpPaymentInstrumentDto
                {
                    Data = new Dictionary<string, object>
                    {
                        ["reference"] = "DIGITAL-REF"
                    }
                }
            };

            var completeResponse = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);
            completeResponse.Success.ShouldBeTrue($"Session completion should succeed. Error: {completeResponse.Error?.Code} {completeResponse.Error?.Message}");

            var completionData = ExtractEnvelopeData(completeResponse.Data);
            completionData.ShouldNotBeNull("Completion response should contain data.");

            using var completionDoc = JsonDocument.Parse(JsonSerializer.Serialize(completionData));
            var completionRoot = completionDoc.RootElement;
            completionRoot.GetProperty("status").GetString().ShouldBe(ProtocolSessionStatuses.Completed);
        }
        finally
        {
            _fixture.ResetMocks();
        }
    }

    private void ConfigureManualProviderForCheckout(PaymentResultStatus status)
    {
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment"
        });
        providerMock.Setup(p => p.GetAvailablePaymentMethods()).Returns(
        [
            new PaymentMethodDefinition
            {
                Alias = "manual",
                DisplayName = "Manual Payment",
                IntegrationType = PaymentIntegrationType.DirectForm,
                MethodType = PaymentMethodTypes.Manual
            }
        ]);
        providerMock
            .Setup(p => p.ProcessPaymentAsync(It.IsAny<ProcessPaymentRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProcessPaymentRequest request, CancellationToken _) =>
            {
                var amount = request.Amount ?? 0m;
                return status switch
                {
                    PaymentResultStatus.Pending => PaymentResult.Pending($"tx_{Guid.NewGuid():N}", amount),
                    PaymentResultStatus.Authorized => PaymentResult.Authorized($"tx_{Guid.NewGuid():N}", amount),
                    _ => PaymentResult.Completed($"tx_{Guid.NewGuid():N}", amount)
                };
            });

        var providerSetting = new PaymentProviderSetting
        {
            ProviderAlias = "manual",
            DisplayName = "Manual Payment",
            IsEnabled = true
        };

        var registeredProvider = new RegisteredPaymentProvider(providerMock.Object, providerSetting);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("manual", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([registeredProvider]);

        var checkoutMethod = new PaymentMethodDto
        {
            ProviderAlias = "manual",
            MethodAlias = "manual",
            DisplayName = "Manual Payment",
            IntegrationType = PaymentIntegrationType.DirectForm,
            MethodType = PaymentMethodTypes.Manual,
            ShowInCheckout = true
        };

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([checkoutMethod]);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        ConfigureIdempotency();
    }

    private void ConfigureRedirectProviderForCheckout(
        PaymentResultStatus status,
        Action<ProcessPaymentRequest>? captureRequest = null)
    {
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "redirectpay",
            DisplayName = "RedirectPay"
        });
        providerMock.Setup(p => p.GetAvailablePaymentMethods()).Returns(
        [
            new PaymentMethodDefinition
            {
                Alias = "redirect",
                DisplayName = "RedirectPay",
                IntegrationType = PaymentIntegrationType.Redirect,
                MethodType = "ideal"
            }
        ]);
        providerMock
            .Setup(p => p.ProcessPaymentAsync(It.IsAny<ProcessPaymentRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProcessPaymentRequest request, CancellationToken _) =>
            {
                captureRequest?.Invoke(request);
                var amount = request.Amount ?? 0m;
                return status switch
                {
                    PaymentResultStatus.Pending => PaymentResult.Pending($"tx_{Guid.NewGuid():N}", amount),
                    PaymentResultStatus.Authorized => PaymentResult.Authorized($"tx_{Guid.NewGuid():N}", amount),
                    _ => PaymentResult.Completed($"tx_{Guid.NewGuid():N}", amount)
                };
            });

        var providerSetting = new PaymentProviderSetting
        {
            ProviderAlias = "redirectpay",
            DisplayName = "RedirectPay",
            IsEnabled = true
        };

        var registeredProvider = new RegisteredPaymentProvider(providerMock.Object, providerSetting);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("redirectpay", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([registeredProvider]);

        var checkoutMethod = new PaymentMethodDto
        {
            ProviderAlias = "redirectpay",
            MethodAlias = "redirect",
            DisplayName = "RedirectPay",
            IntegrationType = PaymentIntegrationType.Redirect,
            MethodType = "ideal",
            ShowInCheckout = true
        };

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([checkoutMethod]);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        ConfigureIdempotency();
    }

    private void ConfigureIdempotency()
    {
        var idempotencyService = _fixture.GetService<IPaymentIdempotencyService>();
        var idempotencyMock = Mock.Get(idempotencyService);
        idempotencyMock
            .Setup(x => x.TryMarkAsProcessingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        idempotencyMock
            .Setup(x => x.GetCachedPaymentResultAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentResult?)null);
    }

    private async Task<Core.Products.Models.Product> CreateTestProductWithShipping()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Smoke Supplier", "SMK");
        var warehouse = dataBuilder.CreateWarehouse("Smoke Warehouse", "US", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Smoke Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"SMK-{Guid.NewGuid():N}"[..12], productRoot, 25.00m);

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        dataBuilder.AddServiceRegion(warehouse, "US");
        dataBuilder.CreateShippingOption("Standard Delivery", warehouse, 5.00m, 3, 5);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private async Task<Core.Products.Models.Product> CreateDigitalProductWithShipping()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20);
        var productType = dataBuilder.CreateProductType("Digital", "digital");
        var supplier = dataBuilder.CreateSupplier("Digital Supplier", "DIGI");
        var warehouse = dataBuilder.CreateWarehouse("Digital Warehouse", "US", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Digital Product", taxGroup, productType);
        productRoot.IsDigitalProduct = true;
        var product = dataBuilder.CreateProduct($"DIG-{Guid.NewGuid():N}"[..12], productRoot, 15.00m);

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        dataBuilder.AddServiceRegion(warehouse, "US");
        dataBuilder.CreateShippingOption("Digital Delivery", warehouse, 0m, 0, 0);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private static AgentIdentity CreateTestAgentIdentity()
    {
        return new AgentIdentity
        {
            AgentId = $"smoke-agent-{Guid.NewGuid():N}",
            Protocol = ProtocolAliases.Ucp,
            ProfileUri = "https://test-agent.example.com/profile",
            Capabilities =
            [
                UcpCapabilityNames.Checkout,
                UcpCapabilityNames.Order
            ]
        };
    }

    private static (string? GroupId, string? OptionId) ExtractFirstFulfillmentSelection(object? responseData)
    {
        var data = ExtractEnvelopeData(responseData);
        if (data == null)
        {
            return (null, null);
        }

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(data));
        var root = doc.RootElement;

        if (!root.TryGetProperty("fulfillment", out var fulfillment) || fulfillment.ValueKind != JsonValueKind.Object)
        {
            return (null, null);
        }

        if (!fulfillment.TryGetProperty("methods", out var methods) || methods.ValueKind != JsonValueKind.Array)
        {
            return (null, null);
        }

        foreach (var method in methods.EnumerateArray())
        {
            if (!method.TryGetProperty("groups", out var groups) || groups.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var group in groups.EnumerateArray())
            {
                var id = group.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                if (string.IsNullOrWhiteSpace(id))
                {
                    continue;
                }

                if (!group.TryGetProperty("options", out var options) || options.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var option in options.EnumerateArray())
                {
                    var optionId = option.TryGetProperty("id", out var optionProp) ? optionProp.GetString() : null;
                    if (!string.IsNullOrWhiteSpace(optionId))
                    {
                        return (id, optionId);
                    }
                }
            }
        }

        return (null, null);
    }

    private static object? ExtractEnvelopeData(object? responseData) => responseData;

    private static string? ExtractSessionId(object? responseData)
    {
        if (responseData == null) return null;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        return json.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
    }
}
