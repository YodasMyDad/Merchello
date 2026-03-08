namespace Merchello.Core.Actions.Models;

/// <summary>
/// Categories of backoffice actions, determining which page the action appears on.
/// </summary>
public enum ActionCategory
{
    Invoice,
    Order,
    ProductRoot,
    Product,
    Customer,
    Warehouse,
    Supplier
}
