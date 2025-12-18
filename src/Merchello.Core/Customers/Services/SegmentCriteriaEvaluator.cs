using System.Linq.Expressions;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Customers.Services;

/// <summary>
/// Evaluates customer segment criteria for automated segments.
/// </summary>
public class SegmentCriteriaEvaluator(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<SegmentCriteriaEvaluator> logger) : ISegmentCriteriaEvaluator
{
    /// <inheritdoc />
    public async Task<bool> EvaluateAsync(Guid customerId, SegmentCriteriaSet criteriaSet, CancellationToken ct = default)
    {
        if (criteriaSet.Criteria.Count == 0)
            return false;

        var metrics = await GetCustomerMetricsAsync(customerId, ct);
        if (metrics == null)
            return false;

        var results = criteriaSet.Criteria.Select(c => EvaluateCriterion(c, metrics)).ToList();

        return criteriaSet.MatchMode == SegmentMatchMode.All
            ? results.All(r => r)
            : results.Any(r => r);
    }

    /// <inheritdoc />
    public List<CriteriaFieldMetadata> GetAvailableFields()
    {
        return
        [
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.OrderCount,
                Label = "Order Count",
                Description = "Total number of completed orders",
                ValueType = CriteriaValueType.Number,
                SupportedOperators = GetNumericOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.TotalSpend,
                Label = "Total Spend",
                Description = "Lifetime spend amount",
                ValueType = CriteriaValueType.Currency,
                SupportedOperators = GetNumericOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.AverageOrderValue,
                Label = "Average Order Value",
                Description = "Average order amount",
                ValueType = CriteriaValueType.Currency,
                SupportedOperators = GetNumericOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.FirstOrderDate,
                Label = "First Order Date",
                Description = "Date of first order (UTC)",
                ValueType = CriteriaValueType.Date,
                SupportedOperators = GetDateOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.LastOrderDate,
                Label = "Last Order Date",
                Description = "Date of most recent order (UTC)",
                ValueType = CriteriaValueType.Date,
                SupportedOperators = GetDateOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.DaysSinceLastOrder,
                Label = "Days Since Last Order",
                Description = "Days since last purchase",
                ValueType = CriteriaValueType.Number,
                SupportedOperators = GetNumericOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.DateCreated,
                Label = "Customer Since",
                Description = "Account creation date (UTC)",
                ValueType = CriteriaValueType.Date,
                SupportedOperators = GetDateOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.Email,
                Label = "Email",
                Description = "Customer email address",
                ValueType = CriteriaValueType.String,
                SupportedOperators = GetStringOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.Country,
                Label = "Country",
                Description = "Billing/shipping country",
                ValueType = CriteriaValueType.String,
                SupportedOperators = GetStringOperators()
            },
            new CriteriaFieldMetadata
            {
                Field = SegmentCriteriaField.Tag,
                Label = "Customer Tag",
                Description = "Check if customer has specific tag",
                ValueType = CriteriaValueType.String,
                SupportedOperators = GetTagOperators()
            }
        ];
    }

    /// <inheritdoc />
    public List<SegmentCriteriaOperator> GetOperatorsForField(SegmentCriteriaField field)
    {
        return field switch
        {
            SegmentCriteriaField.OrderCount or
            SegmentCriteriaField.TotalSpend or
            SegmentCriteriaField.AverageOrderValue or
            SegmentCriteriaField.DaysSinceLastOrder => GetNumericOperators(),

            SegmentCriteriaField.FirstOrderDate or
            SegmentCriteriaField.LastOrderDate or
            SegmentCriteriaField.DateCreated => GetDateOperators(),

            SegmentCriteriaField.Email or
            SegmentCriteriaField.Country => GetStringOperators(),

            SegmentCriteriaField.Tag => GetTagOperators(),

            _ => []
        };
    }

    /// <summary>
    /// Gets customer metrics for criteria evaluation.
    /// All dates are stored and compared in UTC.
    /// </summary>
    private async Task<CustomerMetrics?> GetCustomerMetricsAsync(Guid customerId, CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var customer = await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId, ct);

            if (customer == null)
                return null;

            // Query order metrics (exclude deleted and cancelled invoices)
            var orderStats = await db.Invoices
                .Where(i => i.CustomerId == customerId && !i.IsDeleted && !i.IsCancelled)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    OrderCount = g.Count(),
                    TotalSpend = g.Sum(i => i.TotalInStoreCurrency ?? i.Total),
                    FirstOrderDate = g.Min(i => i.DateCreated),
                    LastOrderDate = g.Max(i => i.DateCreated)
                })
                .FirstOrDefaultAsync(ct);

            // Get country from most recent invoice
            var recentInvoice = await db.Invoices
                .Where(i => i.CustomerId == customerId && !i.IsDeleted && !i.IsCancelled)
                .OrderByDescending(i => i.DateCreated)
                .FirstOrDefaultAsync(ct);

            // Get customer tags
            var tags = await db.CustomerTags
                .Where(t => t.CustomerId == customerId)
                .Select(t => t.Tag)
                .ToListAsync(ct);

            return new CustomerMetrics
            {
                OrderCount = orderStats?.OrderCount ?? 0,
                TotalSpend = orderStats?.TotalSpend ?? 0,
                FirstOrderDate = orderStats?.FirstOrderDate,
                LastOrderDate = orderStats?.LastOrderDate,
                DaysSinceLastOrder = orderStats?.LastOrderDate != null
                    ? (int)(DateTime.UtcNow - orderStats.LastOrderDate).TotalDays
                    : null,
                DateCreated = customer.DateCreated,
                Email = customer.Email,
                Country = recentInvoice?.BillingAddress?.Country,
                Tags = tags
            };
        });
        scope.Complete();
        return result;
    }

    private bool EvaluateCriterion(SegmentCriteria criterion, CustomerMetrics metrics)
    {
        try
        {
            // Special handling for Tag criteria
            if (criterion.Field.Equals("Tag", StringComparison.OrdinalIgnoreCase))
            {
                return EvaluateTagCriterion(criterion, metrics);
            }

            // Parse field name to enum
            if (!Enum.TryParse<SegmentCriteriaField>(criterion.Field, ignoreCase: true, out var field))
            {
                logger.LogWarning("Unknown segment criteria field: {Field}", criterion.Field);
                return false;
            }

            var fieldValue = GetFieldValue(field, metrics);
            return EvaluateOperator(criterion.Operator, fieldValue, criterion.Value, criterion.Value2);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error evaluating criterion for field {Field}", criterion.Field);
            return false;
        }
    }

    private bool EvaluateTagCriterion(SegmentCriteria criterion, CustomerMetrics metrics)
    {
        var tagValue = criterion.Value?.ToString() ?? "";
        return criterion.Operator switch
        {
            SegmentCriteriaOperator.Contains => metrics.Tags.Contains(tagValue, StringComparer.OrdinalIgnoreCase),
            SegmentCriteriaOperator.NotContains => !metrics.Tags.Contains(tagValue, StringComparer.OrdinalIgnoreCase),
            SegmentCriteriaOperator.IsEmpty => metrics.Tags.Count == 0,
            SegmentCriteriaOperator.IsNotEmpty => metrics.Tags.Count > 0,
            _ => false
        };
    }

    private object? GetFieldValue(SegmentCriteriaField field, CustomerMetrics metrics)
    {
        return field switch
        {
            SegmentCriteriaField.OrderCount => metrics.OrderCount,
            SegmentCriteriaField.TotalSpend => metrics.TotalSpend,
            SegmentCriteriaField.AverageOrderValue => metrics.AverageOrderValue,
            SegmentCriteriaField.FirstOrderDate => metrics.FirstOrderDate,
            SegmentCriteriaField.LastOrderDate => metrics.LastOrderDate,
            SegmentCriteriaField.DaysSinceLastOrder => metrics.DaysSinceLastOrder,
            SegmentCriteriaField.DateCreated => metrics.DateCreated,
            SegmentCriteriaField.Email => metrics.Email,
            SegmentCriteriaField.Country => metrics.Country,
            _ => null
        };
    }

    private bool EvaluateOperator(SegmentCriteriaOperator op, object? fieldValue, object? criteriaValue, object? criteriaValue2)
    {
        return op switch
        {
            SegmentCriteriaOperator.Equals => AreEqual(fieldValue, criteriaValue),
            SegmentCriteriaOperator.NotEquals => !AreEqual(fieldValue, criteriaValue),
            SegmentCriteriaOperator.GreaterThan => Compare(fieldValue, criteriaValue) > 0,
            SegmentCriteriaOperator.GreaterThanOrEqual => Compare(fieldValue, criteriaValue) >= 0,
            SegmentCriteriaOperator.LessThan => Compare(fieldValue, criteriaValue) < 0,
            SegmentCriteriaOperator.LessThanOrEqual => Compare(fieldValue, criteriaValue) <= 0,
            SegmentCriteriaOperator.Between => Compare(fieldValue, criteriaValue) >= 0 && Compare(fieldValue, criteriaValue2) <= 0,
            SegmentCriteriaOperator.Contains => fieldValue?.ToString()?.Contains(criteriaValue?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? false,
            SegmentCriteriaOperator.NotContains => !fieldValue?.ToString()?.Contains(criteriaValue?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? true,
            SegmentCriteriaOperator.StartsWith => fieldValue?.ToString()?.StartsWith(criteriaValue?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? false,
            SegmentCriteriaOperator.EndsWith => fieldValue?.ToString()?.EndsWith(criteriaValue?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? false,
            SegmentCriteriaOperator.IsEmpty => fieldValue == null || string.IsNullOrEmpty(fieldValue.ToString()),
            SegmentCriteriaOperator.IsNotEmpty => fieldValue != null && !string.IsNullOrEmpty(fieldValue.ToString()),
            _ => false
        };
    }

    private static bool AreEqual(object? a, object? b)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        // Try numeric comparison
        if (TryConvertToDecimal(a, out var decA) && TryConvertToDecimal(b, out var decB))
            return decA == decB;

        // Try date comparison
        if (TryConvertToDateTime(a, out var dateA) && TryConvertToDateTime(b, out var dateB))
            return dateA.Date == dateB.Date;

        // String comparison
        return string.Equals(a.ToString(), b.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static int Compare(object? a, object? b)
    {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;

        // Try numeric comparison
        if (TryConvertToDecimal(a, out var decA) && TryConvertToDecimal(b, out var decB))
            return decA.CompareTo(decB);

        // Try date comparison
        if (TryConvertToDateTime(a, out var dateA) && TryConvertToDateTime(b, out var dateB))
            return dateA.CompareTo(dateB);

        // String comparison
        return string.Compare(a.ToString(), b.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryConvertToDecimal(object? value, out decimal result)
    {
        result = 0;
        if (value == null) return false;

        if (value is decimal d) { result = d; return true; }
        if (value is int i) { result = i; return true; }
        if (value is long l) { result = l; return true; }
        if (value is double dbl) { result = (decimal)dbl; return true; }
        if (value is float f) { result = (decimal)f; return true; }

        return decimal.TryParse(value.ToString(), out result);
    }

    private static bool TryConvertToDateTime(object? value, out DateTime result)
    {
        result = DateTime.MinValue;
        if (value == null) return false;

        if (value is DateTime dt) { result = dt; return true; }
        if (value is DateTimeOffset dto) { result = dto.UtcDateTime; return true; }

        return DateTime.TryParse(value.ToString(), out result);
    }

    private static List<SegmentCriteriaOperator> GetNumericOperators() =>
    [
        SegmentCriteriaOperator.Equals,
        SegmentCriteriaOperator.NotEquals,
        SegmentCriteriaOperator.GreaterThan,
        SegmentCriteriaOperator.GreaterThanOrEqual,
        SegmentCriteriaOperator.LessThan,
        SegmentCriteriaOperator.LessThanOrEqual,
        SegmentCriteriaOperator.Between
    ];

    private static List<SegmentCriteriaOperator> GetDateOperators() =>
    [
        SegmentCriteriaOperator.Equals,
        SegmentCriteriaOperator.NotEquals,
        SegmentCriteriaOperator.GreaterThan,
        SegmentCriteriaOperator.GreaterThanOrEqual,
        SegmentCriteriaOperator.LessThan,
        SegmentCriteriaOperator.LessThanOrEqual,
        SegmentCriteriaOperator.Between
    ];

    private static List<SegmentCriteriaOperator> GetStringOperators() =>
    [
        SegmentCriteriaOperator.Equals,
        SegmentCriteriaOperator.NotEquals,
        SegmentCriteriaOperator.Contains,
        SegmentCriteriaOperator.NotContains,
        SegmentCriteriaOperator.StartsWith,
        SegmentCriteriaOperator.EndsWith,
        SegmentCriteriaOperator.IsEmpty,
        SegmentCriteriaOperator.IsNotEmpty
    ];

    private static List<SegmentCriteriaOperator> GetTagOperators() =>
    [
        SegmentCriteriaOperator.Contains,
        SegmentCriteriaOperator.NotContains,
        SegmentCriteriaOperator.IsEmpty,
        SegmentCriteriaOperator.IsNotEmpty
    ];

    // =====================================================
    // SQL-Based Criteria Evaluation (High Performance)
    // =====================================================

    /// <inheritdoc />
    public async Task<PaginatedList<Guid>> QueryMatchingCustomersAsync(
        SegmentCriteriaSet criteriaSet,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        if (criteriaSet.Criteria.Count == 0)
            return new PaginatedList<Guid>([], 0, page, pageSize);

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var utcNow = DateTime.UtcNow;

            // Build base query with LEFT JOIN aggregates
            var baseQuery = BuildCustomerWithMetricsQuery(db, utcNow);

            // Apply criteria filter
            var filteredQuery = ApplyCriteriaFilter(baseQuery, criteriaSet, utcNow);

            // Get total count
            var totalCount = await filteredQuery.CountAsync(ct);

            // Get paginated IDs with consistent ordering
            var customerIds = await filteredQuery
                .OrderBy(c => c.DateCreated)
                .ThenBy(c => c.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => c.Id)
                .ToListAsync(ct);

            return new PaginatedList<Guid>(customerIds, totalCount, page, pageSize);
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<int> CountMatchingCustomersAsync(
        SegmentCriteriaSet criteriaSet,
        CancellationToken ct = default)
    {
        if (criteriaSet.Criteria.Count == 0)
            return 0;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var utcNow = DateTime.UtcNow;
            var baseQuery = BuildCustomerWithMetricsQuery(db, utcNow);
            var filteredQuery = ApplyCriteriaFilter(baseQuery, criteriaSet, utcNow);
            return await filteredQuery.CountAsync(ct);
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Builds the base query that joins customers with their invoice aggregates.
    /// Uses LEFT JOIN so customers with no orders are included.
    /// </summary>
    private static IQueryable<CustomerWithMetrics> BuildCustomerWithMetricsQuery(MerchelloDbContext db, DateTime utcNow)
    {
        // Subquery for invoice aggregates per customer
        var invoiceAggregates = db.Invoices
            .Where(i => !i.IsDeleted && !i.IsCancelled)
            .GroupBy(i => i.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                OrderCount = g.Count(),
                TotalSpend = g.Sum(i => i.TotalInStoreCurrency ?? i.Total),
                FirstOrderDate = (DateTime?)g.Min(i => i.DateCreated),
                LastOrderDate = (DateTime?)g.Max(i => i.DateCreated)
            });

        // Subquery for most recent invoice's billing country
        var latestInvoiceCountry = db.Invoices
            .Where(i => !i.IsDeleted && !i.IsCancelled)
            .GroupBy(i => i.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                Country = db.Invoices
                    .Where(i => i.CustomerId == g.Key && !i.IsDeleted && !i.IsCancelled)
                    .OrderByDescending(i => i.DateCreated)
                    .Select(i => i.BillingAddress.Country)
                    .FirstOrDefault()
            });

        // Main query with LEFT JOINs
        var query = from c in db.Customers
                    join agg in invoiceAggregates on c.Id equals agg.CustomerId into aggJoin
                    from agg in aggJoin.DefaultIfEmpty()
                    join ctry in latestInvoiceCountry on c.Id equals ctry.CustomerId into ctryJoin
                    from ctry in ctryJoin.DefaultIfEmpty()
                    select new CustomerWithMetrics
                    {
                        Id = c.Id,
                        Email = c.Email,
                        DateCreated = c.DateCreated,
                        Tags = c.CustomerTags.Select(t => t.Tag).ToList(),
                        OrderCount = agg != null ? agg.OrderCount : 0,
                        TotalSpend = agg != null ? agg.TotalSpend : 0m,
                        FirstOrderDate = agg != null ? agg.FirstOrderDate : null,
                        LastOrderDate = agg != null ? agg.LastOrderDate : null,
                        Country = ctry != null ? ctry.Country : null
                    };

        return query;
    }

    /// <summary>
    /// Applies criteria filters to the query using LINQ expressions.
    /// </summary>
    private IQueryable<CustomerWithMetrics> ApplyCriteriaFilter(
        IQueryable<CustomerWithMetrics> query,
        SegmentCriteriaSet criteriaSet,
        DateTime utcNow)
    {
        if (criteriaSet.MatchMode == SegmentMatchMode.All)
        {
            // AND mode: chain Where clauses sequentially
            foreach (var criterion in criteriaSet.Criteria)
            {
                var predicate = BuildCriterionPredicate(criterion, utcNow);
                if (predicate != null)
                {
                    query = query.Where(predicate);
                }
            }
            return query;
        }

        // OR mode: build combined predicate and apply once
        var combinedPredicate = BuildOrCombinedPredicate(criteriaSet.Criteria, utcNow);
        return combinedPredicate != null ? query.Where(combinedPredicate) : query;
    }

    /// <summary>
    /// Builds a combined OR predicate for Any match mode.
    /// Uses expression tree manipulation that EF Core can translate to SQL.
    /// </summary>
    private Expression<Func<CustomerWithMetrics, bool>>? BuildOrCombinedPredicate(
        List<SegmentCriteria> criteria,
        DateTime utcNow)
    {
        Expression<Func<CustomerWithMetrics, bool>>? combined = null;

        foreach (var criterion in criteria)
        {
            var predicate = BuildCriterionPredicate(criterion, utcNow);
            if (predicate == null) continue;

            if (combined == null)
            {
                combined = predicate;
            }
            else
            {
                // Combine with OR using proper parameter replacement (EF Core compatible)
                combined = CombineOr(combined, predicate);
            }
        }

        return combined;
    }

    /// <summary>
    /// Combines two predicate expressions with OR, using proper parameter replacement
    /// so EF Core can translate the expression to SQL.
    /// </summary>
    private static Expression<Func<CustomerWithMetrics, bool>> CombineOr(
        Expression<Func<CustomerWithMetrics, bool>> left,
        Expression<Func<CustomerWithMetrics, bool>> right)
    {
        // Use the parameter from the left expression as the unified parameter
        var parameter = left.Parameters[0];

        // Replace the parameter in the right expression's body with the left's parameter
        var rightBody = new ParameterReplacer(right.Parameters[0], parameter).Visit(right.Body);

        // Combine with OrElse
        var combinedBody = Expression.OrElse(left.Body, rightBody);
        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(combinedBody, parameter);
    }

    /// <summary>
    /// Expression visitor that replaces one parameter with another.
    /// Required for combining lambda expressions in a way EF Core can translate to SQL.
    /// </summary>
    private sealed class ParameterReplacer(ParameterExpression oldParam, ParameterExpression newParam) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
        {
            return node == oldParam ? newParam : base.VisitParameter(node);
        }
    }

    /// <summary>
    /// Builds a predicate expression for a single criterion.
    /// </summary>
    private Expression<Func<CustomerWithMetrics, bool>>? BuildCriterionPredicate(
        SegmentCriteria criterion,
        DateTime utcNow)
    {
        try
        {
            // Parse field
            if (!Enum.TryParse<SegmentCriteriaField>(criterion.Field, ignoreCase: true, out var field))
            {
                logger.LogWarning("Unknown segment criteria field: {Field}", criterion.Field);
                return null;
            }

            return field switch
            {
                SegmentCriteriaField.OrderCount => BuildNumericPredicate(c => c.OrderCount, criterion),
                SegmentCriteriaField.TotalSpend => BuildDecimalPredicate(c => c.TotalSpend, criterion),
                SegmentCriteriaField.AverageOrderValue => BuildAverageOrderValuePredicate(criterion),
                SegmentCriteriaField.FirstOrderDate => BuildDatePredicate(c => c.FirstOrderDate, criterion),
                SegmentCriteriaField.LastOrderDate => BuildDatePredicate(c => c.LastOrderDate, criterion),
                SegmentCriteriaField.DaysSinceLastOrder => BuildDaysSinceLastOrderPredicate(criterion, utcNow),
                SegmentCriteriaField.DateCreated => BuildNonNullableDatePredicate(c => c.DateCreated, criterion),
                SegmentCriteriaField.Email => BuildStringPredicate(c => c.Email, criterion),
                SegmentCriteriaField.Country => BuildNullableStringPredicate(c => c.Country, criterion),
                SegmentCriteriaField.Tag => BuildTagPredicate(criterion),
                _ => null
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error building predicate for criterion field {Field}", criterion.Field);
            return null;
        }
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildNumericPredicate(
        Expression<Func<CustomerWithMetrics, int>> selector,
        SegmentCriteria criterion)
    {
        var value = Convert.ToInt32(criterion.Value);
        var value2 = criterion.Value2 != null ? Convert.ToInt32(criterion.Value2) : 0;

        // Build expression tree directly (not using Compile) for SQL translation
        var param = selector.Parameters[0];
        var property = selector.Body;
        var valueExpr = Expression.Constant(value);
        var value2Expr = Expression.Constant(value2);

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.Equal(property, valueExpr),
            SegmentCriteriaOperator.NotEquals => Expression.NotEqual(property, valueExpr),
            SegmentCriteriaOperator.GreaterThan => Expression.GreaterThan(property, valueExpr),
            SegmentCriteriaOperator.GreaterThanOrEqual => Expression.GreaterThanOrEqual(property, valueExpr),
            SegmentCriteriaOperator.LessThan => Expression.LessThan(property, valueExpr),
            SegmentCriteriaOperator.LessThanOrEqual => Expression.LessThanOrEqual(property, valueExpr),
            SegmentCriteriaOperator.Between => Expression.AndAlso(
                Expression.GreaterThanOrEqual(property, valueExpr),
                Expression.LessThanOrEqual(property, value2Expr)),
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildDecimalPredicate(
        Expression<Func<CustomerWithMetrics, decimal>> selector,
        SegmentCriteria criterion)
    {
        var value = Convert.ToDecimal(criterion.Value);
        var value2 = criterion.Value2 != null ? Convert.ToDecimal(criterion.Value2) : 0m;

        var param = selector.Parameters[0];
        var property = selector.Body;
        var valueExpr = Expression.Constant(value);
        var value2Expr = Expression.Constant(value2);

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.Equal(property, valueExpr),
            SegmentCriteriaOperator.NotEquals => Expression.NotEqual(property, valueExpr),
            SegmentCriteriaOperator.GreaterThan => Expression.GreaterThan(property, valueExpr),
            SegmentCriteriaOperator.GreaterThanOrEqual => Expression.GreaterThanOrEqual(property, valueExpr),
            SegmentCriteriaOperator.LessThan => Expression.LessThan(property, valueExpr),
            SegmentCriteriaOperator.LessThanOrEqual => Expression.LessThanOrEqual(property, valueExpr),
            SegmentCriteriaOperator.Between => Expression.AndAlso(
                Expression.GreaterThanOrEqual(property, valueExpr),
                Expression.LessThanOrEqual(property, value2Expr)),
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildAverageOrderValuePredicate(SegmentCriteria criterion)
    {
        var value = Convert.ToDecimal(criterion.Value);
        var value2 = criterion.Value2 != null ? Convert.ToDecimal(criterion.Value2) : 0m;

        // AverageOrderValue = TotalSpend / OrderCount (handle division by zero)
        return criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => c => c.OrderCount > 0 && c.TotalSpend / c.OrderCount == value,
            SegmentCriteriaOperator.NotEquals => c => c.OrderCount == 0 || c.TotalSpend / c.OrderCount != value,
            SegmentCriteriaOperator.GreaterThan => c => c.OrderCount > 0 && c.TotalSpend / c.OrderCount > value,
            SegmentCriteriaOperator.GreaterThanOrEqual => c => c.OrderCount > 0 && c.TotalSpend / c.OrderCount >= value,
            SegmentCriteriaOperator.LessThan => c => c.OrderCount == 0 || c.TotalSpend / c.OrderCount < value,
            SegmentCriteriaOperator.LessThanOrEqual => c => c.OrderCount == 0 || c.TotalSpend / c.OrderCount <= value,
            SegmentCriteriaOperator.Between => c => c.OrderCount > 0 && c.TotalSpend / c.OrderCount >= value && c.TotalSpend / c.OrderCount <= value2,
            _ => _ => false
        };
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildDatePredicate(
        Expression<Func<CustomerWithMetrics, DateTime?>> selector,
        SegmentCriteria criterion)
    {
        var value = Convert.ToDateTime(criterion.Value).Date;
        var value2 = criterion.Value2 != null ? Convert.ToDateTime(criterion.Value2).Date : DateTime.MinValue;

        var param = selector.Parameters[0];
        var property = selector.Body;
        var valueExpr = Expression.Constant(value);
        var value2Expr = Expression.Constant(value2);
        var nullExpr = Expression.Constant(null, typeof(DateTime?));

        // Get the .Value property and .Date property for comparisons
        var hasValueProp = Expression.Property(property, "HasValue");
        var valueProp = Expression.Property(property, "Value");
        var dateProp = Expression.Property(valueProp, "Date");

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.AndAlso(hasValueProp, Expression.Equal(dateProp, valueExpr)),
            SegmentCriteriaOperator.NotEquals => Expression.OrElse(Expression.Not(hasValueProp), Expression.NotEqual(dateProp, valueExpr)),
            SegmentCriteriaOperator.GreaterThan => Expression.AndAlso(hasValueProp, Expression.GreaterThan(dateProp, valueExpr)),
            SegmentCriteriaOperator.GreaterThanOrEqual => Expression.AndAlso(hasValueProp, Expression.GreaterThanOrEqual(dateProp, valueExpr)),
            SegmentCriteriaOperator.LessThan => Expression.AndAlso(hasValueProp, Expression.LessThan(dateProp, valueExpr)),
            SegmentCriteriaOperator.LessThanOrEqual => Expression.AndAlso(hasValueProp, Expression.LessThanOrEqual(dateProp, valueExpr)),
            SegmentCriteriaOperator.Between => Expression.AndAlso(
                hasValueProp,
                Expression.AndAlso(
                    Expression.GreaterThanOrEqual(dateProp, valueExpr),
                    Expression.LessThanOrEqual(dateProp, value2Expr))),
            SegmentCriteriaOperator.IsEmpty => Expression.Not(hasValueProp),
            SegmentCriteriaOperator.IsNotEmpty => hasValueProp,
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildNonNullableDatePredicate(
        Expression<Func<CustomerWithMetrics, DateTime>> selector,
        SegmentCriteria criterion)
    {
        var value = Convert.ToDateTime(criterion.Value).Date;
        var value2 = criterion.Value2 != null ? Convert.ToDateTime(criterion.Value2).Date : DateTime.MinValue;

        var param = selector.Parameters[0];
        var property = selector.Body;
        var dateProp = Expression.Property(property, "Date");
        var valueExpr = Expression.Constant(value);
        var value2Expr = Expression.Constant(value2);

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.Equal(dateProp, valueExpr),
            SegmentCriteriaOperator.NotEquals => Expression.NotEqual(dateProp, valueExpr),
            SegmentCriteriaOperator.GreaterThan => Expression.GreaterThan(dateProp, valueExpr),
            SegmentCriteriaOperator.GreaterThanOrEqual => Expression.GreaterThanOrEqual(dateProp, valueExpr),
            SegmentCriteriaOperator.LessThan => Expression.LessThan(dateProp, valueExpr),
            SegmentCriteriaOperator.LessThanOrEqual => Expression.LessThanOrEqual(dateProp, valueExpr),
            SegmentCriteriaOperator.Between => Expression.AndAlso(
                Expression.GreaterThanOrEqual(dateProp, valueExpr),
                Expression.LessThanOrEqual(dateProp, value2Expr)),
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    /// <summary>
    /// Builds predicate for DaysSinceLastOrder by translating to date comparisons.
    /// This is cross-database compatible (works on SQLite and SQL Server).
    /// </summary>
    private static Expression<Func<CustomerWithMetrics, bool>> BuildDaysSinceLastOrderPredicate(
        SegmentCriteria criterion,
        DateTime utcNow)
    {
        var days = Convert.ToInt32(criterion.Value);
        var days2 = criterion.Value2 != null ? Convert.ToInt32(criterion.Value2) : 0;

        // DaysSinceLastOrder > X means LastOrderDate < (utcNow - X days)
        // DaysSinceLastOrder < X means LastOrderDate > (utcNow - X days)
        var cutoffDate = utcNow.AddDays(-days).Date;
        var cutoffDate2 = utcNow.AddDays(-days2).Date;

        return criterion.Operator switch
        {
            // Days == X: LastOrderDate is exactly X days ago
            SegmentCriteriaOperator.Equals => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date == cutoffDate,
            SegmentCriteriaOperator.NotEquals => c => c.LastOrderDate == null || c.LastOrderDate.Value.Date != cutoffDate,
            // Days > X: LastOrderDate < cutoff (ordered longer ago)
            SegmentCriteriaOperator.GreaterThan => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date < cutoffDate,
            SegmentCriteriaOperator.GreaterThanOrEqual => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date <= cutoffDate,
            // Days < X: LastOrderDate > cutoff (ordered more recently)
            SegmentCriteriaOperator.LessThan => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date > cutoffDate,
            SegmentCriteriaOperator.LessThanOrEqual => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date >= cutoffDate,
            // Between X and Y: LastOrderDate between (utcNow - Y) and (utcNow - X)
            SegmentCriteriaOperator.Between => c => c.LastOrderDate != null && c.LastOrderDate.Value.Date <= cutoffDate && c.LastOrderDate.Value.Date >= cutoffDate2,
            _ => _ => false
        };
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildStringPredicate(
        Expression<Func<CustomerWithMetrics, string>> selector,
        SegmentCriteria criterion)
    {
        var value = criterion.Value?.ToString() ?? "";
        var valueLower = value.ToLowerInvariant();

        var param = selector.Parameters[0];
        var property = selector.Body;
        var valueExpr = Expression.Constant(valueLower);

        // Use ToLower for case-insensitive comparison (SQL translatable)
        var toLowerMethod = typeof(string).GetMethod("ToLower", Type.EmptyTypes)!;
        var propertyLower = Expression.Call(property, toLowerMethod);

        var containsMethod = typeof(string).GetMethod("Contains", [typeof(string)])!;
        var startsWithMethod = typeof(string).GetMethod("StartsWith", [typeof(string)])!;
        var endsWithMethod = typeof(string).GetMethod("EndsWith", [typeof(string)])!;
        var isNullOrEmptyMethod = typeof(string).GetMethod("IsNullOrEmpty", [typeof(string)])!;

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.Equal(propertyLower, valueExpr),
            SegmentCriteriaOperator.NotEquals => Expression.NotEqual(propertyLower, valueExpr),
            SegmentCriteriaOperator.Contains => Expression.Call(propertyLower, containsMethod, valueExpr),
            SegmentCriteriaOperator.NotContains => Expression.Not(Expression.Call(propertyLower, containsMethod, valueExpr)),
            SegmentCriteriaOperator.StartsWith => Expression.Call(propertyLower, startsWithMethod, valueExpr),
            SegmentCriteriaOperator.EndsWith => Expression.Call(propertyLower, endsWithMethod, valueExpr),
            SegmentCriteriaOperator.IsEmpty => Expression.Call(isNullOrEmptyMethod, property),
            SegmentCriteriaOperator.IsNotEmpty => Expression.Not(Expression.Call(isNullOrEmptyMethod, property)),
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildNullableStringPredicate(
        Expression<Func<CustomerWithMetrics, string?>> selector,
        SegmentCriteria criterion)
    {
        var value = criterion.Value?.ToString() ?? "";
        var valueLower = value.ToLowerInvariant();

        var param = selector.Parameters[0];
        var property = selector.Body;
        var valueExpr = Expression.Constant(valueLower);
        var nullExpr = Expression.Constant(null, typeof(string));

        var isNotNull = Expression.NotEqual(property, nullExpr);
        var isNull = Expression.Equal(property, nullExpr);

        // Use ToLower for case-insensitive comparison
        var toLowerMethod = typeof(string).GetMethod("ToLower", Type.EmptyTypes)!;
        var propertyLower = Expression.Call(property, toLowerMethod);

        var containsMethod = typeof(string).GetMethod("Contains", [typeof(string)])!;
        var startsWithMethod = typeof(string).GetMethod("StartsWith", [typeof(string)])!;
        var endsWithMethod = typeof(string).GetMethod("EndsWith", [typeof(string)])!;
        var isNullOrEmptyMethod = typeof(string).GetMethod("IsNullOrEmpty", [typeof(string)])!;

        Expression body = criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Expression.AndAlso(isNotNull, Expression.Equal(propertyLower, valueExpr)),
            SegmentCriteriaOperator.NotEquals => Expression.OrElse(isNull, Expression.NotEqual(propertyLower, valueExpr)),
            SegmentCriteriaOperator.Contains => Expression.AndAlso(isNotNull, Expression.Call(propertyLower, containsMethod, valueExpr)),
            SegmentCriteriaOperator.NotContains => Expression.OrElse(isNull, Expression.Not(Expression.Call(propertyLower, containsMethod, valueExpr))),
            SegmentCriteriaOperator.StartsWith => Expression.AndAlso(isNotNull, Expression.Call(propertyLower, startsWithMethod, valueExpr)),
            SegmentCriteriaOperator.EndsWith => Expression.AndAlso(isNotNull, Expression.Call(propertyLower, endsWithMethod, valueExpr)),
            SegmentCriteriaOperator.IsEmpty => Expression.Call(isNullOrEmptyMethod, property),
            SegmentCriteriaOperator.IsNotEmpty => Expression.Not(Expression.Call(isNullOrEmptyMethod, property)),
            _ => Expression.Constant(false)
        };

        return Expression.Lambda<Func<CustomerWithMetrics, bool>>(body, param);
    }

    private static Expression<Func<CustomerWithMetrics, bool>> BuildTagPredicate(SegmentCriteria criterion)
    {
        var tagValue = criterion.Value?.ToString() ?? "";

        // For tags stored as JSON List<string>, EF Core can translate Contains
        // Use simple lambda expressions that EF Core can handle
        return criterion.Operator switch
        {
            SegmentCriteriaOperator.Contains => c => c.Tags.Contains(tagValue),
            SegmentCriteriaOperator.NotContains => c => !c.Tags.Contains(tagValue),
            SegmentCriteriaOperator.IsEmpty => c => c.Tags.Count == 0,
            SegmentCriteriaOperator.IsNotEmpty => c => c.Tags.Count > 0,
            _ => _ => false
        };
    }
}

/// <summary>
/// Internal projection model for SQL-based criteria evaluation.
/// Contains customer data with pre-computed invoice aggregates.
/// </summary>
internal class CustomerWithMetrics
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public List<string> Tags { get; set; } = [];
    public int OrderCount { get; set; }
    public decimal TotalSpend { get; set; }
    public DateTime? FirstOrderDate { get; set; }
    public DateTime? LastOrderDate { get; set; }
    public string? Country { get; set; }
}
