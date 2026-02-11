using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Extensions;

/// <summary>
/// Relationship helpers for linking add-on line items to parent line items.
/// </summary>
public static class LineItemRelationshipExtensions
{
    /// <summary>
    /// Returns the parent line item ID for an add-on, if available.
    /// </summary>
    public static Guid? GetParentLineItemId(this LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ParentLineItemId, out var parentValue))
        {
            return null;
        }

        var raw = parentValue.UnwrapJsonElement()?.ToString();
        return Guid.TryParse(raw, out var parentId) ? parentId : null;
    }

    /// <summary>
    /// Sets or clears the parent line item ID in extended data.
    /// </summary>
    public static void SetParentLineItemId(this LineItem lineItem, Guid? parentLineItemId)
    {
        if (parentLineItemId.HasValue)
        {
            lineItem.ExtendedData[Constants.ExtendedDataKeys.ParentLineItemId] = parentLineItemId.Value.ToString();
            return;
        }

        lineItem.ExtendedData.Remove(Constants.ExtendedDataKeys.ParentLineItemId);
    }

    /// <summary>
    /// Returns the add-on selection signature used to differentiate parent lines in basket merges.
    /// </summary>
    public static string? GetAddonSelectionSignature(this LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.AddonSelectionSignature, out var signatureValue))
        {
            return null;
        }

        var signature = signatureValue.UnwrapJsonElement()?.ToString();
        return string.IsNullOrWhiteSpace(signature) ? null : signature;
    }

    /// <summary>
    /// True when an add-on belongs to the provided parent line item.
    /// Uses parent ID first, then SKU fallback for legacy data.
    /// </summary>
    public static bool IsAddonLinkedToParent(this LineItem addonLineItem, LineItem parentLineItem)
    {
        if (addonLineItem.LineItemType != LineItemType.Addon)
        {
            return false;
        }

        var parentLineItemId = addonLineItem.GetParentLineItemId();
        if (parentLineItemId.HasValue)
        {
            return parentLineItemId.Value == parentLineItem.Id;
        }

        if (string.IsNullOrWhiteSpace(addonLineItem.DependantLineItemSku) || string.IsNullOrWhiteSpace(parentLineItem.Sku))
        {
            return false;
        }

        return string.Equals(addonLineItem.DependantLineItemSku, parentLineItem.Sku, StringComparison.OrdinalIgnoreCase);
    }
}

