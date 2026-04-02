# Customer Segments

Customer Segments are an admin tool for grouping customers together to target discounts and promotions. Segments can be manual (hand-picked customers) or automated (rule-based criteria like total spend or order count).

## Storefront Impact

Segments are configured entirely in the Merchello backoffice. There are no segment APIs used on the storefront -- segments work behind the scenes to control which customers are eligible for specific discounts.

When a segment-restricted discount is active, Merchello automatically evaluates whether the current customer qualifies during checkout. No storefront code is needed.

## Next Steps

- [Discounts Overview](../discounts/discounts-overview.md) -- how segments are used for discount eligibility
