namespace Merchello.Core.Returns.Models;

public enum ReturnStatus
{
    Requested = 10,
    Pending = 20,
    Approved = 30,
    Rejected = 40,
    InTransit = 50,
    Received = 60,
    Processing = 70,
    Completed = 80,
    Cancelled = 90
}
