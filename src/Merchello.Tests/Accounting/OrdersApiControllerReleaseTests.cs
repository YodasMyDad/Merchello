using Merchello.Controllers;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Security;
using Xunit;

namespace Merchello.Tests.Accounting;

public class OrdersApiControllerReleaseTests
{
    private readonly Mock<IFulfilmentSubmissionService> _fulfilmentSubmissionServiceMock;
    private readonly OrdersApiController _controller;

    public OrdersApiControllerReleaseTests()
    {
        _fulfilmentSubmissionServiceMock = new Mock<IFulfilmentSubmissionService>();
        _controller = CreateController(_fulfilmentSubmissionServiceMock);
    }

    [Fact]
    public async Task ReleaseOrderFulfillment_OrderNotFound_ReturnsNotFound()
    {
        var orderId = Guid.NewGuid();
        var result = CreateErrorResult<Order>($"Order {orderId} not found.");

        _fulfilmentSubmissionServiceMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<Core.Fulfilment.Services.Parameters.SubmitFulfilmentOrderParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var actionResult = await _controller.ReleaseOrderFulfillment(orderId, CancellationToken.None);

        var notFound = actionResult.ShouldBeOfType<NotFoundObjectResult>();
        notFound.Value.ShouldBe($"Order {orderId} not found.");
    }

    [Fact]
    public async Task ReleaseOrderFulfillment_ValidationError_ReturnsBadRequest()
    {
        var orderId = Guid.NewGuid();
        var result = CreateErrorResult<Order>("Invoice is not fully paid.");

        _fulfilmentSubmissionServiceMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<Core.Fulfilment.Services.Parameters.SubmitFulfilmentOrderParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var actionResult = await _controller.ReleaseOrderFulfillment(orderId, CancellationToken.None);

        var badRequest = actionResult.ShouldBeOfType<BadRequestObjectResult>();
        badRequest.Value.ShouldBe("Invoice is not fully paid.");
    }

    [Fact]
    public async Task ReleaseOrderFulfillment_AlreadyReleased_ReturnsIdempotentResponse()
    {
        var orderId = Guid.NewGuid();
        var result = new CrudResult<Order>
        {
            ResultObject = new Order
            {
                Id = orderId,
                FulfilmentProviderReference = "SUP-EXISTING"
            },
            Messages =
            [
                new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Warning,
                    Message = "Order has already been submitted to fulfilment provider."
                }
            ]
        };

        _fulfilmentSubmissionServiceMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<Core.Fulfilment.Services.Parameters.SubmitFulfilmentOrderParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var actionResult = await _controller.ReleaseOrderFulfillment(orderId, CancellationToken.None);

        var ok = actionResult.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<Core.Accounting.Dtos.ReleaseFulfillmentResultDto>();
        dto.OrderId.ShouldBe(orderId);
        dto.AlreadyReleased.ShouldBeTrue();
        dto.Released.ShouldBeFalse();
        dto.FulfilmentProviderReference.ShouldBe("SUP-EXISTING");
    }

    [Fact]
    public async Task ReleaseOrderFulfillment_Success_ReturnsReleasedResponse()
    {
        var orderId = Guid.NewGuid();
        var result = new CrudResult<Order>
        {
            ResultObject = new Order
            {
                Id = orderId,
                FulfilmentProviderReference = "SUP-NEW"
            },
            Messages =
            [
                new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Success,
                    Message = "Order released to fulfilment provider."
                }
            ]
        };

        _fulfilmentSubmissionServiceMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<Core.Fulfilment.Services.Parameters.SubmitFulfilmentOrderParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var actionResult = await _controller.ReleaseOrderFulfillment(orderId, CancellationToken.None);

        var ok = actionResult.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<Core.Accounting.Dtos.ReleaseFulfillmentResultDto>();
        dto.OrderId.ShouldBe(orderId);
        dto.Released.ShouldBeTrue();
        dto.AlreadyReleased.ShouldBeFalse();
        dto.FulfilmentProviderReference.ShouldBe("SUP-NEW");
    }

    private static CrudResult<T> CreateErrorResult<T>(string message)
    {
        return new CrudResult<T>
        {
            Messages =
            [
                new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Error,
                    Message = message
                }
            ]
        };
    }

    private static OrdersApiController CreateController(Mock<IFulfilmentSubmissionService> fulfilmentSubmissionServiceMock)
    {
        return new OrdersApiController(
            new Mock<IPaymentService>().Object,
            new Mock<IInvoiceService>().Object,
            new Mock<IInvoiceEditService>().Object,
            new Mock<ICustomerService>().Object,
            fulfilmentSubmissionServiceMock.Object,
            new Mock<IShipmentService>().Object,
            new Mock<IReportingService>().Object,
            new Mock<IStatementService>().Object,
            new Mock<IProductService>().Object,
            new Mock<IAddressLookupService>().Object,
            new Mock<IOrdersDtoMapper>().Object,
            new Mock<IOrdersRequestMapper>().Object,
            new Mock<IBackOfficeSecurityAccessor>().Object);
    }
}
