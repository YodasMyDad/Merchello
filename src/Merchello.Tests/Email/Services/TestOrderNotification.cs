using Merchello.Core.Notifications.Base;

namespace Merchello.Tests.Email.Services;

internal class TestOrderNotification : MerchelloNotification
{
    public string OrderNumber { get; set; } = "";
    public string CustomerEmail { get; set; } = "customer@test.com";
}
