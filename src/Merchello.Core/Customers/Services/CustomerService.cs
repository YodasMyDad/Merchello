using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Shared.Extensions;
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
    IMerchelloNotificationPublisher notificationPublisher,
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
                    Tags = c.CustomerTags.Select(t => t.Tag).ToList(),
                    IsFlagged = c.IsFlagged,
                    AcceptsMarketing = c.AcceptsMarketing,
                    HasAccountTerms = c.HasAccountTerms,
                    PaymentTermsDays = c.PaymentTermsDays,
                    CreditLimit = c.CreditLimit
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

        // Create customer object
        var newCustomer = customerFactory.Create(parameters);

        // Publish "Before" notification - handlers can modify or cancel
        var creatingNotification = new CustomerCreatingNotification(newCustomer);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
        {
            result.AddErrorMessage(creatingNotification.CancelReason ?? "Customer creation cancelled");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        try
        {
            var customer = await scope.ExecuteWithContextAsync(async db =>
            {
                // Check uniqueness inside the scope for better concurrency handling
                // The unique index on Email will catch any race conditions
                var normalizedEmail = parameters.Email.Trim().ToLowerInvariant();
                var existing = await db.Customers
                    .FirstOrDefaultAsync(c => c.Email == normalizedEmail, ct);

                if (existing != null)
                {
                    result.AddErrorMessage($"Customer with email '{parameters.Email}' already exists");
                    return null;
                }

                db.Customers.Add(newCustomer);
                await db.SaveChangesAsync(ct);
                return newCustomer;
            });

            if (customer == null)
            {
                // Uniqueness check failed inside scope
                return result;
            }

            scope.Complete();

            // Publish "After" notification
            await notificationPublisher.PublishAsync(
                new CustomerCreatedNotification(customer), ct);

            result.ResultObject = customer;
            result.AddSuccessMessage("Customer created successfully");

            logger.LogInformation("Created customer {CustomerId} with email {Email}", customer.Id, customer.Email);
            return result;
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Race condition: another request created the customer concurrently
            logger.LogWarning(ex, "Concurrent customer creation detected for email {Email}", parameters.Email);
            result.AddErrorMessage($"Customer with email '{parameters.Email}' already exists");
            return result;
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("IX_", StringComparison.OrdinalIgnoreCase);
    }

    /// <inheritdoc />
    public async Task<Customer> GetOrCreateByEmailAsync(
        GetOrCreateCustomerParameters parameters,
        CancellationToken ct = default)
    {
        var normalizedEmail = parameters.Email.Trim().ToLowerInvariant();

        using var scope = efCoreScopeProvider.CreateScope();
        var customer = await scope.ExecuteWithContextAsync(async db =>
        {
            // Try to find existing customer
            var existing = await db.Customers
                .FirstOrDefaultAsync(c => c.Email == normalizedEmail, ct);

            if (existing != null)
            {
                var updated = false;

                // Update name if we have newer info from billing address and current is empty
                if (parameters.BillingAddress != null && string.IsNullOrEmpty(existing.FirstName) && !string.IsNullOrEmpty(parameters.BillingAddress.Name))
                {
                    var parts = parameters.BillingAddress.Name.Trim().Split(' ', 2);
                    existing.FirstName = parts.Length > 0 ? parts[0] : null;
                    existing.LastName = parts.Length > 1 ? parts[1] : null;
                    updated = true;
                }

                // Ratchet up marketing preference: only upgrade from false to true, never downgrade
                if (parameters.AcceptsMarketing && !existing.AcceptsMarketing)
                {
                    existing.AcceptsMarketing = true;
                    updated = true;
                    logger.LogInformation("Customer {CustomerId} opted in to marketing", existing.Id);
                }

                if (updated)
                {
                    existing.DateUpdated = DateTime.UtcNow;
                    await db.SaveChangesAsync(ct);
                }

                return existing;
            }

            // Create new customer
            var newCustomer = customerFactory.CreateFromEmail(normalizedEmail, parameters.BillingAddress, parameters.AcceptsMarketing);
            db.Customers.Add(newCustomer);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Auto-created customer {CustomerId} for email {Email}, AcceptsMarketing={AcceptsMarketing}",
                newCustomer.Id, normalizedEmail, parameters.AcceptsMarketing);
            return newCustomer;
        });

        scope.Complete();
        return customer;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Customer>> UpdateAsync(UpdateCustomerParameters parameters, CancellationToken ct = default)
    {
        var result = new CrudResult<Customer>();

        // First, fetch the customer to validate and publish notification
        Customer? existing;
        using (var readScope = efCoreScopeProvider.CreateScope())
        {
            existing = await readScope.ExecuteWithContextAsync(async db =>
                await db.Customers.FirstOrDefaultAsync(c => c.Id == parameters.Id, ct));
            readScope.Complete();
        }

        if (existing == null)
        {
            result.AddErrorMessage("Customer not found");
            return result;
        }

        // Publish "Before" notification - handlers can modify or cancel
        var savingNotification = new CustomerSavingNotification(existing);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, ct))
        {
            result.AddErrorMessage(savingNotification.CancelReason ?? "Customer update cancelled");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var customer = await scope.ExecuteWithContextAsync(async db =>
        {
            var toUpdate = await db.Customers.FirstOrDefaultAsync(c => c.Id == parameters.Id, ct);
            if (toUpdate == null) return null;

            // Handle email update with uniqueness check
            if (!string.IsNullOrWhiteSpace(parameters.Email))
            {
                var normalizedEmail = parameters.Email.Trim().ToLowerInvariant();
                if (normalizedEmail != toUpdate.Email)
                {
                    // Check if email is already used by another customer
                    var emailExists = await db.Customers.AnyAsync(
                        c => c.Email == normalizedEmail && c.Id != parameters.Id, ct);
                    if (emailExists)
                    {
                        result.AddErrorMessage($"A customer with email '{parameters.Email}' already exists");
                        return null;
                    }
                    toUpdate.Email = normalizedEmail;
                }
            }

            // Update fields if provided
            if (parameters.FirstName != null) toUpdate.FirstName = parameters.FirstName;
            if (parameters.LastName != null) toUpdate.LastName = parameters.LastName;
            if (parameters.IsFlagged.HasValue) toUpdate.IsFlagged = parameters.IsFlagged.Value;
            if (parameters.AcceptsMarketing.HasValue) toUpdate.AcceptsMarketing = parameters.AcceptsMarketing.Value;

            // Handle MemberKey: can set to a value or clear it
            if (parameters.ClearMemberKey)
            {
                toUpdate.MemberKey = null;
            }
            else if (parameters.MemberKey.HasValue)
            {
                toUpdate.MemberKey = parameters.MemberKey;
            }

            // Handle account terms fields
            if (parameters.HasAccountTerms.HasValue) toUpdate.HasAccountTerms = parameters.HasAccountTerms.Value;

            if (parameters.ClearPaymentTermsDays)
            {
                toUpdate.PaymentTermsDays = null;
            }
            else if (parameters.PaymentTermsDays.HasValue)
            {
                toUpdate.PaymentTermsDays = parameters.PaymentTermsDays;
            }

            if (parameters.ClearCreditLimit)
            {
                toUpdate.CreditLimit = null;
            }
            else if (parameters.CreditLimit.HasValue)
            {
                toUpdate.CreditLimit = parameters.CreditLimit;
            }

            toUpdate.DateUpdated = DateTime.UtcNow;
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

            return toUpdate;
        });

        scope.Complete();

        if (customer != null)
        {
            // Publish "After" notification
            await notificationPublisher.PublishAsync(new CustomerSavedNotification(customer), ct);

            result.ResultObject = customer;
            result.AddSuccessMessage("Customer updated successfully");
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteAsync(Guid customerId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        // First, fetch the customer to validate and publish notification
        Customer? customer;
        using (var readScope = efCoreScopeProvider.CreateScope())
        {
            customer = await readScope.ExecuteWithContextAsync(async db =>
                await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct));
            readScope.Complete();
        }

        if (customer == null)
        {
            result.AddErrorMessage("Customer not found");
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var deletingNotification = new CustomerDeletingNotification(customer);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, ct))
        {
            result.AddErrorMessage(deletingNotification.CancelReason ?? "Customer deletion cancelled");
            return result;
        }

        // Capture customer for after-notification (before deletion)
        var deletedCustomer = customer;

        using var scope = efCoreScopeProvider.CreateScope();
        var deleted = await scope.ExecuteWithContextAsync(async db =>
        {
            var toDelete = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct);
            if (toDelete == null) return false;

            // Remove related tags first
            var tags = await db.CustomerTags
                .Where(t => t.CustomerId == customerId)
                .ToListAsync(ct);
            db.CustomerTags.RemoveRange(tags);

            db.Customers.Remove(toDelete);
            await db.SaveChangesAsync(ct);
            return true;
        });

        scope.Complete();

        if (deleted)
        {
            // Publish "After" notification
            await notificationPublisher.PublishAsync(new CustomerDeletedNotification(deletedCustomer), ct);

            result.ResultObject = true;
            result.AddSuccessMessage("Customer deleted successfully");

            logger.LogInformation("Deleted customer {CustomerId} with email {Email}", customerId, deletedCustomer.Email);
        }
        else
        {
            result.AddErrorMessage("Failed to delete customer");
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
    public async Task<CustomerPageDto> GetPagedAsync(CustomerQueryParameters parameters, CancellationToken ct = default)
    {
        var page = parameters.Page;
        var pageSize = parameters.PageSize;
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 50;
        if (pageSize > 200) pageSize = 200;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Customers.AsNoTracking();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(parameters.Search))
            {
                var term = parameters.Search.Trim().ToLowerInvariant();
                query = query.Where(c =>
                    c.Email.Contains(term) ||
                    (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(term)));
            }

            // Exclude specific IDs (applied before pagination for consistent page sizes)
            if (parameters.ExcludeIds is { Count: > 0 })
            {
                query = query.Where(c => !parameters.ExcludeIds.Contains(c.Id));
            }

            // Get total count for pagination
            var totalItems = await query.CountAsync(ct);
            var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            // Get paginated items with order count
            // Use explicit subqueries to avoid N+1 query problem with navigation properties
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
                    // Use subquery for order count instead of navigation property to avoid N+1
                    OrderCount = db.Invoices.Count(i => i.CustomerId == c.Id),
                    // Use subquery for tags instead of navigation property to avoid N+1
                    Tags = db.CustomerTags.Where(t => t.CustomerId == c.Id).Select(t => t.Tag).ToList(),
                    IsFlagged = c.IsFlagged,
                    AcceptsMarketing = c.AcceptsMarketing,
                    HasAccountTerms = c.HasAccountTerms,
                    PaymentTermsDays = c.PaymentTermsDays,
                    CreditLimit = c.CreditLimit
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
                    Tags = c.CustomerTags.Select(t => t.Tag).ToList(),
                    IsFlagged = c.IsFlagged,
                    AcceptsMarketing = c.AcceptsMarketing,
                    HasAccountTerms = c.HasAccountTerms,
                    PaymentTermsDays = c.PaymentTermsDays,
                    CreditLimit = c.CreditLimit
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

    /// <inheritdoc />
    public async Task<List<CustomerLookupResultDto>> SearchCustomersAsync(
        string? email,
        string? name,
        int limit = 10,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(name))
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var searchEmail = email?.Trim().ToLower();
            var searchName = name?.Trim().ToLower();
            List<CustomerLookupResultDto> customers = [];
            var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // First, search registered Customers table for best matches
            var customerQuery = db.Customers.AsNoTracking();

            if (!string.IsNullOrEmpty(searchEmail))
            {
                customerQuery = customerQuery.Where(c => c.Email.ToLower().Contains(searchEmail));
            }

            if (!string.IsNullOrEmpty(searchName))
            {
                customerQuery = customerQuery.Where(c =>
                    (c.FirstName != null && c.FirstName.ToLower().Contains(searchName)) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(searchName)));
            }

            var registeredCustomers = await customerQuery
                .OrderByDescending(c => c.DateCreated)
                .Take(limit)
                .ToListAsync(ct);

            // Add registered customers first
            foreach (var customer in registeredCustomers)
            {
                if (!seenEmails.Add(customer.Email))
                    continue;

                // Get past addresses from invoices for this customer
                var customerInvoices = await db.Invoices
                    .AsNoTracking()
                    .Where(i => i.CustomerId == customer.Id && !i.IsDeleted)
                    .OrderByDescending(i => i.DateCreated)
                    .Take(10)
                    .ToListAsync(ct);

                var mostRecentInvoice = customerInvoices.FirstOrDefault();

                var dto = new CustomerLookupResultDto
                {
                    CustomerId = customer.Id,
                    Name = $"{customer.FirstName} {customer.LastName}".Trim(),
                    Email = customer.Email,
                    Phone = mostRecentInvoice?.BillingAddress.Phone,
                    PastShippingAddresses = customerInvoices
                        .Select(i => i.ShippingAddress)
                        .Where(a => !string.IsNullOrWhiteSpace(a.AddressOne))
                        .DistinctBy(NormalizeAddressKey)
                        .Select(MapAddressToDto)
                        .ToList(),
                    HasAccountTerms = customer.HasAccountTerms,
                    CreditLimit = customer.CreditLimit
                };

                if (mostRecentInvoice != null)
                {
                    dto.BillingAddress = MapAddressToDto(mostRecentInvoice.BillingAddress);
                }

                customers.Add(dto);
            }

            // If we haven't reached the limit, search invoices for guest customers
            if (customers.Count < limit)
            {
                // Query invoices matching the search criteria
                var query = db.Invoices
                    .AsNoTracking()
                    .Where(i => !i.IsDeleted);

                // Apply search filters for invoice-based search
                if (!string.IsNullOrEmpty(searchEmail))
                {
                    query = query.Where(i => i.BillingAddress.Email != null &&
                        i.BillingAddress.Email.ToLower().Contains(searchEmail));
                }

                if (!string.IsNullOrEmpty(searchName))
                {
                    query = query.Where(i => i.BillingAddress.Name != null &&
                        i.BillingAddress.Name.ToLower().Contains(searchName));
                }

                // Get matching invoices, ordered by most recent
                // Load full entities to ensure owned entities (Address, CountyState) are properly included
                var invoices = await query
                    .OrderByDescending(i => i.DateCreated)
                    .Take(100) // Limit to prevent scanning too many records
                    .ToListAsync(ct);

                // Group by billing email to get unique customers (skip already-found registered customers)
                var remainingLimit = limit - customers.Count;
                var customerGroups = invoices
                    .Where(i => !string.IsNullOrWhiteSpace(i.BillingAddress.Email) &&
                                !seenEmails.Contains(i.BillingAddress.Email!))
                    .GroupBy(i => i.BillingAddress.Email!.ToLower())
                    .Take(remainingLimit);

                foreach (var group in customerGroups)
                {
                    var firstInvoice = group.First();
                    var billingAddress = firstInvoice.BillingAddress;

                    if (!seenEmails.Add(billingAddress.Email!))
                        continue;

                    // Collect unique shipping addresses from all invoices for this customer
                    var shippingAddresses = group
                        .Select(i => i.ShippingAddress)
                        .Where(a => !string.IsNullOrWhiteSpace(a.AddressOne))
                        .DistinctBy(NormalizeAddressKey)
                        .Select(MapAddressToDto)
                        .ToList();

                    customers.Add(new CustomerLookupResultDto
                    {
                        Name = billingAddress.Name ?? string.Empty,
                        Email = billingAddress.Email ?? string.Empty,
                        Phone = billingAddress.Phone,
                        BillingAddress = MapAddressToDto(billingAddress),
                        PastShippingAddresses = shippingAddresses
                    });
                }
            }

            return customers;
        });

        scope.Complete();
        return result;
    }

    private static string NormalizeAddressKey(Address address)
    {
        var key = $"{address.AddressOne?.Trim().ToLower()}|{address.TownCity?.Trim().ToLower()}|{address.PostalCode?.Trim().ToLower()}|{address.CountryCode?.Trim().ToLower()}";
        return key;
    }

    private static AddressDto MapAddressToDto(Address address)
    {
        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }
}
