using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Shared.Models;

public class CrudResult<T> : IResult
{
    public T? ResultObject { get; set; }
    public List<ResultMessage> Messages { get; set; } = [];
    public bool Success => Messages.All(x => x.ResultMessageType != ResultMessageType.Error);
}
