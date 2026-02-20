using Merchello.Core.Settings.Dtos;
using Merchello.Core.Settings.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Settings.Services.Interfaces;

public interface IMerchelloStoreSettingsService
{
    StoreConfigurationDto GetStoreConfiguration();

    Task<StoreConfigurationDto> GetStoreConfigurationAsync(CancellationToken ct = default);

    MerchelloStoreRuntimeSettings GetRuntimeSettings();

    Task<MerchelloStoreRuntimeSettings> GetRuntimeSettingsAsync(CancellationToken ct = default);

    Task<CrudResult<StoreConfigurationDto>> SaveStoreConfigurationAsync(
        StoreConfigurationDto configuration,
        CancellationToken ct = default);
}
