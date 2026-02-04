using System.Linq.Expressions;

namespace Merchello.Core.Customers.Services;

/// <summary>
/// Expression visitor that replaces one parameter with another.
/// Required for combining lambda expressions in a way EF Core can translate to SQL.
/// </summary>
internal sealed class ParameterReplacer(ParameterExpression oldParam, ParameterExpression newParam) : ExpressionVisitor
{
    protected override Expression VisitParameter(ParameterExpression node)
    {
        return node == oldParam ? newParam : base.VisitParameter(node);
    }
}
