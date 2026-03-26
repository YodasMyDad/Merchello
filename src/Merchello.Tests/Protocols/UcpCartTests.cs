using System.Text.Json;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Integration tests for UCP Cart capability (draft spec).
/// </summary>
[Collection("Integration Tests")]
public class UcpCartTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;
    private readonly ICheckoutService _checkoutService;
    private readonly LineItemFactory _lineItemFactory;

    public UcpCartTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _lineItemFactory = fixture.GetService<LineItemFactory>();
    }

    [Fact]
    public async Task CreateCartAsync_ReturnsCreated_WithNoPaymentHandlers()
    {
        // Arrange
        var product = await CreateTestProduct();
        var request = new UcpCreateCartRequestDto
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
                        Price = 2500
                    },
                    Quantity = 2
                }
            ]
        };

        // Act
        var response = await _adapter.CreateCartAsync(request, CreateTestAgentIdentity());

        // Assert
        response.ShouldNotBeNull();
        response.Success.ShouldBeTrue();
        response.StatusCode.ShouldBe(201);
        response.Data.ShouldNotBeNull();

        // Verify no payment_handlers in envelope
        var json = SerializeToJsonElement(response.Data);
        json.TryGetProperty("ucp", out var ucpElement).ShouldBeTrue();
        if (ucpElement.TryGetProperty("payment_handlers", out var handlers))
        {
            handlers.ValueKind.ShouldBe(JsonValueKind.Null);
        }

        // Verify cart has line items
        json.TryGetProperty("line_items", out var lineItems).ShouldBeTrue();
        lineItems.GetArrayLength().ShouldBe(1);
    }

    [Fact]
    public async Task GetCartAsync_ReturnsOk_ForValidCartId()
    {
        // Arrange
        var product = await CreateTestProduct();
        var createResponse = await _adapter.CreateCartAsync(
            new UcpCreateCartRequestDto
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
                            Price = 1000
                        },
                        Quantity = 1
                    }
                ]
            },
            CreateTestAgentIdentity());

        var cartId = ExtractId(createResponse.Data);

        // Act
        var response = await _adapter.GetCartAsync(cartId, CreateTestAgentIdentity());

        // Assert
        response.Success.ShouldBeTrue();
        response.StatusCode.ShouldBe(200);

        var json = SerializeToJsonElement(response.Data);
        json.TryGetProperty("id", out var idElement).ShouldBeTrue();
        idElement.GetString().ShouldBe(cartId);
    }

    [Fact]
    public async Task GetCartAsync_ReturnsNotFound_ForInvalidId()
    {
        // Act
        var response = await _adapter.GetCartAsync(Guid.NewGuid().ToString(), CreateTestAgentIdentity());

        // Assert
        response.Success.ShouldBeFalse();
        response.StatusCode.ShouldBe(404);
    }

    [Fact]
    public async Task UpdateCartAsync_AppliesLineItemChanges()
    {
        // Arrange
        var product = await CreateTestProduct();
        var createResponse = await _adapter.CreateCartAsync(
            new UcpCreateCartRequestDto
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
                            Price = 1000
                        },
                        Quantity = 1
                    }
                ]
            },
            CreateTestAgentIdentity());

        var cartId = ExtractId(createResponse.Data);
        var lineItemId = ExtractFirstLineItemId(createResponse.Data);

        // Act - update quantity to 3
        var updateRequest = new UcpUpdateCartRequestDto
        {
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Id = lineItemId,
                    Item = new UcpItemInfoDto
                    {
                        Id = product.Id.ToString(),
                        Title = product.Name,
                        Price = 1000
                    },
                    Quantity = 3
                }
            ]
        };

        var response = await _adapter.UpdateCartAsync(cartId, updateRequest, CreateTestAgentIdentity());

        // Assert
        response.Success.ShouldBeTrue();
        response.StatusCode.ShouldBe(200);

        var json = SerializeToJsonElement(response.Data);
        json.TryGetProperty("line_items", out var lineItems).ShouldBeTrue();
        lineItems.GetArrayLength().ShouldBe(1);

        var firstItem = lineItems[0];
        firstItem.TryGetProperty("quantity", out var qty).ShouldBeTrue();
        qty.GetInt32().ShouldBe(3);
    }

    [Fact]
    public async Task CancelCartAsync_DeletesAndReturnsCanceled()
    {
        // Arrange
        var product = await CreateTestProduct();
        var createResponse = await _adapter.CreateCartAsync(
            new UcpCreateCartRequestDto
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
                            Price = 500
                        },
                        Quantity = 1
                    }
                ]
            },
            CreateTestAgentIdentity());

        var cartId = ExtractId(createResponse.Data);

        // Act
        var response = await _adapter.CancelCartAsync(cartId, CreateTestAgentIdentity());

        // Assert
        response.Success.ShouldBeTrue();
        response.StatusCode.ShouldBe(200);

        var json = SerializeToJsonElement(response.Data);
        json.TryGetProperty("status", out var status).ShouldBeTrue();
        status.GetString().ShouldBe("canceled");

        // Verify cart no longer exists
        var getResponse = await _adapter.GetCartAsync(cartId, CreateTestAgentIdentity());
        getResponse.Success.ShouldBeFalse();
        getResponse.StatusCode.ShouldBe(404);
    }

    [Fact]
    public async Task CreateSessionAsync_WithCartId_ConvertsCartToCheckout()
    {
        // Arrange - create a cart first
        var product = await CreateTestProduct();
        var cartResponse = await _adapter.CreateCartAsync(
            new UcpCreateCartRequestDto
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
                            Price = 2000
                        },
                        Quantity = 1
                    }
                ]
            },
            CreateTestAgentIdentity());

        cartResponse.Success.ShouldBeTrue();
        var cartId = ExtractId(cartResponse.Data);

        // Act - create checkout session from cart
        var checkoutRequest = new UcpCreateSessionRequestDto
        {
            CartId = cartId
        };

        var response = await _adapter.CreateSessionAsync(checkoutRequest, CreateTestAgentIdentity());

        // Assert
        response.Success.ShouldBeTrue();
        response.StatusCode.ShouldBe(201);

        // The checkout session should use the same basket ID
        var sessionId = ExtractId(response.Data);
        sessionId.ShouldBe(cartId);

        // Checkout envelope should have payment_handlers in ucp metadata
        var json = SerializeToJsonElement(response.Data);
        json.TryGetProperty("ucp", out var ucpElement).ShouldBeTrue();
        ucpElement.TryGetProperty("payment_handlers", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task Manifest_IncludesCartCapability_WhenEnabled()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest!.Ucp.Capabilities.ShouldContain(c => c.Name == UcpCapabilityNames.Cart);

        var cartCapability = manifest.Ucp.Capabilities.First(c => c.Name == UcpCapabilityNames.Cart);
        cartCapability.Version.ShouldBe(ProtocolVersions.DraftVersion);
        cartCapability.Spec.ShouldContain("cart");
    }

    // --- Helpers ---

    private async Task<Product> CreateTestProduct()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Test Supplier", "TEST");
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Cart Test Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"CART-{Guid.NewGuid():N}"[..12], productRoot, 25.00m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private static AgentIdentity CreateTestAgentIdentity()
    {
        return new AgentIdentity
        {
            AgentId = Guid.NewGuid().ToString(),
            Protocol = ProtocolAliases.Ucp,
            ProfileUri = "https://test-agent.example.com/profile",
            Capabilities =
            [
                UcpCapabilityNames.Checkout,
                UcpCapabilityNames.Cart,
                UcpCapabilityNames.Order
            ]
        };
    }

    private static string ExtractId(object? responseData)
    {
        if (responseData == null) return string.Empty;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        return json.RootElement.TryGetProperty("id", out var id) ? id.GetString() ?? string.Empty : string.Empty;
    }

    private static string ExtractFirstLineItemId(object? responseData)
    {
        if (responseData == null) return string.Empty;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        if (json.RootElement.TryGetProperty("line_items", out var items) && items.GetArrayLength() > 0)
        {
            return items[0].TryGetProperty("id", out var id) ? id.GetString() ?? string.Empty : string.Empty;
        }
        return string.Empty;
    }

    private static JsonElement SerializeToJsonElement(object? data)
    {
        var jsonString = JsonSerializer.Serialize(data);
        return JsonDocument.Parse(jsonString).RootElement;
    }
}
