using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Shared.Models;

public class ResultMessage
{
    public ResultMessageType ResultMessageType { get; set; }
    public string? Message { get; set; }
}
