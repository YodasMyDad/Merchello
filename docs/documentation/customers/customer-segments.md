# Customer Segments

Customer Segments are an admin tool for grouping customers together to target discounts and promotions. Segments come in two flavors ([`CustomerSegmentType.cs`](../../../src/Merchello.Core/Customers/Models/CustomerSegmentType.cs)):

- **Manual** -- membership is explicit. Customers are added and removed by a backoffice user (stored in `CustomerSegmentMember`).
- **Automated** -- membership is calculated on the fly from criteria rules (e.g. "total spend >= 500" or "first order in the last 30 days"). No table of members exists; evaluation happens per request.

## Criteria Fields (Automated Segments)

Automated segments evaluate against a fixed catalogue of fields ([`SegmentCriteriaField.cs`](../../../src/Merchello.Core/Customers/Models/SegmentCriteriaField.cs)):

| Category | Fields |
| -------- | ------ |
| Order metrics | `OrderCount`, `TotalSpend`, `AverageOrderValue`, `FirstOrderDate`, `LastOrderDate`, `DaysSinceLastOrder` |
| Customer properties | `DateCreated`, `Email`, `Country` |
| Custom | `Tag` |

Rules are combined using a `SegmentMatchMode` (`All` / `Any`) and an operator per rule (`SegmentCriteriaOperator`).

## Manual vs Automated: Practical Differences

| Concern | Manual | Automated |
| ------- | ------ | --------- |
| Adding a customer | Explicit via backoffice | Implicit once they match criteria |
| Removing a customer | Explicit via backoffice | Implicit as soon as they stop matching |
| Audit | Exact membership list persisted | No persisted list; recomputed |
| Performance | Direct DB lookup | Criteria evaluated against customer aggregates |
| Good for | One-off VIP lists, B2B account groups | Programmatic tiers (spend, recency, etc.) |

## Storefront Impact

Segments are configured entirely in the Merchello backoffice. There are **no segment APIs used on the storefront** -- segments work behind the scenes to control which customers are eligible for specific discounts.

When a segment-restricted discount is active (`DiscountEligibilityType.CustomerSegments` -- see [Discounts Overview](../discounts/discounts-overview.md#segment-targeting)), the discount engine calls [`ICustomerSegmentService.IsCustomerInSegmentAsync(segmentId, customerId, ct)`](../../../src/Merchello.Core/Customers/Services/Interfaces/ICustomerSegmentService.cs#L76) -- the single centralized method for membership checks. Manual segments hit the DB, automated segments evaluate criteria; callers do not need to care which.

No storefront code is needed to make segment-restricted discounts work: the customer is identified by email at checkout, segment membership is resolved at discount-evaluation time, and the applicable discounts flow through the usual basket totals.

## Next Steps

- [Customer Management](customer-management.md) -- how customers themselves are created and linked to Umbraco Members
- [Discounts Overview](../discounts/discounts-overview.md) -- how segments feed `DiscountEligibilityType`
- [Architecture-Diagrams Section 2.8](../../Architecture-Diagrams.md) -- full service map for customers and segments
