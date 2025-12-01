using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface IOrderService
{
    Task<Invoice> CreateOrderFromBasketAsync(Basket basket, CheckoutSession checkoutSession, CancellationToken cancellationToken = default);
    Task<List<Shipment>> CreateShipmentsFromOrderAsync(CreateShipmentsParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateOrderStatusAsync(Guid orderId, OrderStatus newStatus, string? reason = null, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> CancelOrderAsync(Guid orderId, string reason, CancellationToken cancellationToken = default);
    Task<Order?> GetOrderWithDetailsAsync(Guid orderId, CancellationToken cancellationToken = default);
}

