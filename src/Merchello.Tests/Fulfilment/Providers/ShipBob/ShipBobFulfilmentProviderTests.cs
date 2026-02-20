using System.Reflection;
using System.Text;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.ShipBob;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.ShipBob;

public class ShipBobFulfilmentProviderTests
{
    private readonly ShipBobFulfilmentProvider _provider;

    public ShipBobFulfilmentProviderTests()
    {
        _provider = new ShipBobFulfilmentProvider(NullLogger<ShipBobFulfilmentProvider>.Instance);
    }

    #region Metadata Tests

    [Fact]
    public void Metadata_HasCorrectKey()
    {
        _provider.Metadata.Key.ShouldBe("shipbob");
    }

    [Fact]
    public void Metadata_HasCorrectDisplayName()
    {
        _provider.Metadata.DisplayName.ShouldBe("ShipBob");
    }

    [Fact]
    public void Metadata_SupportsAllCapabilities()
    {
        var metadata = _provider.Metadata;

        metadata.SupportsOrderSubmission.ShouldBeTrue();
        metadata.SupportsOrderCancellation.ShouldBeTrue();
        metadata.SupportsWebhooks.ShouldBeTrue();
        metadata.SupportsPolling.ShouldBeTrue();
        metadata.SupportsProductSync.ShouldBeTrue();
        metadata.SupportsInventorySync.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_HasRestApiStyle()
    {
        _provider.Metadata.ApiStyle.ShouldBe(FulfilmentApiStyle.Rest);
    }

    [Fact]
    public void Metadata_HasIconSvg()
    {
        _provider.Metadata.IconSvg.ShouldBe(ProviderBrandLogoCatalog.ShipBob);
    }

    [Fact]
    public void Metadata_HasDescription()
    {
        _provider.Metadata.Description.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Metadata_HasSetupInstructions()
    {
        _provider.Metadata.SetupInstructions.ShouldNotBeNullOrWhiteSpace();
        _provider.Metadata.SetupInstructions.ShouldContain("ShipBob");
    }

    #endregion

    #region Configuration Field Tests

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsRequiredFields()
    {
        // Act
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        // Assert
        fields.Count.ShouldBeGreaterThan(0);

        // Check for required fields
        var patField = fields.FirstOrDefault(f => f.Key == "PersonalAccessToken");
        patField.ShouldNotBeNull();
        patField.IsRequired.ShouldBeTrue();
        patField.IsSensitive.ShouldBeTrue();
        patField.FieldType.ShouldBe(ConfigurationFieldType.Password);

        var channelIdField = fields.FirstOrDefault(f => f.Key == "ChannelId");
        channelIdField.ShouldNotBeNull();
        channelIdField.IsRequired.ShouldBeTrue();
        channelIdField.FieldType.ShouldBe(ConfigurationFieldType.Number);
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsOptionalFields()
    {
        // Act
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        // Assert
        var webhookSecretField = fields.FirstOrDefault(f => f.Key == "WebhookSecret");
        webhookSecretField.ShouldNotBeNull();
        webhookSecretField.IsRequired.ShouldBeFalse();
        webhookSecretField.IsSensitive.ShouldBeTrue();

        var apiVersionField = fields.FirstOrDefault(f => f.Key == "ApiVersion");
        apiVersionField.ShouldNotBeNull();
        apiVersionField.IsRequired.ShouldBeFalse();
        apiVersionField.DefaultValue.ShouldBe("2026-01");

        var debugField = fields.FirstOrDefault(f => f.Key == "EnableDebugLogging");
        debugField.ShouldNotBeNull();
        debugField.FieldType.ShouldBe(ConfigurationFieldType.Checkbox);
    }

    #endregion

    #region Configuration Tests

    [Fact]
    public async Task ConfigureAsync_WithNullConfiguration_DoesNotThrow()
    {
        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(null));
    }

    [Fact]
    public async Task ConfigureAsync_WithEmptySettingsJson_DoesNotThrow()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = null
        };

        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(config));
    }

    [Fact]
    public async Task ConfigureAsync_WithValidSettings_ConfiguresSuccessfully()
    {
        // Arrange
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345
        };

        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = settings.ToJson()
        };

        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(config));
    }

    #endregion

    #region Unconfigured Provider Tests

    [Fact]
    public async Task TestConnectionAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Act
        var result = await _provider.TestConnectionAsync();

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task SubmitOrderAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var request = CreateTestOrderRequest();

        // Act
        var result = await _provider.SubmitOrderAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task CancelOrderAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Act
        var result = await _provider.CancelOrderAsync("12345");

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task PollOrderStatusAsync_WhenNotConfigured_ReturnsEmptyList()
    {
        // Act
        var result = await _provider.PollOrderStatusAsync(["12345"]);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task SyncProductsAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var products = new List<FulfilmentProduct>
        {
            new() { ProductId = Guid.NewGuid(), Sku = "TEST-SKU", Name = "Test Product" }
        };

        // Act
        var result = await _provider.SyncProductsAsync(products);

        // Assert
        result.Success.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("not configured"));
    }

    [Fact]
    public async Task GetInventoryLevelsAsync_WhenNotConfigured_ReturnsEmptyList()
    {
        // Act
        var result = await _provider.GetInventoryLevelsAsync();

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetInventoryLevelsAsync_UsesSkuFirstWhenProvided()
    {
        // Arrange
        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = new ShipBobSettings
            {
                PersonalAccessToken = "pat_test_token",
                ChannelId = 12345,
                ApiBaseUrl = "https://api.shipbob.test"
            }.ToJson()
        });

        var handler = new ShipBobApiClientTests_OneShotHandler("""
            [
              {
                "id": 101,
                "name": "Fallback Name",
                "sku": "SKU-INV-001",
                "total_fulfillable_quantity": 9,
                "total_committed_quantity": 1,
                "total_awaiting_quantity": 0
              }
            ]
            """);
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345,
            ApiVersion = "2026-01"
        };
        var apiClient = new ShipBobApiClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://api.shipbob.test") },
            settings,
            NullLogger.Instance);
        SetProviderApiClientForTest(_provider, apiClient);

        // Act
        var levels = await _provider.GetInventoryLevelsAsync();

        // Assert
        levels.Count.ShouldBe(1);
        levels[0].Sku.ShouldBe("SKU-INV-001");
        levels[0].AvailableQuantity.ShouldBe(9);
    }

    #endregion

    #region Validation Tests

    [Fact]
    public async Task CancelOrderAsync_WithInvalidProviderReference_ReturnsFailure()
    {
        // Arrange - Configure with valid settings first
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345
        };

        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = settings.ToJson()
        });

        // Act
        var result = await _provider.CancelOrderAsync("not_a_number");

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid provider reference");
    }

    [Fact]
    public async Task GetWebhookEventTemplatesAsync_ReturnsShipBobTemplates()
    {
        // Act
        var templates = await _provider.GetWebhookEventTemplatesAsync();

        // Assert
        templates.ShouldNotBeEmpty();
        templates.ShouldContain(x => x.EventType == "order.shipped");
        templates.ShouldContain(x => x.EventType == "order.delivered");
        templates.ShouldContain(x => x.EventType == "order.cancelled");
        templates.ShouldContain(x => x.EventType == "shipment.created");
    }

    [Fact]
    public async Task GenerateTestWebhookPayloadAsync_ProducesPayloadThatCanBeProcessed()
    {
        // Arrange
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345,
            WebhookSecret = "webhook-secret"
        };

        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = settings.ToJson()
        });

        // Act
        var (payload, headers) = await _provider.GenerateTestWebhookPayloadAsync(new GenerateFulfilmentWebhookPayloadRequest
        {
            EventType = "order.shipped",
            ProviderReference = "REF-123",
            ProviderShipmentId = "456",
            TrackingNumber = "TRACK-123",
            Carrier = "UPS",
            ShippedDate = DateTime.UtcNow
        });

        var request = BuildRequest(payload, headers);
        var isValid = await _provider.ValidateWebhookAsync(request);
        var parsed = await _provider.ProcessWebhookAsync(request);

        // Assert
        isValid.ShouldBeTrue();
        parsed.Success.ShouldBeTrue();
        parsed.EventType.ShouldNotBeNullOrWhiteSpace();
        parsed.StatusUpdates.Count.ShouldBe(1);
        parsed.StatusUpdates[0].ProviderReference.ShouldBe("12345");
        parsed.StatusUpdates[0].ExtendedData["ShipBobReferenceId"].ToString().ShouldBe("REF-123");
        parsed.ShipmentUpdates.Count.ShouldBe(1);
        parsed.ShipmentUpdates[0].ProviderReference.ShouldBe("12345");
        parsed.ShipmentUpdates[0].TrackingNumber.ShouldBe("TRACK-123");
        var shippedItems = parsed.ShipmentUpdates[0].Items;
        shippedItems.ShouldNotBeNull();
        shippedItems!.Count.ShouldBe(1);
        shippedItems[0].Sku.ShouldBe("TEST-SKU-001");
        headers.ContainsKey("x-webhook-topic").ShouldBeTrue();
    }

    [Fact]
    public async Task ProcessWebhookAsync_PrefersOrderIdAsProviderReference_WhenBothOrderIdAndReferenceIdExist()
    {
        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = new ShipBobSettings
            {
                PersonalAccessToken = "pat_test_token",
                ChannelId = 12345
            }.ToJson()
        });

        const string payload = """
            {
              "topic": "order.shipped",
              "data": {
                "id": 555,
                "order_id": 777,
                "reference_id": "ORDER-GUID-ABC",
                "status": "shipped",
                "shipment": {
                  "id": 555,
                  "tracking": {
                    "tracking_number": "TRACK-777",
                    "tracking_url": "https://tracking.example.com/TRACK-777",
                    "carrier": "UPS"
                  },
                  "products": [
                    {
                      "sku": "TEST-SKU-001",
                      "quantity": 1
                    }
                  ]
                }
              }
            }
            """;

        var request = BuildRequest(payload, new Dictionary<string, string>
        {
            ["x-webhook-topic"] = "order.shipped"
        });

        var parsed = await _provider.ProcessWebhookAsync(request);

        parsed.Success.ShouldBeTrue();
        parsed.StatusUpdates.Count.ShouldBe(1);
        parsed.StatusUpdates[0].ProviderReference.ShouldBe("777");
        parsed.StatusUpdates[0].ExtendedData["ShipBobReferenceId"].ToString().ShouldBe("ORDER-GUID-ABC");
        parsed.ShipmentUpdates.Count.ShouldBe(1);
        parsed.ShipmentUpdates[0].ProviderReference.ShouldBe("777");
    }

    [Fact]
    public async Task PollOrderStatusAsync_WithNumericProviderReferences_UsesOrderIdEndpoint()
    {
        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = new ShipBobSettings
            {
                PersonalAccessToken = "pat_test_token",
                ChannelId = 12345,
                ApiBaseUrl = "https://api.shipbob.test",
                ApiVersion = "2026-01"
            }.ToJson()
        });

        var handler = new SequenceJsonHandler(
        [
            """
            {
              "id": 123,
              "reference_id": "ORDER-GUID-123",
              "status": "in_transit"
            }
            """,
            """
            {
              "id": 456,
              "reference_id": "ORDER-GUID-456",
              "status": "processing",
              "shipments": [
                {
                  "id": 4561,
                  "status": "delivered",
                  "status_details": [
                    { "id": 203 }
                  ],
                  "created_date": "2026-01-01T00:00:00Z"
                }
              ]
            }
            """
        ]);

        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345,
            ApiVersion = "2026-01"
        };
        var apiClient = new ShipBobApiClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://api.shipbob.test") },
            settings,
            NullLogger.Instance);
        SetProviderApiClientForTest(_provider, apiClient);

        var updates = await _provider.PollOrderStatusAsync(["123", "456"]);

        updates.Count.ShouldBe(2);
        updates.ShouldContain(x =>
            x.ProviderReference == "123" &&
            x.MappedStatus == OrderStatus.Shipped &&
            x.ExtendedData["ShipBobReferenceId"].ToString() == "ORDER-GUID-123");
        updates.ShouldContain(x =>
            x.ProviderReference == "456" &&
            x.MappedStatus == OrderStatus.Completed &&
            x.ExtendedData["ShipBobReferenceId"].ToString() == "ORDER-GUID-456");

        handler.Requests.Count.ShouldBe(2);
        handler.Requests[0].RequestUri!.PathAndQuery.ShouldBe("/2026-01/order/123");
        handler.Requests[1].RequestUri!.PathAndQuery.ShouldBe("/2026-01/order/456");
    }

    #endregion

    #region Settings Tests

    [Fact]
    public void ShipBobSettings_IsValid_RequiresTokenAndChannelId()
    {
        // Missing both
        new ShipBobSettings().IsValid.ShouldBeFalse();

        // Missing channel ID
        new ShipBobSettings { PersonalAccessToken = "pat_test" }.IsValid.ShouldBeFalse();

        // Missing token
        new ShipBobSettings { ChannelId = 123 }.IsValid.ShouldBeFalse();

        // Has both
        new ShipBobSettings { PersonalAccessToken = "pat_test", ChannelId = 123 }.IsValid.ShouldBeTrue();
    }

    [Fact]
    public void ShipBobSettings_HasCorrectDefaults()
    {
        var settings = new ShipBobSettings();

        settings.ApiBaseUrl.ShouldBe("https://api.shipbob.com");
        settings.ApiVersion.ShouldBe("2026-01");
        settings.TimeoutSeconds.ShouldBe(30);
        settings.EnableDebugLogging.ShouldBeFalse();
    }

    [Fact]
    public void ShipBobSettings_GetVersionedBaseUrl_ReturnsCorrectUrl()
    {
        var settings = new ShipBobSettings
        {
            ApiBaseUrl = "https://api.shipbob.com",
            ApiVersion = "2026-01"
        };

        settings.GetVersionedBaseUrl().ShouldBe("https://api.shipbob.com/2026-01");
    }

    [Fact]
    public void ShipBobSettings_GetVersionedBaseUrl_HandlesTrailingSlash()
    {
        var settings = new ShipBobSettings
        {
            ApiBaseUrl = "https://api.shipbob.com/",
            ApiVersion = "2026-01"
        };

        settings.GetVersionedBaseUrl().ShouldBe("https://api.shipbob.com/2026-01");
    }

    [Fact]
    public void ShipBobSettings_FromJson_ParsesCorrectly()
    {
        // Arrange
        var json = """
            {
                "personalAccessToken": "pat_test_123",
                "channelId": 12345,
                "webhookSecret": "whsec_test",
                "apiVersion": "2026-01",
                "enableDebugLogging": true
            }
            """;

        // Act
        var settings = ShipBobSettings.FromJson(json);

        // Assert
        settings.ShouldNotBeNull();
        settings.PersonalAccessToken.ShouldBe("pat_test_123");
        settings.ChannelId.ShouldBe(12345);
        settings.WebhookSecret.ShouldBe("whsec_test");
        settings.ApiVersion.ShouldBe("2026-01");
        settings.EnableDebugLogging.ShouldBeTrue();
    }

    [Fact]
    public void ShipBobSettings_FromJson_WithInvalidJson_ReturnsNull()
    {
        var settings = ShipBobSettings.FromJson("not valid json");
        settings.ShouldBeNull();
    }

    [Fact]
    public void ShipBobSettings_FromJson_WithNullOrEmpty_ReturnsNull()
    {
        ShipBobSettings.FromJson(null).ShouldBeNull();
        ShipBobSettings.FromJson("").ShouldBeNull();
        ShipBobSettings.FromJson("   ").ShouldBeNull();
    }

    [Fact]
    public void ShipBobSettings_ToJson_RoundTrips()
    {
        // Arrange
        var original = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test",
            ChannelId = 999,
            WebhookSecret = "secret",
            DefaultFulfillmentCenterId = 1,
            EnableDebugLogging = true
        };

        // Act
        var json = original.ToJson();
        var parsed = ShipBobSettings.FromJson(json);

        // Assert
        parsed.ShouldNotBeNull();
        parsed.PersonalAccessToken.ShouldBe(original.PersonalAccessToken);
        parsed.ChannelId.ShouldBe(original.ChannelId);
        parsed.WebhookSecret.ShouldBe(original.WebhookSecret);
        parsed.DefaultFulfillmentCenterId.ShouldBe(original.DefaultFulfillmentCenterId);
        parsed.EnableDebugLogging.ShouldBe(original.EnableDebugLogging);
    }

    #endregion

    #region Dispose Tests

    [Fact]
    public void Dispose_CanBeCalledMultipleTimes()
    {
        // Act & Assert - Should not throw
        _provider.Dispose();
        _provider.Dispose();
    }

    #endregion

    #region Helper Methods

    private static FulfilmentOrderRequest CreateTestOrderRequest()
    {
        return new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = "TEST-001",
            CustomerEmail = "test@example.com",
            ShippingAddress = new FulfilmentAddress
            {
                Name = "Test Customer",
                AddressOne = "123 Test Street",
                TownCity = "Test City",
                CountyState = "CA",
                PostalCode = "90210",
                CountryCode = "US"
            },
            LineItems =
            [
                new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = "TEST-SKU-001",
                    Name = "Test Product",
                    Quantity = 2,
                    UnitPrice = 29.99m
                }
            ]
        };
    }

    private static HttpRequest BuildRequest(string payload, IDictionary<string, string> headers)
    {
        var context = new DefaultHttpContext();
        var bytes = Encoding.UTF8.GetBytes(payload);
        context.Request.Body = new MemoryStream(bytes);
        context.Request.ContentLength = bytes.Length;
        context.Request.ContentType = "application/json";
        context.Request.Method = HttpMethods.Post;

        foreach (var header in headers)
        {
            context.Request.Headers[header.Key] = header.Value;
        }

        return context.Request;
    }

    private static void SetProviderApiClientForTest(ShipBobFulfilmentProvider provider, ShipBobApiClient apiClient)
    {
        var apiClientField = typeof(ShipBobFulfilmentProvider)
            .GetField("_apiClient", BindingFlags.Instance | BindingFlags.NonPublic);
        apiClientField.ShouldNotBeNull();
        apiClientField!.SetValue(provider, apiClient);
    }

    private sealed class ShipBobApiClientTests_OneShotHandler(string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class SequenceJsonHandler(IReadOnlyList<string> bodies) : HttpMessageHandler
    {
        private int _index;

        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);

            var index = Math.Min(_index, bodies.Count - 1);
            var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(bodies[index], Encoding.UTF8, "application/json")
            };

            _index++;
            return Task.FromResult(response);
        }
    }

    #endregion
}
