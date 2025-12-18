using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Customers.Services;

/// <summary>
/// Service for managing customers.
/// </summary>
public class CustomerService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    CustomerFactory customerFactory,
    ILogger<CustomerService> logger) : ICustomerService
{
    /// <inheritdoc />
    public async Task<Customer?> GetByIdAsync(Guid customerId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CustomerListItemDto?> GetDtoByIdAsync(Guid customerId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .Where(c => c.Id == customerId)
                .Select(c => new CustomerListItemDto
                {
                    Id = c.Id,
                    Email = c.Email,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    MemberKey = c.MemberKey,
                    DateCreated = c.DateCreated,
                    OrderCount = c.Invoices != null ? c.Invoices.Count : 0,
                    Tags = c.CustomerTags.Select(t => t.Tag).ToList()
                })
                .FirstOrDefaultAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Email == normalizedEmail, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<Customer?> GetByMemberKeyAsync(Guid memberKey, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.MemberKey == memberKey, ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Customer>> CreateAsync(CreateCustomerParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<Customer>();

        // Validate email uniqueness
        var existing = await GetByEmailAsync(parameters.Email, ct);
        if (existing != null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Customer with email '{parameters.Email}' already exists",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var customer = await scope.ExecuteWithContextAsync(async db =>
        {
            var newCustomer = customerFactory.Create(parameters);
            db.Customers.Add(newCustomer);
            await db.SaveChangesAsync(ct);
            return newCustomer;
        });
        scope.Complete();

        result.ResultObject = customer;
        result.Messages.Add(new ResultMessage
        {
            Message = "Customer created successfully",
            ResultMessageType = ResultMessageType.Success
        });

        logger.LogInformation("Created customer {CustomerId} with email {Email}", customer.Id, customer.Email);
        return result;
    }

    /// <inheritdoc />
    public async Task<Customer> GetOrCreateByEmailAsync(string email, Address? billingAddress = null, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        using var scope = efCoreScopeProvider.CreateScope();
        var customer = await scope.ExecuteWithContextAsync(async db =>
        {
            // Try to find existing customer
            var existing = await db.Customers
                .FirstOrDefaultAsync(c => c.Email == normalizedEmail, ct);

            if (existing != null)
            {
                // Update name if we have newer info from billing address and current is empty
                if (billingAddress != null)
                {
                    var updated = false;
                    if (string.IsNullOrEmpty(existing.FirstName) && !string.IsNullOrEmpty(billingAddress.Name))
                    {
                        var parts = billingAddress.Name.Trim().Split(' ', 2);
                        existing.FirstName = parts.Length > 0 ? parts[0] : null;
                        existing.LastName = parts.Length > 1 ? parts[1] : null;
                        updated = true;
                    }
                    if (updated)
                    {
                        existing.DateUpdated = DateTime.UtcNow;
                        await db.SaveChangesAsync(ct);
                    }
                }
                return existing;
            }

            // Create new customer
            var newCustomer = customerFactory.CreateFromEmail(normalizedEmail, billingAddress);
            db.Customers.Add(newCustomer);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Auto-created customer {CustomerId} for email {Email}", newCustomer.Id, normalizedEmail);
            return newCustomer;
        });

        scope.Complete();
        return customer;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Customer>> UpdateAsync(UpdateCustomerParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<Customer>();

        using var scope = efCoreScopeProvider.CreateScope();
        var customer = await scope.ExecuteWithContextAsync(async db =>
        {
            var existing = await db.Customers.FirstOrDefaultAsync(c => c.Id == parameters.Id, ct);
            if (existing == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Customer not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return null;
            }

            // Handle email update with uniqueness check
            if (!string.IsNullOrWhiteSpace(parameters.Email))
            {
                var normalizedEmail = parameters.Email.Trim().ToLowerInvariant();
                if (normalizedEmail != existing.Email)
                {
                    // Check if email is already used by another customer
                    var emailExists = await db.Customers.AnyAsync(
                        c => c.Email == normalizedEmail && c.Id != parameters.Id, ct);
                    if (emailExists)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"A customer with email '{parameters.Email}' already exists",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return null;
                    }
                    existing.Email = normalizedEmail;
                }
            }

            // Update fields if provided
            if (parameters.FirstName != null) existing.FirstName = parameters.FirstName;
            if (parameters.LastName != null) existing.LastName = parameters.LastName;

            // Handle MemberKey: can set to a value or clear it
            if (parameters.ClearMemberKey)
            {
                existing.MemberKey = null;
            }
            else if (parameters.MemberKey.HasValue)
            {
                existing.MemberKey = parameters.MemberKey;
            }

            existing.DateUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            // Handle tags if provided
            if (parameters.Tags != null)
            {
                var existingTags = await db.CustomerTags
                    .Where(t => t.CustomerId == parameters.Id)
                    .ToListAsync(ct);
                db.CustomerTags.RemoveRange(existingTags);

                var newTags = parameters.Tags
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Select(tag => new CustomerTag
                    {
                        CustomerId = parameters.Id,
                        Tag = tag
                    });

                await db.CustomerTags.AddRangeAsync(newTags, ct);
                await db.SaveChangesAsync(ct);
            }

            return existing;
        });

        scope.Complete();

        if (customer != null)
        {
            result.ResultObject = customer;
            result.Messages.Add(new ResultMessage
            {
                Message = "Customer updated successfully",
                ResultMessageType = ResultMessageType.Success
            });
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<List<Customer>> SearchAsync(string? searchTerm, int limit = 20, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Customers.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLowerInvariant();
                query = query.Where(c =>
                    c.Email.Contains(term) ||
                    (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(term)));
            }

            return await query
                .OrderByDescending(c => c.DateCreated)
                .Take(limit)
                .ToListAsync(ct);
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CustomerPageDto> GetPagedAsync(string? search, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 50;
        if (pageSize > 200) pageSize = 200;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Customers.AsNoTracking();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                query = query.Where(c =>
                    c.Email.Contains(term) ||
                    (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(term)));
            }

            // Get total count for pagination
            var totalItems = await query.CountAsync(ct);
            var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            // Get paginated items with order count
            var items = await query
                .OrderByDescending(c => c.DateCreated)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new CustomerListItemDto
                {
                    Id = c.Id,
                    Email = c.Email,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    MemberKey = c.MemberKey,
                    DateCreated = c.DateCreated,
                    OrderCount = c.Invoices != null ? c.Invoices.Count : 0,
                    Tags = c.CustomerTags.Select(t => t.Tag).ToList()
                })
                .ToListAsync(ct);

            return new CustomerPageDto
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<int> GetCountAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers.CountAsync(ct));
        scope.Complete();
        return count;
    }

    /// <inheritdoc />
    public async Task<bool> AnyExistAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers.AnyAsync(ct));
        scope.Complete();
        return exists;
    }

    /// <inheritdoc />
    public async Task<List<Customer>> GetByIdsAsync(List<Guid> customerIds, CancellationToken ct = default)
    {
        if (customerIds.Count == 0)
            return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<CustomerListItemDto>> GetDtosByIdsAsync(List<Guid> customerIds, CancellationToken ct = default)
    {
        if (customerIds.Count == 0)
            return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Customers
                .AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .Select(c => new CustomerListItemDto
                {
                    Id = c.Id,
                    Email = c.Email,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    MemberKey = c.MemberKey,
                    DateCreated = c.DateCreated,
                    OrderCount = c.Invoices != null ? c.Invoices.Count : 0,
                    Tags = c.CustomerTags.Select(t => t.Tag).ToList()
                })
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<string>> GetCustomerTagsAsync(Guid customerId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerTags
                .AsNoTracking()
                .Where(t => t.CustomerId == customerId)
                .Select(t => t.Tag)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task SetCustomerTagsAsync(Guid customerId, List<string> tags, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Remove existing tags
            var existing = await db.CustomerTags
                .Where(t => t.CustomerId == customerId)
                .ToListAsync(ct);
            db.CustomerTags.RemoveRange(existing);

            // Add new tags (deduplicated, trimmed)
            var newTags = tags
                .Select(t => t.Trim())
                .Where(t => !string.IsNullOrEmpty(t))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(tag => new CustomerTag
                {
                    CustomerId = customerId,
                    Tag = tag
                });

            await db.CustomerTags.AddRangeAsync(newTags, ct);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Updated tags for customer {CustomerId}", customerId);
    }

    /// <inheritdoc />
    public async Task<List<string>> GetAllUniqueTagsAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerTags
                .AsNoTracking()
                .Select(t => t.Tag)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }
}
