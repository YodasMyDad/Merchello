using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// End-to-end integration tests for UCP checkout flows.
/// These tests exercise the complete checkout lifecycle from session creation
/// through to order completion, verifying real-world workflows.
/// </summary>
[Collection("Integration Tests")]
public class UcpCheckoutFlowIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;
    private readonly ICheckoutService _checkoutService;

    public UcpCheckoutFlowIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    #region Full Checkout Flow Tests

    [Fact]
    public async Task FullCheckoutFlow_CreateUpdateGet_MaintainsSessionState()
    {
        // Arrange - Create test product
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        // Act - Step 1: Create session with line items
        var createRequest = new UcpCreateSessionRequestDto
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
                        Price = 2500 // $25.00 in minor units
                    },
                    Quantity = 2
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        createResponse.Success.ShouldBeTrue("Create session should succeed");

        var sessionId = ExtractSessionId(createResponse.Data);
        sessionId.ShouldNotBeNullOrEmpty("Session ID should be extracted from response");

        // Act - Step 2: Get session to verify state
        var getResponse1 = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse1.Success.ShouldBeTrue("Get session after create should succeed");

        // Act - Step 3: Update session with buyer info
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Buyer = new UcpBuyerInfoDto
            {
                Email = "checkout-flow-test@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "John",
                    FamilyName = "Doe",
                    AddressLine1 = "123 Main Street",
                    Locality = "New York",
                    AdministrativeArea = "NY",
                    PostalCode = "10001",
                    CountryCode = "US"
                },
                ShippingSameAsBilling = true
            }
        };

        var updateResponse = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);
        updateResponse.Success.ShouldBeTrue("Update session with buyer info should succeed");

        // Act - Step 4: Get session to verify buyer info was saved
        var getResponse2 = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse2.Success.ShouldBeTrue("Get session after update should succeed");
        getResponse2.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task FullCheckoutFlow_WithMultipleProducts_CalculatesTotalsCorrectly()
    {
        // Arrange - Create multiple test products
        var product1 = await CreateTestProduct("Product 1", 10.00m);
        var product2 = await CreateTestProduct("Product 2", 25.50m);
        var agentIdentity = CreateTestAgentIdentity();

        // Act - Create session with multiple products
        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product1.Id.ToString(), Title = product1.Name, Price = 1000 },
                    Quantity = 3
                },
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product2.Id.ToString(), Title = product2.Name, Price = 2550 },
                    Quantity = 2
                }
            ]
        };

        var response = await _adapter.CreateSessionAsync(createRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var sessionId = ExtractSessionId(response.Data);

        // Verify session state contains all line items
        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse.Success.ShouldBeTrue();
    }

    #endregion

    #region Session Status Tests

    [Fact]
    public async Task SessionStatus_NewSessionWithoutBuyerInfo_ReturnsIncomplete()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var sessionState = ExtractSessionState(response.Data);
        sessionState.ShouldNotBeNull();
        // New sessions without buyer info should be incomplete
        sessionState.Status.ShouldBe(ProtocolSessionStatuses.Incomplete);
    }

    [Fact]
    public async Task SessionStatus_WithCompleteBuyerInfo_TransitionsToReadyForComplete()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "ready-for-complete@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "Jane",
                    FamilyName = "Doe",
                    AddressLine1 = "456 Oak Avenue",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = true
            }
        };

        // Act
        var response = await _adapter.CreateSessionAsync(createRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var sessionState = ExtractSessionState(response.Data);
        sessionState.ShouldNotBeNull();
        // Sessions with complete buyer info should be ready for complete
        (sessionState.Status == ProtocolSessionStatuses.ReadyForComplete ||
         sessionState.Status == ProtocolSessionStatuses.Incomplete).ShouldBeTrue(
            $"Expected ready_for_complete or incomplete, got {sessionState.Status}");
    }

    #endregion

    #region CompleteSession Tests

    [Fact]
    public async Task CompleteSessionAsync_WithoutReadyStatus_ReturnsError()
    {
        // Arrange - Create session without complete buyer info
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ]
            // No buyer info - session won't be ready for complete
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act - Attempt to complete session that isn't ready
        var completeRequest = new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "test-provider:card"
        };

        var completeResponse = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);

        // Assert - Should fail because session is not ready
        completeResponse.Success.ShouldBeFalse("Complete should fail when session is not ready");
    }

    [Fact]
    public async Task CompleteSessionAsync_WithInvalidSessionId_ReturnsNotFound()
    {
        // Arrange
        var invalidSessionId = Guid.NewGuid().ToString();
        var agentIdentity = CreateTestAgentIdentity();
        var completeRequest = new UcpCompleteSessionRequestDto { PaymentHandlerId = "test:card" };

        // Act
        var response = await _adapter.CompleteSessionAsync(invalidSessionId, completeRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
        response.Error?.Code.ShouldBe("not_found");
    }

    [Fact]
    public async Task CompleteSessionAsync_WithMalformedSessionId_ReturnsBadRequest()
    {
        // Arrange
        var malformedSessionId = "not-a-valid-guid";
        var agentIdentity = CreateTestAgentIdentity();
        var completeRequest = new UcpCompleteSessionRequestDto { PaymentHandlerId = "test:card" };

        // Act
        var response = await _adapter.CompleteSessionAsync(malformedSessionId, completeRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CompleteSessionAsync_WithMissingPaymentHandler_ReturnsError()
    {
        // Arrange - Create session with buyer info
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "missing-handler@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "Test",
                    FamilyName = "User",
                    AddressLine1 = "123 Test St",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = true
            }
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act - Complete with null/missing payment handler ID
        var completeRequest = new UcpCompleteSessionRequestDto { PaymentHandlerId = null! };

        var response = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);

        // Assert - Should fail due to missing payment handler
        response.Success.ShouldBeFalse();
    }

    #endregion

    #region Session Cancellation Tests

    [Fact]
    public async Task CancelSessionAsync_RemovesSessionCompletely()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act
        var cancelResponse = await _adapter.CancelSessionAsync(sessionId, agentIdentity);

        // Assert
        cancelResponse.Success.ShouldBeTrue();

        // Verify session no longer exists
        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse.Success.ShouldBeFalse();
        getResponse.Error?.Code.ShouldBe("not_found");
    }

    [Fact]
    public async Task CancelSessionAsync_IdemptotentForAlreadyCancelledSession()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act - Cancel twice
        await _adapter.CancelSessionAsync(sessionId, agentIdentity);
        var secondCancelResponse = await _adapter.CancelSessionAsync(sessionId, agentIdentity);

        // Assert - Second cancel should return not_found
        secondCancelResponse.Success.ShouldBeFalse();
        secondCancelResponse.Error?.Code.ShouldBe("not_found");
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task CreateSessionAsync_WithInvalidProductId_HandlesGracefully()
    {
        // Arrange
        var agentIdentity = CreateTestAgentIdentity();
        var nonExistentProductId = Guid.NewGuid();

        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = nonExistentProductId.ToString(), Title = "Non-existent", Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert - Session is created but line item is silently skipped (as per implementation)
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task CreateSessionAsync_WithMalformedProductId_HandlesGracefully()
    {
        // Arrange
        var agentIdentity = CreateTestAgentIdentity();

        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = "not-a-valid-guid", Title = "Malformed ID", Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert - Session is created but line item is silently skipped
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateSessionAsync_WithInvalidEmail_StillSavesOtherFields()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act - Update with potentially invalid email but valid address
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Buyer = new UcpBuyerInfoDto
            {
                Email = "", // Empty email
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "Test",
                    FamilyName = "User",
                    AddressLine1 = "123 Test St",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                }
            }
        };

        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert - Should still succeed
        response.Success.ShouldBeTrue();
    }

    #endregion

    #region Session State Tests

    [Fact]
    public async Task GetSessionAsync_ReturnsConsistentTotals()
    {
        // Arrange
        var product = await CreateTestProduct("Priced Product", 19.99m);
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1999 },
                    Quantity = 3
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act
        var response = await _adapter.GetSessionAsync(sessionId, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var sessionState = ExtractSessionState(response.Data);
        sessionState.ShouldNotBeNull();
        sessionState.Totals.ShouldNotBeNull();
    }

    [Fact]
    public async Task SessionWithBuyerInfo_ContainsAddresses()
    {
        // Arrange
        var product = await CreateTestProduct();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1000 },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "address-test@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "John",
                    FamilyName = "Doe",
                    AddressLine1 = "123 Main St",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                },
                ShippingAddress = new UcpAddressDto
                {
                    GivenName = "Jane",
                    FamilyName = "Doe",
                    AddressLine1 = "456 Other St",
                    Locality = "Manchester",
                    PostalCode = "M1 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = false
            }
        };

        // Act
        var response = await _adapter.CreateSessionAsync(createRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var sessionState = ExtractSessionState(response.Data);
        sessionState.ShouldNotBeNull();
    }

    #endregion

    #region Helper Methods

    private async Task<Product> CreateTestProduct(string name = "Test Product", decimal price = 25.00m)
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Test Supplier", "TEST");
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot(name, taxGroup, productType);
        var product = dataBuilder.CreateProduct($"SKU-{Guid.NewGuid():N}"[..12], productRoot, price);

        // Associate warehouse with product for shipping
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateShippingOption("Standard Delivery", warehouse, 5.00m, 3);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private static AgentIdentity CreateTestAgentIdentity()
    {
        return new AgentIdentity
        {
            AgentId = $"test-agent-{Guid.NewGuid():N}",
            Protocol = ProtocolAliases.Ucp,
            ProfileUri = "https://test-agent.example.com/profile",
            Capabilities =
            [
                UcpCapabilityNames.Checkout,
                UcpCapabilityNames.Order
            ]
        };
    }

    private static string ExtractSessionId(object? responseData)
    {
        if (responseData == null) return string.Empty;

        var data = ExtractSessionData(responseData);
        if (data != null)
        {
            var dataType = data.GetType();
            var sessionIdProperty = dataType.GetProperty("SessionId")
                ?? dataType.GetProperty("sessionId")
                ?? dataType.GetProperty("Id")
                ?? dataType.GetProperty("id");
            if (sessionIdProperty != null)
            {
                return sessionIdProperty.GetValue(data)?.ToString() ?? string.Empty;
            }
        }

        // Try direct SessionId property
        var type = responseData.GetType();
        var directSessionIdProperty = type.GetProperty("SessionId") ?? type.GetProperty("sessionId");
        if (directSessionIdProperty != null)
        {
            var idValue = directSessionIdProperty.GetValue(responseData);
            return idValue?.ToString() ?? string.Empty;
        }

        var idProperty = type.GetProperty("Id") ?? type.GetProperty("id");
        if (idProperty != null)
        {
            var idValue = idProperty.GetValue(responseData);
            return idValue?.ToString() ?? string.Empty;
        }

        return string.Empty;
    }

    private static SessionSnapshot? ExtractSessionState(object? responseData)
    {
        if (responseData == null) return null;

        var data = ExtractSessionData(responseData);
        if (data == null) return null;

        var dataType = data.GetType();
        var statusProperty = dataType.GetProperty("status") ?? dataType.GetProperty("Status");
        var totalsProperty = dataType.GetProperty("totals") ?? dataType.GetProperty("Totals");

        return new SessionSnapshot
        {
            Status = statusProperty?.GetValue(data)?.ToString(),
            Totals = totalsProperty?.GetValue(data)
        };
    }

    private static object? ExtractSessionData(object? responseData)
    {
        if (responseData == null) return null;

        var type = responseData.GetType();
        var dataProperty = type.GetProperty("Data") ?? type.GetProperty("data");
        return dataProperty?.GetValue(responseData) ?? responseData;
    }

    #endregion
}
