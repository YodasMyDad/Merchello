using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IShippingOptionService
{
    // Shipping Options
    Task<List<ShippingOptionDto>> GetAllAsync(CancellationToken ct = default);
    Task<ShippingOptionDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CrudResult<ShippingOption>> CreateAsync(CreateShippingOptionDto dto, CancellationToken ct = default);
    Task<CrudResult<ShippingOption>> UpdateAsync(Guid id, CreateShippingOptionDto dto, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteAsync(Guid id, CancellationToken ct = default);

    // Shipping Costs
    Task<CrudResult<ShippingCost>> AddCostAsync(Guid optionId, CreateShippingCostDto dto, CancellationToken ct = default);
    Task<CrudResult<ShippingCost>> UpdateCostAsync(Guid costId, CreateShippingCostDto dto, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteCostAsync(Guid costId, CancellationToken ct = default);

    // Weight Tiers
    Task<CrudResult<ShippingWeightTier>> AddWeightTierAsync(Guid optionId, CreateShippingWeightTierDto dto, CancellationToken ct = default);
    Task<CrudResult<ShippingWeightTier>> UpdateWeightTierAsync(Guid tierId, CreateShippingWeightTierDto dto, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteWeightTierAsync(Guid tierId, CancellationToken ct = default);
}
