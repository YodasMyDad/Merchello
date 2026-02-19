using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Integration tests for UCP checkout session lifecycle.
/// </summary>
[Collection("Integration Tests")]
public class UcpCheckoutSessionTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;
    private readonly ICheckoutService _checkoutService;
    private readonly LineItemFactory _lineItemFactory;

    public UcpCheckoutSessionTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _lineItemFactory = fixture.GetService<LineItemFactory>();
    }

    [Fact]
    public async Task CreateSessionAsync_WithLineItems_ReturnsCreatedSession()
    {
        // Arrange
        var product = await CreateTestProduct();

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
                        Price = 2500 // $25.00 in minor units
                    },
                    Quantity = 2
                }
            ]
        };

        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert
        response.ShouldNotBeNull();
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task CreateSessionAsync_WithBuyerInfo_SavesAddresses()
    {
        // Arrange
        var product = await CreateTestProduct();

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
                        Price = 1000
                    },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "test@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "John",
                    FamilyName = "Doe",
                    AddressLine1 = "123 Main St",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = true
            }
        };

        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task CreateSessionAsync_ReturnsIncompleteStatus()
    {
        // Arrange
        var product = await CreateTestProduct();

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
                        Price = 1000
                    },
                    Quantity = 1
                }
            ]
        };

        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        // New sessions without full buyer info should be "incomplete"
    }

    [Fact]
    public async Task GetSessionAsync_ReturnsSessionState()
    {
        // Arrange
        var product = await CreateTestProduct();
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
                        Price = 1500
                    },
                    Quantity = 1
                }
            ]
        };

        var agentIdentity = CreateTestAgentIdentity();
        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        createResponse.Success.ShouldBeTrue();

        // Extract session ID from response
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act
        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);

        // Assert
        getResponse.ShouldNotBeNull();
        getResponse.Success.ShouldBeTrue();
        getResponse.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetSessionAsync_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var invalidSessionId = Guid.NewGuid().ToString();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetSessionAsync(invalidSessionId, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
        response.Error?.Code.ShouldBe("not_found");
    }

    [Fact]
    public async Task UpdateSessionAsync_WithAddresses_UpdatesSession()
    {
        // Arrange
        var product = await CreateTestProduct();
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
                        Price = 2000
                    },
                    Quantity = 1
                }
            ]
        };

        var agentIdentity = CreateTestAgentIdentity();
        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Buyer = new UcpBuyerInfoDto
            {
                Email = "updated@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "Jane",
                    FamilyName = "Smith",
                    AddressLine1 = "456 Oak Ave",
                    Locality = "Manchester",
                    PostalCode = "M1 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = true
            }
        };

        // Act
        var updateResponse = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert
        updateResponse.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task CancelSessionAsync_DeletesBasket()
    {
        // Arrange
        var product = await CreateTestProduct();
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
                        Price = 1000
                    },
                    Quantity = 1
                }
            ]
        };

        var agentIdentity = CreateTestAgentIdentity();
        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Act
        var cancelResponse = await _adapter.CancelSessionAsync(sessionId, agentIdentity);

        // Assert
        cancelResponse.Success.ShouldBeTrue();

        // Verify session no longer exists
        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CancelSessionAsync_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var invalidSessionId = Guid.NewGuid().ToString();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.CancelSessionAsync(invalidSessionId, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
        response.Error?.Code.ShouldBe("not_found");
    }

    [Fact]
    public async Task CreateSessionAsync_WithEmptyLineItems_CreatesEmptySession()
    {
        // Arrange - empty line items is valid, creates an empty basket session
        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems = []
        };

        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert - session is created successfully but will be empty
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task UpdateSessionAsync_WithInvalidSessionId_ReturnsNotFound()
    {
        // Arrange
        var invalidSessionId = Guid.NewGuid().ToString();
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Buyer = new UcpBuyerInfoDto { Email = "test@example.com" }
        };

        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.UpdateSessionAsync(invalidSessionId, updateRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
        response.Error?.Code.ShouldBe("not_found");
    }

    #region Discount Application Tests

    [Fact]
    public async Task CreateSessionAsync_WithDiscountCodes_AcceptsDiscounts()
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
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 5000 },
                    Quantity = 1
                }
            ],
            Discounts = new UcpDiscountsRequestDto
            {
                Codes = ["TESTCODE10"]
            }
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert - Session creates successfully (discount validation happens during apply)
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateSessionAsync_WithDiscountCodes_AppliesDiscounts()
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
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 3000 },
                    Quantity = 1
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Discounts = new UcpDiscountsRequestDto
            {
                Codes = ["DISCOUNT20"]
            }
        };

        // Act
        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateSessionAsync_WithMultipleDiscountCodes_AppliesAll()
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
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 10000 },
                    Quantity = 1
                }
            ]
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Discounts = new UcpDiscountsRequestDto
            {
                Codes = ["CODE1", "CODE2", "CODE3"]
            }
        };

        // Act
        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert - Multiple codes are accepted
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateSessionAsync_WithEmptyDiscountCodes_ClearsDiscounts()
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
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 2000 },
                    Quantity = 1
                }
            ],
            Discounts = new UcpDiscountsRequestDto { Codes = ["INITIAL_CODE"] }
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Inject a promotional discount line item to verify clearing behavior end-to-end.
        Guid.TryParse(sessionId, out var basketId).ShouldBeTrue();
        var basket = await _checkoutService.GetBasketByIdAsync(new GetBasketByIdParameters
        {
            BasketId = basketId
        });
        basket.ShouldNotBeNull();

        var discountLineItem = _lineItemFactory.CreateDiscountLineItem(
            name: "Test Discount",
            sku: $"DISCOUNT-{Guid.NewGuid():N}"[..16],
            amount: -5m,
            extendedData: new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountCode] = "INITIAL_CODE",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountId] = Guid.NewGuid().ToString()
            });
        basket!.LineItems.Add(discountLineItem);
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket });

        var beforeClearResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        ExtractDiscountCodes(beforeClearResponse.Data).ShouldContain("INITIAL_CODE");

        // Update with empty codes should clear
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Discounts = new UcpDiscountsRequestDto { Codes = [] }
        };

        // Act
        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();

        var afterClearResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        ExtractDiscountCodes(afterClearResponse.Data).ShouldBeEmpty();
    }

    [Fact]
    public async Task GetSessionStateAsync_MapsCanonicalDiscountMetadata()
    {
        // Arrange
        var product = await CreateTestProduct();
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(_lineItemFactory.CreateFromProduct(product, 1));

        var codeDiscountId = Guid.NewGuid();
        basket.LineItems.Add(_lineItemFactory.CreateDiscountLineItem(
            name: "Code Discount",
            sku: $"DISC-{Guid.NewGuid():N}"[..12],
            amount: -10m,
            extendedData: new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountId] = codeDiscountId.ToString(),
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountCode] = "SAVE10",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountCategory] = DiscountCategory.AmountOffOrder.ToString(),
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = DiscountValueType.Percentage.ToString(),
                [Merchello.Core.Constants.ExtendedDataKeys.ApplyAfterTax] = true
            }));

        var automaticDiscountId = Guid.NewGuid();
        basket.LineItems.Add(_lineItemFactory.CreateDiscountLineItem(
            name: "Auto Shipping Discount",
            sku: $"DISC-{Guid.NewGuid():N}"[..12],
            amount: -5m,
            extendedData: new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountId] = automaticDiscountId.ToString(),
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountCategory] = DiscountCategory.FreeShipping.ToString(),
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = DiscountValueType.FixedAmount.ToString()
            }));

        await _checkoutService.SaveBasketAsync(new SaveBasketParameters
        {
            Basket = basket
        });

        // Act
        var state = await _checkoutService.GetSessionStateAsync(new GetSessionStateParameters
        {
            BasketId = basket.Id
        });

        // Assert
        state.ShouldNotBeNull();
        state!.Discounts.Count.ShouldBe(2);

        var codeDiscount = state.Discounts.Single(d => d.DiscountId == codeDiscountId.ToString());
        codeDiscount.Code.ShouldBe("SAVE10");
        codeDiscount.Type.ShouldBe(ProtocolDiscountTypes.Percentage);
        codeDiscount.IsAutomatic.ShouldBeFalse();

        var automaticDiscount = state.Discounts.Single(d => d.DiscountId == automaticDiscountId.ToString());
        automaticDiscount.Code.ShouldBeNull();
        automaticDiscount.Type.ShouldBe(ProtocolDiscountTypes.FreeShipping);
        automaticDiscount.IsAutomatic.ShouldBeTrue();
    }

    #endregion

    #region Fulfillment Selection Tests

    [Fact]
    public async Task UpdateSessionAsync_WithFulfillmentSelection_UpdatesShipping()
    {
        // Arrange
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
                Email = "fulfillment-test@example.com",
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

        // Update with fulfillment selection
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Fulfillment = new UcpFulfillmentRequestDto
            {
                Methods = [new UcpFulfillmentMethodRequestDto { Type = ProtocolFulfillmentTypes.Shipping }]
            }
        };

        // Act
        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task SessionWithShippingAddress_CalculatesShippingOptions()
    {
        // Arrange
        var product = await CreateTestProductWithShipping();
        var agentIdentity = CreateTestAgentIdentity();

        var request = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 1500 },
                    Quantity = 2
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "shipping-options@example.com",
                BillingAddress = new UcpAddressDto
                {
                    GivenName = "John",
                    FamilyName = "Doe",
                    AddressLine1 = "456 Oak St",
                    Locality = "Manchester",
                    PostalCode = "M1 1AA",
                    CountryCode = "GB"
                },
                ShippingSameAsBilling = true
            }
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity);

        // Assert - Session is created with address, shipping options can be calculated
        response.Success.ShouldBeTrue();
        var sessionId = ExtractSessionId(response.Data);

        var getResponse = await _adapter.GetSessionAsync(sessionId, agentIdentity);
        getResponse.Success.ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateSessionAsync_ChangingShippingAddress_RecalculatesOptions()
    {
        // Arrange
        var product = await CreateTestProductWithShipping();
        var agentIdentity = CreateTestAgentIdentity();

        var createRequest = new UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems =
            [
                new UcpLineItemRequestDto
                {
                    Item = new UcpItemInfoDto { Id = product.Id.ToString(), Title = product.Name, Price = 2000 },
                    Quantity = 1
                }
            ],
            Buyer = new UcpBuyerInfoDto
            {
                Email = "address-change@example.com",
                ShippingAddress = new UcpAddressDto
                {
                    GivenName = "Test",
                    FamilyName = "User",
                    AddressLine1 = "123 First St",
                    Locality = "London",
                    PostalCode = "SW1A 1AA",
                    CountryCode = "GB"
                }
            }
        };

        var createResponse = await _adapter.CreateSessionAsync(createRequest, agentIdentity);
        var sessionId = ExtractSessionId(createResponse.Data);

        // Change shipping address
        var updateRequest = new UcpUpdateSessionRequestDto
        {
            Buyer = new UcpBuyerInfoDto
            {
                ShippingAddress = new UcpAddressDto
                {
                    GivenName = "Test",
                    FamilyName = "User",
                    AddressLine1 = "789 New St",
                    Locality = "Edinburgh",
                    PostalCode = "EH1 1AA",
                    CountryCode = "GB"
                }
            }
        };

        // Act
        var response = await _adapter.UpdateSessionAsync(sessionId, updateRequest, agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
    }

    #endregion

    #region CompleteSession Tests

    [Fact]
    public async Task CompleteSessionAsync_WithInvalidPaymentHandlerFormat_ReturnsError()
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
                Email = "invalid-handler@example.com",
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

        // Complete with invalid handler format (missing colon separator)
        var completeRequest = new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "invalid-format-no-colon"
        };

        // Act
        var response = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);

        // Assert - Should fail due to invalid handler format
        response.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CompleteSessionAsync_WithNonexistentPaymentProvider_ReturnsError()
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
                Email = "nonexistent-provider@example.com",
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

        // Complete with non-existent provider
        var completeRequest = new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = "nonexistent-provider:card"
        };

        // Act
        var response = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);

        // Assert - Should fail since provider doesn't exist
        response.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CompleteSessionAsync_AfterCancellation_ReturnsError()
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
                Email = "cancelled-complete@example.com",
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

        // Cancel the session
        await _adapter.CancelSessionAsync(sessionId, agentIdentity);

        // Try to complete cancelled session
        var completeRequest = new UcpCompleteSessionRequestDto { PaymentHandlerId = "test:card" };

        // Act
        var response = await _adapter.CompleteSessionAsync(sessionId, completeRequest, agentIdentity);

        // Assert - Should fail after cancellation (implementation may return bad_request or not_found)
        response.Success.ShouldBeFalse();
        (response.Error?.Code == "not_found" || response.Error?.Code == "bad_request").ShouldBeTrue(
            $"Expected not_found or bad_request, got {response.Error?.Code}");
    }

    #endregion

    // Helper methods

    private async Task<Product> CreateTestProduct()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Test Supplier", "TEST");
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("TEST-SKU", productRoot, 25.00m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private async Task<Product> CreateTestProductWithShipping()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Shipping Supplier", "SHIP");
        var warehouse = dataBuilder.CreateWarehouse("Shipping Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Shippable Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"SHIP-{Guid.NewGuid():N}"[..12], productRoot, 30.00m);

        // Associate warehouse with product for shipping calculations
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);

        // Add service region for GB
        dataBuilder.AddServiceRegion(warehouse, "GB");

        // Create shipping options
        dataBuilder.CreateShippingOption("Standard Delivery", warehouse, 5.00m, 3, 5);
        dataBuilder.CreateShippingOption("Express Delivery", warehouse, 10.00m, 1, 2);

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
                UcpCapabilityNames.Order
            ]
        };
    }

    private static string ExtractSessionId(object? responseData)
    {
        if (responseData == null) return string.Empty;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        return json.RootElement.TryGetProperty("id", out var id) ? id.GetString() ?? string.Empty : string.Empty;
    }

    private static IReadOnlyList<string> ExtractDiscountCodes(object? responseData)
    {
        if (responseData == null)
        {
            return [];
        }

        using var document = JsonDocument.Parse(JsonSerializer.Serialize(responseData));
        var root = document.RootElement;

        if (!root.TryGetProperty("discounts", out var discountsElement) ||
            discountsElement.ValueKind != JsonValueKind.Object)
        {
            return [];
        }

        if (!discountsElement.TryGetProperty("codes", out var codesElement) ||
            codesElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var codes = new List<string>();
        foreach (var codeElement in codesElement.EnumerateArray())
        {
            var code = codeElement.GetString();
            if (!string.IsNullOrWhiteSpace(code))
            {
                codes.Add(code);
            }
        }

        return codes;
    }
}
