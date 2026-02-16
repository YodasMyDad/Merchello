using System.Text.Json;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

[Collection("Integration Tests")]
public class UcpSessionContractTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;

    public UcpSessionContractTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public async Task SessionResponse_ContainsLegalLinksAndTotalsArray()
    {
        var product = await CreateTestProductAsync();
        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto
                    {
                        Id = product.Id.ToString(),
                        Title = product.Name,
                        Price = 1200
                    },
                    Quantity = 1
                }
            ]
        };

        var response = await _adapter.CreateSessionAsync(request, CreateAgentIdentity());

        response.Success.ShouldBeTrue();
        using var envelopeJson = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        var data = envelopeJson.RootElement.TryGetProperty("data", out var dataNode)
            ? dataNode
            : envelopeJson.RootElement.GetProperty("Data");

        data.TryGetProperty("links", out var links).ShouldBeTrue();
        links.ValueKind.ShouldBe(JsonValueKind.Array);
        links.GetArrayLength().ShouldBeGreaterThanOrEqualTo(2);
        links.EnumerateArray().Any(link =>
            link.GetProperty("rel").GetString() == "terms" &&
            link.GetProperty("href").GetString() == "https://test.example.com/terms").ShouldBeTrue();
        links.EnumerateArray().Any(link =>
            link.GetProperty("rel").GetString() == "privacy" &&
            link.GetProperty("href").GetString() == "https://test.example.com/privacy").ShouldBeTrue();

        data.TryGetProperty("totals", out var totals).ShouldBeTrue();
        totals.ValueKind.ShouldBe(JsonValueKind.Array);
        totals.EnumerateArray().Any(total =>
            total.GetProperty("type").GetString() == "total" &&
            total.TryGetProperty("amount", out _)
        ).ShouldBeTrue();
    }

    [Fact]
    public async Task SessionResponse_ExposesPaymentHandlersInUcpMetadata()
    {
        var response = await _adapter.CreateSessionAsync(new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems = []
        }, CreateAgentIdentity());

        response.Success.ShouldBeTrue();
        var envelope = response.Data as ProtocolResponseEnvelope;
        envelope.ShouldNotBeNull();
        envelope!.Ucp.PaymentHandlers.ShouldNotBeNull();

        using var envelopeJson = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        var ucp = envelopeJson.RootElement.TryGetProperty("ucp", out var ucpNode)
            ? ucpNode
            : envelopeJson.RootElement.GetProperty("Ucp");
        ucp.TryGetProperty("payment_handlers", out _).ShouldBeTrue();
        var data = envelopeJson.RootElement.TryGetProperty("data", out var dataNode)
            ? dataNode
            : envelopeJson.RootElement.GetProperty("Data");
        data.TryGetProperty("payment", out _).ShouldBeFalse();
    }

    private async Task<Core.Products.Models.Product> CreateTestProductAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20m);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var warehouse = dataBuilder.CreateWarehouse("Contract Warehouse", "US");
        var productRoot = dataBuilder.CreateProductRoot("Contract Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"CON-{Guid.NewGuid():N}"[..10], productRoot, 12.00m);

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);
        dataBuilder.AddServiceRegion(warehouse, "US");
        dataBuilder.CreateShippingOption("Standard", warehouse, 4m, 2, 4);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        return product;
    }

    private static AgentIdentity CreateAgentIdentity() => new()
    {
        AgentId = "ucp-contract-agent",
        ProfileUri = "https://agent.example.com/profile",
        Protocol = ProtocolAliases.Ucp,
        Capabilities = [UcpCapabilityNames.Checkout]
    };
}
