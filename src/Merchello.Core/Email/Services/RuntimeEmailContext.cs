using Merchello.Core.Email.Models;

namespace Merchello.Core.Email.Services;

internal sealed class RuntimeEmailContext
{
    public required Type NotificationType { get; init; }
    public required object EmailModel { get; init; }
    public required EmailStoreContext StoreContext { get; init; }
}
