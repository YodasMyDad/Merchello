using Merchello.Core.Data;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Shared.Extensions;

public static class MerchDbContextExtensions
{
    public static async Task<CrudResult<TR>> SaveChangesAsyncLogged<T, TR>(this IMerchDbContext context, ILogger<T> logger, CrudResult<TR> result, CancellationToken cancellationToken = default)
    {
        try
        {
            var dbResult = await context.SaveChangesAsync(cancellationToken);
            if (dbResult <= 0)
            {
                result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Warning, Message = "No items were updated in the database" });
            }
        }
        catch (Exception e)
        {
            logger.LogError(e, "Error when calling EF SaveChangesAsync");
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = $"{e.Message} - {e.InnerException?.Message}"});

        }
        return result;
    }
}
