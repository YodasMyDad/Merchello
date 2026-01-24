using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Customers.Services.Interfaces;

/// <summary>
/// Service for managing customers.
/// </summary>
public interface ICustomerService
{
    // =====================================================
    // Core CRUD
    // =====================================================

    /// <summary>
    /// Gets a customer by ID
    /// </summary>
    Task<Customer?> GetByIdAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Gets a customer DTO by ID with order count included
    /// </summary>
    Task<CustomerListItemDto?> GetDtoByIdAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Gets a customer by email address
    /// </summary>
    Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Gets a customer by Umbraco Member key
    /// </summary>
    Task<Customer?> GetByMemberKeyAsync(Guid memberKey, CancellationToken ct = default);

    /// <summary>
    /// Creates a new customer
    /// </summary>
    Task<CrudResult<Customer>> CreateAsync(CreateCustomerParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing customer
    /// </summary>
    Task<CrudResult<Customer>> UpdateAsync(UpdateCustomerParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Deletes a customer by ID
    /// </summary>
    Task<CrudResult<bool>> DeleteAsync(Guid customerId, CancellationToken ct = default);

    // =====================================================
    // Checkout Integration (Primary Use Case)
    // =====================================================

    /// <summary>
    /// Gets an existing customer by email, or creates a new one if not found.
    /// This is the primary method used during checkout to ensure every invoice
    /// has a linked customer.
    /// </summary>
    Task<Customer> GetOrCreateByEmailAsync(GetOrCreateCustomerParameters parameters, CancellationToken ct = default);

    // =====================================================
    // Search & Query
    // =====================================================

    /// <summary>
    /// Searches customers by email or name
    /// </summary>
    Task<List<Customer>> SearchAsync(string? searchTerm, int limit = 20, CancellationToken ct = default);

    /// <summary>
    /// Gets paginated list of customers with optional search.
    /// </summary>
    Task<CustomerPageDto> GetPagedAsync(CustomerQueryParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Gets total customer count
    /// </summary>
    Task<int> GetCountAsync(CancellationToken ct = default);

    /// <summary>
    /// Checks if any customers exist (for seeding)
    /// </summary>
    Task<bool> AnyExistAsync(CancellationToken ct = default);

    // =====================================================
    // Batch Operations (Performance)
    // =====================================================

    /// <summary>
    /// Gets multiple customers by their IDs in a single query.
    /// </summary>
    /// <param name="customerIds">The customer IDs to retrieve.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>List of customers (order not guaranteed to match input).</returns>
    Task<List<Customer>> GetByIdsAsync(List<Guid> customerIds, CancellationToken ct = default);

    /// <summary>
    /// Gets multiple customer DTOs by their IDs in a single query (includes order counts).
    /// </summary>
    /// <param name="customerIds">The customer IDs to retrieve.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>List of customer DTOs with order counts.</returns>
    Task<List<CustomerListItemDto>> GetDtosByIdsAsync(List<Guid> customerIds, CancellationToken ct = default);

    // =====================================================
    // Tag Management
    // =====================================================

    /// <summary>
    /// Gets all tags for a specific customer.
    /// </summary>
    Task<List<string>> GetCustomerTagsAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Sets the tags for a customer (replaces all existing tags).
    /// </summary>
    Task SetCustomerTagsAsync(Guid customerId, List<string> tags, CancellationToken ct = default);

    /// <summary>
    /// Gets all unique tags across all customers (for autocomplete).
    /// </summary>
    Task<List<string>> GetAllUniqueTagsAsync(CancellationToken ct = default);

    // =====================================================
    // Customer Lookup (Backoffice Order Creation)
    // =====================================================

    /// <summary>
    /// Search for customers by email or name, returning their info and past shipping addresses.
    /// Used for customer lookup when creating orders in the backoffice.
    /// Searches both registered customers and guest customers from invoice billing addresses.
    /// </summary>
    /// <param name="email">Email to search (exact or partial match)</param>
    /// <param name="name">Name to search (partial match)</param>
    /// <param name="limit">Maximum number of results to return</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>List of matching customers with their de-duplicated past shipping addresses</returns>
    Task<List<CustomerLookupResultDto>> SearchCustomersAsync(
        string? email,
        string? name,
        int limit = 10,
        CancellationToken ct = default);
}
