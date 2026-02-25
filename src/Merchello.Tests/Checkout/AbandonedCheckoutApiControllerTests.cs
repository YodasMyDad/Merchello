using Merchello.Controllers;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout;

public class AbandonedCheckoutApiControllerTests
{
    private readonly Mock<IAbandonedCheckoutService> _abandonedCheckoutServiceMock;
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisherMock;
    private readonly Mock<ICurrencyService> _currencyServiceMock;
    private readonly AbandonedCheckoutApiController _controller;

    public AbandonedCheckoutApiControllerTests()
    {
        _abandonedCheckoutServiceMock = new Mock<IAbandonedCheckoutService>();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        _currencyServiceMock = new Mock<ICurrencyService>();
        _controller = new AbandonedCheckoutApiController(
            _abandonedCheckoutServiceMock.Object,
            _notificationPublisherMock.Object,
            _currencyServiceMock.Object);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task ResendRecoveryEmail_PublishesConcreteNotificationType(int recoveryEmailsSent)
    {
        var checkoutId = Guid.NewGuid();
        var checkout = CreateAbandonedCheckout(checkoutId, recoveryEmailsSent);

        _abandonedCheckoutServiceMock
            .Setup(x => x.GetByIdAsync(checkoutId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(checkout);
        _abandonedCheckoutServiceMock
            .Setup(x => x.GenerateRecoveryLinkAsync(checkoutId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://example.com/checkout/recover/test-token");
        _abandonedCheckoutServiceMock
            .Setup(x => x.MarkRecoveryEmailSentAsync(checkoutId, It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _controller.ResendRecoveryEmail(checkoutId, CancellationToken.None);

        result.ShouldBeOfType<OkObjectResult>();
        _abandonedCheckoutServiceMock.Verify(
            x => x.MarkRecoveryEmailSentAsync(checkoutId, It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()),
            Times.Once);

        _notificationPublisherMock.Verify(
            x => x.PublishAsync(It.IsAny<CheckoutAbandonedFirstNotification>(), It.IsAny<CancellationToken>()),
            recoveryEmailsSent == 0 ? Times.Once : Times.Never);
        _notificationPublisherMock.Verify(
            x => x.PublishAsync(It.IsAny<CheckoutAbandonedReminderNotification>(), It.IsAny<CancellationToken>()),
            recoveryEmailsSent == 1 ? Times.Once : Times.Never);
        _notificationPublisherMock.Verify(
            x => x.PublishAsync(It.IsAny<CheckoutAbandonedFinalNotification>(), It.IsAny<CancellationToken>()),
            recoveryEmailsSent >= 2 ? Times.Once : Times.Never);
    }

    private static AbandonedCheckout CreateAbandonedCheckout(Guid id, int recoveryEmailsSent)
    {
        return new AbandonedCheckout
        {
            Id = id,
            BasketId = Guid.NewGuid(),
            Email = "customer@test.com",
            CustomerName = "Test Customer",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddHours(-2),
            BasketTotal = 99.99m,
            CurrencyCode = "GBP",
            CurrencySymbol = "GBP ",
            RecoveryEmailsSent = recoveryEmailsSent
        };
    }
}
