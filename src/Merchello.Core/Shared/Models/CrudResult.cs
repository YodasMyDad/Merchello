using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Shared.Models;

public class CrudResult<T>
{
    public T? ResultObject { get; set; }
    public List<ResultMessage> Messages { get; set; } = new();
    public bool Successful => Messages.All(x => x.ResultMessageType != ResultMessageType.Error);
}
