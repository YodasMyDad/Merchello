using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

public class AddToBasketParameters
{
    public LineItem? ItemToAdd { get; set; }
    public Guid? CustomerId { get; set; }
}

