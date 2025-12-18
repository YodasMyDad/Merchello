using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Accounting.Services;

public class LineItemService(ICurrencyService currencyService) : ILineItemService
{
    public List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem)
    {
        var errors = newLineItem.ValidateLineItem();
        if (errors.Any())
        {
            return errors;
        }

        var sameLineItem =
            currentLineItems.FirstOrDefault(x =>
                x.Sku == newLineItem.Sku && newLineItem.LineItemType == x.LineItemType);

        if (sameLineItem != null)
        {
            newLineItem.Quantity += sameLineItem.Quantity;

            foreach (var extendedDataEntry in sameLineItem.ExtendedData)
            {
                newLineItem.ExtendedData.TryAdd(extendedDataEntry.Key, extendedDataEntry.Value);
            }

            newLineItem.Id = sameLineItem.Id;
            currentLineItems.RemoveAll(x => x.Id == sameLineItem.Id);
            currentLineItems.Add(newLineItem);
        }
        else
        {
            currentLineItems.Add(newLineItem);
        }

        return errors;
    }

    public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateFromLineItems(
            List<LineItem> lineItems,
            decimal shippingAmount,
            decimal defaultTaxRate,
            string currencyCode,
            bool isShippingTaxable = true)
    {
        // Separate product/custom items from discount items
        var productItems = lineItems.Where(li =>
            li.LineItemType == LineItemType.Product ||
            li.LineItemType == LineItemType.Custom).ToList();

        var discountItems = lineItems.Where(li => li.LineItemType == LineItemType.Discount).ToList();

        // Calculate subtotal from products/custom items
        var subTotal = productItems.Sum(li =>
            currencyService.Round(li.Amount * li.Quantity, currencyCode));

        // Process discount items - handle percentage discounts by calculating actual amount
        decimal totalDiscountAmount = 0;
        foreach (var discount in discountItems)
        {
            var discountAmount = discount.Amount; // Already negative for fixed amounts

            // Check if this is a percentage or free discount (stored in ExtendedData)
            if (discount.ExtendedData.TryGetValue("DiscountValueType", out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue("DiscountValue", out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };

                    // Calculate percentage of relevant base
                    if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
                    {
                        // Linked to specific product - calculate percentage of that product's total
                        var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                        if (linkedItem != null)
                        {
                            var linkedTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
                            discountAmount = -currencyService.Round(linkedTotal * (percentageValue / 100m), currencyCode);
                        }
                    }
                    else
                    {
                        // Order-level percentage - calculate percentage of subtotal
                        discountAmount = -currencyService.Round(subTotal * (percentageValue / 100m), currencyCode);
                    }
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Free means 100% off the linked item
                    if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
                    {
                        var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                        if (linkedItem != null)
                        {
                            var linkedTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
                            discountAmount = -linkedTotal;
                        }
                    }
                    else
                    {
                        // Order-level free - full subtotal off (unusual but supported)
                        discountAmount = -subTotal;
                    }
                }
            }

            totalDiscountAmount += discountAmount; // discountAmount is negative
        }

        // Adjusted subtotal (discount is negative so we add it)
        var adjustedSubTotal = currencyService.Round(subTotal + totalDiscountAmount, currencyCode);
        adjustedSubTotal = Math.Max(0, adjustedSubTotal); // Ensure non-negative

        // Separate linked vs unlinked discounts for tax calculation
        var linkedDiscounts = discountItems.Where(d => !string.IsNullOrEmpty(d.DependantLineItemSku)).ToList();
        var unlinkedDiscountTotal = CalculateUnlinkedDiscountTotal(discountItems, subTotal, currencyCode);

        // Get taxable items
        var taxableItems = productItems.Where(li => li.IsTaxable).ToList();
        var totalTaxableAmount = taxableItems.Sum(li =>
            currencyService.Round(li.Amount * li.Quantity, currencyCode));

        // Calculate tax on discounted amounts
        decimal tax = 0;
        foreach (var lineItem in taxableItems)
        {
            var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);

            // Find any linked discount for this item
            var lineItemDiscount = CalculateLinkedDiscountForItem(linkedDiscounts, lineItem, currencyCode);

            // Pro-rate unlinked discounts across taxable items
            var proRatedUnlinkedDiscount = 0m;
            if (unlinkedDiscountTotal < 0 && totalTaxableAmount > 0)
            {
                var proportion = itemTotal / totalTaxableAmount;
                proRatedUnlinkedDiscount = currencyService.Round(unlinkedDiscountTotal * proportion, currencyCode);
            }

            // Tax on discounted amount
            var taxableAmount = currencyService.Round(itemTotal + lineItemDiscount + proRatedUnlinkedDiscount, currencyCode);
            taxableAmount = Math.Max(0, taxableAmount);
            tax += currencyService.Round(taxableAmount * (lineItem.TaxRate / 100m), currencyCode);
        }

        // Add shipping tax if applicable
        if (isShippingTaxable && shippingAmount > 0)
        {
            tax += currencyService.Round(shippingAmount * (defaultTaxRate / 100m), currencyCode);
        }

        var total = currencyService.Round(adjustedSubTotal + tax + shippingAmount, currencyCode);
        var discountAbsolute = currencyService.Round(Math.Abs(totalDiscountAmount), currencyCode);

        return (subTotal, discountAbsolute, adjustedSubTotal, tax, total, shippingAmount);
    }

    private decimal CalculateUnlinkedDiscountTotal(
        List<LineItem> discountItems,
        decimal subTotal,
        string currencyCode)
    {
        decimal total = 0;
        foreach (var discount in discountItems.Where(d => string.IsNullOrEmpty(d.DependantLineItemSku)))
        {
            var discountAmount = discount.Amount;

            if (discount.ExtendedData.TryGetValue("DiscountValueType", out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue("DiscountValue", out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };
                    discountAmount = -currencyService.Round(subTotal * (percentageValue / 100m), currencyCode);
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Order-level free - full subtotal off
                    discountAmount = -subTotal;
                }
            }

            total += discountAmount;
        }
        return total;
    }

    private decimal CalculateLinkedDiscountForItem(
        List<LineItem> linkedDiscounts,
        LineItem lineItem,
        string currencyCode)
    {
        decimal total = 0;
        foreach (var discount in linkedDiscounts.Where(d => d.DependantLineItemSku == lineItem.Sku))
        {
            var discountAmount = discount.Amount;

            if (discount.ExtendedData.TryGetValue("DiscountValueType", out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue("DiscountValue", out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };
                    var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);
                    discountAmount = -currencyService.Round(itemTotal * (percentageValue / 100m), currencyCode);
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Free means 100% off the linked item
                    var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);
                    discountAmount = -itemTotal;
                }
            }

            total += discountAmount;
        }
        return total;
    }

    public List<string> AddDiscountLineItem(
        List<LineItem> lineItems,
        decimal amount,
        DiscountValueType discountValueType,
        string currencyCode,
        string? linkedSku = null,
        string? name = null,
        string? reason = null)
    {
        List<string> errors = [];

        if (amount <= 0)
        {
            errors.Add("Discount amount must be greater than zero");
            return errors;
        }

        if (discountValueType == DiscountValueType.Percentage && amount > 100)
        {
            errors.Add("Percentage discount cannot exceed 100%");
            return errors;
        }

        // If linking to a SKU, verify it exists
        if (!string.IsNullOrEmpty(linkedSku))
        {
            var linkedItem = lineItems.FirstOrDefault(li =>
                li.Sku == linkedSku &&
                (li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom));

            if (linkedItem == null)
            {
                errors.Add($"Cannot link discount to SKU '{linkedSku}' - item not found in line items");
                return errors;
            }
        }

        // Calculate the actual discount amount for storage
        decimal storedAmount;
        if (discountValueType == DiscountValueType.FixedAmount)
        {
            storedAmount = -amount; // Store as negative
        }
        else
        {
            // For percentage/free, we store a placeholder negative amount
            // The actual calculation happens in CalculateFromLineItems
            // We store the value type in ExtendedData
            storedAmount = -amount; // Placeholder - will be recalculated
        }

        var discountLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            LineItemType = LineItemType.Discount,
            Name = name ?? (discountValueType == DiscountValueType.Percentage ? $"{amount}% discount" : discountValueType == DiscountValueType.Free ? "Free" : "Discount"),
            Sku = $"DISCOUNT-{Guid.NewGuid():N}",
            Amount = storedAmount,
            Quantity = 1,
            IsTaxable = false,
            TaxRate = 0,
            DependantLineItemSku = linkedSku,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow,
            ExtendedData = new Dictionary<string, object>
            {
                ["DiscountValueType"] = discountValueType.ToString(),
                ["DiscountValue"] = amount
            }
        };

        if (!string.IsNullOrEmpty(reason))
        {
            discountLineItem.ExtendedData["Reason"] = reason;
        }

        lineItems.Add(discountLineItem);
        return errors;
    }

    public bool RemoveDiscountLineItem(List<LineItem> lineItems, Guid discountLineItemId)
    {
        var discount = lineItems.FirstOrDefault(li =>
            li.Id == discountLineItemId && li.LineItemType == LineItemType.Discount);

        if (discount == null)
        {
            return false;
        }

        lineItems.Remove(discount);
        return true;
    }
}

