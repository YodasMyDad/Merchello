using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface ITaxService
{
    /// <summary>
    /// Gets all tax groups
    /// </summary>
    Task<List<TaxGroup>> GetTaxGroups(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a tax group by ID
    /// </summary>
    Task<TaxGroup?> GetTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new tax group
    /// </summary>
    Task<CrudResult<TaxGroup>> CreateTaxGroup(string name, decimal rate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing tax group
    /// </summary>
    Task<CrudResult<TaxGroup>> UpdateTaxGroup(TaxGroup taxGroup, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing tax group by ID
    /// </summary>
    /// <param name="taxGroupId">The ID of the tax group to update</param>
    /// <param name="name">The new name</param>
    /// <param name="taxPercentage">The new tax percentage (0-100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CrudResult<TaxGroup>> UpdateTaxGroup(Guid taxGroupId, string name, decimal taxPercentage, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a tax group
    /// </summary>
    Task<CrudResult<bool>> DeleteTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default);

    #region Tax Group Rates

    /// <summary>
    /// Gets the applicable tax rate for a tax group at a specific location.
    /// Lookup priority: State-specific -> Country-level -> Zero (0%)
    /// </summary>
    /// <param name="taxGroupId">The tax group ID</param>
    /// <param name="countryCode">ISO 3166-1 country code</param>
    /// <param name="stateOrProvinceCode">Optional ISO 3166-2 state/province code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The applicable tax percentage (0-100)</returns>
    Task<decimal> GetApplicableRateAsync(
        Guid taxGroupId,
        string countryCode,
        string? stateOrProvinceCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all rates for a tax group
    /// </summary>
    Task<List<TaxGroupRate>> GetRatesForTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific tax group rate by ID
    /// </summary>
    Task<TaxGroupRate?> GetTaxGroupRate(Guid rateId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new geographic tax rate
    /// </summary>
    Task<CrudResult<TaxGroupRate>> CreateTaxGroupRate(
        Guid taxGroupId,
        string countryCode,
        string? stateOrProvinceCode,
        decimal taxPercentage,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing geographic tax rate
    /// </summary>
    Task<CrudResult<TaxGroupRate>> UpdateTaxGroupRate(
        Guid rateId,
        decimal taxPercentage,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a geographic tax rate
    /// </summary>
    Task<CrudResult<bool>> DeleteTaxGroupRate(Guid rateId, CancellationToken cancellationToken = default);

    #endregion

    #region Shipping Tax Overrides

    /// <summary>
    /// Gets a shipping tax override for a specific location.
    /// Lookup priority: State-specific -> Country-level -> null (no override)
    /// </summary>
    /// <param name="countryCode">ISO 3166-1 country code</param>
    /// <param name="stateOrProvinceCode">Optional ISO 3166-2 state/province code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The shipping tax override, or null if none exists</returns>
    Task<ShippingTaxOverride?> GetShippingTaxOverrideAsync(
        string countryCode,
        string? stateOrProvinceCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a shipping tax override by ID
    /// </summary>
    Task<ShippingTaxOverride?> GetShippingTaxOverrideByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all shipping tax overrides
    /// </summary>
    Task<List<ShippingTaxOverride>> GetAllShippingTaxOverridesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new shipping tax override
    /// </summary>
    Task<CrudResult<ShippingTaxOverride>> CreateShippingTaxOverrideAsync(
        CreateShippingTaxOverrideDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing shipping tax override
    /// </summary>
    Task<CrudResult<ShippingTaxOverride>> UpdateShippingTaxOverrideAsync(
        Guid id,
        UpdateShippingTaxOverrideDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a shipping tax override
    /// </summary>
    Task<CrudResult<bool>> DeleteShippingTaxOverrideAsync(Guid id, CancellationToken cancellationToken = default);

    #endregion
}

