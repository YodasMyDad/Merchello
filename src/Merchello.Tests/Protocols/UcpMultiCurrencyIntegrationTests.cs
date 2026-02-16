using System.Text.Json;
using Merchello.Core.Accounting.Services.Interfaces;
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

[Collection("Integration Tests")]
public class UcpMultiCurrencyIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;
    private readonly IInvoiceService _invoiceService;

    public UcpMultiCurrencyIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
        _invoiceService = fixture.GetService<IInvoiceService>();
    }

    [Fact]
    public async Task SessionAmounts_UseDisplayCurrencyMultiplyConversion()
    {
        _fixture.SetExchangeRate("USD", "EUR", 2m);
        var product = await CreateShippableProductAsync(10m);

        var response = await _adapter.CreateSessionAsync(new UcpCreateSessionRequestDto
        {
            Currency = "EUR",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto
                    {
                        Id = product.Id.ToString(),
                        Title = product.Name,
                        Price = 1000
                    },
                    Quantity = 1
                }
            ]
        }, CreateAgentIdentity());

        response.Success.ShouldBeTrue();
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        var data = GetEnvelopeData(json);
        var firstLineItem = data.GetProperty("line_items")[0];

        // Store price is $10.00; with USD->EUR rate 2.0, display should be €20.00 (minor: 2000).
        firstLineItem.GetProperty("item").GetProperty("price").GetInt64().ShouldBe(2000);
    }

    [Fact]
    public async Task CompleteFlow_LocksInvoiceRate_AndPaymentUsesPresentmentTotals()
    {
        _fixture.SetExchangeRate("USD", "EUR", 2m);
        _fixture.SetExchangeRate("EUR", "USD", 0.5m);
        ConfigureManualProviderForCheckout(PaymentResultStatus.Completed);
        var product = await CreateShippableProductAsync(10m);
        var agent = CreateAgentIdentity();

        var createResponse = await _adapter.CreateSessionAsync(new UcpCreateSessionRequestDto
        {
            Currency = "EUR",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto
                    {
                        Id = product.Id.ToString(),
                        Title = product.Name,
                        Price = 1000
                    },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "fx-checkout@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "Fx",
                    FamilyName = "Buyer",
                    AddressLine1 = "123 Main Street",
                    Locality = "Austin",
                    AdministrativeArea = "TX",
                    PostalCode = "78701",
                    CountryCode = "US"
                },
                ShippingSameAsBilling = true
            }
        }, agent);
        createResponse.Success.ShouldBeTrue();

        var sessionId = ExtractSessionId(createResponse.Data);
        var (groupId, optionId) = ExtractFirstFulfillmentOption(createResponse.Data);
        groupId.ShouldNotBeNullOrWhiteSpace();
        optionId.ShouldNotBeNullOrWhiteSpace();

        var updateResponse = await _adapter.UpdateSessionAsync(sessionId, new UcpUpdateSessionRequestDto
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
        }, agent);
        updateResponse.Success.ShouldBeTrue();

        var completeResponse = await _adapter.CompleteSessionAsync(sessionId, new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "manual:manual",
            PaymentInstrument = new UcpPaymentInstrumentDto
            {
                Data = new Dictionary<string, object>
                {
                    ["reference"] = "FX-REF-001"
                }
            }
        }, agent);
        completeResponse.Success.ShouldBeTrue();

        using var completionJson = JsonDocument.Parse(JsonSerializer.Serialize(completeResponse.Data));
        var invoiceId = Guid.Parse(GetEnvelopeData(completionJson).GetProperty("order_id").GetString()!);
        var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
        invoice.ShouldNotBeNull();

        invoice!.CurrencyCode.ShouldBe("EUR");
        invoice.StoreCurrencyCode.ShouldBe("USD");
        invoice.PricingExchangeRate.ShouldNotBeNull();
        invoice.PricingExchangeRate!.Value.ShouldBe(0.5m);
        invoice.PricingExchangeRateTimestampUtc.ShouldNotBeNull();

        invoice.Payments.ShouldNotBeNull();
        invoice.Payments!.ShouldNotBeEmpty();
        invoice.Payments.First().Amount.ShouldBe(invoice.Total);
        invoice.Payments.First().CurrencyCode.ShouldBe("EUR");
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

    private async Task<Core.Products.Models.Product> CreateShippableProductAsync(decimal price)
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("No Tax", 0m);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("FX Supplier", "FX");
        var warehouse = dataBuilder.CreateWarehouse("FX Warehouse", "US", supplier);
        var productRoot = dataBuilder.CreateProductRoot("FX Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"FX-{Guid.NewGuid():N}"[..10], productRoot, price);

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        dataBuilder.AddServiceRegion(warehouse, "US");
        dataBuilder.CreateShippingOption("Standard", warehouse, 3m, 2, 3);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        return product;
    }

    private static AgentIdentity CreateAgentIdentity() => new()
    {
        AgentId = $"fx-agent-{Guid.NewGuid():N}",
        ProfileUri = "https://agent.example.com/profile",
        Protocol = ProtocolAliases.Ucp,
        Capabilities = [UcpCapabilityNames.Checkout, UcpCapabilityNames.Order]
    };

    private static string ExtractSessionId(object? responseData)
    {
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        return GetEnvelopeData(json).GetProperty("id").GetString() ?? string.Empty;
    }

    private static (string GroupId, string OptionId) ExtractFirstFulfillmentOption(object? responseData)
    {
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        var methods = GetEnvelopeData(json).GetProperty("fulfillment").GetProperty("methods");
        foreach (var method in methods.EnumerateArray())
        {
            foreach (var group in method.GetProperty("groups").EnumerateArray())
            {
                var groupId = group.GetProperty("id").GetString();
                foreach (var option in group.GetProperty("options").EnumerateArray())
                {
                    var optionId = option.GetProperty("id").GetString();
                    if (!string.IsNullOrWhiteSpace(groupId) && !string.IsNullOrWhiteSpace(optionId))
                    {
                        return (groupId, optionId);
                    }
                }
            }
        }

        throw new InvalidOperationException("No fulfillment options found in session response.");
    }

    private static JsonElement GetEnvelopeData(JsonDocument document)
    {
        return document.RootElement.TryGetProperty("data", out var data)
            ? data
            : document.RootElement.GetProperty("Data");
    }
}
