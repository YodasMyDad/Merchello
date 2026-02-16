using Merchello.Core;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using System.Linq;
using Xunit;

namespace Merchello.Tests.Checkout;

[Collection("Integration")]
public class CheckoutBasketWebhookBridgeIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly IWebhookService _webhookService;

    public CheckoutBasketWebhookBridgeIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _webhookService = fixture.GetService<IWebhookService>();
    }

    [Fact]
    public async Task AddToBasket_NewBasket_EmitsBasketCreatedWebhook()
    {
        await _webhookService.CreateSubscriptionAsync(new CreateWebhookSubscriptionParameters
        {
            Name = "Basket Created",
            Topic = Constants.WebhookTopics.BasketCreated,
            TargetUrl = "https://example.com/basket-created"
        });

        var builder = _fixture.CreateDataBuilder();
        var product = builder.CreateProduct();
        await builder.SaveChangesAsync();

        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = lineItem
        });

        var deliveries = await _webhookService.QueryDeliveriesAsync(new OutboundDeliveryQueryParameters
        {
            DeliveryType = OutboundDeliveryType.Webhook,
            Topic = Constants.WebhookTopics.BasketCreated
        });

        deliveries.Items.Count().ShouldBe(1);
    }

    [Fact]
    public async Task BasketMutations_EmitBasketUpdatedWebhook()
    {
        await _webhookService.CreateSubscriptionAsync(new CreateWebhookSubscriptionParameters
        {
            Name = "Basket Updated",
            Topic = Constants.WebhookTopics.BasketUpdated,
            TargetUrl = "https://example.com/basket-updated"
        });

        var builder = _fixture.CreateDataBuilder();
        var product = builder.CreateProduct();
        await builder.SaveChangesAsync();

        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = lineItem
        });

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();
        var lineItemId = basket!.LineItems[0].Id;

        await _checkoutService.UpdateLineItemQuantity(lineItemId, 2, "US");

        var deliveries = await _webhookService.QueryDeliveriesAsync(new OutboundDeliveryQueryParameters
        {
            DeliveryType = OutboundDeliveryType.Webhook,
            Topic = Constants.WebhookTopics.BasketUpdated
        });

        deliveries.Items.Count().ShouldBeGreaterThanOrEqualTo(2);
    }
}
