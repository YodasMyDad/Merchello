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
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

[Collection("Integration Tests")]
public class UcpDynamicFulfillmentTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;

    public UcpDynamicFulfillmentTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public async Task DynamicSelectionKey_RoundTrips_CreateGetUpdateComplete()
    {
        ConfigureDynamicQuotes("DYN-GROUND", "Ground Dynamic", 6.25m);
        ConfigureManualProviderForCheckout(PaymentResultStatus.Completed);
        var product = await CreateShippableProductAsync();
        var agentIdentity = CreateAgentIdentity();

        var createResponse = await _adapter.CreateSessionAsync(
            BuildCreateRequest(product.Id.ToString(), "dynamic-roundtrip@example.com"),
            agentIdentity);
        createResponse.Success.ShouldBeTrue();

        var sessionId = ExtractSessionId(createResponse.Data);
        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse.Success.ShouldBeTrue();

        var (groupId, dynamicOptionId) = ExtractFirstDynamicOption(getResponse.Data);
        groupId.ShouldNotBeNullOrWhiteSpace();
        dynamicOptionId.ShouldNotBeNullOrWhiteSpace();
        dynamicOptionId!.StartsWith("dyn:", StringComparison.OrdinalIgnoreCase).ShouldBeTrue();

        var updateResponse = await _adapter.UpdateSessionAsync(sessionId, new UcpUpdateSessionRequestDto
        {
            Fulfillment = new UcpFulfillmentRequestDto
            {
                Groups =
                [
                    new UcpFulfillmentGroupSelectionDto
                    {
                        Id = groupId,
                        SelectedOptionId = dynamicOptionId
                    }
                ]
            }
        }, agentIdentity);
        updateResponse.Success.ShouldBeTrue();

        var updatedSession = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        updatedSession.Success.ShouldBeTrue();
        ExtractSelectedOptionId(updatedSession.Data, groupId).ShouldBe(dynamicOptionId);

        var completeResponse = await _adapter.CompleteSessionAsync(sessionId, new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "manual:manual",
            PaymentInstrument = new UcpPaymentInstrumentDto
            {
                Data = new Dictionary<string, object> { ["reference"] = "DYN-ROUNDTRIP" }
            }
        }, agentIdentity);

        completeResponse.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task SingleDynamicOption_IsAutoSelectedDuringComplete()
    {
        ConfigureDynamicQuotes("DYN-SINGLE", "Single Dynamic", 9.00m);
        ConfigureManualProviderForCheckout(PaymentResultStatus.Pending);
        var product = await CreateShippableProductAsync();
        var agentIdentity = CreateAgentIdentity();

        var createResponse = await _adapter.CreateSessionAsync(
            BuildCreateRequest(product.Id.ToString(), "dynamic-autoselect@example.com"),
            agentIdentity);
        createResponse.Success.ShouldBeTrue();

        var sessionId = ExtractSessionId(createResponse.Data);
        var sessionBeforeComplete = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        var (groupId, dynamicOptionId) = ExtractFirstDynamicOption(sessionBeforeComplete.Data);
        ExtractSelectedOptionId(sessionBeforeComplete.Data, groupId).ShouldBeNull();

        var completeResponse = await _adapter.CompleteSessionAsync(sessionId, new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "manual:manual",
            PaymentInstrument = new UcpPaymentInstrumentDto
            {
                Data = new Dictionary<string, object> { ["reference"] = "DYN-AUTOSELECT" }
            }
        }, agentIdentity);

        completeResponse.Success.ShouldBeTrue();

        // Payment is pending so basket/session remains and we can inspect the auto-selected dynamic option.
        var sessionAfterComplete = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        sessionAfterComplete.Success.ShouldBeTrue();
        ExtractSelectedOptionId(sessionAfterComplete.Data, groupId).ShouldBe(dynamicOptionId);
    }

    private void ConfigureDynamicQuotes(string serviceCode, string serviceName, decimal totalCost)
    {
        var shippingQuoteService = _fixture.GetService<IShippingQuoteService>();
        var shippingQuoteMock = Mock.Get(shippingQuoteService);

        var quote = new ShippingRateQuote
        {
            ProviderKey = "dynamic-test-provider",
            ProviderName = "Dynamic Test Provider",
            Metadata = new ShippingProviderMetadata
            {
                Key = "dynamic-test-provider",
                DisplayName = "Dynamic Test Provider",
                ConfigCapabilities = new ProviderConfigCapabilities
                {
                    UsesLiveRates = true
                }
            },
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = serviceCode,
                    ServiceName = serviceName,
                    TotalCost = totalCost,
                    CurrencyCode = "USD"
                }
            ]
        };

        shippingQuoteMock
            .Setup(x => x.GetQuotesForWarehouseAsync(It.IsAny<GetWarehouseQuotesParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([quote]);
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
        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new PaymentMethodDto
                {
                    ProviderAlias = "manual",
                    MethodAlias = "manual",
                    DisplayName = "Manual Payment",
                    IntegrationType = PaymentIntegrationType.DirectForm,
                    MethodType = PaymentMethodTypes.Manual,
                    ShowInCheckout = true
                }
            ]);
        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var idempotencyService = _fixture.GetService<IPaymentIdempotencyService>();
        var idempotencyMock = Mock.Get(idempotencyService);
        idempotencyMock
            .Setup(x => x.TryMarkAsProcessingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        idempotencyMock
            .Setup(x => x.GetCachedPaymentResultAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentResult?)null);
    }

    private async Task<Core.Products.Models.Product> CreateShippableProductAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Dynamic Supplier", "DYN");
        var warehouse = dataBuilder.CreateWarehouse("Dynamic Warehouse", "US", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Dynamic Product", taxGroup, productType);
        productRoot.DefaultPackageConfigurations =
        [
            new ProductPackage
            {
                Weight = 1m,
                LengthCm = 10m,
                WidthCm = 10m,
                HeightCm = 5m
            }
        ];
        var product = dataBuilder.CreateProduct($"DYN-{Guid.NewGuid():N}"[..12], productRoot, 25m);

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        dataBuilder.AddServiceRegion(warehouse, "US");

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private static UcpCreateSessionRequestDto BuildCreateRequest(string productId, string email) => new()
    {
        Currency = "USD",
        LineItems =
        [
            new UcpLineItemRequestDto
            {
                Item = new UcpItemInfoDto
                {
                    Id = productId,
                    Title = "Dynamic Product",
                    Price = 2500
                },
                Quantity = 1
            }
        ],
        Buyer = new UcpBuyerInfoDto
        {
            Email = email,
            BillingAddress = new UcpAddressDto
            {
                GivenName = "Dynamic",
                FamilyName = "Buyer",
                AddressLine1 = "123 Main Street",
                Locality = "Austin",
                AdministrativeArea = "TX",
                PostalCode = "78701",
                CountryCode = "US"
            },
            ShippingSameAsBilling = true
        }
    };

    private static AgentIdentity CreateAgentIdentity() => new()
    {
        AgentId = $"dynamic-agent-{Guid.NewGuid():N}",
        ProfileUri = "https://agent.example.com/profile",
        Protocol = ProtocolAliases.Ucp,
        Capabilities = [UcpCapabilityNames.Checkout, UcpCapabilityNames.Order]
    };

    private static string ExtractSessionId(object? responseData)
    {
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        var data = GetEnvelopeData(doc);
        return data.GetProperty("id").GetString() ?? string.Empty;
    }

    private static (string GroupId, string DynamicOptionId) ExtractFirstDynamicOption(object? responseData)
    {
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        var methods = GetEnvelopeData(doc).GetProperty("fulfillment").GetProperty("methods");

        foreach (var method in methods.EnumerateArray())
        {
            foreach (var group in method.GetProperty("groups").EnumerateArray())
            {
                var groupId = group.GetProperty("id").GetString();
                foreach (var option in group.GetProperty("options").EnumerateArray())
                {
                    var optionId = option.GetProperty("id").GetString();
                    if (!string.IsNullOrWhiteSpace(groupId) &&
                        !string.IsNullOrWhiteSpace(optionId) &&
                        optionId.StartsWith("dyn:", StringComparison.OrdinalIgnoreCase))
                    {
                        return (groupId, optionId);
                    }
                }
            }
        }

        throw new InvalidOperationException("No dynamic fulfillment option found in session response.");
    }

    private static string? ExtractSelectedOptionId(object? responseData, string groupId)
    {
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        var methods = GetEnvelopeData(doc).GetProperty("fulfillment").GetProperty("methods");
        foreach (var method in methods.EnumerateArray())
        {
            foreach (var group in method.GetProperty("groups").EnumerateArray())
            {
                if (!string.Equals(group.GetProperty("id").GetString(), groupId, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return group.TryGetProperty("selected_option_id", out var selectedOption)
                    ? selectedOption.GetString()
                    : null;
            }
        }

        return null;
    }

    private static JsonElement GetEnvelopeData(JsonDocument document) => document.RootElement;
}
