using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Merchello.Core.Shipping.Providers;

// Back-compat shim: preserves the old class name while delegating to the new manager
public class ShippingProviderRegistry : ShippingProviderManager
{
    public ShippingProviderRegistry(ExtensionManager extensionManager, IMerchDbContext dbContext, Microsoft.Extensions.Logging.ILogger<ShippingProviderRegistry> _)
        : base(extensionManager, dbContext, NullLogger<ShippingProviderManager>.Instance)
    {
    }
}
