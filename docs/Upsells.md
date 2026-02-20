# Upsells & Product Recommendations

A rule-based product recommendation system for Merchello that allows administrators to create upsell rules via the backoffice. When trigger conditions are met in a customer's basket, relevant product recommendations are shown across checkout, basket, product pages, and email templates.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Design Decisions](#key-design-decisions)
3. [Checkout Display Modes](#checkout-display-modes)
4. [Payment Gateway Requirements](#payment-gateway-requirements-post-purchase-only)
5. [Architecture](#architecture)
6. [Implementation Phases](#implementation-phases)
   - [Phase 1: Foundation â€” Enums, Models & Database](#phase-1-foundation--enums-models--database)
   - [Phase 2: Services â€” CRUD, Factory, Engine & Matching](#phase-2-services--crud-factory-engine--matching)
   - [Phase 3: Admin API & DTOs](#phase-3-admin-api--dtos)
   - [Phase 4: Backoffice UI](#phase-4-backoffice-ui)
   - [Phase 5: Storefront & Email Integration](#phase-5-storefront--email-integration)
   - [Phase 6: Analytics & Background Jobs](#phase-6-analytics--background-jobs)
   - [Phase 7: Integration Tests](#phase-7-integration-tests)
   - [Phase 8: Post-Purchase Upsells](#phase-8-post-purchase-upsells)
7. [File Structure Summary](#file-structure-summary)
8. [Configuration](#configuration)

---

## Overview

The Upsells feature enables store administrators to create rule-based product recommendations that appear when trigger conditions are met in a customer's basket. Unlike discounts, upsells recommend products at their normal price â€” pricing incentives are handled exclusively by the Discounts feature.

**Key Concepts:**

- **Trigger Rules** â€” Conditions evaluated against the current basket (what products are in the cart)
- **Recommendation Rules** â€” Which products to suggest when triggers match
- **Eligibility Rules** â€” Who sees the upsell (customer segments, specific customers, or everyone)
- **Filter Matching** â€” Recommended products can be automatically filtered to share the same filter values (e.g., size, colour) as the trigger products in the basket
- **Display Locations** â€” Checkout, basket, product pages, and email templates
- **Analytics** â€” Full impression, click, and conversion tracking with ROI reporting

The feature follows the same architectural patterns as the Discount system: JSON-serialized rule columns on the entity, a static matcher utility, an engine for evaluation, a name resolver for admin display, and Lit-based backoffice UI components.

### Examples

**Example 1: Bed â†’ Pillows (Product Type Cross-Sell)**

A customer adds a Bed to their basket. The upsell rule has:

- **Trigger**: Basket contains products of types `WoodenBed`, `MetalBed`
- **Recommendation**: Show products of types `FeatherPillow`, `MemoryFoamPillow`

The engine checks if any line items match the trigger types. If they do, it fetches products from the recommendation types, filters out any already in the basket, sorts by the configured order (e.g., BestSeller), and shows up to the configured max.

**Example 2: Bed (King Size) â†’ Mattress (King Size) (Filter-Matched Cross-Sell)**

A customer adds a King Size Bed. The upsell rule has:

- **Trigger**: Basket contains products of types `WoodenBed`, `MetalBed` â€” **extract filter values from Size group**
- **Recommendation**: Show products of types `CoilMattress`, `MemoryMattress` â€” **match trigger filters**

The engine finds the bed in the basket, extracts its "King Size" filter value from the Size filter group, then queries mattresses and filters to only those that also have "King Size" in the same filter group.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Trigger / Recommendation naming** | Action-oriented language that maps clearly to "when X is in cart, show Y" |
| **No pricing incentives on upsells** | Keeps upsells focused on recommendations; discounts feature handles pricing separately |
| **Current basket evaluation only** | Simpler, covers primary use cases; purchase history can be added later |
| **JSON rule storage** | Consistent with discount system; flexible, no extra tables for rules |
| **Flags enum for display locations** | Single rule can target multiple locations (Checkout + Basket + Email) |
| **Filter matching via ExtractFilterGroupIds** | Enables "same size/colour" matching without hardcoding filter logic |
| **Server-side conversion tracking** | Accurate attribution via OrderCreatedNotification handler |
| **Heading + Message fields** | Customer-facing promotional text ("Complete your bedroom", "Don't forget pillows!") |
| **Suppress if already in cart** | Configurable toggle, defaults to true â€” don't show products already in the basket |
| **Priority ordering** | Lower number = higher priority, matching discount system convention |
| **Rules stack, not exclude** | Multiple matching rules each produce their own suggestion group with distinct heading/message. Mutual exclusivity would limit cross-sell variety |
| **Cross-rule product overlap allowed** | Same product can appear in different suggestion groups since each group has different promotional context. Deduplicated within a single rule's product list only (by ProductRootId) |
| **Region-aware recommendations** | Recommended products filtered by warehouse shipping region using existing `Warehouse.CanServeRegion()`. Prevents recommending products that can't reach the customer |
| **Buffered event writes** | Impressions buffered in-memory and flushed in batches (every 5s or 500 events). Avoids per-pageview DB writes on the storefront hot path |
| **Batch product fetching** | Recommendation products fetched in 1-2 queries total (grouped by recommendation type), not per-rule. Keeps DB round-trips constant regardless of matched rule count |
| **Live BestSeller sort** | Uses existing `ProductOrderBy.Popularity` aggregation against the small candidate set (10-50 products). No pre-computed column needed at launch |
| **Per-rule CheckoutMode** | Different upsell strategies suit different modes â€” accessories (inline) vs warranty (interstitial) vs impulse (post-purchase) |
| **Interstitial replaces left column** | Cleaner UX than modal; order summary remains visible; no z-index/overlay issues |
| **Post-purchase via VaultedPayments** | Leverages existing VaultedPayments infrastructure for saved payment methods and off-session charging |
| **Gateway compatibility check in UI** | Prevents misconfiguration; PostPurchase requires `SupportsVaultedPayments` + `IsVaultingEnabled` (Stripe/Braintree/PayPal). PayPal may require vault/reference approval. |
| **Fulfillment hold window** | Prevents shipping before post-purchase decision; configurable timeout |
| **Graceful degradation** | If post-purchase fails, proceed to confirmation rather than blocking |

### Upsell Content Types

Upsells support two distinct content types, determined by whether the rule has recommendation rules:

| Content Type | When | Display |
| ------------ | ---- | ------- |
| **Product Recommendations** | Rule has `RecommendationRules` | Heading + Message + Product grid with Add buttons |
| **Message Only** | Rule has empty `RecommendationRules` | Heading + Message only (no products) |

**Product Recommendations** (most common):

Shows a grid of product cards. Each card includes:

- Product image (from `ProductRoot.Media`, fallback to placeholder)
- Product name and price (formatted per `DisplayPricesIncTax` setting)
- **Variant selector dropdown** â€” if product has variants, customer selects before adding
- **Add to Cart/Order button** â€” disabled until variant selected (if applicable)
- "Added âœ“" state after successful add

**Message Only** (for prompts/nudges):

Shows only the heading and message text â€” useful for cart value triggers like "Spend Â£20 more for free shipping!" where no specific product recommendation is needed.

---

## Checkout Display Modes

The integrated Merchello checkout supports three display modes for upsells, configured per-rule via `CheckoutMode`. This allows different strategies for different product types.

### Inline Mode (Default)

- Collapsible section at top of checkout page, above the checkout forms
- Shows product cards with "Add to Cart" buttons
- Variant selector dropdown if product has variants
- Expands/collapses without page reload
- Lowest friction â€” customers can ignore and proceed
- Best for: Low-value add-ons, accessories

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ â–¼ You might also like...                          [Collapse]â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”‚
â”‚ â”‚ Pillow  â”‚ â”‚ Sheets  â”‚ â”‚ Mattressâ”‚ â”‚ Duvet   â”‚            â”‚
â”‚ â”‚  Â£29    â”‚ â”‚  Â£49    â”‚ â”‚  Â£199   â”‚ â”‚  Â£79    â”‚            â”‚
â”‚ â”‚[Add]    â”‚ â”‚[Add]    â”‚ â”‚[Add]    â”‚ â”‚[Add]    â”‚            â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Checkout Form (shipping, billing, payment)                  â”‚
â”‚ ...                                                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Interstitial Mode

- Replaces the checkout left column content entirely
- Customer must click "Continue to Checkout" or "No Thanks" to proceed
- Shows larger product cards with descriptions
- Higher visibility, adds intentional friction
- Best for: High-value upsells, warranty/protection plans, bundles

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Complete Your Purchase                                      â”‚
â”‚                                                             â”‚
â”‚ "Customers who bought a King Bed also added..."             â”‚
â”‚                                                             â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚ â”‚ [Image] Premium Memory Foam Mattress                  â”‚  â”‚
â”‚ â”‚         Perfect match for your new bed                â”‚  â”‚
â”‚ â”‚         Â£299  [Select Size â–¼]  [Add to Order]         â”‚  â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                             â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚ â”‚ [Image] 5-Year Protection Plan                        â”‚  â”‚
â”‚ â”‚         Covers accidental damage & wear               â”‚  â”‚
â”‚ â”‚         Â£49   [Add to Order]                          â”‚  â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                             â”‚
â”‚       [Continue to Checkout]     [No Thanks, Skip]          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

When items are added, they go into the basket and the order summary (right column) updates. Clicking "Continue to Checkout" reveals the standard checkout forms.

### Post-Purchase Mode

- Shows after payment succeeds, before order confirmation
- One-click "Add to Order" â€” charges saved payment method via VaultedPayments
- Highest conversion potential (payment friction already passed)
- Requires VaultedPayments feature (see [Phase 8](#phase-8-post-purchase-upsells))
- Best for: Impulse items, digital add-ons, subscriptions

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ âœ“ Payment Successful!                                       â”‚
â”‚                                                             â”‚
â”‚ Before we show your confirmation...                         â”‚
â”‚                                                             â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚ â”‚ [Image] Matching Pillowcases (Set of 2)               â”‚  â”‚
â”‚ â”‚         Â£19  [Add to Order â€” One Click]               â”‚  â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                             â”‚
â”‚            [Show My Order Confirmation]                     â”‚
â”‚                   (auto-redirects in 15s)                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Payment Gateway Requirements (Post-Purchase Only)

Post-purchase upsells require charging a saved payment method without CVV re-entry. Not all gateways support this.

| Gateway | Post-Purchase Support | Notes |
| ------- | --------------------- | ----- |
| Stripe | âœ… Yes | Vaulted payments via off-session PaymentIntent |
| Braintree | âœ… Yes | Vault token charge (requires customer + vaulting enabled) |
| PayPal | âœ… Yes (conditional) | Vault payment token; may require vault/reference approval |
| Manual/Offline | âŒ No | No tokenization capability |

**UI Behavior:** When a merchant configures an upsell rule with `CheckoutMode = PostPurchase`, the backoffice should:

1. Check if any configured payment provider has `SupportsVaultedPayments = true` **and** `IsVaultingEnabled = true`
2. If not, show a warning: "Post-purchase upsells require a gateway with saved payment methods enabled (e.g., Stripe, Braintree, PayPal). Your current configuration does not support this mode."
3. Allow saving but mark the rule as "Limited â€” gateway incompatible"

---

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Display Location Request                                           â”‚
â”‚  (Basket page, Checkout, Product page, Email render)                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  IUpsellEngine.GetSuggestionsAsync(context)                         â”‚
â”‚    1. Load active UpsellRules for requested DisplayLocation (cached)â”‚
â”‚    2. Check eligibility (customer segments)                         â”‚
â”‚    3. Check scheduling (StartsAt/EndsAt)                            â”‚
â”‚    4. For each rule:                                                â”‚
â”‚       a. UpsellTriggerMatcher.DoesBasketMatchTriggerRules()         â”‚
â”‚       b. If matched: extract filter values (ExtractFilterGroupIds)  â”‚
â”‚       c. Fetch recommendation products (batched by type)            â”‚
â”‚       d. Deduplicate by ProductRootId within rule                   â”‚
â”‚       e. Apply filter matching (MatchTriggerFilters)                â”‚
â”‚       f. Apply region filtering (CanServeRegion)                    â”‚
â”‚       g. Suppress products already in basket (if enabled)           â”‚
â”‚       h. Remove unavailable products                                â”‚
â”‚       i. Sort by configured SortBy, take MaxProducts                â”‚
â”‚    5. Order suggestions by Priority                                 â”‚
â”‚    6. Take top MaxSuggestionsPerLocation                            â”‚
â”‚    7. Return List<UpsellSuggestion>                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Storefront / Checkout / Email                                      â”‚
â”‚    - Render product cards with heading/message                      â”‚
â”‚    - Track impressions via POST /upsells/events                     â”‚
â”‚    - Track clicks on product links                                  â”‚
â”‚    - Server-side conversion tracking on OrderCreatedNotification    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Email-specific flow:**

```
OrderCreatedNotification published
        â”‚
        â–¼
UpsellEmailEnrichmentHandler (priority 2050)
  â†’ IUpsellEngine.GetSuggestionsForInvoiceAsync(invoiceId)
  â†’ Stores suggestions in notification.State["UpsellSuggestions"]
        â”‚
        â–¼
EmailNotificationHandler (priority 2100)
  â†’ Queues email delivery
  â†’ Razor template accesses Model.Notification.State["UpsellSuggestions"]
  â†’ Renders upsell product cards in email
```

---

## Implementation Phases

---

### Phase 1: Foundation â€” Enums, Models & Database

**Goal:** Establish the data layer â€” enums, domain models, database schema, and EF mapping. The project should compile and the migration should run successfully.

**Depends on:** Nothing (this is the starting point).

#### 1.1 Enums

All enums use `[JsonConverter(typeof(JsonStringEnumConverter))]`. Each enum is its own file in `Upsells/Models/`.

**UpsellStatus** â€” `UpsellStatus.cs`

```csharp
public enum UpsellStatus
{
    Draft,
    Active,
    Scheduled,
    Expired,
    Disabled
}
```

Mirrors `DiscountStatus`. Background job (`UpsellStatusJob`) transitions Scheduled â†’ Active and Active â†’ Expired based on StartsAt/EndsAt.

**Status transition rules:**

| From | To | Trigger |
| ---- | ---- | ------- |
| Draft | Active | Manual activation via `ActivateAsync()` when `StartsAt <= now` |
| Draft | Scheduled | Manual activation via `ActivateAsync()` when `StartsAt > now` |
| Scheduled | Active | Background job when `StartsAt` is reached |
| Active | Expired | Background job when `EndsAt` is passed |
| Active | Disabled | Manual deactivation via `DeactivateAsync()` |
| Disabled | Active | Manual activation via `ActivateAsync()` |

**Note:** Updating `StartsAt` on an existing rule does NOT automatically change status. A Draft rule with a future `StartsAt` remains Draft until explicitly activated. This prevents accidental early activation when editing scheduled campaigns.

**UpsellSortBy** â€” `UpsellSortBy.cs`

```csharp
public enum UpsellSortBy
{
    BestSeller,
    PriceLowToHigh,
    PriceHighToLow,
    Name,
    DateAdded,
    Random
}
```

**Random sort:** True random per-request using `OrderBy(x => Guid.NewGuid())`. Results differ on each page load. For more variety in recommendations without true randomness, consider alternating between BestSeller and DateAdded.

**UpsellDisplayLocation** â€” `UpsellDisplayLocation.cs`

```csharp
[Flags]
public enum UpsellDisplayLocation
{
    None = 0,
    Checkout = 1,
    Basket = 2,
    ProductPage = 4,
    Email = 8,
    Confirmation = 16,  // Thank you / order confirmation page
    All = Checkout | Basket | ProductPage | Email | Confirmation
}
```

Flags enum so a single rule can show in multiple locations. Admin UI shows checkboxes, allowing combinations like `Checkout | Email`.

**CheckoutUpsellMode** â€” `CheckoutUpsellMode.cs`

```csharp
public enum CheckoutUpsellMode
{
    Inline,        // Collapsible section at top of checkout
    Interstitial,  // Replaces checkout content until dismissed
    OrderBump,     // Checkbox upsell integrated into checkout form (non-variant or pre-selected variant)
    PostPurchase   // After payment, before confirmation (requires VaultedPayments)
}
```

Controls how upsells display specifically within the integrated checkout. Only applies when `DisplayLocation` includes `Checkout`. See [Checkout Display Modes](#checkout-display-modes) for detailed wireframes and behavior.

**OrderBump mode constraints:**

- Recommendation must be a **single specific product** (not collection/type)
- If the product has variants, admin must select the **exact variant** at configuration time
- Stored as `ProductId` (variant ID), not `ProductRootId`
- Renders as a checkbox with product name, image thumbnail, and price: `â˜‘ï¸ Add Black Leather Belt (+Â£29)`

**UpsellTriggerType** â€” `UpsellTriggerType.cs`

```csharp
public enum UpsellTriggerType
{
    ProductTypes,
    ProductFilters,
    Collections,
    SpecificProducts,
    Suppliers,
    // Cart value triggers
    MinimumCartValue,   // Cart subtotal >= X
    MaximumCartValue,   // Cart subtotal <= X
    CartValueBetween    // Cart subtotal between X and Y
}
```

No `AllProducts` â€” triggers must be specific to avoid every basket matching every rule.

**Cart value trigger storage:**

For `MinimumCartValue` and `MaximumCartValue`, the threshold is stored in `TriggerIds` as JSON: `{"value": 100.00}`

For `CartValueBetween`, the range is stored as: `{"min": 80.00, "max": 100.00}`

**Message-only upsells:**

When a rule has **no RecommendationRules** but has a `Heading` and/or `Message`, it displays as a message-only prompt without product cards. This is useful for cart value triggers like "Spend Â£20 more for free shipping!"

| RecommendationRules | Behaviour |
| ------------------- | --------- |
| Has rules | Show Heading + Message + Product cards |
| Empty | Show Heading + Message only (no product grid) |

**UpsellRecommendationType** â€” `UpsellRecommendationType.cs`

```csharp
public enum UpsellRecommendationType
{
    ProductTypes,
    ProductFilters,
    Collections,
    SpecificProducts,
    Suppliers
}
```

**UpsellEligibilityType** â€” `UpsellEligibilityType.cs`

```csharp
public enum UpsellEligibilityType
{
    AllCustomers,
    CustomerSegments,
    SpecificCustomers
}
```

**UpsellEventType** â€” `UpsellEventType.cs`

```csharp
public enum UpsellEventType
{
    Impression,
    Click,
    Conversion
}
```

**UpsellOrderBy** â€” `UpsellOrderBy.cs` (in `Services/Parameters/`)

```csharp
public enum UpsellOrderBy
{
    Name,
    DateCreated,
    Priority,
    Status
}
```

**UpsellExtensions** â€” `Extensions/UpsellExtensions.cs`

Extension methods for computed display values (follows `DiscountExtensions` pattern):

```csharp
public static class UpsellExtensions
{
    public static string GetStatusLabel(this UpsellStatus status) => status switch
    {
        UpsellStatus.Draft => "Draft",
        UpsellStatus.Active => "Active",
        UpsellStatus.Scheduled => "Scheduled",
        UpsellStatus.Expired => "Expired",
        UpsellStatus.Disabled => "Disabled",
        _ => "Unknown"
    };

    public static string GetStatusColor(this UpsellStatus status) => status switch
    {
        UpsellStatus.Active => "positive",
        UpsellStatus.Scheduled => "warning",
        UpsellStatus.Expired or UpsellStatus.Disabled => "danger",
        _ => "default"
    };
}
```

#### 1.2 Domain Models

Each model is its own file in `Upsells/Models/`.

**UpsellRule** â€” `UpsellRule.cs` (maps to `merchelloUpsellRules` table)

```csharp
public class UpsellRule
{
    public Guid Id { get; set; }

    // Basic Info
    public string Name { get; set; }               // "Bed â†’ Pillow Upsell"
    public string? Description { get; set; }        // Internal admin notes
    public UpsellStatus Status { get; set; }        // Draft, Active, Scheduled, Expired, Disabled

    // Customer-Facing Display
    public string Heading { get; set; }             // "Complete your bedroom"
    public string? Message { get; set; }            // "Don't forget your pillows!"

    // Configuration
    public int Priority { get; set; } = 1000;       // Lower = higher priority
    public int MaxProducts { get; set; } = 4;        // Max products to show
    public UpsellSortBy SortBy { get; set; }        // BestSeller, PriceLowToHigh, etc.
    public bool SuppressIfInCart { get; set; } = true;
    public UpsellDisplayLocation DisplayLocation { get; set; }  // Flags: Checkout | Basket | ProductPage | Email
    public CheckoutUpsellMode CheckoutMode { get; set; } = CheckoutUpsellMode.Inline;  // How to display in checkout

    // Scheduling
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }            // For display purposes

    // JSON Rule Columns
    public string? TriggerRulesJson { get; set; }           // List<UpsellTriggerRule>
    public string? RecommendationRulesJson { get; set; }    // List<UpsellRecommendationRule>
    public string? EligibilityRulesJson { get; set; }       // List<UpsellEligibilityRule>

    // Audit
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public Guid? CreatedBy { get; set; }

    // Computed Properties (NotMapped)
    public List<UpsellTriggerRule> TriggerRules => ...;
    public List<UpsellRecommendationRule> RecommendationRules => ...;
    public List<UpsellEligibilityRule> EligibilityRules => ...;

    // Setter Helpers
    public void SetTriggerRules(List<UpsellTriggerRule>? rules);
    public void SetRecommendationRules(List<UpsellRecommendationRule>? rules);
    public void SetEligibilityRules(List<UpsellEligibilityRule>? rules);
}
```

**UpsellTriggerRule** â€” `UpsellTriggerRule.cs`

Defines what must be in the basket for the upsell to activate.

```csharp
public class UpsellTriggerRule
{
    /// <summary>
    /// The type of trigger (ProductTypes, ProductFilters, Collections, etc.).
    /// </summary>
    public UpsellTriggerType TriggerType { get; set; }

    /// <summary>
    /// JSON array of target IDs (product type IDs, filter IDs, collection IDs, etc.).
    /// </summary>
    public string? TriggerIds { get; set; }

    /// <summary>
    /// Optional: Filter group IDs to extract filter values from matching trigger products.
    /// When set, the engine captures the actual filter values from products matching this
    /// trigger and passes them to recommendation rules with MatchTriggerFilters = true.
    ///
    /// Example: Trigger on ProductType "WoodenBed" with ExtractFilterGroupIds = [SizeGroupId]
    /// â†’ Extracts "King Size" filter value from the bed in the cart.
    /// </summary>
    public string? ExtractFilterGroupIds { get; set; }

    public List<Guid> GetTriggerIdsList() { ... }
    public List<Guid> GetExtractFilterGroupIdsList() { ... }
}
```

**UpsellRecommendationRule** â€” `UpsellRecommendationRule.cs`

Defines what products to recommend.

```csharp
public class UpsellRecommendationRule
{
    /// <summary>
    /// The type of recommendation (ProductTypes, ProductFilters, Collections, etc.).
    /// </summary>
    public UpsellRecommendationType RecommendationType { get; set; }

    /// <summary>
    /// JSON array of target IDs (product type IDs, filter IDs, collection IDs, etc.).
    /// </summary>
    public string? RecommendationIds { get; set; }

    /// <summary>
    /// When true, recommended products are filtered to match the filter values
    /// extracted from trigger products (via ExtractFilterGroupIds on the trigger rule).
    ///
    /// Example: If trigger extracted "King Size" from a bed, only recommend mattresses
    /// that also have "King Size" in the same filter group.
    /// </summary>
    public bool MatchTriggerFilters { get; set; }

    /// <summary>
    /// Optional: Specific filter group IDs to match from trigger.
    /// When null/empty and MatchTriggerFilters is true, matches ALL extracted filter groups.
    /// When specified, only matches the listed filter groups.
    /// </summary>
    public string? MatchFilterGroupIds { get; set; }

    public List<Guid> GetRecommendationIdsList() { ... }
    public List<Guid> GetMatchFilterGroupIdsList() { ... }
}
```

**UpsellEligibilityRule** â€” `UpsellEligibilityRule.cs`

```csharp
public class UpsellEligibilityRule
{
    public UpsellEligibilityType EligibilityType { get; set; }
    public string? EligibilityIds { get; set; }  // JSON array of GUIDs

    public List<Guid> GetEligibilityIdsList() { ... }
}
```

**UpsellEvent** â€” `UpsellEvent.cs` (maps to `merchelloUpsellEvents` table)

```csharp
public class UpsellEvent
{
    public Guid Id { get; set; }
    public Guid UpsellRuleId { get; set; }
    public UpsellRule UpsellRule { get; set; }

    public UpsellEventType EventType { get; set; }  // Impression, Click, Conversion
    public Guid? ProductId { get; set; }            // Recommended product interacted with
    public Guid? BasketId { get; set; }             // Basket context
    public Guid? CustomerId { get; set; }           // Customer if authenticated
    public Guid? InvoiceId { get; set; }            // Invoice for conversion events
    public decimal? Amount { get; set; }            // Revenue from conversion
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public DateTime DateCreated { get; set; }
}
```

**UpsellContext** â€” `UpsellContext.cs`

The context passed to the engine for evaluation.

```csharp
public class UpsellContext
{
    public Guid? CustomerId { get; set; }
    public Guid? BasketId { get; set; }
    public List<UpsellContextLineItem> LineItems { get; set; } = [];
    public List<Guid>? CustomerSegmentIds { get; set; }
    public UpsellDisplayLocation? Location { get; set; }

    /// <summary>
    /// The customer's shipping country code (e.g., "GB", "US").
    /// Used to filter recommended products to those shippable to the customer's location.
    /// Null when unavailable (e.g., some email contexts) â€” region filtering is skipped.
    /// </summary>
    public string? CountryCode { get; set; }

    /// <summary>
    /// Optional state/province code for finer-grained warehouse region filtering.
    /// </summary>
    public string? RegionCode { get; set; }
}
```

**Context population by source:**
- **Storefront API** â€” `CountryCode` and `RegionCode` populated from `IStorefrontContextService.GetShippingLocationAsync()` (the same cookie-based location used for stock checks on product pages)
- **Invoice context (email)** â€” Populated from the invoice's shipping address country/region
- **Product page** â€” From the storefront location if available via `IHttpContextAccessor`, otherwise null (region filtering skipped)
- **Admin preview** â€” Null (region filtering skipped, all products shown)

**UpsellContextLineItem** â€” `UpsellContextLineItem.cs`

Enriched line item with product metadata needed for trigger matching and filter extraction.

```csharp
public class UpsellContextLineItem
{
    public Guid LineItemId { get; set; }
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public List<Guid> CollectionIds { get; set; } = [];
    public List<Guid> ProductFilterIds { get; set; } = [];
    public Guid? SupplierId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Filter values grouped by filter group ID.
    /// Key: FilterGroupId, Value: List of FilterIds in that group.
    /// Used for filter matching between trigger and recommendation products.
    /// </summary>
    public Dictionary<Guid, List<Guid>> FiltersByGroup { get; set; } = [];
}
```

**UpsellSuggestion** â€” `UpsellSuggestion.cs`

Result from the engine â€” a matched upsell rule with its recommended products.

```csharp
public class UpsellSuggestion
{
    public Guid UpsellRuleId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; }
    public List<UpsellProduct> Products { get; set; } = [];
}
```

**UpsellProduct** â€” `UpsellProduct.cs`

A product recommended by the upsell engine.

```csharp
public class UpsellProduct
{
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }

    // Pricing - follows DisplayPricesIncTax setting
    public decimal Price { get; set; }                      // Net or Gross based on setting
    public string FormattedPrice { get; set; } = string.Empty;
    public bool PriceIncludesTax { get; set; }              // True when DisplayPricesIncTax=true
    public decimal TaxRate { get; set; }                    // Tax rate percentage (e.g., 20.0)
    public decimal? TaxAmount { get; set; }                 // Tax amount (only when not included in Price)
    public string? FormattedTaxAmount { get; set; }         // Formatted tax for display

    // Sale pricing
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public string? FormattedPreviousPrice { get; set; }

    // Product info
    public string? Url { get; set; }
    public List<string> Images { get; set; } = [];
    public string? ProductTypeName { get; set; }
    public bool AvailableForPurchase { get; set; }

    // Variants (for products with options like Size, Color)
    public bool HasVariants { get; set; }
    public List<UpsellVariant>? Variants { get; set; }
}

/// <summary>
/// A variant option for a recommended product.
/// Only populated when UpsellProduct.HasVariants is true.
/// </summary>
public class UpsellVariant
{
    public Guid ProductId { get; set; }               // The variant's Product.Id
    public string Name { get; set; } = string.Empty;  // e.g., "King Size - Oak"
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool AvailableForPurchase { get; set; }
}
```

**Price field semantics:**
- When `PriceIncludesTax = true`: `Price` is the gross price (tax included), `TaxAmount` is null
- When `PriceIncludesTax = false`: `Price` is the net price, `TaxAmount` contains the calculated tax
- This matches the `MerchelloSettings.DisplayPricesIncTax` setting and follows the `GetDisplayLineItemUnitPrice()` pattern from `DisplayCurrencyExtensions`

**Url population:** The `Url` property is populated from `ProductRoot.RootUrl` which stores the product's storefront URL (e.g., `/products/king-size-oak-bed`). For email rendering, URLs should be made absolute using the store's base URL from settings.

**Image population:**

- Images are sourced from `ProductRoot.Media` â†’ first image's URL
- Falls back to `Product.Media` if variant has specific imagery
- If no images exist, `Images` is an empty list (UI should show a placeholder)
- For email rendering, image URLs should be made absolute using `IMediaUrlService.GetAbsoluteUrl()`

**Absolute URL helper** (for email rendering):

```csharp
// In UpsellEngine when building suggestions for email context
private string MakeAbsolute(string? relativeUrl)
{
    if (string.IsNullOrEmpty(relativeUrl)) return string.Empty;
    if (relativeUrl.StartsWith("http")) return relativeUrl;

    var baseUrl = _merchelloSettings.StoreBaseUrl?.TrimEnd('/') ?? "";
    return $"{baseUrl}{relativeUrl}";
}
```

#### 1.3 Database Mapping & Schema

**UpsellRuleDbMapping** â€” `Mapping/UpsellRuleDbMapping.cs`
**UpsellEventDbMapping** â€” `Mapping/UpsellEventDbMapping.cs`

Tables: `merchelloUpsellRules`, `merchelloUpsellEvents`

**Indexes:**
- `IX_merchelloUpsellRules_Status` on `Status`
- `IX_merchelloUpsellRules_StartsAt_EndsAt` on `(StartsAt, EndsAt)`
- `IX_merchelloUpsellEvents_UpsellRuleId` on `UpsellRuleId`
- `IX_merchelloUpsellEvents_UpsellRuleId_EventType` on `(UpsellRuleId, EventType)`
- `IX_merchelloUpsellEvents_DateCreated` on `DateCreated`

**Existing file changes:**
- `MerchelloDbContext.cs` â€” Add `DbSet<UpsellRule>` and `DbSet<UpsellEvent>`

#### 1.4 Configuration Model

**UpsellSettings** â€” `Models/UpsellSettings.cs`

Bound in `Startup.cs` via `services.Configure<UpsellSettings>(configuration.GetSection("Merchello:Upsells"))`.

```csharp
public class UpsellSettings
{
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Maximum number of upsell suggestions returned per display location.
    /// Individual rules may return fewer products via their MaxProducts setting.
    /// </summary>
    public int MaxSuggestionsPerLocation { get; set; } = 3;

    /// <summary>
    /// Duration in seconds to cache active upsell rules.
    /// Rules are invalidated on create/update/delete.
    /// </summary>
    public int CacheDurationSeconds { get; set; } = 300;

    /// <summary>
    /// Number of days to retain analytics events before cleanup.
    /// </summary>
    public int EventRetentionDays { get; set; } = 90;
}
```

#### Phase 1 â€” Verification

- [ ] Project compiles with all enums, models, and mapping classes
- [ ] Migration runs successfully via `scripts/add-migration.ps1`
- [ ] `DbSet<UpsellRule>` and `DbSet<UpsellEvent>` added to DbContext
- [ ] Tables `merchelloUpsellRules` and `merchelloUpsellEvents` created with correct indexes

---

### Phase 2: Services â€” CRUD, Factory, Engine & Matching

**Goal:** Build all backend business logic â€” the service for CRUD operations, the factory, the trigger matcher, the recommendation engine, and the name resolver. After this phase, upsell rules can be created, evaluated, and matched entirely in code.

**Depends on:** Phase 1 (enums, models, database).

#### 2.1 Service Parameters

Each parameter class is its own file in `Upsells/Services/Parameters/`:

| File | Class | Purpose |
|------|-------|---------|
| `CreateUpsellParameters.cs` | `CreateUpsellParameters` | Create a new upsell rule |
| `UpdateUpsellParameters.cs` | `UpdateUpsellParameters` | Update an existing rule |
| `CreateUpsellTriggerRuleParameters.cs` | `CreateUpsellTriggerRuleParameters` | Trigger rule input |
| `CreateUpsellRecommendationRuleParameters.cs` | `CreateUpsellRecommendationRuleParameters` | Recommendation rule input |
| `CreateUpsellEligibilityRuleParameters.cs` | `CreateUpsellEligibilityRuleParameters` | Eligibility rule input |
| `UpsellQueryParameters.cs` | `UpsellQueryParameters` | Query/filter/paginate rules |
| `RecordUpsellEventParameters.cs` | `RecordUpsellEventParameters` | Record impression/click |
| `RecordUpsellConversionParameters.cs` | `RecordUpsellConversionParameters` | Record conversion with amount |
| `GetUpsellPerformanceParameters.cs` | `GetUpsellPerformanceParameters` | Fetch performance data |
| `UpsellReportParameters.cs` | `UpsellReportParameters` | Aggregated report query |
| `UpsellDashboardParameters.cs` | `UpsellDashboardParameters` | Dashboard data query |

**CreateUpsellParameters:**

```csharp
public class CreateUpsellParameters
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; } = 1000;
    public int MaxProducts { get; set; } = 4;
    public UpsellSortBy SortBy { get; set; } = UpsellSortBy.BestSeller;
    public bool SuppressIfInCart { get; set; } = true;
    public UpsellDisplayLocation DisplayLocation { get; set; } = UpsellDisplayLocation.All;
    public CheckoutUpsellMode CheckoutMode { get; set; } = CheckoutUpsellMode.Inline;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public Guid? CreatedBy { get; set; }
    public List<CreateUpsellTriggerRuleParameters>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleParameters>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleParameters>? EligibilityRules { get; set; }
}
```

**UpdateUpsellParameters:**

Follows the `UpdateDiscountParameters` pattern â€” all properties nullable (null = keep existing), with `ClearX` flags for nullable DB fields.

```csharp
public class UpdateUpsellParameters
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Heading { get; set; }
    public string? Message { get; set; }
    public int? Priority { get; set; }
    public int? MaxProducts { get; set; }
    public UpsellSortBy? SortBy { get; set; }
    public bool? SuppressIfInCart { get; set; }
    public UpsellDisplayLocation? DisplayLocation { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ClearEndsAt { get; set; }
    public string? Timezone { get; set; }
    public List<CreateUpsellTriggerRuleParameters>? TriggerRules { get; set; }
    public List<CreateUpsellRecommendationRuleParameters>? RecommendationRules { get; set; }
    public List<CreateUpsellEligibilityRuleParameters>? EligibilityRules { get; set; }
}
```

#### 2.2 Factory

**UpsellFactory** â€” `Factories/UpsellFactory.cs`

Creates upsell domain objects. Follows the `DiscountFactory` pattern.

```csharp
public class UpsellFactory
{
    /// <summary>
    /// Creates a new UpsellRule from parameters.
    /// Determines initial status: Scheduled if StartsAt > now, else Active.
    /// </summary>
    public UpsellRule Create(CreateUpsellParameters parameters);

    /// <summary>
    /// Creates a trigger rule POCO for JSON serialization.
    /// </summary>
    public UpsellTriggerRule CreateTriggerRule(CreateUpsellTriggerRuleParameters parameters);

    /// <summary>
    /// Creates a recommendation rule POCO for JSON serialization.
    /// </summary>
    public UpsellRecommendationRule CreateRecommendationRule(CreateUpsellRecommendationRuleParameters parameters);

    /// <summary>
    /// Creates an eligibility rule POCO for JSON serialization.
    /// </summary>
    public UpsellEligibilityRule CreateEligibilityRule(CreateUpsellEligibilityRuleParameters parameters);
}
```

#### 2.3 IUpsellService

CRUD operations for managing upsell rules. Follows `IDiscountService` pattern.

```csharp
public interface IUpsellService
{
    // CRUD
    Task<PaginatedList<UpsellRule>> QueryAsync(UpsellQueryParameters parameters, CancellationToken ct = default);
    Task<UpsellRule?> GetByIdAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> CreateAsync(CreateUpsellParameters parameters, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> UpdateAsync(Guid upsellRuleId, UpdateUpsellParameters parameters, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteAsync(Guid upsellRuleId, CancellationToken ct = default);

    // Status
    Task<CrudResult<UpsellRule>> ActivateAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task<CrudResult<UpsellRule>> DeactivateAsync(Guid upsellRuleId, CancellationToken ct = default);
    Task UpdateExpiredUpsellsAsync(CancellationToken ct = default);

    // Bulk
    Task<List<UpsellRule>> GetActiveUpsellRulesAsync(CancellationToken ct = default);
    Task<List<UpsellRule>> GetActiveUpsellRulesForLocationAsync(UpsellDisplayLocation location, CancellationToken ct = default);
}
```

#### 2.4 Trigger Matcher

**UpsellTriggerMatcher** â€” `Services/UpsellTriggerMatcher.cs`

Static utility class following the `DiscountTargetMatcher` pattern.

```csharp
public static class UpsellTriggerMatcher
{
    /// <summary>
    /// Returns true if any line item matches any trigger rule.
    /// </summary>
    public static bool DoesBasketMatchTriggerRules(
        List<UpsellContextLineItem> lineItems,
        List<UpsellTriggerRule> rules);

    /// <summary>
    /// Gets line items that match the given trigger rules.
    /// </summary>
    public static List<UpsellContextLineItem> GetMatchingLineItems(
        List<UpsellContextLineItem> lineItems,
        List<UpsellTriggerRule> rules);

    /// <summary>
    /// Extracts filter values from matching line items based on ExtractFilterGroupIds.
    /// Returns Dictionary of FilterGroupId â†’ Set of FilterIds found on matching products.
    /// </summary>
    public static Dictionary<Guid, HashSet<Guid>> ExtractFilterValues(
        List<UpsellContextLineItem> matchingLineItems,
        List<UpsellTriggerRule> rules);
}
```

#### 2.5 Engine

**IUpsellEngine** â€” `Services/Interfaces/IUpsellEngine.cs`

Evaluates upsell rules against a basket context and returns product recommendations.

```csharp
public interface IUpsellEngine
{
    /// <summary>
    /// Evaluates all active upsell rules against the given context and returns suggestions.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsAsync(UpsellContext context, CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions filtered to a specific display location.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForLocationAsync(
        UpsellContext context,
        UpsellDisplayLocation location,
        CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions for email templates based on an invoice's line items.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForInvoiceAsync(Guid invoiceId, CancellationToken ct = default);

    /// <summary>
    /// Gets suggestions for a product page by creating a synthetic context
    /// with that product as if it were in the basket.
    /// </summary>
    Task<List<UpsellSuggestion>> GetSuggestionsForProductAsync(Guid productId, CancellationToken ct = default);
}
```

**Filter Matching Algorithm** â€” implemented within `UpsellEngine`:

**Step 1: Trigger Evaluation**
```
For each active UpsellRule (filtered by location, schedule, eligibility):
  For each TriggerRule in UpsellRule.TriggerRules:
    Match basket line items against TriggerType + TriggerIds
    (same logic as DiscountTargetMatcher.DoesLineItemMatchRule)
    If any line item matches â†’ trigger is satisfied
  If no trigger rules match â†’ skip this UpsellRule
```

**Step 2: Filter Value Extraction**
```
For each matched TriggerRule that has ExtractFilterGroupIds:
  Get the line items that matched this trigger
  For each matched line item:
    Look up the Product's Filters collection (via ProductId)
    Group filters by FilterGroupId
    For each FilterGroupId in ExtractFilterGroupIds:
      Add the filter values to the extracted set
  Result: Dictionary<FilterGroupId, HashSet<FilterId>>
    Example: { SizeGroupId: { KingSizeFilterId } }
```

**Step 3: Recommendation Fetching & Filtering**
```
For each RecommendationRule in UpsellRule.RecommendationRules:
  Query products matching RecommendationType + RecommendationIds
    e.g., products of type CoilMattress, MemoryMattress
    (batched across rules by recommendation type â€” see section 2.9)
  Deduplicate by ProductRootId within this rule (keep first occurrence)
  If MatchTriggerFilters is true:
    Get extracted filter values from Step 2
    Determine which filter groups to match:
      If MatchFilterGroupIds is set â†’ use those
      Otherwise â†’ match ALL extracted filter groups
    For each candidate product:
      For each required filter group:
        Product must have at least one filter value from the
        extracted set for that group
  If context.CountryCode is set:
    Filter to products with a warehouse that CanServeRegion (see section 2.8)
  Remove products already in basket (if SuppressIfInCart)
  Remove out-of-stock / unavailable products (AvailableForPurchase && CanPurchase)
  Sort by UpsellRule.SortBy
  Take top UpsellRule.MaxProducts
```

**Example Walkthrough:**

Setup:
```
TriggerRule: {
  TriggerType: ProductTypes,
  TriggerIds: [WoodenBedId, MetalBedId],
  ExtractFilterGroupIds: [SizeGroupId]
}
RecommendationRule: {
  RecommendationType: ProductTypes,
  RecommendationIds: [CoilMattressId, MemoryMattressId],
  MatchTriggerFilters: true
}
```

Basket contains: Oak Bed (King Size) â€” ProductType: WoodenBed, Filters: [KingSizeFilter]

Evaluation:

1. **Trigger match**: Oak Bed's ProductTypeId = WoodenBedId âœ“ (in trigger list)
2. **Extract**: SizeGroup â†’ `{KingSizeFilterId}` (from Oak Bed's filters)
3. **Recommend**: Query all products with ProductType in `[CoilMattressId, MemoryMattressId]`
4. **Filter match**: Keep only products whose Filters include KingSizeFilterId in the SizeGroup
5. **Result**: "King Size Coil Mattress", "King Size Memory Mattress" âœ“ (not "Double Mattress" or "Single Mattress")

#### 2.6 Name Resolver

**IUpsellRuleNameResolver** â€” `Services/Interfaces/IUpsellRuleNameResolver.cs`

Resolves GUIDs to display names for the admin UI. Follows `DiscountRuleNameResolver` pattern.

```csharp
public interface IUpsellRuleNameResolver
{
    Task ResolveTriggerRuleNamesAsync(List<UpsellTriggerRuleDto> rules, CancellationToken ct = default);
    Task ResolveRecommendationRuleNamesAsync(List<UpsellRecommendationRuleDto> rules, CancellationToken ct = default);
    Task ResolveEligibilityRuleNamesAsync(List<UpsellEligibilityRuleDto> rules, CancellationToken ct = default);
}
```

#### 2.7 Multiple Match Resolution

When multiple upsell rules match the same basket, the engine must resolve product overlap and enforce global limits.

**Rules stack, not exclude.** Every rule whose triggers match the basket produces its own `UpsellSuggestion` with its own heading/message. A customer who buys a bed could see both "Complete your bedroom" (pillows) and "Protect your investment" (mattress protector) as separate suggestion groups. Rules are never mutually exclusive â€” each active, eligible, triggered rule generates a suggestion independently.

**Per-rule product cap.** Each rule's `MaxProducts` (default 4) limits how many products that single rule returns. The recommendation pipeline fetches, filters, sorts, and truncates to `MaxProducts` before yielding the suggestion.

**Global suggestion cap.** `UpsellSettings.MaxSuggestionsPerLocation` (default 3) limits how many `UpsellSuggestion` groups are returned for a single display location. After all rules are evaluated and sorted by `Priority` (lower number first), the engine takes the top N suggestions. Rules beyond the cap are discarded entirely â€” their products are not merged into other suggestions.

**Cross-rule product deduplication.** A product appearing in multiple matched rules is shown in each suggestion group intentionally â€” each group has its own heading/message context ("Complete your bedroom" vs "Protect your investment"). Within a single suggestion's product list, duplicates are removed at the `ProductRootId` level: if two recommendation rules on the same upsell rule both yield the same product root, only the first occurrence is kept.

**Resolution algorithm:**

```text
1. Load active rules for the requested DisplayLocation (cached)
2. Filter by schedule (StartsAt/EndsAt) and eligibility (segments/customers)
3. For each remaining rule (no ordering yet):
   a. Run trigger matching against basket line items
   b. If triggers match:
      - Extract filter values from matching line items (via ExtractFilterGroupIds)
      - Fetch recommendation products (combined from all recommendation rules on this upsell)
      - Deduplicate by ProductRootId within this rule (keep first occurrence)
      - Apply filter matching (MatchTriggerFilters)
      - Apply region filtering (CanServeRegion â€” see section 2.8)
      - Remove products already in basket (if SuppressIfInCart)
      - Remove unavailable products (AvailableForPurchase && CanPurchase)
      - Sort by rule's SortBy, take rule's MaxProducts
      - Yield UpsellSuggestion with heading, message, priority, and products
4. Sort all suggestions by Priority (ascending â€” lower number first)
5. Take top MaxSuggestionsPerLocation suggestions
6. Return the list
```

**With 10+ matching rules**, the engine evaluates all of them through step 3 but discards all but the top N (by priority) in step 5. This is acceptable because rule count is admin-controlled and typically small (tens, not thousands). The cost is in product fetching, addressed in section 2.9.

**Example: 2 rules match, MaxSuggestionsPerLocation = 3**

Rule A (Priority 500): "Bed â†’ Pillow" â†’ yields 4 pillows
Rule B (Priority 1000): "Bed â†’ Mattress Protector" â†’ yields 2 protectors

Result: Both suggestions returned (2 < 3 cap). Customer sees two distinct recommendation sections, ordered by priority.

**Example: Product overlap across rules**

Rule A recommends Product X and Product Y.
Rule B also recommends Product X and Product Z.

Result: Rule A's suggestion contains [X, Y]. Rule B's suggestion contains [X, Z]. Product X appears in both groups â€” this is correct because each group has different promotional context (different heading/message).

---

#### 2.8 Region-Aware Recommendation Filtering

Recommended products must be shippable to the customer's location. Recommending something they can't buy creates a poor experience and inflates false impression metrics.

**Mechanism.** The engine uses the existing `Warehouse.CanServeRegion(countryCode, regionCode)` method â€” the same check `StorefrontContextService` uses for product availability on the storefront. When `UpsellContext.CountryCode` is set, the engine filters out recommended products that have no warehouse capable of serving that region.

**Where it fits in the engine pipeline.** Applied in step 3 of the resolution algorithm (section 2.7), after recommendation products are fetched and before sorting/truncation:

```text
For each candidate product:
  1. Check AvailableForPurchase && CanPurchase
  2. If context.CountryCode is not null:
     a. Load the product's ProductWarehouses (with Warehouse.ServiceRegions)
     b. Check if any warehouse CanServeRegion(context.CountryCode, context.RegionCode)
     c. If no warehouse can serve â†’ exclude the product
  3. If SuppressIfInCart â†’ exclude products already in basket
```

**When region filtering is skipped.** When `CountryCode` is null:

- Email suggestions where the invoice has no shipping address (digital-only orders)
- Admin preview requests from the backoffice

**Product loading.** Recommendation products must be fetched with warehouse data included so the `CanServeRegion` check has the data it needs. This uses the same EF Include pattern as `StorefrontContextService.GetProductAvailabilityForLocationAsync`. See section 2.9 for how this is batched efficiently.

**Storefront API context building** (`GET /api/merchello/storefront/upsells`):

```csharp
var location = await storefrontContextService.GetShippingLocationAsync(ct);
var context = new UpsellContext
{
    CustomerId = customerId,
    BasketId = basket.Id,
    LineItems = enrichedLineItems,
    CountryCode = location.CountryCode,
    RegionCode = location.RegionCode,
    Location = displayLocation
};
```

**Invoice-based context building** (`GetSuggestionsForInvoiceAsync`):

```csharp
var shippingAddress = invoice.ShippingAddress;
var context = new UpsellContext
{
    CustomerId = invoice.CustomerId,
    LineItems = enrichedLineItems,
    CountryCode = shippingAddress?.CountryCode,
    RegionCode = shippingAddress?.RegionCode,
    Location = UpsellDisplayLocation.Email
};
```

---

#### 2.9 Performance & Query Strategy

The upsell engine runs on every basket/checkout/product page load, so query efficiency matters. This section documents the concrete strategies for each performance concern.

**Active Rule Caching**

Unlike the discount engine (which queries active discounts fresh on every evaluation), the upsell engine caches active rules in `IMemoryCache`. Active rules change infrequently (admin CRUD operations) but are evaluated on every storefront page hit.

```csharp
// In UpsellService
private static readonly string CacheKey = "merchello:upsells:active";

public async Task<List<UpsellRule>> GetActiveUpsellRulesAsync(CancellationToken ct = default)
{
    if (_cache.TryGetValue(CacheKey, out List<UpsellRule>? cached))
        return cached!;

    var rules = await QueryActiveRulesFromDbAsync(ct);
    _cache.Set(CacheKey, rules, TimeSpan.FromSeconds(_settings.CacheDurationSeconds));
    return rules;
}
```

Cache is invalidated on any upsell CRUD operation (create, update, delete, activate, deactivate) by calling `_cache.Remove(CacheKey)`. The `CacheDurationSeconds` setting (default 300) provides a safety net for multi-instance deployments where one instance modifies a rule and another serves the storefront.

**Batch Product Fetching**

The engine does not fetch products one rule at a time. Instead, it collects all recommendation criteria across all matched rules and groups them by recommendation type, issuing one query per distinct type.

```text
1. Evaluate triggers for all active rules â†’ list of matched rules
2. For each matched rule, collect recommendation criteria:
   - ProductTypeIds, CollectionIds, FilterIds, SpecificProductIds, SupplierIds
3. Group criteria by recommendation type (e.g., all ProductType IDs together)
4. Issue 1 query per distinct type via ProductService.QueryProducts():
   - AvailabilityFilter = ProductAvailabilityFilter.Available
   - IncludeProductWarehouses = true (for region filtering)
   - AmountPerPage = 200 (generous limit since we post-filter)
5. Partition fetched products back to their originating rules in memory
6. Apply per-rule filtering (filter matching, region, suppress-if-in-cart)
7. Sort and truncate per rule
```

Typically this means 1-2 product queries total regardless of how many rules match. If Rule A and Rule B both recommend by ProductTypes, their type IDs are merged into a single query.

**Filter Data Loading**

When `MatchTriggerFilters` is enabled, the engine needs filter data for both trigger products (already in `UpsellContextLineItem.FiltersByGroup`) and recommendation products. Product filter data (`Product.Filters`) is loaded as part of the standard EF Include chain â€” no extra query is needed. The engine groups these by `FilterGroupId` in memory for the matching step.

**BestSeller Sort Strategy**

`UpsellSortBy.BestSeller` is achieved by querying products via `ProductService.QueryProducts()` with `OrderBy = ProductOrderBy.Popularity`. Internally, this performs a live aggregation query joining `LineItems` to `Orders` with `Status == Completed` (via the private `GetProductIdsByPopularityAsync` helper). For the upsell engine, this query runs against the already-filtered candidate product IDs (typically 10-50 products), not the full catalog.

The cost is acceptable because:

- The candidate set is small (post-filter, pre-truncation)
- The query uses existing indexes (`IX_LineItems_ProductId`, `IX_Orders_Status`)
- No pre-computed popularity column is needed, avoiding staleness and extra write cost

If performance profiling later shows this as a bottleneck, a materialized `PopularityScore` column on the Product table (refreshed by a background job) would be the optimization path. This is not needed at launch.

**Events Table Write Strategy**

Impression events are high-volume (every page load with upsells renders 1+ impressions). The analytics service uses an in-process buffer with periodic flush to avoid per-impression database writes.

```csharp
public class UpsellAnalyticsService : IUpsellAnalyticsService, IDisposable
{
    private readonly ConcurrentQueue<UpsellEvent> _eventBuffer = new();
    private readonly Timer _flushTimer;
    private const int FlushIntervalMs = 5000;
    private const int MaxBufferSize = 500;

    public Task RecordImpressionAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default)
    {
        _eventBuffer.Enqueue(CreateEvent(parameters, UpsellEventType.Impression));

        // Flush immediately if buffer is getting large
        if (_eventBuffer.Count >= MaxBufferSize)
            _ = FlushAsync(ct);

        return Task.CompletedTask;
    }

    private async Task FlushAsync(CancellationToken ct)
    {
        var events = new List<UpsellEvent>();
        while (_eventBuffer.TryDequeue(out var evt) && events.Count < MaxBufferSize)
            events.Add(evt);

        if (events.Count == 0) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        db.UpsellEvents.AddRange(events);
        await db.SaveChangesAsync(ct);
    }
}
```

This approach:

- Returns immediately from the storefront POST endpoint (non-blocking)
- Batches inserts every 5 seconds or when the buffer reaches 500 events
- Uses `ConcurrentQueue` for thread-safety without locks
- Flushes remaining events on `Dispose` (application shutdown)

Click events use the same buffer. Conversion events (server-side, low volume) write directly â€” no buffering needed.

**Error recovery for buffered events:**

If the application crashes with events in the buffer, those events are lost. This is an acceptable trade-off because:

1. Impressions are high-volume, low-value data â€” losing a few doesn't materially affect analytics
2. The alternative (write-through) would add latency to every storefront page load
3. Conversion events (the most valuable) are written immediately, not buffered

For deployments requiring higher durability, consider:

- Reducing `FlushIntervalMs` to 1000ms (more frequent flushes, smaller loss window)
- Using a persistent queue (Redis, RabbitMQ) instead of in-memory buffer â€” not implemented at launch

**Event Retention Cleanup**

The `UpsellStatusJob` (already running on a periodic interval) also handles event cleanup once per hour, deleting events older than `EventRetentionDays`:

```csharp
private async Task CleanupOldEventsAsync(CancellationToken ct)
{
    using var scope = serviceScopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
    var cutoff = DateTime.UtcNow.AddDays(-settings.EventRetentionDays);
    await db.UpsellEvents
        .Where(e => e.DateCreated < cutoff)
        .ExecuteDeleteAsync(ct);
}
```

**Overall Query Budget Per Storefront Request**

For a typical storefront upsell request with 3 active rules and 2 matches:

| Operation | Queries | Notes |
|-----------|---------|-------|
| Load active rules | 0 | Cached in memory |
| Trigger matching | 0 | In-memory against `UpsellContextLineItem` data |
| Fetch recommendation products | 1-2 | Batched by recommendation type |
| Popularity sort (if BestSeller) | 0-1 | Only if SortBy = BestSeller, against small candidate set |
| Region filtering | 0 | Uses warehouse data already loaded on products |
| Record impressions | 0 | Buffered, flushed async |
| **Total** | **1-3** | Comparable to a category page load |

---

#### 2.10 DI Registration

**Existing file changes:**
- `Startup.cs` â€” Register `IUpsellService`, `IUpsellEngine`, `IUpsellRuleNameResolver`, `UpsellFactory`

#### Phase 2 â€” Verification

- [ ] Project compiles with all service interfaces, implementations, and parameters
- [ ] Unit tests pass for `UpsellFactory.Create()` with various parameter combinations
- [ ] Unit tests pass for `UpsellTriggerMatcher` â€” all trigger types (ProductTypes, Filters, Collections, SpecificProducts, Suppliers)
- [ ] Unit tests pass for `UpsellTriggerMatcher.ExtractFilterValues()` â€” filter value extraction from matching line items
- [ ] Unit tests pass for `UpsellEngine` â€” full evaluation including filter matching
- [ ] CRUD operations (create, read, update, delete, activate, deactivate) work via `UpsellService`
- [ ] Query with pagination, filtering, and sorting works
- [ ] Multiple match resolution: 3+ rules match, only top `MaxSuggestionsPerLocation` returned in priority order
- [ ] Cross-rule deduplication: same product in multiple suggestion groups is kept (different groups); duplicates within a single rule removed by `ProductRootId`
- [ ] Region filtering: products from non-serving warehouses excluded when `CountryCode` is set
- [ ] Region filtering skipped when `CountryCode` is null (no errors, all products returned)
- [ ] Active rules cache populated on first call, invalidated on CRUD operations
- [ ] Batch product fetch: 2 matched rules with same recommendation type â†’ 1 product query (not 2)

---

### Phase 3: Admin API & DTOs

**Goal:** Expose upsell CRUD and management via REST API endpoints, with DTOs for all request/response shapes. After this phase, the admin API is fully functional and testable via Swagger or HTTP client.

**Depends on:** Phase 2 (services).

#### 3.1 Admin DTOs

Each DTO is its own file in `Upsells/Dtos/`.

**UpsellDetailDto** â€” Full detail for the editor:

```csharp
public class UpsellDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public UpsellStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "default";
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int Priority { get; set; }
    public int MaxProducts { get; set; }
    public UpsellSortBy SortBy { get; set; }
    public bool SuppressIfInCart { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public List<UpsellTriggerRuleDto> TriggerRules { get; set; } = [];
    public List<UpsellRecommendationRuleDto> RecommendationRules { get; set; } = [];
    public List<UpsellEligibilityRuleDto> EligibilityRules { get; set; } = [];
}
```

**UpsellListItemDto** â€” List view rows:

```csharp
public class UpsellListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Heading { get; set; } = string.Empty;
    public UpsellStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "default";
    public int Priority { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public int TriggerRuleCount { get; set; }
    public int RecommendationRuleCount { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
    public DateTime DateCreated { get; set; }
}
```

**UpsellTriggerRuleDto** â€” Trigger rule with resolved names:

```csharp
public class UpsellTriggerRuleDto
{
    public UpsellTriggerType TriggerType { get; set; }
    public List<Guid>? TriggerIds { get; set; }
    public List<string>? TriggerNames { get; set; }  // Resolved display names
    public List<Guid>? ExtractFilterGroupIds { get; set; }
    public List<string>? ExtractFilterGroupNames { get; set; }  // Resolved
}
```

**UpsellRecommendationRuleDto** â€” Recommendation rule with resolved names:

```csharp
public class UpsellRecommendationRuleDto
{
    public UpsellRecommendationType RecommendationType { get; set; }
    public List<Guid>? RecommendationIds { get; set; }
    public List<string>? RecommendationNames { get; set; }  // Resolved display names
    public bool MatchTriggerFilters { get; set; }
    public List<Guid>? MatchFilterGroupIds { get; set; }
    public List<string>? MatchFilterGroupNames { get; set; }  // Resolved
}
```

**UpsellEligibilityRuleDto:**

```csharp
public class UpsellEligibilityRuleDto
{
    public UpsellEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
    public List<string>? EligibilityNames { get; set; }  // Resolved
}
```

**Create/Update DTOs:**

| File | Class |
|------|-------|
| `CreateUpsellDto.cs` | `CreateUpsellDto` |
| `UpdateUpsellDto.cs` | `UpdateUpsellDto` |
| `CreateUpsellTriggerRuleDto.cs` | `CreateUpsellTriggerRuleDto` |
| `CreateUpsellRecommendationRuleDto.cs` | `CreateUpsellRecommendationRuleDto` |
| `CreateUpsellEligibilityRuleDto.cs` | `CreateUpsellEligibilityRuleDto` |

**UpsellPageDto** â€” Paginated response wrapper:

```csharp
public class UpsellPageDto
{
    public int PageIndex { get; set; }
    public int TotalPages { get; set; }
    public int TotalItems { get; set; }
    public List<UpsellListItemDto> Items { get; set; } = [];
    public bool HasPreviousPage => PageIndex > 1;
    public bool HasNextPage => PageIndex < TotalPages;
}
```

#### 3.2 Admin API Controller

Controller: `UpsellsApiController`

| Method | Route | Description | Response |
|--------|-------|-------------|----------|
| `GET` | `/api/v1/upsells` | Query upsell rules (paginated, filterable) | `UpsellPageDto` |
| `GET` | `/api/v1/upsells/{id}` | Get single upsell rule | `UpsellDetailDto` |
| `POST` | `/api/v1/upsells` | Create new upsell rule | `UpsellDetailDto` (201) |
| `PUT` | `/api/v1/upsells/{id}` | Update upsell rule | `UpsellDetailDto` |
| `DELETE` | `/api/v1/upsells/{id}` | Delete upsell rule | 204 |
| `POST` | `/api/v1/upsells/{id}/activate` | Activate rule | `UpsellDetailDto` |
| `POST` | `/api/v1/upsells/{id}/deactivate` | Deactivate rule | `UpsellDetailDto` |
| `GET` | `/api/v1/upsells/{id}/performance` | Get performance metrics | `UpsellPerformanceDto` |
| `GET` | `/api/v1/upsells/dashboard` | Overall analytics dashboard | `UpsellDashboardDto` |
| `GET` | `/api/v1/upsells/summary` | Aggregated summary report | `List<UpsellSummaryDto>` |
| `POST` | `/api/v1/upsells/{id}/preview` | Preview suggestions for a test basket | `List<UpsellSuggestionDto>` |

**Query parameters for `GET /api/v1/upsells`:**

| Parameter | Type | Default |
|-----------|------|---------|
| `status` | `UpsellStatus?` | - |
| `search` | `string?` | - |
| `displayLocation` | `UpsellDisplayLocation?` | - |
| `page` | `int` | 1 |
| `pageSize` | `int` | 50 |
| `orderBy` | `UpsellOrderBy` | DateCreated |
| `descending` | `bool` | true |

**DisplayLocation filter semantics:** Since `UpsellDisplayLocation` is a `[Flags]` enum, filtering uses "has flag" semantics (bitwise AND). Filtering by `?displayLocation=Checkout` returns all rules that include Checkout in their display locations (e.g., `Checkout`, `Checkout | Basket`, `All`).

#### 3.3 Frontend API Client

**Existing file changes:**
- `merchello-api.ts` â€” Add upsell API methods (query, getById, create, update, delete, activate, deactivate, getPerformance, getDashboard, getSummary, preview)

#### Phase 3 â€” Verification

- [ ] All admin API endpoints return correct responses via Swagger / HTTP client
- [ ] `GET /api/v1/upsells` returns paginated list with correct filtering and sorting
- [ ] `POST /api/v1/upsells` creates a rule and returns `UpsellDetailDto` with resolved names
- [ ] `PUT /api/v1/upsells/{id}` updates and returns updated detail
- [ ] `DELETE /api/v1/upsells/{id}` returns 204
- [ ] Activate/deactivate toggles status correctly
- [ ] Preview endpoint returns suggestions for a test basket payload

---

### Phase 4: Backoffice UI

**Goal:** Build the full backoffice UI for managing upsell rules â€” tree navigation, list view, detail editor with all tabs, rule builders, and create modal. After this phase, admins can create and manage upsell rules through the Umbraco backoffice.

**Depends on:** Phase 3 (API endpoints and API client methods).

#### 4.1 TypeScript Types

**`upsell.types.ts`** â€” TypeScript interfaces mirroring the C# DTOs.

#### 4.2 Tree Integration

Add "Upsells" as a child node under "Products" in the Merchello tree.

**Existing file changes:**
- `tree-data-source.ts` â€” Set `Products` node to `hasChildren: true`, add `getChildrenOf` handler for `products` parent
- `tree.types.ts` â€” Add `MERCHELLO_UPSELLS_ENTITY_TYPE`
- `tree/manifest.ts` â€” Add `"merchello-upsells"` to `forEntityTypes`

```typescript
// In getChildrenOf:
if (args.parent.unique === "products") {
  return {
    data: {
      items: [{
        entityType: MERCHELLO_UPSELLS_ENTITY_TYPE,
        unique: "upsells",
        name: "Upsells",
        hasChildren: false,
        isFolder: false,
        icon: "icon-trending-up",
        parent: { unique: "products", entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE },
      }],
      total: 1,
    },
  };
}
```

```typescript
// tree.types.ts
export const MERCHELLO_UPSELLS_ENTITY_TYPE = "merchello-upsells";
```

#### 4.3 Navigation Helpers

**Existing file changes:**
- `navigation.ts` â€” Add upsell navigation helpers

```typescript
export const UPSELLS_ENTITY_TYPE = "merchello-upsells";

export function getUpsellDetailHref(upsellId: string): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, `edit/upsells/${upsellId}`);
}

export function getUpsellCreateHref(): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, "edit/upsells/create");
}

export function getUpsellsListHref(): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, "edit/upsells");
}

export function navigateToUpsellDetail(upsellId: string): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, `edit/upsells/${upsellId}`);
}

export function navigateToUpsellCreate(): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, "edit/upsells/create");
}

export function navigateToUpsellsList(): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, "edit/upsells");
}
```

Use `href` attributes for navigation (preferred) and programmatic navigation after modal submits:

```typescript
// In list view
html`<a href=${getUpsellDetailHref(upsell.id)}>${upsell.name}</a>`

// After create modal
const result = await modal.onSubmit();
if (result?.created) { navigateToUpsellDetail(result.id); }
```

#### 4.4 Workspace Context & Manifest

**`upsells-workspace.context.ts`** â€” Workspace routing context.

**`manifest.ts`:**

```typescript
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Upsells.Workspace",
    name: "Merchello Upsells Workspace",
    api: () => import("./contexts/upsells-workspace.context.js"),
    meta: { entityType: MERCHELLO_UPSELLS_ENTITY_TYPE },
  },
  {
    type: "workspaceView",
    alias: "Merchello.Upsells.Workspace.View",
    name: "Merchello Upsells View",
    js: () => import("./components/upsells-list.element.js"),
    weight: 100,
    meta: {
      label: "Upsells",
      pathname: "upsells",
      icon: "icon-trending-up",
    },
    conditions: [{
      alias: "Umb.Condition.WorkspaceAlias",
      match: "Merchello.Upsells.Workspace",
    }],
  },
  {
    type: "modal",
    alias: "Merchello.CreateUpsell.Modal",
    name: "Create Upsell Modal",
    js: () => import("./modals/create-upsell-modal.element.js"),
  },
];
```

**Existing file changes:**
- `bundle.manifests.ts` â€” Import and spread upsells manifest

#### 4.5 List View

**`upsells-list.element.ts`** displays:

| Column | Description |
|--------|-------------|
| Name | Upsell rule name |
| Heading | Customer-facing heading |
| Status | Badge (Draft/Active/Scheduled/Expired/Disabled) |
| Display | Icons for enabled locations (Checkout/Basket/Product/Email) |
| Rules | "2 triggers â†’ 1 recommendation" summary |
| Impressions | Total impression count |
| CTR | Click-through rate percentage |
| Conversions | Total conversion count |
| Revenue | Total attributed revenue |
| Created | Date created |

**Filters:** Status dropdown, display location dropdown, search by name
**Actions:** Create button, bulk activate/deactivate

#### 4.6 Detail Editor

**`upsell-detail.element.ts`** â€” The editor has these tabs:

**Tab 1: Details**
- **Name** â€” Admin identifier ("Bed â†’ Pillow Upsell")
- **Description** â€” Internal notes
- **Status** â€” Draft / Active / Disabled toggle
- **Heading** â€” Customer-facing heading ("Complete your bedroom")
- **Message** â€” Optional customer-facing message ("Don't forget your pillows!")
- **Priority** â€” Number input (lower = higher priority, default 1000)

**Tab 2: Rules**

Split into two visual sections:

**WHEN basket contains:** (Trigger Rules)
- Add trigger rule button
- For each rule: Type dropdown + entity picker + optional "Extract filter values from" filter group picker
- Multiple triggers use OR logic (any trigger matching activates the upsell)

**THEN recommend:** (Recommendation Rules)
- Add recommendation rule button
- For each rule: Type dropdown + entity picker + "Match trigger filters" toggle
- When toggle is on: optional filter group picker for which groups to match
- Multiple recommendations form a combined product pool

**Tab 3: Display**
- **Show in**: Checkboxes for Checkout, Basket, Product Page, Email
- **Checkout mode**: Dropdown (Inline, Interstitial, Post-Purchase) â€” only visible when "Checkout" is checked
  - *Inline*: Collapsible section at top of checkout
  - *Interstitial*: Replaces checkout content until dismissed
  - *Post-Purchase*: After payment, before confirmation (requires VaultedPayments â€” shows warning if no compatible gateway)
- **Sort by**: Dropdown (Best Seller, Price Lowâ†’High, Price Highâ†’Low, Name, Date Added, Random)
- **Max products**: Number input (default 4)
- **Suppress if in cart**: Toggle (default on)

**Tab 4: Eligibility**
- Reuses/adapts the eligibility-rule-builder from discounts
- Options: All Customers, Customer Segments, Specific Customers

**Tab 5: Schedule**
- **Starts at**: Date/time picker
- **Ends at**: Optional date/time picker
- **Timezone**: Timezone dropdown (for display)

**Tab 6: Performance** (read-only, populated in Phase 6)
- Impression/Click/Conversion counts with sparklines
- CTR and Conversion Rate gauges
- Revenue attributed
- Time series chart
- Top converting products
- Breakdown by display location

#### 4.7 Rule Builders

**`trigger-rule-builder.element.ts`:**
1. **Type dropdown** â€” Product Types, Filters, Collections, Specific Products, Suppliers
2. **Entity picker** â€” Opens the appropriate picker modal based on type selection
3. **Extract filter groups** section â€” When type is ProductTypes, Collections, or SpecificProducts, shows an optional filter group picker. Label: "Extract filter values from these groups (for filter matching)"
4. **Add/Remove** â€” Multiple trigger rules supported with OR logic
5. **Display** â€” Shows selected entities as tags with remove buttons, resolved names from IUpsellRuleNameResolver

**`recommendation-rule-builder.element.ts`:**
1. **Type dropdown** â€” Product Types, Filters, Collections, Specific Products, Suppliers
2. **Entity picker** â€” Opens the appropriate picker modal
3. **Match trigger filters** toggle â€” When enabled, shows:
   - Default: "Match ALL extracted filter groups"
   - Optional: Filter group picker to narrow to specific groups
4. **Add/Remove** â€” Multiple recommendation rules supported (products from all rules form the pool)
5. **Display** â€” Selected entities as tags, with a visual indicator for filter matching

**`eligibility-rule-builder.element.ts`** â€” Reused/adapted from discounts.

#### 4.8 Create Modal

**`create-upsell-modal.element.ts`** + **`create-upsell-modal.token.ts`**

#### Phase 4 â€” Verification

- [ ] "Upsells" appears as a child node under "Products" in the Merchello tree
- [ ] Clicking "Upsells" navigates to the list view
- [ ] List view loads with correct columns, filtering, sorting, and pagination
- [ ] Create modal opens, accepts input, and creates a new upsell rule
- [ ] After creation, navigates to the detail editor
- [ ] Detail editor loads all tabs with correct data from the API
- [ ] Trigger rule builder: can add/remove triggers of all types, entity picker works
- [ ] Recommendation rule builder: can add/remove recommendations, filter matching toggle works
- [ ] Eligibility tab: all three options work (All, Segments, Specific)
- [ ] Schedule tab: date pickers work, timezone selection works
- [ ] Save updates the rule and reloads with resolved names
- [ ] Activate/deactivate buttons work from both list and detail views

---

### Phase 5: Storefront & Email Integration

**Goal:** Make upsell suggestions available to the storefront (basket, checkout, product pages) and order confirmation emails. After this phase, customers see product recommendations and events are tracked.

**Depends on:** Phase 2 (engine), Phase 3 (API patterns).

#### 5.1 Storefront DTOs

**UpsellSuggestionDto:**

```csharp
public class UpsellSuggestionDto
{
    public Guid UpsellRuleId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public List<UpsellProductDto> Products { get; set; } = [];
}
```

**UpsellProductDto:**

```csharp
public class UpsellProductDto
{
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public string? FormattedPreviousPrice { get; set; }
    public string? Url { get; set; }
    public string? ImageUrl { get; set; }
    public string? ProductTypeName { get; set; }
    public bool AvailableForPurchase { get; set; }
}
```

**RecordUpsellEventDto:**

```csharp
public class RecordUpsellEventDto
{
    public Guid UpsellRuleId { get; set; }
    public UpsellEventType EventType { get; set; }
    public Guid? ProductId { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
}
```

**RecordUpsellEventsDto** â€” Batch wrapper for storefront events endpoint:

```csharp
public class RecordUpsellEventsDto
{
    public List<RecordUpsellEventDto> Events { get; set; } = [];
}
```

#### 5.2 Storefront API

Create a new `StorefrontUpsellController` to keep concerns isolated from the main storefront controller.

| Method | Route | Description | Response |
|--------|-------|-------------|----------|
| `GET` | `/api/merchello/storefront/upsells` | Suggestions for current basket | `List<UpsellSuggestionDto>` |
| `GET` | `/api/merchello/storefront/upsells/product/{productId}` | Suggestions for product page | `List<UpsellSuggestionDto>` |
| `POST` | `/api/merchello/storefront/upsells/events` | Record impression/click events (batch) | 204 |

**`GET /api/merchello/storefront/upsells` query parameter:**

| Parameter | Type | Required |
|-----------|------|----------|
| `location` | `UpsellDisplayLocation` | Yes |

**`POST /api/merchello/storefront/upsells/events` body:**

```json
{
  "events": [
    {
      "upsellRuleId": "guid",
      "eventType": "Impression",
      "productId": "guid",
      "displayLocation": "Checkout"
    }
  ]
}
```

#### 5.3 Storefront JavaScript Integration

**Basket Page:**

```javascript
async function loadBasketUpsells() {
    const response = await fetch('/api/merchello/storefront/upsells?location=Basket');
    const suggestions = await response.json();

    if (suggestions.length > 0) {
        renderUpsellSection(suggestions);
        trackImpressions(suggestions);
    }
}

function trackImpressions(suggestions) {
    const events = suggestions.flatMap(s =>
        [{ upsellRuleId: s.upsellRuleId, eventType: 'Impression', displayLocation: 'Basket' }]
    );
    fetch('/api/merchello/storefront/upsells/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
    });
}
```

**Checkout Page:**

```javascript
async function loadCheckoutUpsells() {
    const response = await fetch('/api/merchello/storefront/upsells?location=Checkout');
    const suggestions = await response.json();

    if (suggestions.length > 0) {
        renderCheckoutUpsells(suggestions);
        trackImpressions(suggestions, 'Checkout');
    }
}
```

**Product Page:**

```javascript
async function loadProductUpsells(productId) {
    const response = await fetch(`/api/merchello/storefront/upsells/product/${productId}`);
    const suggestions = await response.json();

    if (suggestions.length > 0) {
        renderProductUpsells(suggestions);
        trackImpressions(suggestions, 'ProductPage');
    }
}
```

For product pages, the engine creates a synthetic context with just that product (as if it were in the basket) to evaluate trigger rules. This enables "customers who view this bed should see pillows" recommendations.

**Existing file changes:**
- `StorefrontApiController.cs` â€” Add upsell storefront endpoints (or create separate controller)
- `Constants.cs` â€” Add `MerchelloUpsellImpressions` extended data key

#### 5.4 Conversion Tracking Flow

1. **Impression recording** â€” When upsells are rendered, the frontend sends impression events via `POST /upsells/events`. The service also stores a lightweight record in the basket's `ExtendedData` under key `MerchelloUpsellImpressions`:

```json
[
  {
    "upsellRuleId": "guid",
    "productIds": ["guid1", "guid2"],
    "displayLocation": "Checkout",
    "timestamp": "2026-01-28T12:00:00Z"
  }
]
```

2. **Click recording** â€” When a customer clicks a recommended product, the frontend sends a click event before navigating.

3. **Conversion recording** â€” Server-side via `UpsellConversionHandler` on `OrderCreatedNotification`:
   - Gets the basket's ExtendedData for `MerchelloUpsellImpressions`
   - Compares purchased line item ProductIds against previously-shown upsell product IDs
   - Records `Conversion` events for matches with the line item amount as revenue

**UpsellConversionHandler** â€” `Services/UpsellConversionHandler.cs`

Notification handler listening on `OrderCreatedNotification` (priority 2200) that:
1. Gets the basket's ExtendedData for `MerchelloUpsellImpressions`
2. Compares purchased line items against previously-shown upsell products
3. Records `Conversion` events for matches

#### 5.5 Email Integration

**UpsellEmailEnrichmentHandler** â€” `Services/UpsellEmailEnrichmentHandler.cs`

Notification handler at priority 2050 (before `EmailNotificationHandler` at 2100) that:
1. Listens for `OrderCreatedNotification`
2. Evaluates upsell rules with `ShowInEmail` enabled against the order's line items
3. Stores suggestions in `notification.State["UpsellSuggestions"]`

```csharp
[NotificationHandlerPriority(2050)]
public class UpsellEmailEnrichmentHandler(
    IUpsellEngine upsellEngine,
    ILogger<UpsellEmailEnrichmentHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            var suggestions = await upsellEngine.GetSuggestionsForInvoiceAsync(
                notification.Order.InvoiceId, ct);

            notification.State["UpsellSuggestions"] = suggestions;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to generate upsell suggestions for email");
            // Non-critical: email sends without upsells
        }
    }
}
```

**Email Template Partial** â€” `Views/Emails/Shared/_UpsellSuggestions.cshtml`

```html
@{
    var upsellSuggestions = Model.Notification.State.TryGetValue("UpsellSuggestions", out var raw)
        ? raw as List<UpsellSuggestion> ?? []
        : new List<UpsellSuggestion>();
}

@if (upsellSuggestions.Count > 0)
{
    @foreach (var suggestion in upsellSuggestions)
    {
        <mj-section>
          <mj-column>
            @Html.Mjml().Heading(suggestion.Heading, level: 2)
            @if (!string.IsNullOrEmpty(suggestion.Message))
            {
                @Html.Mjml().Text(suggestion.Message)
            }
          </mj-column>
        </mj-section>

        <mj-section>
          @foreach (var product in suggestion.Products.Take(3))
          {
              <mj-column width="33%">
                @if (product.Images.Count > 0)
                {
                    <mj-image src="@product.Images[0]" width="150px" />
                }
                <mj-text align="center" font-weight="bold">@product.Name</mj-text>
                <mj-text align="center">@product.FormattedPrice</mj-text>
                @if (!string.IsNullOrEmpty(product.Url))
                {
                    @Html.Mjml().Button("View Product", product.Url)
                }
              </mj-column>
          }
        </mj-section>
    }
}
```

**Topics That Support Upsells:**

| Topic | Notification | Use Case |
|-------|-------------|----------|
| `order.created` | `OrderCreatedNotification` | "You might also like..." in order confirmation |
| `shipment.created` | `ShipmentCreatedNotification` | "While you wait..." in shipping confirmation |
| `checkout.abandoned.*` | `CheckoutAbandoned*Notification` | "Complete your set..." in recovery emails |

#### 5.6 Example Site Integration

The `Merchello.Site` example project will include:

- Upsell section on the basket partial view
- Upsell section on the product detail view
- JavaScript for fetching and rendering upsell product cards

#### 5.7 Interstitial Mode Implementation

The integrated Merchello checkout supports interstitial upsells that replace the checkout left column until dismissed.

**Checkout State Management:**

The checkout page maintains state for whether interstitial upsells have been dismissed:

```typescript
interface CheckoutState {
  interstitialDismissed: boolean;
  // ... other checkout state
}
```

**Flow:**

1. Customer navigates to `/checkout`
2. `MerchelloCheckoutController` calls `IUpsellEngine.GetSuggestionsAsync()` with `Location = Checkout`
3. Filter suggestions to those with `CheckoutMode = Interstitial`
4. If any interstitial suggestions exist AND not dismissed:
   - Render interstitial view instead of checkout forms
   - Pass suggestions to view
5. Customer clicks "Add to Order" â†’ AJAX adds to basket, updates order summary
6. Customer clicks "Continue" or "Skip" â†’ sets `interstitialDismissed = true`, renders checkout forms
7. Inline suggestions (if any) now render at top of checkout forms

**Session/Cookie Storage:**

Store `interstitialDismissed` in session or cookie to prevent re-showing on page refresh:

```csharp
// Key: merchello_checkout_interstitial_dismissed_{basketId}
// Value: "true"
// Expires: When basket is deleted (order completed)
```

**Variant Selection:**

For products with variants, the interstitial card includes a variant selector:

```html
<select name="variantId" data-product-id="{productRootId}">
  <option value="">Select Size...</option>
  <option value="{variantId}">Single - Â£199</option>
  <option value="{variantId}">Double - Â£249</option>
  <option value="{variantId}">King - Â£299</option>
</select>
<button disabled>Add to Order</button> <!-- Enabled when variant selected -->
```

**UpsellSuggestionDto Extension:**

Add `CheckoutMode` to the DTO so the frontend knows how to render:

```csharp
public class UpsellSuggestionDto
{
    public Guid UpsellRuleId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string? Message { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }  // NEW
    public List<UpsellProductDto> Products { get; set; } = [];
}
```

#### 5.8 Alpine.js Checkout Integration

The integrated Merchello checkout uses Alpine.js for state management and component orchestration. Inline and Interstitial upsell modes require updates to both the store and the single-page checkout component.

**checkout.store.js Additions:**

Add the following state and methods to the checkout store:

```javascript
// ============================================
// UPSELL STATE
// ============================================

/** @type {Array<UpsellSuggestion>} */
upsellSuggestions: [],

/** @type {boolean} */
upsellsLoading: false,

/** @type {string|null} */
upsellsError: null,

/** @type {boolean} Whether interstitial upsells have been dismissed */
interstitialDismissed: false,

/** @type {boolean} Whether inline upsells section is collapsed */
inlineUpsellsCollapsed: false,

/** @type {Set<string>} Product IDs that have been added from upsells this session */
addedUpsellProductIds: new Set(),

/** @type {boolean} Whether an upsell add-to-cart is in progress */
upsellAddingToCart: false,

// ============================================
// UPSELL METHODS
// ============================================

/**
 * Set upsell suggestions from API
 * @param {Array<UpsellSuggestion>} suggestions
 */
setUpsellSuggestions(suggestions) {
    this.upsellSuggestions = suggestions;
},

/**
 * Set upsells loading state
 * @param {boolean} loading
 */
setUpsellsLoading(loading) {
    this.upsellsLoading = loading;
},

/**
 * Set upsells error
 * @param {string|null} error
 */
setUpsellsError(error) {
    this.upsellsError = error;
},

/**
 * Dismiss interstitial upsells and show checkout form
 */
dismissInterstitial() {
    this.interstitialDismissed = true;
},

/**
 * Toggle inline upsells collapsed state
 */
toggleInlineUpsells() {
    this.inlineUpsellsCollapsed = !this.inlineUpsellsCollapsed;
},

/**
 * Mark a product as added from upsells
 * @param {string} productId
 */
markUpsellProductAdded(productId) {
    this.addedUpsellProductIds = new Set([...this.addedUpsellProductIds, productId]);
},

/**
 * Check if upsell product was already added this session
 * @param {string} productId
 * @returns {boolean}
 */
wasUpsellProductAdded(productId) {
    return this.addedUpsellProductIds.has(productId);
},

/**
 * Set upsell add-to-cart loading state
 * @param {boolean} adding
 */
setUpsellAddingToCart(adding) {
    this.upsellAddingToCart = adding;
},

/**
 * Clear all upsell state (on checkout complete or error)
 */
clearUpsells() {
    this.upsellSuggestions = [];
    this.upsellsLoading = false;
    this.upsellsError = null;
    this.interstitialDismissed = false;
    this.inlineUpsellsCollapsed = false;
    this.addedUpsellProductIds = new Set();
    this.upsellAddingToCart = false;
},

/**
 * Check if checkout should show interstitial
 * @returns {boolean}
 */
shouldShowInterstitial() {
    if (this.interstitialDismissed) return false;
    return this.upsellSuggestions.some(s => s.checkoutMode === 'Interstitial');
},

/**
 * Get suggestions for a specific checkout mode
 * @param {'Inline' | 'Interstitial'} mode
 * @returns {Array<UpsellSuggestion>}
 */
getSuggestionsByMode(mode) {
    return this.upsellSuggestions.filter(s => s.checkoutMode === mode);
}
```

**TypeScript Types (for JSDoc):**

```javascript
/**
 * @typedef {Object} UpsellSuggestion
 * @property {string} upsellRuleId - The upsell rule ID
 * @property {string} heading - Customer-facing heading
 * @property {string|null} message - Customer-facing message
 * @property {'Inline' | 'Interstitial' | 'PostPurchase'} checkoutMode - Display mode
 * @property {UpsellProduct[]} products - Recommended products
 */

/**
 * @typedef {Object} UpsellProduct
 * @property {string} productId
 * @property {string} productRootId
 * @property {string} name
 * @property {string} sku
 * @property {number} price
 * @property {string} formattedPrice
 * @property {string|null} imageUrl
 * @property {string|null} url
 * @property {boolean} hasVariants
 * @property {UpsellVariant[]|null} variants
 * @property {boolean} availableForPurchase
 */

/**
 * @typedef {Object} UpsellVariant
 * @property {string} productId
 * @property {string} name
 * @property {string} sku
 * @property {number} price
 * @property {string} formattedPrice
 * @property {boolean} availableForPurchase
 */
```

**single-page-checkout.js Additions:**

Add the following to the single-page checkout component:

```javascript
// ============================================
// Upsell State (UI-specific)
// ============================================

/** @type {string|null} Currently selected variant ID for upsell product */
selectedUpsellVariant: {},

/** @type {string|null} Product ID currently being added */
upsellAddingProductId: null,

// ============================================
// Store Getters (add to existing getters)
// ============================================

get upsellSuggestions() { return this.$store.checkout?.upsellSuggestions ?? []; },
get upsellsLoading() { return this.$store.checkout?.upsellsLoading ?? false; },
get upsellsError() { return this.$store.checkout?.upsellsError ?? null; },
get interstitialDismissed() { return this.$store.checkout?.interstitialDismissed ?? false; },
get inlineUpsellsCollapsed() { return this.$store.checkout?.inlineUpsellsCollapsed ?? false; },
get upsellAddingToCart() { return this.$store.checkout?.upsellAddingToCart ?? false; },

// ============================================
// Computed Properties (add to existing)
// ============================================

/**
 * Whether to show interstitial upsells (blocks checkout form)
 */
get showInterstitial() {
    return this.$store.checkout?.shouldShowInterstitial() ?? false;
},

/**
 * Get inline upsell suggestions only
 */
get inlineSuggestions() {
    return this.$store.checkout?.getSuggestionsByMode('Inline') ?? [];
},

/**
 * Get interstitial upsell suggestions only
 */
get interstitialSuggestions() {
    return this.$store.checkout?.getSuggestionsByMode('Interstitial') ?? [];
},

/**
 * Whether there are any inline upsells to show
 */
get hasInlineUpsells() {
    return this.inlineSuggestions.length > 0 &&
           this.inlineSuggestions.some(s => s.products.length > 0);
},

// ============================================
// Lifecycle (add to init())
// ============================================

async init() {
    // ... existing init code ...

    // Load upsell suggestions after shipping is calculated
    // (need shipping address for region filtering)
    if (this._shippingCalculated) {
        await this.loadCheckoutUpsells();
    }

    // Listen for basket changes to refresh upsells
    document.addEventListener('merchello:basket-updated', () => {
        this.debouncedLoadCheckoutUpsells();
    });
},

// ============================================
// Upsell Methods
// ============================================

/**
 * Debounced upsell loading (after basket changes)
 */
debouncedLoadCheckoutUpsells() {
    debouncer.debounce('loadUpsells', () => this.loadCheckoutUpsells(), 500);
},

/**
 * Load checkout upsell suggestions from API
 */
async loadCheckoutUpsells() {
    const store = this.$store.checkout;

    // Don't load if no shipping address yet (region filtering needs it)
    if (!this.form.shipping.countryCode) return;

    store?.setUpsellsLoading(true);
    store?.setUpsellsError(null);

    try {
        const response = await fetch('/api/merchello/storefront/upsells?' + new URLSearchParams({
            location: 'Checkout',
            countryCode: this.form.shipping.countryCode,
            regionCode: this.form.shipping.stateCode || ''
        }));

        if (!response.ok) throw new Error('Failed to load upsells');

        const suggestions = await response.json();
        store?.setUpsellSuggestions(suggestions);

        // Track impressions for loaded suggestions
        if (suggestions.length > 0) {
            this.trackUpsellImpressions(suggestions);
        }
    } catch (error) {
        console.error('Failed to load checkout upsells:', error);
        store?.setUpsellsError('Unable to load recommendations');
    } finally {
        store?.setUpsellsLoading(false);
    }
},

/**
 * Track upsell impressions for analytics
 * @param {Array<UpsellSuggestion>} suggestions
 */
async trackUpsellImpressions(suggestions) {
    const events = suggestions.flatMap(s =>
        s.products.map(p => ({
            upsellRuleId: s.upsellRuleId,
            productId: p.productId,
            eventType: 'Impression',
            displayLocation: 'Checkout'
        }))
    );

    if (events.length === 0) return;

    try {
        await fetch('/api/merchello/storefront/upsells/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events })
        });
    } catch (error) {
        console.error('Failed to track upsell impressions:', error);
    }
},

/**
 * Track upsell click for analytics
 * @param {string} upsellRuleId
 * @param {string} productId
 */
async trackUpsellClick(upsellRuleId, productId) {
    try {
        await fetch('/api/merchello/storefront/upsells/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                events: [{
                    upsellRuleId,
                    productId,
                    eventType: 'Click',
                    displayLocation: 'Checkout'
                }]
            })
        });
    } catch (error) {
        console.error('Failed to track upsell click:', error);
    }
},

/**
 * Add upsell product to cart
 * Handles variant selection, basket update, shipping recalculation, and payment reinit
 *
 * @param {UpsellProduct} product - The product to add
 * @param {string} upsellRuleId - The upsell rule ID for tracking
 */
async addUpsellToCart(product, upsellRuleId) {
    const store = this.$store.checkout;

    if (store?.upsellAddingToCart) return;

    // Get selected variant if product has variants
    const productIdToAdd = product.hasVariants
        ? (this.selectedUpsellVariant[product.productRootId] || product.variants?.[0]?.productId)
        : product.productId;

    if (!productIdToAdd) {
        this.announce('Please select a variant');
        return;
    }

    store?.setUpsellAddingToCart(true);
    this.upsellAddingProductId = product.productId;

    try {
        // Track click before adding
        await this.trackUpsellClick(upsellRuleId, productIdToAdd);

        // Add to basket via Storefront API
        const response = await fetch('/api/merchello/storefront/basket/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: productIdToAdd,
                quantity: 1
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add item');
        }

        await response.json();

        // Mark product as added (to hide from suggestions or show "Added" state)
        store?.markUpsellProductAdded(product.productRootId);

        // Refresh basket totals (includes display currency + tax display settings)
        const basketResponse = await fetch('/api/merchello/checkout/basket');
        if (basketResponse.ok) {
            const basket = await basketResponse.json();
            await this.updateBasketAndReinitPayment(basket);
        }

        // Recalculate shipping (if address is available)
        if (this.canCalculateShipping) {
            await this.calculateShipping();
        }

        // Refresh upsells (added product should be suppressed if SuppressIfInCart)
        await this.loadCheckoutUpsells();

        this.announce(`${product.name} added to your order`);

        // Dispatch event for other components (e.g., mini-cart)
        document.dispatchEvent(new CustomEvent('merchello:basket-item-added', {
            detail: { productId: productIdToAdd, name: product.name }
        }));

    } catch (error) {
        console.error('Failed to add upsell to cart:', error);
        this.announce(error.message || 'Failed to add item to cart');
    } finally {
        store?.setUpsellAddingToCart(false);
        this.upsellAddingProductId = null;
    }
},

/**
 * Handle variant selection for upsell product
 * @param {string} productRootId
 * @param {string} variantProductId
 */
selectUpsellVariant(productRootId, variantProductId) {
    this.selectedUpsellVariant = {
        ...this.selectedUpsellVariant,
        [productRootId]: variantProductId
    };
},

/**
 * Dismiss interstitial and continue to checkout form
 */
dismissInterstitial() {
    this.$store.checkout?.dismissInterstitial();
    this.announce('Continuing to checkout');
},

/**
 * Toggle inline upsells section
 */
toggleInlineUpsells() {
    this.$store.checkout?.toggleInlineUpsells();
},

/**
 * Check if a specific product is currently being added
 * @param {string} productId
 * @returns {boolean}
 */
isAddingUpsellProduct(productId) {
    return this.upsellAddingProductId === productId;
},

/**
 * Check if product was already added from upsells
 * @param {string} productRootId
 * @returns {boolean}
 */
wasUpsellAdded(productRootId) {
    return this.$store.checkout?.wasUpsellProductAdded(productRootId) ?? false;
}
```

**Template Integration â€” Inline Upsells (at top of checkout form):**

```html
<!-- Inline Upsells Section -->
<template x-if="hasInlineUpsells && !showInterstitial">
    <div class="checkout-upsells checkout-upsells--inline">
        <button
            type="button"
            class="checkout-upsells__toggle"
            @click="toggleInlineUpsells()"
            :aria-expanded="!inlineUpsellsCollapsed"
        >
            <span x-text="inlineSuggestions[0]?.heading || 'You might also like...'"></span>
            <svg class="toggle-icon" :class="{ 'rotated': inlineUpsellsCollapsed }">...</svg>
        </button>

        <div x-show="!inlineUpsellsCollapsed" x-collapse>
            <template x-for="suggestion in inlineSuggestions" :key="suggestion.upsellRuleId">
                <div class="upsell-group">
                    <p x-show="suggestion.message" x-text="suggestion.message" class="upsell-message"></p>

                    <div class="upsell-products">
                        <template x-for="product in suggestion.products" :key="product.productId">
                            <div class="upsell-product-card" :class="{ 'added': wasUpsellAdded(product.productRootId) }">
                                <img x-show="product.imageUrl" :src="product.imageUrl" :alt="product.name">
                                <div class="product-info">
                                    <h4 x-text="product.name"></h4>
                                    <span class="price" x-text="product.formattedPrice"></span>
                                </div>

                                <!-- Variant selector if has variants -->
                                <template x-if="product.hasVariants && product.variants?.length > 1">
                                    <select
                                        @change="selectUpsellVariant(product.productRootId, $event.target.value)"
                                        class="variant-select"
                                    >
                                        <template x-for="variant in product.variants" :key="variant.productId">
                                            <option
                                                :value="variant.productId"
                                                :disabled="!variant.availableForPurchase"
                                                x-text="variant.name + (variant.availableForPurchase ? '' : ' (Out of stock)')"
                                            ></option>
                                        </template>
                                    </select>
                                </template>

                                <button
                                    type="button"
                                    class="add-button"
                                    @click="addUpsellToCart(product, suggestion.upsellRuleId)"
                                    :disabled="upsellAddingToCart || !product.availableForPurchase || wasUpsellAdded(product.productRootId)"
                                >
                                    <span x-show="wasUpsellAdded(product.productRootId)">Added âœ“</span>
                                    <span x-show="!wasUpsellAdded(product.productRootId) && !isAddingUpsellProduct(product.productId)">Add</span>
                                    <span x-show="isAddingUpsellProduct(product.productId)">Adding...</span>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
```

**Template Integration â€” Interstitial Mode (replaces checkout form):**

```html
<!-- Interstitial Upsells (replaces left column) -->
<template x-if="showInterstitial">
    <div class="checkout-interstitial">
        <template x-for="suggestion in interstitialSuggestions" :key="suggestion.upsellRuleId">
            <div class="interstitial-group">
                <h2 x-text="suggestion.heading"></h2>
                <p x-show="suggestion.message" x-text="suggestion.message" class="interstitial-message"></p>

                <div class="interstitial-products">
                    <template x-for="product in suggestion.products" :key="product.productId">
                        <div class="interstitial-product-card">
                            <img x-show="product.imageUrl" :src="product.imageUrl" :alt="product.name">
                            <div class="product-details">
                                <h3 x-text="product.name"></h3>
                                <p x-show="product.description" x-text="product.description"></p>
                                <span class="price" x-text="product.formattedPrice"></span>
                            </div>

                            <!-- Variant selector -->
                            <template x-if="product.hasVariants && product.variants?.length > 1">
                                <select
                                    @change="selectUpsellVariant(product.productRootId, $event.target.value)"
                                    class="variant-select"
                                >
                                    <template x-for="variant in product.variants" :key="variant.productId">
                                        <option
                                            :value="variant.productId"
                                            :disabled="!variant.availableForPurchase"
                                            x-text="variant.name + ' - ' + variant.formattedPrice"
                                        ></option>
                                    </template>
                                </select>
                            </template>

                            <button
                                type="button"
                                class="add-to-order-button"
                                @click="addUpsellToCart(product, suggestion.upsellRuleId)"
                                :disabled="upsellAddingToCart || !product.availableForPurchase || wasUpsellAdded(product.productRootId)"
                            >
                                <span x-show="wasUpsellAdded(product.productRootId)">Added to Order âœ“</span>
                                <span x-show="!wasUpsellAdded(product.productRootId) && !isAddingUpsellProduct(product.productId)">Add to Order</span>
                                <span x-show="isAddingUpsellProduct(product.productId)">Adding...</span>
                            </button>
                        </div>
                    </template>
                </div>
            </div>
        </template>

        <div class="interstitial-actions">
            <button type="button" class="continue-button" @click="dismissInterstitial()">
                Continue to Checkout
            </button>
            <button type="button" class="skip-button" @click="dismissInterstitial()">
                No Thanks, Skip
            </button>
        </div>
    </div>
</template>

<!-- Regular checkout form (hidden during interstitial) -->
<template x-if="!showInterstitial">
    <!-- ... existing checkout form ... -->
</template>
```

**API Endpoint Updates:**

Add checkout-specific endpoint to `StorefrontUpsellApiController`:

```csharp
[HttpGet("checkout")]
public async Task<ActionResult<List<CheckoutUpsellSuggestionDto>>> GetCheckoutUpsells(
    [FromQuery] string? countryCode,
    [FromQuery] string? regionCode,
    CancellationToken ct)
{
    var basketId = GetBasketId();
    if (basketId == null) return Ok(new List<CheckoutUpsellSuggestionDto>());

    var suggestions = await upsellEngine.GetSuggestionsAsync(
        new UpsellContext
        {
            BasketId = basketId.Value,
            DisplayLocation = UpsellDisplayLocation.Checkout,
            CountryCode = countryCode,
            RegionCode = regionCode,
            CustomerId = GetCustomerId()
        }, ct);

    // Include CheckoutMode in response for frontend routing
    return Ok(suggestions.Select(s => new CheckoutUpsellSuggestionDto
    {
        UpsellRuleId = s.UpsellRuleId,
        Heading = s.Heading,
        Message = s.Message,
        CheckoutMode = s.CheckoutMode.ToString(),
        Products = s.Products
    }).ToList());
}
```

**Existing Files Modified:**

| File | Changes |
|------|---------|
| `checkout.store.js` | Add upsell state properties and methods |
| `single-page-checkout.js` | Add upsell loading, tracking, add-to-cart, and interstitial handling |
| `_SinglePageCheckout.cshtml` | Add inline and interstitial template sections |
| `checkout.css` | Add styles for upsell cards, interstitial layout |
| `StorefrontUpsellApiController.cs` | Add checkout-specific endpoint with CheckoutMode |

#### Phase 5 â€” Verification

- [ ] `GET /api/merchello/storefront/upsells?location=Basket` returns suggestions for the current basket
- [ ] `GET /api/merchello/storefront/upsells/product/{id}` returns suggestions for a product page
- [ ] `POST /api/merchello/storefront/upsells/events` records impression and click events
- [ ] Impression data is stored in basket ExtendedData
- [ ] Conversion handler fires on OrderCreatedNotification and records conversion events
- [ ] Email enrichment handler stores suggestions in notification state
- [ ] Email template partial renders upsell product cards correctly
- [ ] Filter matching works end-to-end (e.g., King Size bed â†’ King Size mattress)
- [ ] SuppressIfInCart correctly hides products already in the basket
- [ ] Product page synthetic context creates valid suggestions
- [ ] Inline mode: upsells render as collapsible section at top of checkout
- [ ] Interstitial mode: upsells replace checkout left column until dismissed
- [ ] Interstitial dismiss state persists across page refresh (cookie/session)
- [ ] Variant selector works for products with variants in interstitial mode
- [ ] Adding products from interstitial updates order summary in real-time

---

### Phase 6: Analytics & Background Jobs

**Goal:** Add analytics reporting (dashboard, per-rule performance), the background status job, and CRUD notifications. After this phase, the feature is complete with full analytics visibility and automated lifecycle management.

**Depends on:** Phase 5 (event recording), Phase 4 (UI shell for performance tab/dashboard).

#### 6.1 Analytics Service

**IUpsellAnalyticsService** â€” `Services/Interfaces/IUpsellAnalyticsService.cs`

```csharp
public interface IUpsellAnalyticsService
{
    // Event Recording
    Task RecordImpressionAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default);
    Task RecordClickAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default);
    Task RecordConversionAsync(RecordUpsellConversionParameters parameters, CancellationToken ct = default);

    // Reporting
    Task<UpsellPerformanceDto?> GetPerformanceAsync(GetUpsellPerformanceParameters parameters, CancellationToken ct = default);
    Task<List<UpsellSummaryDto>> GetSummaryAsync(UpsellReportParameters parameters, CancellationToken ct = default);
    Task<UpsellDashboardDto> GetDashboardAsync(UpsellDashboardParameters parameters, CancellationToken ct = default);
}
```

#### 6.2 Analytics DTOs

Each DTO is its own file in `Upsells/Dtos/`.

**UpsellPerformanceDto:**

```csharp
public class UpsellPerformanceDto
{
    public Guid UpsellRuleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AverageOrderValue { get; set; }
    public int UniqueCustomersCount { get; set; }
    public DateTime? FirstImpression { get; set; }
    public DateTime? LastConversion { get; set; }
    public List<UpsellEventsByDateDto> EventsByDate { get; set; } = [];
}
```

**UpsellDashboardDto:**

```csharp
public class UpsellDashboardDto
{
    public int TotalActiveRules { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal OverallClickThroughRate { get; set; }
    public decimal OverallConversionRate { get; set; }
    public decimal TotalRevenue { get; set; }
    public List<UpsellSummaryDto> TopPerformers { get; set; } = [];
    public List<UpsellEventsByDateDto> TrendByDate { get; set; } = [];
}
```

**UpsellEventsByDateDto:**

```csharp
public class UpsellEventsByDateDto
{
    public DateOnly Date { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int Conversions { get; set; }
    public decimal Revenue { get; set; }
}
```

**UpsellSummaryDto:**

```csharp
public class UpsellSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public UpsellStatus Status { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int Conversions { get; set; }
    public decimal Revenue { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
}
```

#### 6.3 Tracked Events & Calculated Metrics

| Event | When Recorded | Source | Key Fields |
|-------|--------------|--------|------------|
| `Impression` | Upsell rendered to customer | Client-side POST | UpsellRuleId, DisplayLocation, BasketId, CustomerId |
| `Click` | Customer clicks recommended product | Client-side POST | UpsellRuleId, ProductId, DisplayLocation, BasketId, CustomerId |
| `Conversion` | Customer purchases recommended product | Server-side handler | UpsellRuleId, ProductId, InvoiceId, CustomerId, Amount |

| Metric | Formula |
|--------|---------|
| Click-Through Rate (CTR) | `Clicks / Impressions Ã— 100` |
| Conversion Rate | `Conversions / Impressions Ã— 100` |
| Total Revenue | `SUM(Amount) from Conversion events` |
| Average Order Value | `Total Revenue / COUNT(DISTINCT InvoiceId)` |
| Revenue per Impression | `Total Revenue / Impressions` |
| Unique Customers | `COUNT(DISTINCT CustomerId)` |

#### 6.4 Dashboard UI

**`upsell-dashboard.element.ts`** shows:

- **Summary cards**: Active Rules, Total Impressions, Total Clicks, Total Conversions, Overall CTR, Conversion Rate, Total Revenue
- **Trend chart**: Impressions, Clicks, Conversions over time (daily aggregation)
- **Top performers**: Table ranked by conversion rate or revenue
- **Location breakdown**: Performance by display location (Checkout vs Basket vs Product Page vs Email)

#### 6.5 Per-Rule Performance UI

**`upsell-performance.element.ts`** (renders in the Performance tab of the detail editor):

- Impression / Click / Conversion counts with trends
- CTR and Conversion Rate
- Revenue attributed to this rule
- Time series chart
- Top converting products within this rule
- Breakdown by display location

#### 6.6 Background Status Job

**UpsellStatusJob** â€” `Services/UpsellStatusJob.cs`

Background job (IHostedService) that:

- Transitions `Scheduled` â†’ `Active` when `StartsAt` is reached
- Transitions `Active` â†’ `Expired` when `EndsAt` is passed

Follows the `DiscountStatusJob` pattern.

#### 6.7 CRUD Notifications

Standard CRUD notification set following the Discount pattern. All inherit from `MerchelloNotification` base classes (see Architecture-Diagrams.md Section 8).

**Standard CRUD Pattern:** Creatingâœ“/Created, Savingâœ“/Saved, Deletingâœ“/Deleted (âœ“ = cancelable)

| Notification | Cancelable | When |
|-------------|-----------|------|
| `UpsellRuleCreatingNotification` | Yes | Before create |
| `UpsellRuleCreatedNotification` | No | After create |
| `UpsellRuleSavingNotification` | Yes | Before update |
| `UpsellRuleSavedNotification` | No | After update |
| `UpsellRuleDeletingNotification` | Yes | Before delete |
| `UpsellRuleDeletedNotification` | No | After delete |
| `UpsellRuleStatusChangingNotification` | Yes | Before status change |
| `UpsellRuleStatusChangedNotification` | No | After status change |

#### 6.8 DI Registration

**Existing file changes:**
- `Startup.cs` â€” Register `IUpsellAnalyticsService`, `UpsellStatusJob`, `UpsellConversionHandler`, `UpsellEmailEnrichmentHandler`, all notification handlers

#### Phase 6 â€” Verification

- [ ] `GET /api/v1/upsells/{id}/performance` returns correct metrics for a rule with recorded events
- [ ] `GET /api/v1/upsells/dashboard` returns overall analytics
- [ ] `GET /api/v1/upsells/summary` returns aggregated summary
- [ ] Dashboard UI renders summary cards, trend chart, and top performers
- [ ] Performance tab in detail editor shows per-rule metrics
- [ ] List view analytics columns (Impressions, CTR, Conversions, Revenue) display correct values
- [ ] `UpsellStatusJob` transitions Scheduled â†’ Active when `StartsAt` is reached
- [ ] `UpsellStatusJob` transitions Active â†’ Expired when `EndsAt` is passed
- [ ] CRUD notifications fire correctly (test with a custom handler)
- [ ] Cancelable notifications prevent create/update/delete when canceled

---

### Phase 7: Integration Tests

**Goal:** Comprehensive integration test suite covering the full upsell feature end-to-end â€” service CRUD, engine evaluation, trigger matching, filter matching, region filtering, analytics, API endpoints, and background jobs. All tests use the existing integration test infrastructure (xUnit, Shouldly, real database).

**Depends on:** All previous phases (1â€“6).

#### 7.1 UpsellService Integration Tests

**`UpsellServiceTests.cs`** â€” CRUD and query operations against a real database.

| Test | Description |
|------|-------------|
| `CreateAsync_WithValidParameters_CreatesRule` | Creates a rule with all fields and verifies it persists correctly |
| `CreateAsync_WithTriggerAndRecommendationRules_SerializesJsonCorrectly` | Verifies JSON rule columns are correctly serialized and deserialized |
| `CreateAsync_WithFutureStartsAt_SetsStatusToScheduled` | Verifies status is Scheduled when StartsAt is in the future |
| `CreateAsync_WithPastStartsAt_SetsStatusToActive` | Verifies status is Active when StartsAt is in the past |
| `UpdateAsync_UpdatesAllFields` | Updates every field and verifies the changes persist |
| `UpdateAsync_WithNonExistentId_ReturnsFailure` | Returns error for unknown ID |
| `DeleteAsync_RemovesRule` | Deletes a rule and verifies it is gone |
| `DeleteAsync_WithNonExistentId_ReturnsFailure` | Returns error for unknown ID |
| `GetByIdAsync_ReturnsCorrectRule` | Fetches by ID and verifies all fields |
| `GetByIdAsync_WithNonExistentId_ReturnsNull` | Returns null for unknown ID |
| `QueryAsync_FiltersByStatus` | Creates rules with different statuses, queries by status, verifies filtering |
| `QueryAsync_FiltersByDisplayLocation` | Creates rules with different locations, queries by location |
| `QueryAsync_SearchesByName` | Searches by partial name match |
| `QueryAsync_PaginatesCorrectly` | Creates 15 rules, queries page 2 with pageSize 5, verifies 5 results |
| `QueryAsync_OrdersByPriority` | Verifies ordering by priority ascending and descending |
| `QueryAsync_OrdersByDateCreated` | Verifies ordering by date created |
| `ActivateAsync_TransitionsFromDraftToActive` | Activates a Draft rule |
| `ActivateAsync_FromDisabled_TransitionsToActive` | Activates a Disabled rule |
| `DeactivateAsync_TransitionsToDisabled` | Deactivates an Active rule |
| `GetActiveUpsellRulesAsync_ReturnsOnlyActiveRules` | Creates Active, Draft, Disabled rules â€” only Active returned |
| `GetActiveUpsellRulesForLocationAsync_FiltersbyLocation` | Creates rules for different locations, verifies location filtering |

#### 7.2 UpsellTriggerMatcher Integration Tests

**`UpsellTriggerMatcherTests.cs`** â€” Trigger matching logic against real product data.

| Test | Description |
|------|-------------|
| `DoesBasketMatchTriggerRules_ProductTypes_MatchesCorrectly` | Basket with product of matching type returns true |
| `DoesBasketMatchTriggerRules_ProductTypes_NoMatch_ReturnsFalse` | Basket with product of non-matching type returns false |
| `DoesBasketMatchTriggerRules_Collections_MatchesCorrectly` | Basket with product in matching collection returns true |
| `DoesBasketMatchTriggerRules_SpecificProducts_MatchesCorrectly` | Basket with specific product ID match returns true |
| `DoesBasketMatchTriggerRules_Suppliers_MatchesCorrectly` | Basket with product from matching supplier returns true |
| `DoesBasketMatchTriggerRules_ProductFilters_MatchesCorrectly` | Basket with product having matching filter returns true |
| `DoesBasketMatchTriggerRules_MultipleTriggers_AnyMatchReturnsTrue` | Two triggers, only second matches â€” returns true (OR logic) |
| `DoesBasketMatchTriggerRules_EmptyBasket_ReturnsFalse` | Empty basket never matches |
| `DoesBasketMatchTriggerRules_EmptyTriggerIds_ReturnsFalse` | Trigger with no IDs never matches |
| `GetMatchingLineItems_ReturnsOnlyMatchingItems` | Basket with 3 items, 1 matches â€” returns only the matching item |
| `ExtractFilterValues_ExtractsCorrectFilterGroups` | Extracts filter values from matching line items by specified filter group IDs |
| `ExtractFilterValues_MultipleProducts_MergesFilterValues` | Two matching products with different filter values â€” merges into combined set |
| `ExtractFilterValues_NoExtractFilterGroupIds_ReturnsEmpty` | Trigger without ExtractFilterGroupIds returns empty dictionary |

#### 7.3 UpsellEngine Integration Tests

**`UpsellEngineTests.cs`** â€” Full engine evaluation with real database, products, and rules.

| Test | Description |
|------|-------------|
| `GetSuggestionsAsync_SingleRuleMatch_ReturnsSuggestion` | One active rule matches basket â€” returns suggestion with correct heading, message, and products |
| `GetSuggestionsAsync_NoRulesMatch_ReturnsEmptyList` | No rules match basket â€” returns empty list |
| `GetSuggestionsAsync_DisabledRule_NotEvaluated` | Disabled rule is skipped even if triggers would match |
| `GetSuggestionsAsync_ScheduledRule_BeforeStartsAt_NotEvaluated` | Scheduled rule with future StartsAt is skipped |
| `GetSuggestionsAsync_ExpiredRule_NotEvaluated` | Expired rule is skipped |
| `GetSuggestionsAsync_FilterMatching_BedToMattress_MatchesSize` | King Size bed triggers King Size mattress â€” other sizes excluded |
| `GetSuggestionsAsync_FilterMatching_NoExtractGroups_SkipsFiltering` | Trigger without ExtractFilterGroupIds â€” all recommendation products returned |
| `GetSuggestionsAsync_FilterMatching_MultipleGroups_AllMustMatch` | Extract from Size and Colour groups â€” recommended products must match both |
| `GetSuggestionsAsync_FilterMatching_MatchFilterGroupIds_NarrowsToSpecificGroups` | Recommendation rule with MatchFilterGroupIds only matches those groups |
| `GetSuggestionsAsync_SuppressIfInCart_RemovesCartProducts` | Product already in basket is excluded from suggestions |
| `GetSuggestionsAsync_SuppressIfInCart_Disabled_KeepsCartProducts` | SuppressIfInCart=false â€” product in basket still shown |
| `GetSuggestionsAsync_UnavailableProducts_Excluded` | Out-of-stock products excluded from suggestions |
| `GetSuggestionsAsync_SortByPriceLowToHigh_CorrectOrder` | Products sorted by price ascending |
| `GetSuggestionsAsync_SortByPriceHighToLow_CorrectOrder` | Products sorted by price descending |
| `GetSuggestionsAsync_SortByName_CorrectOrder` | Products sorted alphabetically |
| `GetSuggestionsAsync_MaxProducts_TruncatesResults` | MaxProducts=2 â€” only 2 products returned despite 5 matching |
| `GetSuggestionsAsync_MultipleRulesMatch_OrderedByPriority` | 3 rules match â€” returned in priority order (lower number first) |
| `GetSuggestionsAsync_MultipleRulesMatch_RespectMaxSuggestionsPerLocation` | 4 rules match, MaxSuggestionsPerLocation=3 â€” only top 3 by priority returned |
| `GetSuggestionsAsync_CrossRuleProductOverlap_AllowedAcrossGroups` | Same product in 2 rule suggestions â€” appears in both (different heading/message context) |
| `GetSuggestionsAsync_WithinRuleDedup_ByProductRootId` | Two recommendation rules on same upsell both yield same product â€” deduplicated to one |
| `GetSuggestionsAsync_EligibilityAllCustomers_AlwaysMatches` | Eligibility=AllCustomers â€” rule matches regardless of customer |
| `GetSuggestionsAsync_EligibilityCustomerSegments_MatchingSegment` | Customer in matching segment â€” rule evaluates |
| `GetSuggestionsAsync_EligibilityCustomerSegments_NonMatchingSegment` | Customer not in segment â€” rule skipped |
| `GetSuggestionsAsync_EligibilitySpecificCustomers_MatchingCustomer` | Specific customer ID matches â€” rule evaluates |
| `GetSuggestionsAsync_EligibilitySpecificCustomers_NonMatchingCustomer` | Different customer â€” rule skipped |
| `GetSuggestionsAsync_LocationFiltering_BasketRuleNotShownInCheckout` | Rule with DisplayLocation=Basket only â€” not returned for Checkout location |
| `GetSuggestionsForProductAsync_CreatesSyntheticContext` | Product page request creates context with product as if in basket â€” returns relevant suggestions |
| `GetSuggestionsForInvoiceAsync_UsesInvoiceLineItems` | Invoice-based evaluation returns suggestions based on purchased items |

#### 7.4 Region Filtering Integration Tests

**`UpsellRegionFilteringTests.cs`** â€” Region-aware recommendation filtering.

| Test | Description |
|------|-------------|
| `RegionFiltering_WithCountryCode_ExcludesNonServingProducts` | Product with warehouse that doesn't serve GB â€” excluded when CountryCode=GB |
| `RegionFiltering_WithCountryCode_IncludesServingProducts` | Product with warehouse serving GB â€” included when CountryCode=GB |
| `RegionFiltering_WithCountryAndRegionCode_FiltersCorrectly` | Finer-grained region filtering with state/province code |
| `RegionFiltering_NullCountryCode_SkipsFiltering` | CountryCode=null â€” all products returned regardless of warehouse regions |
| `RegionFiltering_MultipleWarehouses_AnyCanServe_ProductIncluded` | Product with 2 warehouses, one serves region â€” product included |

#### 7.5 Caching Integration Tests

**`UpsellCachingTests.cs`** â€” Active rules cache behaviour.

| Test | Description |
|------|-------------|
| `GetActiveRules_CachesOnFirstCall` | First call hits database, second call returns cached result |
| `CreateAsync_InvalidatesCache` | Creating a rule invalidates the active rules cache |
| `UpdateAsync_InvalidatesCache` | Updating a rule invalidates the cache |
| `DeleteAsync_InvalidatesCache` | Deleting a rule invalidates the cache |
| `ActivateAsync_InvalidatesCache` | Activating a rule invalidates the cache |
| `DeactivateAsync_InvalidatesCache` | Deactivating a rule invalidates the cache |

#### 7.6 Analytics Integration Tests

**`UpsellAnalyticsServiceTests.cs`** â€” Event recording and reporting.

| Test | Description |
|------|-------------|
| `RecordImpressionAsync_BuffersEvent` | Impression is buffered and eventually flushed to database |
| `RecordClickAsync_BuffersEvent` | Click event is buffered and flushed |
| `RecordConversionAsync_WritesDirectly` | Conversion event writes immediately (not buffered) |
| `GetPerformanceAsync_ReturnsCorrectMetrics` | Records mixed events, verifies impression/click/conversion counts and rates |
| `GetPerformanceAsync_CalculatesCTR` | 100 impressions, 10 clicks â€” CTR = 10% |
| `GetPerformanceAsync_CalculatesConversionRate` | 100 impressions, 5 conversions â€” ConversionRate = 5% |
| `GetPerformanceAsync_CalculatesTotalRevenue` | 3 conversions with amounts â€” total revenue is sum |
| `GetPerformanceAsync_CalculatesAverageOrderValue` | Revenue / distinct invoices |
| `GetDashboardAsync_AggregatesAcrossAllRules` | Dashboard sums metrics from all active rules |
| `GetDashboardAsync_TopPerformers_OrderedByConversionRate` | Top performers ranked correctly |
| `GetSummaryAsync_ReturnsPerRuleSummary` | Returns aggregated summary per rule |
| `GetPerformanceAsync_EventsByDate_AggregatesCorrectly` | Events on different dates aggregated into daily buckets |

#### 7.7 Conversion Tracking Integration Tests

**`UpsellConversionTrackingTests.cs`** â€” End-to-end conversion attribution flow.

| Test | Description |
|------|-------------|
| `FullConversionFlow_ImpressionToPurchase` | Record impressions in basket ExtendedData â†’ create order â†’ verify conversion events recorded with correct amounts |
| `ConversionHandler_MatchesPurchasedProductsToImpressions` | Basket showed products A, B, C â€” customer buys A and C â€” 2 conversion events recorded |
| `ConversionHandler_NoImpressionData_NoConversionsRecorded` | Order without upsell impression data â€” no conversion events |
| `ConversionHandler_ProductNotPurchased_NoConversionForThatProduct` | Basket showed product A â€” customer buys product D â€” no conversion |
| `ConversionHandler_ConversionAmountMatchesLineItemAmount` | Conversion event amount matches the purchased line item amount |
| `ConversionHandler_MultipleRulesShowedSameProduct_BothGetConversion` | Product shown by 2 different rules â€” both rules get a conversion event |

#### 7.8 Admin API Integration Tests

**`UpsellsApiControllerTests.cs`** â€” API endpoints through the full HTTP pipeline.

| Test | Description |
|------|-------------|
| `GET_Upsells_ReturnsPaginatedList` | Returns paginated list with correct page metadata |
| `GET_Upsells_FilterByStatus_ReturnsFiltered` | Query with status filter returns only matching rules |
| `GET_Upsells_FilterByDisplayLocation_ReturnsFiltered` | Query with location filter returns only matching rules |
| `GET_Upsells_Search_ReturnsMatching` | Search by name returns matching rules |
| `GET_UpsellById_ReturnsDetail` | Returns full detail with resolved rule names |
| `GET_UpsellById_NotFound_Returns404` | Unknown ID returns 404 |
| `POST_Upsells_CreatesAndReturnsDetail` | Creates rule and returns UpsellDetailDto with 201 |
| `POST_Upsells_WithRules_ResolvedNamesPopulated` | Created rule has trigger/recommendation names resolved |
| `POST_Upsells_InvalidPayload_Returns400` | Missing required fields returns 400 |
| `PUT_Upsells_UpdatesAndReturnsDetail` | Updates rule and returns updated detail |
| `PUT_Upsells_NotFound_Returns404` | Unknown ID returns 404 |
| `DELETE_Upsells_Returns204` | Deletes rule and returns 204 |
| `DELETE_Upsells_NotFound_Returns404` | Unknown ID returns 404 |
| `POST_Activate_TransitionsStatus` | Activates rule and returns updated detail |
| `POST_Deactivate_TransitionsStatus` | Deactivates rule and returns updated detail |
| `GET_Performance_ReturnsMetrics` | Returns performance data for a rule with events |
| `GET_Dashboard_ReturnsAggregatedData` | Returns dashboard with summary cards and top performers |
| `POST_Preview_ReturnsSuggestionsForTestBasket` | Preview endpoint evaluates test basket and returns suggestions |

#### 7.9 Storefront API Integration Tests

**`StorefrontUpsellApiTests.cs`** â€” Storefront-facing endpoints.

| Test | Description |
|------|-------------|
| `GET_StorefrontUpsells_ReturnsSuggestionsForBasket` | Returns suggestions based on current basket contents |
| `GET_StorefrontUpsells_EmptyBasket_ReturnsEmptyList` | No basket items â€” no suggestions |
| `GET_StorefrontUpsells_NoActiveRules_ReturnsEmptyList` | No active upsell rules â€” returns empty list |
| `GET_StorefrontUpsells_LocationParameter_FiltersCorrectly` | Basket vs Checkout location returns different results |
| `GET_StorefrontUpsellsForProduct_ReturnsSuggestions` | Product page endpoint returns relevant suggestions |
| `GET_StorefrontUpsellsForProduct_UnknownProduct_ReturnsEmptyList` | Unknown product ID returns empty list |
| `POST_StorefrontUpsellEvents_RecordsImpressions` | Batch impression recording returns 204 |
| `POST_StorefrontUpsellEvents_RecordsClicks` | Click events recorded correctly |
| `POST_StorefrontUpsellEvents_EmptyEvents_Returns204` | Empty events array still returns 204 |

#### 7.10 Background Job Integration Tests

**`UpsellStatusJobTests.cs`** â€” Status transitions and event cleanup.

| Test | Description |
|------|-------------|
| `UpdateExpiredUpsellsAsync_TransitionsActiveToExpired` | Active rule past EndsAt â†’ transitioned to Expired |
| `UpdateExpiredUpsellsAsync_ScheduledToActive_WhenStartsAtReached` | Scheduled rule with past StartsAt â†’ transitioned to Active |
| `UpdateExpiredUpsellsAsync_ActiveWithNoEndsAt_RemainsActive` | Active rule without EndsAt â€” not expired |
| `UpdateExpiredUpsellsAsync_DraftRule_NotTransitioned` | Draft rules are never auto-transitioned |
| `UpdateExpiredUpsellsAsync_DisabledRule_NotTransitioned` | Disabled rules are never auto-transitioned |
| `CleanupOldEventsAsync_DeletesExpiredEvents` | Events older than EventRetentionDays are deleted |
| `CleanupOldEventsAsync_PreservesRecentEvents` | Events within retention period are preserved |

#### 7.11 Notification Integration Tests

**`UpsellNotificationTests.cs`** â€” CRUD notification firing.

| Test | Description |
|------|-------------|
| `CreateAsync_FiresCreatingAndCreatedNotifications` | Both Creating and Created notifications fire in order |
| `CreateAsync_CreatingCanceled_PreventsCreation` | Canceling the Creating notification prevents the rule from being created |
| `UpdateAsync_FiresSavingAndSavedNotifications` | Both Saving and Saved notifications fire |
| `UpdateAsync_SavingCanceled_PreventsUpdate` | Canceling the Saving notification prevents the update |
| `DeleteAsync_FiresDeletingAndDeletedNotifications` | Both Deleting and Deleted notifications fire |
| `DeleteAsync_DeletingCanceled_PreventsDeletion` | Canceling the Deleting notification prevents deletion |
| `ActivateAsync_FiresStatusChangingAndChangedNotifications` | Status change notifications fire on activate |
| `DeactivateAsync_FiresStatusChangingAndChangedNotifications` | Status change notifications fire on deactivate |
| `StatusChangingCanceled_PreventsStatusChange` | Canceling StatusChanging prevents the transition |

#### 7.12 End-to-End Scenario Tests

**`UpsellEndToEndTests.cs`** â€” Full business scenarios combining multiple components.

| Test | Description |
|------|-------------|
| `Scenario_BedToPillows_BasicCrossSell` | Create bedâ†’pillow rule, add bed to basket, verify pillow suggestions returned |
| `Scenario_BedToMattress_FilterMatchedCrossSell` | Create filter-matched rule (Size group), add King Size bed, verify only King Size mattresses suggested |
| `Scenario_MultipleRules_PriorityOrdering` | Create 3 rules with different priorities, verify suggestions ordered correctly |
| `Scenario_MultipleRules_MaxSuggestionsEnforced` | Create 5 rules, MaxSuggestionsPerLocation=3, verify only top 3 returned |
| `Scenario_FullLifecycle_DraftToActiveToExpired` | Create Draft â†’ Activate â†’ wait past EndsAt â†’ verify Expired via status job |
| `Scenario_FullConversionFunnel` | Create rule â†’ show suggestions (impressions) â†’ customer clicks â†’ customer purchases â†’ verify conversion event with revenue |
| `Scenario_EligibilitySegmentRestriction` | Create segment-restricted rule â†’ customer in segment sees suggestions â†’ customer not in segment does not |
| `Scenario_RegionFiltering_UKCustomerSeesUKProducts` | Create rule with products in UK and US warehouses â†’ UK customer only sees UK-shippable products |
| `Scenario_ProductPageSuggestions` | Create rule â†’ visit product page for trigger product â†’ verify relevant suggestions returned |
| `Scenario_EmailEnrichment_OrderConfirmation` | Create email-enabled rule â†’ place order â†’ verify UpsellSuggestions in notification state |
| `Scenario_SuppressIfInCart_DynamicBehaviour` | Add recommended product to cart â†’ verify it disappears from suggestions |
| `Scenario_CacheInvalidation_NewRuleVisibleImmediately` | Active rules cached â†’ create new rule â†’ verify new rule immediately available for evaluation |

#### 7.13 Test Data Builders

**`UpsellTestDataBuilder.cs`** â€” Fluent builder for creating test data.

```csharp
public class UpsellTestDataBuilder
{
    // Creates a complete upsell rule with triggers, recommendations, and products
    public UpsellTestDataBuilder WithTrigger(UpsellTriggerType type, params Guid[] ids);
    public UpsellTestDataBuilder WithRecommendation(UpsellRecommendationType type, params Guid[] ids);
    public UpsellTestDataBuilder WithFilterMatching(Guid[] extractGroupIds, Guid[]? matchGroupIds = null);
    public UpsellTestDataBuilder WithEligibility(UpsellEligibilityType type, params Guid[] ids);
    public UpsellTestDataBuilder WithDisplayLocation(UpsellDisplayLocation location);
    public UpsellTestDataBuilder WithPriority(int priority);
    public UpsellTestDataBuilder WithMaxProducts(int max);
    public UpsellTestDataBuilder WithSortBy(UpsellSortBy sortBy);
    public UpsellTestDataBuilder WithSchedule(DateTime startsAt, DateTime? endsAt = null);
    public UpsellTestDataBuilder WithStatus(UpsellStatus status);
    public Task<UpsellRule> BuildAsync(IUpsellService service);
}
```

**`UpsellContextBuilder.cs`** â€” Fluent builder for creating test contexts.

```csharp
public class UpsellContextBuilder
{
    public UpsellContextBuilder WithLineItem(Guid productId, Guid productRootId, Guid? productTypeId = null);
    public UpsellContextBuilder WithLineItemFilters(Guid productId, Dictionary<Guid, List<Guid>> filtersByGroup);
    public UpsellContextBuilder WithCustomer(Guid customerId, List<Guid>? segmentIds = null);
    public UpsellContextBuilder WithLocation(UpsellDisplayLocation location);
    public UpsellContextBuilder WithRegion(string countryCode, string? regionCode = null);
    public UpsellContext Build();
}
```

#### 7.14 Test File Structure

```
tests/Merchello.Tests.Integration/Upsells/
â”œâ”€â”€ UpsellServiceTests.cs
â”œâ”€â”€ UpsellTriggerMatcherTests.cs
â”œâ”€â”€ UpsellEngineTests.cs
â”œâ”€â”€ UpsellRegionFilteringTests.cs
â”œâ”€â”€ UpsellCachingTests.cs
â”œâ”€â”€ UpsellAnalyticsServiceTests.cs
â”œâ”€â”€ UpsellConversionTrackingTests.cs
â”œâ”€â”€ UpsellsApiControllerTests.cs
â”œâ”€â”€ StorefrontUpsellApiTests.cs
â”œâ”€â”€ UpsellStatusJobTests.cs
â”œâ”€â”€ UpsellNotificationTests.cs
â”œâ”€â”€ UpsellEndToEndTests.cs
â””â”€â”€ Builders/
    â”œâ”€â”€ UpsellTestDataBuilder.cs
    â””â”€â”€ UpsellContextBuilder.cs
```

#### Phase 7 â€” Verification

- [ ] All UpsellService CRUD tests pass (create, read, update, delete, query, activate, deactivate)
- [ ] All UpsellTriggerMatcher tests pass (all 5 trigger types, OR logic, filter extraction)
- [ ] All UpsellEngine tests pass (full evaluation pipeline including filter matching, region filtering, eligibility, sorting, deduplication)
- [ ] All region filtering tests pass (include/exclude by warehouse, null country code handling)
- [ ] All caching tests pass (cache population and invalidation on all CRUD operations)
- [ ] All analytics tests pass (event recording, metric calculations, dashboard aggregation)
- [ ] All conversion tracking tests pass (full funnel from impression to purchase)
- [ ] All admin API tests pass (HTTP pipeline, status codes, response shapes)
- [ ] All storefront API tests pass (basket suggestions, product page suggestions, event recording)
- [ ] All background job tests pass (status transitions, event cleanup)
- [ ] All notification tests pass (CRUD notifications fire, cancelable notifications prevent operations)
- [ ] All end-to-end scenario tests pass (complete business workflows)
- [ ] Test coverage covers all trigger types: ProductTypes, ProductFilters, Collections, SpecificProducts, Suppliers
- [ ] Test coverage covers all display locations: Checkout, Basket, ProductPage, Email
- [ ] Test coverage covers all sort modes: BestSeller, PriceLowToHigh, PriceHighToLow, Name, DateAdded, Random
- [ ] Test coverage covers all checkout modes: Inline, Interstitial, PostPurchase

---

### Phase 8: Post-Purchase Upsells

**Goal:** Enable one-click post-purchase upsells that charge a saved payment method. Customers see upsell offers immediately after payment completes, and can add items with a single click using their already-saved payment method.

**Depends on:** Phase 5 (storefront integration), Phase 6 (analytics), **VaultedPayments feature** (must be implemented first).

**Prerequisites:** The VaultedPayments feature provides all necessary payment infrastructure:

- `SavedPaymentMethod` model and `merchelloSavedPaymentMethods` database table
- `ISavedPaymentMethodService` for saved payment method management and charging
- `IPaymentProvider.SupportsVaultedPayments` capability flag
- `IPaymentProvider.ChargeVaultedMethodAsync()` for off-session charging
- Save-during-checkout flow via `ProcessPaymentRequest.SavePaymentMethod`

---

#### 8.1 Vaulted Payments Integration

**No new payment models required.** The `SavedPaymentMethod` entity from VaultedPayments is used directly:

```csharp
// From VaultedPayments â€” Payments/Models/SavedPaymentMethod.cs
public class SavedPaymentMethod
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string ProviderAlias { get; set; }       // "stripe", "braintree", "paypal"
    public string ProviderMethodId { get; set; }    // Provider token
    public string? ProviderCustomerId { get; set; } // Provider customer ID
    public SavedPaymentMethodType MethodType { get; set; }
    public string? CardBrand { get; set; }
    public string? Last4 { get; set; }
    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }
    public bool IsDefault { get; set; }
    public bool IsVerified { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateLastUsed { get; set; }
}
```

**Reference:** See `VaultedPayments.md` for complete model and service documentation.

---

#### 8.2 Payment Provider Capabilities

**No additional provider changes required.** The VaultedPayments feature provides all necessary capabilities:

| Provider | SupportsVaultedPayments | Off-Session Charging |
|----------|-------------------------|----------------------|
| Stripe | Yes | PaymentIntent with `off_session: true` |
| Braintree | Yes | Transaction.Sale with vault token |
| PayPal | Yes | Order with vault payment token |
| Manual | No | Not supported |

**Important:** Availability is **capability + configuration**. Post-purchase must check:
- `provider.Metadata.SupportsVaultedPayments == true`
- `provider.Setting.IsVaultingEnabled == true`
- customer is authenticated (saved methods are customer-bound)

**Key service method for post-purchase:**

```csharp
// From VaultedPayments â€” ISavedPaymentMethodService
Task<CrudResult<PaymentResult>> ChargeAsync(
    ChargeSavedMethodParameters parameters,
    CancellationToken ct = default);
```

---

#### 8.3 Post-Purchase Flow

**Important timing note:** `PaymentCreatedNotification` fires inside `PaymentService` **before**
`CheckoutPaymentsApiController` saves a vaulted method (`SaveFromCheckoutAsync`).
That means post-purchase gating **cannot** rely solely on `PaymentCreatedNotification` if you
need the freshly-saved method.

**Recommended flow (aligned to actual checkout code):**

1. `CheckoutPaymentsApiController.ProcessPayment` / `ProcessSavedPayment` completes payment.
2. If a saved method exists (or was just saved), call `IPostPurchaseUpsellService.InitializePostPurchaseAsync(...)`
   with `InvoiceId`, `ProviderAlias` (payment provider alias), and optional `SavedPaymentMethodId`.
   - Validates provider vaulting + `IsVaultingEnabled`
   - Validates customer + saved method (not expired)
   - Evaluates PostPurchase upsell rules
   - If eligible: sets all orders to `OnHold` and persists window state on `Invoice.ExtendedData`
     (e.g., `PostPurchaseEligible`, `PostPurchaseWindowStartUtc`, `PostPurchaseWindowEndsUtc`).
3. Controller sets `RedirectUrl` to `/checkout/post-purchase/{invoiceId}` when eligible; otherwise
   `/checkout/confirmation/{invoiceId}`.
4. Post-purchase page loads offers via `PostPurchaseUpsellController`.
5. On add success / skip / timeout, service releases hold and redirects to confirmation.

**Optional handler:** A `PaymentPostPurchaseHandler` can still be useful for non-checkout flows
(webhooks, API-created payments), but it **must not** rely on `notification.State` for redirecting.

---
#### 8.4 Multi-Currency Handling

Post-purchase upsell items **MUST** use the invoice's locked exchange rate to ensure consistency with the original order.

**The Rule:** All prices use `Invoice.PricingExchangeRate` — the rate locked at order creation.

**Why?**
1. **Consistency** — Customer sees same exchange rate as their original order
2. **Transparency** — No "surprise" price changes between payment and upsell
3. **Audit Trail** — All items on invoice use same rate for accounting

**Guardrail:** `InvoiceEditService.EditInvoiceAsync` **refuses** to edit multi-currency invoices without a locked rate.
Post-purchase should surface this as a clear error and skip upsells.

**Price Calculation:**

```csharp
// Guard: multi-currency invoices require a locked rate
if (!string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase) &&
    (!invoice.PricingExchangeRate.HasValue || invoice.PricingExchangeRate.Value <= 0m))
{
    return Error("Cannot edit a multi-currency invoice without a locked exchange rate.");
}

var lockedRate = invoice.PricingExchangeRate ?? 1m;
var presentmentCurrency = invoice.CurrencyCode;
var storeCurrencyPrice = product.Price; // store currency

// Convert to presentment currency using LOCKED rate (same as InvoiceService)
var presentmentPrice = currencyService.ConvertToPresentmentCurrency(
    storeCurrencyPrice,
    lockedRate,
    presentmentCurrency);

// Line item amounts are stored in presentment currency.
lineItem.Amount = presentmentPrice;
// AmountInStoreCurrency is set via ApplyPricingRateToStoreAmounts after the edit.
```

**Implementation note:** `InvoiceEditService` currently uses `product.Price` directly when
building virtual line items and when calculating tax for new items. For multi-currency
invoices, update `BuildGroupingForNewItemsAsync` and `AddProductLineItemAsync` to use the
converted `presentmentPrice` (based on `invoice.PricingExchangeRate`) instead of store currency.

**Exchange Rate Direction Clarification:**

Post-purchase uses DIVISION (not multiplication) because it's a payment/checkout context:

| Context | Method | Formula | Use For |
|---------|--------|---------|---------|
| UI Display | `GetDisplayAmounts()` | `storeCurrencyPrice × exchangeRate` | Product pages, cart display |
| Checkout/Payment | `ConvertToPresentmentCurrency()` | `storeCurrencyPrice ÷ exchangeRate` | Invoice creation, post-purchase |

This is the same conversion pattern used when the original invoice was created via
`InvoiceService.CreateOrderFromBasketAsync()`. The rate is stored as "presentment → store",
so dividing gives the customer's payable amount.

**Display note:** For post-purchase UI in **invoice currency**, do **not** apply exchange rate again
(ExchangeRate = 1). If the customer switches display currency after purchase, follow the
conversion logic in `MerchelloCheckoutController` confirmation rendering.

---
#### 8.4.1 Order Modification Pattern (Use InvoiceEditService)

Post-purchase upsells should reuse `IInvoiceEditService` to keep grouping, tax, stock, and totals
consistent with checkout.

**Why:** `InvoiceEditService` already:
- Enforces editability (no shipped/completed orders)
- Reserves stock and validates availability
- Calculates tax via `ITaxProviderManager` (external providers) and uses stored line-item tax rates
- Recalculates invoice totals incl. shipping tax and `RatesIncludeTax` handling
- Requires `PricingExchangeRate` for multi-currency invoices

**Order assignment rules (actual code):**
- There is **no** `Order.GroupId`. Matching is by `WarehouseId` + `ShippingOptionId` (flat-rate).
- Dynamic providers use `ShippingOptionId = Guid.Empty` and store `ShippingProviderKey` +
  `ShippingServiceCode` on the order.
- Default strategy is `DefaultOrderGroupingStrategy` (key `default-warehouse`);
  override via `MerchelloSettings.OrderGroupingStrategy`.

**Implementation pattern:**

1. Build shipping deltas per affected order (Section 8.6).
2. Call `IInvoiceEditService.PreviewInvoiceEditAsync` for UI preview (optional).
3. Call `EditInvoiceAsync` with products + shipping updates:

```csharp
var editResult = await invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
{
    InvoiceId = invoice.Id,
    Request = new EditInvoiceDto
    {
        ProductsToAdd =
        [
            new AddProductToOrderDto
            {
                ProductId = productId,
                Quantity = 1,
                WarehouseId = warehouseId,
                ShippingOptionId = shippingOptionId
            }
        ],
        OrderShippingUpdates = shippingUpdates,
        EditReason = "Post-purchase upsell"
    },
    AuthorId = customerId,
    AuthorName = "PostPurchase"
}, ct);
```

**Dynamic shipping support gap:** `AddProductToOrderDto` currently only supports flat-rate
`ShippingOptionId`. For carrier/dynamic selections, extend the DTO to accept a `SelectionKey`
or `(ProviderKey, ServiceCode)` and update `BuildGroupingForNewItemsAsync` to use
`SelectionKeyExtensions.ForDynamicProvider(...)`.

---
#### 8.5 Tax & Price Display

**Tax Calculation (post-purchase):**
Use the same provider path as `InvoiceEditService` to avoid mismatches with checkout.
Prefer the active tax provider; fall back to `ITaxService` only when no provider is active.

```csharp
var taxRate = 0m;
if (product.ProductRoot?.TaxGroupId is Guid taxGroupId && invoice.ShippingAddress != null)
{
    var provider = await taxProviderManager.GetActiveProviderAsync(ct);
    if (provider != null)
    {
        var taxRequest = new TaxCalculationRequest
        {
            ShippingAddress = invoice.ShippingAddress,
            CurrencyCode = invoice.CurrencyCode,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = product.Sku ?? $"PROD-{product.Id:N}"[..20],
                    Name = product.Name ?? product.ProductRoot?.RootName ?? "Product",
                    Amount = presentmentPrice,
                    Quantity = 1,
                    TaxGroupId = taxGroupId
                }
            ]
        };

        var taxResult = await provider.Provider.CalculateOrderTaxAsync(taxRequest, ct);
        taxRate = taxResult.LineResults.FirstOrDefault()?.TaxRate ?? 0m;
    }
    else
    {
        taxRate = await taxService.GetApplicableRateAsync(
            taxGroupId,
            invoice.ShippingAddress.CountryCode ?? string.Empty,
            invoice.ShippingAddress.CountyState?.RegionCode,
            ct);
    }
}

var taxAmount = currencyService.Round(
    presentmentPrice * (taxRate / 100m),
    invoice.CurrencyCode);
```

**Shipping tax (separate from product tax):**
- Use `ITaxProviderManager.GetShippingTaxConfigurationAsync()` to resolve shipping tax behavior.
- If `Mode = FixedRate`, use the returned `Rate`.
- If `Mode = Proportional` or `Mode = ProviderCalculated`, use `invoice.EffectiveShippingTaxRate`.
- Exclude shipping amounts from providers where `RatesIncludeTax = true`
  (see `InvoiceEditService.GetTaxableShippingTotalAsync`).

**Price Display:**

Follows global `MerchelloSettings.DisplayPricesIncTax` for consistency with checkout:

- **If `DisplayPricesIncTax = true`:** show prices inclusive of tax (e.g., "£29.99 inc VAT")
- **If `DisplayPricesIncTax = false`:** show net prices with tax breakdown

For **post-purchase**, amounts are already in **invoice currency** — set `ExchangeRate = 1`.
For **pre-purchase** (basket/checkout) suggestions, use `StorefrontContextService.GetDisplayContextAsync`
and the `DisplayCurrencyExtensions` / `DisplayPriceExtensions` helpers.

**UpsellProductDto Tax-Inclusive Display (post-purchase):**

```csharp
var displayContext = new StorefrontDisplayContext(
    CurrencyCode: invoice.CurrencyCode,
    CurrencySymbol: invoice.CurrencySymbol,
    DecimalPlaces: currencyService.GetDecimalPlaces(invoice.CurrencyCode),
    ExchangeRate: 1m, // already in presentment currency
    StoreCurrencyCode: settings.StoreCurrencyCode,
    DisplayPricesIncTax: settings.DisplayPricesIncTax,
    TaxCountryCode: invoice.ShippingAddress?.CountryCode ?? "",
    TaxRegionCode: invoice.ShippingAddress?.RegionCode
);

var displayPrice = presentmentPrice;

if (displayContext.DisplayPricesIncTax && product.IsTaxable && taxRate > 0)
{
    displayPrice *= 1 + (taxRate / 100m);
}

displayPrice = currencyService.Round(displayPrice, displayContext.CurrencyCode);

var upsellProduct = new UpsellProductDto
{
    ProductId = product.Id,
    Price = displayPrice,
    FormattedPrice = currencyService.FormatAmount(displayPrice, displayContext.CurrencyCode),
    PriceIncludesTax = displayContext.DisplayPricesIncTax && product.IsTaxable && taxRate > 0,
    TaxRate = taxRate,
    TaxAmount = displayContext.DisplayPricesIncTax ? null : taxAmount
};
```

---
#### 8.6 Shipping Cost Recalculation

Shipping delta must mirror checkout + invoice recalculation logic.

**Order assignment source of truth:** Use `IInvoiceEditService` grouping (WarehouseId + ShippingOptionId).
For dynamic providers, the order uses `ShippingOptionId = Guid.Empty` with
`ShippingProviderKey` + `ShippingServiceCode` on the order.

**Delta calculation flow:**

1. Build packages from existing order line items + upsell item (use `Product.PackageConfigurations`).
2. Re-quote shipping:
   - **Dynamic providers:** `IShippingQuoteService.GetQuotesForWarehouseAsync(...)`
   - **Flat-rate:** `IShippingCostResolver.ResolveBaseCost(...)` (or recompute from `ShippingOption`)
3. Determine original baseline:
   - Use `Order.QuotedShippingCost` when available (dynamic providers)
   - Otherwise use `Order.ShippingCost` or recompute base cost from `ShippingOption`
     (note: `ShippingCost` may be 0 if free shipping discount applied)
4. Delta = `max(0, newBaseCost - originalBaseCost)`
5. Convert delta to presentment currency using the locked exchange rate
6. Pass updated shipping costs via `EditInvoiceAsync` (`OrderShippingUpdates`)

**Tax implications:**
- Shipping tax rate is **separate** from product tax. Use
  `ITaxProviderManager.GetShippingTaxConfigurationAsync()` and apply mode semantics.
- If provider metadata `RatesIncludeTax = true`, treat its shipping amounts as tax-inclusive
  and exclude from taxable shipping (handled in `InvoiceEditService.GetTaxableShippingTotalAsync`).

**Edge Cases:**

| Scenario | Behavior |
|----------|----------|
| Shipping cost decreases | Charge $0 delta (no refund for shipping) |
| Different warehouse required | Create new order with full shipping cost |
| Original shipping was free (discount) | Maintain free shipping or recalc based on new total |

---
#### 8.7 Backend Implementation

**IPostPurchaseUpsellService** â€” `Upsells/Services/Interfaces/IPostPurchaseUpsellService.cs`

```csharp
public interface IPostPurchaseUpsellService
{
    /// <summary>
    /// Initialize post-purchase window after a successful checkout payment.
    /// Sets invoice hold + window metadata and returns eligibility.
    /// </summary>
    Task<OperationResult<bool>> InitializePostPurchaseAsync(
        InitializePostPurchaseParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Get available post-purchase upsell suggestions for an invoice.
    /// </summary>
    Task<PostPurchaseUpsellsDto?> GetAvailableUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default);

    /// <summary>
    /// Preview adding a post-purchase item (calculate price, tax, shipping without committing).
    /// </summary>
    Task<PostPurchasePreviewDto?> PreviewAddToOrderAsync(
        PreviewPostPurchaseParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Add a post-purchase upsell item to an existing order.
    /// Charges the customer's saved payment method and updates the invoice.
    /// </summary>
    Task<OperationResult<PostPurchaseResultDto>> AddToOrderAsync(
        AddPostPurchaseUpsellParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Skip post-purchase upsells and release fulfillment hold.
    /// </summary>
    Task<OperationResult<bool>> SkipUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default);

    /// <summary>
    /// Check if post-purchase window is still valid for an invoice.
    /// </summary>
    Task<bool> IsPostPurchaseWindowValidAsync(
        Guid invoiceId,
        CancellationToken ct = default);
}
```

**Service Parameters:**

```csharp
// AddPostPurchaseUpsellParameters.cs
public class AddPostPurchaseUpsellParameters
{
    public required Guid InvoiceId { get; init; }
    public required Guid ProductId { get; init; }
    public int Quantity { get; init; } = 1;
    public required Guid UpsellRuleId { get; init; }
    public required Guid SavedPaymentMethodId { get; init; }
    public string? IdempotencyKey { get; init; }
    public List<OrderAddonDto>? Addons { get; init; }
}

// InitializePostPurchaseParameters.cs
public class InitializePostPurchaseParameters
{
    public required Guid InvoiceId { get; init; }
    public required string ProviderAlias { get; init; }
    public Guid? SavedPaymentMethodId { get; init; }
}

// PreviewPostPurchaseParameters.cs
public class PreviewPostPurchaseParameters
{
    public required Guid InvoiceId { get; init; }
    public required Guid ProductId { get; init; }
    public int Quantity { get; init; } = 1;
    public List<OrderAddonDto>? Addons { get; init; }
}
```

**AddToOrderAsync sequence (critical for correctness):**

1. Validate post-purchase window + saved method (use `InitializePostPurchaseAsync` state).
2. Preview totals via `IInvoiceEditService.PreviewInvoiceEditAsync` (product + tax + shipping delta).
3. Charge saved method with `ISavedPaymentMethodService.ChargeAsync` (pass `IdempotencyKey` if provided).
4. **Record the payment** with `IPaymentService.RecordPaymentAsync` (use provider transaction ID; set
   `Description = "Post-purchase upsell"` so notification handlers can ignore these payments).
5. Apply invoice changes via `IInvoiceEditService.EditInvoiceAsync`.
6. If edit fails after charge, **log critical** and surface a support message (consider refund/manual correction).

**Important:** `ISavedPaymentMethodService.ChargeAsync` does **not** create a `Payment` record.
You must explicitly record it to keep invoice payment status accurate.

**DTOs:**

```csharp
// PostPurchaseUpsellsDto.cs
public class PostPurchaseUpsellsDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public List<UpsellSuggestionDto> Suggestions { get; set; } = [];
    public StorefrontSavedMethodDto? SavedPaymentMethod { get; set; }
    public int TimeRemainingSeconds { get; set; }
    public bool WindowExpired { get; set; }
}

// PostPurchasePreviewDto.cs
public class PostPurchasePreviewDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }

    // Amounts in presentment (customer) currency
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ShippingDelta { get; set; }
    public decimal Total { get; set; }

    // Store currency equivalents (for reporting/reconciliation)
    public decimal UnitPriceInStoreCurrency { get; set; }
    public decimal SubTotalInStoreCurrency { get; set; }
    public decimal TotalInStoreCurrency { get; set; }

    // Formatted for display
    public string FormattedUnitPrice { get; set; } = string.Empty;
    public string FormattedSubTotal { get; set; } = string.Empty;
    public string FormattedTaxAmount { get; set; } = string.Empty;
    public string FormattedShippingDelta { get; set; } = string.Empty;
    public string FormattedTotal { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;

    // Tax-inclusive display (follows MerchelloSettings.DisplayPricesIncTax)
    public bool PriceIncludesTax { get; set; }
    public string? TaxLabel { get; set; }  // "inc VAT", "plus tax", etc.
    public decimal TaxRate { get; set; }   // Tax rate percentage applied

    // Validation
    public bool IsAvailable { get; set; }
    public string? UnavailableReason { get; set; }
}

// PostPurchaseResultDto.cs
public class PostPurchaseResultDto
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? PaymentTransactionId { get; set; }
    public decimal AmountCharged { get; set; }
    public string FormattedAmountCharged { get; set; } = string.Empty;
    public Guid? AddedLineItemId { get; set; }
}
```

**Optional notification handler (non-checkout flows only):**

Use this for webhooks/API-created payments. **Do not** use it for checkout redirects
(see the controller flow in Section 8.3).

```csharp
[NotificationHandlerPriority(1900)]
public class PaymentPostPurchaseHandler(
    IPostPurchaseUpsellService postPurchaseUpsellService,
    IPaymentProviderManager paymentProviderManager,
    IOptions<UpsellSettings> upsellSettings)
    : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        if (!upsellSettings.Value.EnablePostPurchase)
            return;

        var payment = notification.Payment;

        if (payment.PaymentType != PaymentType.Payment || !payment.PaymentSuccess)
            return;

        // Avoid re-triggering for post-purchase upsell charges
        if (string.Equals(payment.Description, "Post-purchase upsell", StringComparison.OrdinalIgnoreCase))
            return;

        if (string.IsNullOrWhiteSpace(payment.PaymentProviderAlias))
            return;

        var provider = await paymentProviderManager.GetProviderAsync(
            payment.PaymentProviderAlias, requireEnabled: false, ct);

        if (provider?.Metadata.SupportsVaultedPayments != true ||
            provider.Setting?.IsVaultingEnabled != true)
        {
            return;
        }

        await postPurchaseUpsellService.InitializePostPurchaseAsync(
            new InitializePostPurchaseParameters
            {
                InvoiceId = payment.InvoiceId,
                ProviderAlias = payment.PaymentProviderAlias
            }, ct);
    }
}
```

---

#### 8.8 Frontend Implementation

**post-purchase.element.ts** â€” Lit component for post-purchase page

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PostPurchaseUpsellsResponse, UpsellProduct, PostPurchaseResult } from "./types.js";

@customElement("merchello-post-purchase")
export class PostPurchaseElement extends LitElement {
    @property({ type: String }) invoiceId = "";

    @state() private _loading = true;
    @state() private _data: PostPurchaseUpsellsResponse | null = null;
    @state() private _processing = false;
    @state() private _error: string | null = null;
    @state() private _success: PostPurchaseResult | null = null;
    @state() private _timeRemaining = 0;

    private _timerInterval?: number;
    private _idempotencyKeys = new Map<string, string>();

    async connectedCallback(): Promise<void> {
        super.connectedCallback();
        await this._loadUpsells();
        this._startTimer();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this._stopTimer();
    }

    private async _loadUpsells(): Promise<void> {
        try {
            const response = await fetch(
                `/api/merchello/checkout/post-purchase/${this.invoiceId}`
            );
            if (!response.ok) throw new Error("Failed to load");

            this._data = await response.json();
            this._timeRemaining = this._data?.timeRemainingSeconds ?? 0;

            if (this._data?.windowExpired) {
                this._redirectToConfirmation();
            }
        } catch (error) {
            this._error = error instanceof Error ? error.message : "Unknown error";
        } finally {
            this._loading = false;
        }
    }

    private _startTimer(): void {
        this._timerInterval = window.setInterval(() => {
            this._timeRemaining--;
            if (this._timeRemaining <= 0) {
                this._stopTimer();
                this._handleSkip();
            }
        }, 1000);
    }

    private async _handleAddToOrder(product: UpsellProduct, ruleId: string): Promise<void> {
        if (this._processing || !this._data?.savedPaymentMethod) return;

        this._processing = true;
        this._error = null;
        this._stopTimer();

        try {
            const idempotencyKey = this._idempotencyKeys.get(product.productId) ?? crypto.randomUUID();
            this._idempotencyKeys.set(product.productId, idempotencyKey);

            const response = await fetch(
                `/api/merchello/checkout/post-purchase/${this.invoiceId}/add`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: product.productId,
                        quantity: 1,
                        upsellRuleId: ruleId,
                        savedPaymentMethodId: this._data.savedPaymentMethod.id,
                        idempotencyKey
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to add item");
            }

            this._success = await response.json();
            this._idempotencyKeys.delete(product.productId);
            setTimeout(() => this._redirectToConfirmation(), 2000);

        } catch (error) {
            this._error = error instanceof Error ? error.message : "Payment failed";
            this._startTimer();
        } finally {
            this._processing = false;
        }
    }

    private async _handleSkip(): Promise<void> {
        this._stopTimer();
        try {
            await fetch(
                `/api/merchello/checkout/post-purchase/${this.invoiceId}/skip`,
                { method: "POST" }
            );
        } catch { /* Continue anyway */ }
        this._redirectToConfirmation();
    }

    private _redirectToConfirmation(): void {
        window.location.href = `/checkout/confirmation/${this.invoiceId}`;
    }

    render() {
        if (this._loading) return html`<div class="loading">Loading...</div>`;

        if (this._success) {
            return html`
                <div class="success-message">
                    <div class="success-icon">âœ“</div>
                    <h2>Added to your order!</h2>
                    <p>${this._success.formattedAmountCharged} charged successfully</p>
                </div>
            `;
        }

        return html`
            <div class="post-purchase-container">
                <div class="header">
                    <div class="success-badge">âœ“ Payment Successful!</div>
                    <h1>Complete Your Order</h1>
                </div>

                <div class="timer">
                    Auto-redirect in ${Math.floor(this._timeRemaining / 60)}:${(this._timeRemaining % 60).toString().padStart(2, "0")}
                </div>

                ${this._error ? html`<div class="error">${this._error}</div>` : ""}

                ${this._data?.suggestions.map(suggestion => html`
                    <div class="suggestion-group">
                        <h2>${suggestion.heading}</h2>
                        ${suggestion.message ? html`<p>${suggestion.message}</p>` : ""}

                        <div class="products">
                            ${suggestion.products.map(product => html`
                                <div class="product-card">
                                    ${product.imageUrl ? html`<img src="${product.imageUrl}" alt="${product.name}">` : ""}
                                    <div class="product-info">
                                        <h3>${product.name}</h3>
                                        <div class="price">${product.formattedPrice}</div>
                                    </div>
                                    <button
                                        class="add-button"
                                        ?disabled=${this._processing || !product.availableForPurchase}
                                        @click=${() => this._handleAddToOrder(product, suggestion.upsellRuleId)}
                                    >
                                        ${this._processing ? "Processing..." : "Add to Order"}
                                        <span class="one-click">One-click</span>
                                    </button>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}

                <div class="payment-method">
                    Paying with: ${this._data?.savedPaymentMethod?.displayLabel}
                </div>

                <button class="skip-button" @click=${this._handleSkip}>
                    No Thanks, Show My Order Confirmation
                </button>
            </div>
        `;
    }
}
```

---

#### 8.9 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/merchello/checkout/post-purchase/{invoiceId}` | Get available post-purchase upsells |
| `POST` | `/api/merchello/checkout/post-purchase/{invoiceId}/preview` | Preview price calculation |
| `POST` | `/api/merchello/checkout/post-purchase/{invoiceId}/add` | Add item and charge saved method |
| `POST` | `/api/merchello/checkout/post-purchase/{invoiceId}/skip` | Skip upsells and release hold |

**Controller:**

```csharp
[Route("api/merchello/checkout/post-purchase")]
[ApiController]
public class PostPurchaseUpsellController(
    IPostPurchaseUpsellService postPurchaseService) : ControllerBase
{
    [HttpGet("{invoiceId:guid}")]
    public async Task<ActionResult<PostPurchaseUpsellsDto>> GetUpsells(
        Guid invoiceId, CancellationToken ct)
    {
        var result = await postPurchaseService.GetAvailableUpsellsAsync(invoiceId, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("{invoiceId:guid}/preview")]
    public async Task<ActionResult<PostPurchasePreviewDto>> Preview(
        Guid invoiceId, [FromBody] PreviewPostPurchaseDto request, CancellationToken ct)
    {
        var result = await postPurchaseService.PreviewAddToOrderAsync(
            new PreviewPostPurchaseParameters
            {
                InvoiceId = invoiceId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Addons = request.Addons
            }, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("{invoiceId:guid}/add")]
    public async Task<ActionResult<PostPurchaseResultDto>> AddToOrder(
        Guid invoiceId, [FromBody] AddPostPurchaseUpsellDto request, CancellationToken ct)
    {
        var result = await postPurchaseService.AddToOrderAsync(
            new AddPostPurchaseUpsellParameters
            {
                InvoiceId = invoiceId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                UpsellRuleId = request.UpsellRuleId,
                SavedPaymentMethodId = request.SavedPaymentMethodId,
                IdempotencyKey = request.IdempotencyKey,
                Addons = request.Addons
            }, ct);

        return result.Success ? Ok(result.Value) : BadRequest(result.ErrorMessage);
    }

    [HttpPost("{invoiceId:guid}/skip")]
    public async Task<ActionResult> Skip(Guid invoiceId, CancellationToken ct)
    {
        var result = await postPurchaseService.SkipUpsellsAsync(invoiceId, ct);
        return result.Success ? NoContent() : BadRequest(result.ErrorMessage);
    }
}
```

---

#### 8.10 Edge Case Handling

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| **Payment method expired** | Check `ExpiryMonth/ExpiryYear` | Show message, disable one-click, offer skip |
| **Stock unavailable** | `InventoryService.ValidateStockAvailabilityAsync()` | Remove product from suggestions |
| **Payment fails (declined)** | `ChargeAsync()` returns failure | Show error, allow retry or skip |
| **Payment fails (auth required)** | Stripe `authentication_required` error | Show message, offer skip |
| **Timer expires** | Client-side countdown | Auto-call `/skip`, redirect |
| **Window expires (server)** | Check `PostPurchaseWindowStartUtc` | Return `windowExpired: true` |
| **Provider doesn't support vaulting** | `IPaymentProvider.SupportsVaultedPayments = false` | Skip post-purchase flow entirely |
| **No saved payment method** | Check in `InitializePostPurchaseAsync` / controller | Skip post-purchase flow entirely |
| **Guest checkout** | No `CustomerId` on invoice | Skip post-purchase flow entirely |
| **Invoice edit fails after payment** | `EditInvoiceAsync()` returns failure | Log critical error, show support message |
| **Network error** | Fetch throws | Show retry option, pause timer |
| **Multiple tabs** | Idempotency key check | Second request fails gracefully |

---

#### 8.11 Fulfillment Hold

During the post-purchase window, orders are placed "On Hold" to prevent premature shipping:

- **Set hold:** When `InitializePostPurchaseAsync` marks the invoice eligible
- **Release hold when:**
  - Customer clicks "No Thanks"
  - Timer expires (configurable, default 60 seconds)
  - Customer completes post-purchase upsell
  - Post-purchase window expires (server-side, default 5 minutes)
- **If payment for upsell fails:** Show error, allow retry or skip, hold remains until decision made

---

#### 8.12 Settings

Add to `UpsellSettings`:

```csharp
/// <summary>
/// Whether to enable post-purchase upsells.
/// Requires at least one payment provider with SupportsVaultedPayments = true.
/// </summary>
public bool EnablePostPurchase { get; set; } = true;

/// <summary>
/// Timeout in seconds before auto-redirecting from post-purchase page to confirmation.
/// Default: 60 seconds (0 = no auto-redirect)
/// </summary>
public int PostPurchaseTimeoutSeconds { get; set; } = 60;

/// <summary>
/// Maximum duration in minutes for the post-purchase window.
/// After this time, the post-purchase page will redirect to confirmation.
/// Default: 5 minutes
/// </summary>
public int PostPurchaseFulfillmentHoldMinutes { get; set; } = 5;
```

**appsettings.json:**

```json
{
  "Merchello": {
    "Upsells": {
      "Enabled": true,
      "MaxSuggestionsPerLocation": 3,
      "CacheDurationSeconds": 300,
      "EventRetentionDays": 90,
      "EnablePostPurchase": true,
      "PostPurchaseTimeoutSeconds": 60,
      "PostPurchaseFulfillmentHoldMinutes": 5
    }
  }
}
```

---

#### 8.13 PostPurchaseUpsellService Integration Tests

**`PostPurchaseUpsellServiceTests.cs`** â€” Service layer tests.

| Test | Description |
|------|-------------|
| `InitializePostPurchaseAsync_Eligible_SetsHoldAndWindow` | Sets OrderStatus=OnHold and writes window metadata on invoice |
| `InitializePostPurchaseAsync_SkipsWhenProviderNotVaulting` | Non-vaulting provider returns false and does not set hold |
| `GetAvailableUpsellsAsync_ReturnsMatchingPostPurchaseRules` | Only rules with CheckoutMode=PostPurchase returned |
| `GetAvailableUpsellsAsync_ExpiredWindow_ReturnsWindowExpired` | Invoice past PostPurchaseFulfillmentHoldMinutes returns windowExpired=true |
| `GetAvailableUpsellsAsync_NoSavedMethod_ReturnsNull` | Invoice without saved payment method returns null |
| `GetAvailableUpsellsAsync_NonVaultingProvider_ReturnsNull` | Invoice paid via non-vaulting provider (bank transfer) returns null |
| `GetAvailableUpsellsAsync_GuestCheckout_ReturnsNull` | Invoice without CustomerId returns null |
| `GetAvailableUpsellsAsync_IncludesSavedMethodDetails` | Response includes masked card info, expiry, brand |
| `GetAvailableUpsellsAsync_CalculatesTimeRemaining` | Response includes correct timeRemainingSeconds |
| `PreviewAddToOrderAsync_CalculatesCorrectTotals` | Preview returns product price, tax, shipping delta, total |
| `PreviewAddToOrderAsync_MultiCurrency_UsesLockedExchangeRate` | Price converted using invoice's locked PricingExchangeRate |
| `PreviewAddToOrderAsync_TaxCalculation_UsesShippingAddress` | Tax calculated using invoice's shipping address location |
| `PreviewAddToOrderAsync_ShippingDelta_CalculatesCorrectly` | Re-quotes shipping and calculates delta from QuotedShippingCost |
| `PreviewAddToOrderAsync_ShippingDelta_ZeroWhenDecreases` | Returns 0 delta when new shipping < original (no refund) |
| `PreviewAddToOrderAsync_ProductOutOfStock_ReturnsUnavailable` | Out-of-stock product returns availableForPurchase=false |

---

#### 8.14 Invoice Recalculation Integration Tests

**`PostPurchaseInvoiceRecalculationTests.cs`** â€” Invoice and order total recalculation.

| Test | Description |
|------|-------------|
| `AddToOrderAsync_RecalculatesOrderTotals_Correctly` | Order SubTotal, Tax, Total updated after adding line item |
| `AddToOrderAsync_RecalculatesInvoiceTotals_Correctly` | Invoice SubTotal, Tax, Shipping, Total updated |
| `AddToOrderAsync_UpdatesInStoreCurrencyFields` | SubTotalInStoreCurrency, TotalInStoreCurrency updated for reporting |
| `AddToOrderAsync_SameWarehouse_AddsToExistingOrder` | Item from same warehouse added to existing order |
| `AddToOrderAsync_DifferentWarehouse_CreatesNewOrder` | Item from different warehouse creates new order on invoice |
| `AddToOrderAsync_NewOrder_CalculatesFullShipping` | New order gets full shipping quote (not delta) |
| `AddToOrderAsync_ExistingOrder_AddsShippingDelta` | Existing order shipping increased by delta only |
| `AddToOrderAsync_CalculateFromLineItems_CalledCorrectly` | Verifies ILineItemService.CalculateFromLineItems invoked |
| `AddToOrderAsync_MultipleItems_RecalculatesEachTime` | Adding 2 items recalculates correctly after each |
| `AddToOrderAsync_WithDiscount_MaintainsDiscountOnInvoice` | Invoice.Discount preserved after adding upsell |
| `AddToOrderAsync_TaxRate_MatchesOriginalOrderTaxRate` | New line item uses same tax rate as original order |
| `AddToOrderAsync_LineItemAmount_InStoreCurrency` | Line item amounts stored in store currency |

---

#### 8.15 Extra Payment Integration Tests

**`PostPurchasePaymentTests.cs`** â€” Vaulted payment charging.

| Test | Description |
|------|-------------|
| `AddToOrderAsync_ChargesCorrectAmount` | Charges product + tax + shipping delta |
| `AddToOrderAsync_ChargesInPresentmentCurrency` | Charge amount in customer's currency (not store currency) |
| `AddToOrderAsync_CreatesPaymentRecord` | Payment record created linked to invoice |
| `AddToOrderAsync_PaymentRecord_HasCorrectAmount` | Payment amount matches charged amount |
| `AddToOrderAsync_PaymentRecord_ProviderAliasMatches` | Payment provider alias matches saved method provider |
| `AddToOrderAsync_IdempotencyKey_PreventsDuplicateCharges` | Same idempotency key returns existing result |
| `AddToOrderAsync_IdempotencyKey_DifferentKeyAllowsNewCharge` | Different key allows new charge |
| `AddToOrderAsync_PaymentFailed_ReturnsError` | Failed charge returns error message |
| `AddToOrderAsync_PaymentFailed_NoInvoiceChanges` | Failed charge doesn't modify invoice |
| `AddToOrderAsync_PaymentFailed_AuthRequired_ReturnsSpecificError` | Stripe auth_required returns specific message |
| `AddToOrderAsync_ExpiredCard_ReturnsExpiredError` | Expired saved method returns expiry error |
| `AddToOrderAsync_SuccessfulPayment_RecordsConversionEvent` | Conversion analytics event recorded |

---

#### 8.16 Shipping Delta Calculation Integration Tests

**`PostPurchaseShippingDeltaTests.cs`** â€” Shipping recalculation scenarios.

| Test | Description |
|------|-------------|
| `ShippingDelta_FlatRate_WeightIncrease_SameTier` | Weight increase within tier = $0 delta |
| `ShippingDelta_FlatRate_WeightIncrease_NextTier` | Weight crosses to next tier = tier difference delta |
| `ShippingDelta_DynamicProvider_ReQuotesFromCarrier` | FedEx/UPS re-quoted with new package dimensions |
| `ShippingDelta_DynamicProvider_UsesWarehouseMarkup` | Delta includes warehouse provider markup |
| `ShippingDelta_FreeShippingDiscount_MaintainsFree` | Original free shipping (discount) stays free |
| `ShippingDelta_FreeShippingThreshold_RecalculatesIfBelow` | If upsell pushes below threshold, shipping applies |
| `ShippingDelta_MultipleOrders_CalculatesPerOrder` | Each order's shipping calculated independently |
| `ShippingDelta_NewWarehouse_FullShippingNotDelta` | New order = full shipping quote |
| `ShippingDelta_CachedFallbackRate_UsesCache` | Carrier API failure uses cached fallback rate |
| `ShippingDelta_ConvertsToPresentmentCurrency` | Delta converted using locked exchange rate |

---

#### 8.17 Multi-Currency Integration Tests

**`PostPurchaseMultiCurrencyTests.cs`** â€” Currency conversion scenarios.

| Test | Description |
|------|-------------|
| `MultiCurrency_ProductPrice_ConvertedFromStoreCurrency` | Product price / lockedRate = presentment price |
| `MultiCurrency_TaxAmount_CalculatedInPresentmentCurrency` | Tax calculated on presentment price |
| `MultiCurrency_ShippingDelta_ConvertedToPresentment` | Shipping delta in customer's currency |
| `MultiCurrency_TotalCharge_SumOfConvertedAmounts` | Total = price + tax + shipping (all in presentment) |
| `MultiCurrency_LineItem_StoredInStoreCurrency` | Line item Amount in store currency for reporting |
| `MultiCurrency_Payment_InPresentmentCurrency` | Stripe charge in customer's currency |
| `MultiCurrency_RoundingApplied_CorrectDecimalPlaces` | Amounts rounded per currency decimal places |
| `MultiCurrency_ExchangeRateLocked_NotRefetched` | Uses invoice's locked rate, not current rate |
| `MultiCurrency_EUR_TwoDecimalPlaces` | EUR amounts have 2 decimal places |
| `MultiCurrency_JPY_ZeroDecimalPlaces` | JPY amounts have 0 decimal places |

---

#### 8.18 Fulfillment Hold Integration Tests

**`PostPurchaseFulfillmentHoldTests.cs`** â€” Order hold/release flow.

| Test | Description |
|------|-------------|
| `InitializePostPurchase_SetsOrderOnHold` | Order status = OnHold when entering post-purchase |
| `SkipUpsellsAsync_ReleasesHold` | Skip sets order status back to processing |
| `AddToOrderAsync_Success_ReleasesHold` | Successful upsell releases hold |
| `AddToOrderAsync_Failure_MaintainsHold` | Failed payment keeps order on hold |
| `WindowExpiry_ReleasesHold` | Background job releases hold after window expires |
| `HoldDuration_RespectsConfiguration` | Uses PostPurchaseFulfillmentHoldMinutes setting |
| `MultipleOrders_AllSetOnHold` | All orders on invoice set to OnHold |
| `MultipleOrders_AllReleasedTogether` | All orders released when exiting post-purchase |

---

#### 8.19 Edge Case Integration Tests

**`PostPurchaseEdgeCaseTests.cs`** â€” Error handling and edge cases.

| Test | Description |
|------|-------------|
| `ExpiredPaymentMethod_DetectedInGetUpsells` | Expired card flagged in savedPaymentMethod response |
| `ExpiredPaymentMethod_ChargeAttempt_Fails` | Attempt to charge expired card returns error |
| `StockUnavailable_DetectedInGetUpsells` | Out-of-stock products marked unavailableForPurchase |
| `StockUnavailable_AddAttempt_Fails` | Attempt to add out-of-stock returns error |
| `InvoiceEditFailure_AfterPayment_LogsCritical` | Failed invoice edit after successful payment logs critical |
| `InvoiceEditFailure_AfterPayment_ReturnsPartialSuccess` | Returns success=true but with warning |
| `ConcurrentAddAttempts_IdempotencyPrevents` | Rapid double-click prevented by idempotency |
| `NetworkTimeout_PaymentProvider_ReturnsTimeout` | Provider timeout returns appropriate error |
| `WindowExpired_AddAttempt_ReturnsExpired` | Add after window expiry returns windowExpired error |
| `ProviderDoesntSupportVaulting_SkipsPostPurchase` | Bank transfer invoice skips post-purchase entirely |

---

#### 8.20 End-to-End Post-Purchase Scenario Tests

**`PostPurchaseEndToEndTests.cs`** â€” Full flow scenarios.

| Test | Description |
|------|-------------|
| `Scenario_FullPostPurchaseFlow_SingleItem` | Complete flow: payment â†’ hold â†’ get upsells â†’ add item â†’ charge â†’ release |
| `Scenario_FullPostPurchaseFlow_MultipleItems` | Add 2 items sequentially, each recalculates correctly |
| `Scenario_FullPostPurchaseFlow_WithVariant` | Add variant product, correct variant charged |
| `Scenario_SkipPostPurchase_ReleasesAndRedirects` | Skip flow: payment â†’ hold â†’ skip â†’ release â†’ confirmation |
| `Scenario_TimerExpiry_AutoSkips` | Timer expires â†’ auto-skip â†’ release â†’ confirmation |
| `Scenario_PaymentDeclined_RetrySucceeds` | First charge fails â†’ user retries â†’ second succeeds |
| `Scenario_DifferentWarehouse_CreatesSecondOrder` | Upsell from different warehouse creates new order |
| `Scenario_MultiCurrency_GBP_To_EUR` | UK store, EUR customer, all amounts correct |
| `Scenario_FreeShippingMaintained` | Original free shipping maintained after upsell |
| `Scenario_ConversionTracking_RecordsCorrectly` | Conversion event has correct amount and attribution |
| `Scenario_EmailUpdated_AfterUpsell` | Order confirmation email reflects added items |

---

#### 8.21 Test Data Builders for Phase 8

**`PostPurchaseTestDataBuilder.cs`**

```csharp
public class PostPurchaseTestDataBuilder
{
    public PostPurchaseTestDataBuilder WithInvoice(Action<Invoice> configure);
    public PostPurchaseTestDataBuilder WithSavedPaymentMethod(string providerAlias, string last4);
    public PostPurchaseTestDataBuilder WithExpiredPaymentMethod();
    public PostPurchaseTestDataBuilder WithPostPurchaseRule(Action<UpsellRule> configure);
    public PostPurchaseTestDataBuilder WithUpsellProduct(Guid productId, decimal price);
    public PostPurchaseTestDataBuilder WithMultiCurrency(string presentmentCurrency, decimal exchangeRate);
    public PostPurchaseTestDataBuilder WithFreeShipping();
    public PostPurchaseTestDataBuilder WithMultipleWarehouses();
    public Task<PostPurchaseTestContext> BuildAsync();
}

public record PostPurchaseTestContext(
    Invoice Invoice,
    SavedPaymentMethod? SavedMethod,
    List<UpsellRule> Rules,
    Dictionary<Guid, Product> Products
);
```

---

#### 8.22 Phase 8 Test File Structure

```
tests/Merchello.Tests.Integration/Upsells/PostPurchase/
â”œâ”€â”€ PostPurchaseUpsellServiceTests.cs
â”œâ”€â”€ PostPurchaseInvoiceRecalculationTests.cs
â”œâ”€â”€ PostPurchasePaymentTests.cs
â”œâ”€â”€ PostPurchaseShippingDeltaTests.cs
â”œâ”€â”€ PostPurchaseMultiCurrencyTests.cs
â”œâ”€â”€ PostPurchaseFulfillmentHoldTests.cs
â”œâ”€â”€ PostPurchaseEdgeCaseTests.cs
â”œâ”€â”€ PostPurchaseEndToEndTests.cs
â””â”€â”€ Builders/
    â””â”€â”€ PostPurchaseTestDataBuilder.cs
```

---

#### Phase 8 â€” Verification

**Prerequisites:**
- [ ] VaultedPayments feature is fully implemented and tested
- [ ] At least one payment provider has `SupportsVaultedPayments = true`
- [ ] `ISavedPaymentMethodService.ChargeAsync()` works correctly

**Service Layer:**
- [ ] `IPostPurchaseUpsellService` interface implemented
- [ ] `PostPurchaseUpsellService` handles all flows correctly
- [ ] `CheckoutPaymentsApiController` calls `InitializePostPurchaseAsync` after `SaveFromCheckout`
- [ ] `InitializePostPurchaseAsync` skips when provider doesn't support vaulting or vaulting is disabled
- [ ] Optional: `PaymentPostPurchaseHandler` (if used) ignores post-purchase charges to avoid loops
- [ ] Multi-currency calculations use invoice's locked exchange rate
- [ ] Tax calculations use customer's shipping address location
- [ ] Shipping delta calculated correctly (re-quoted via provider)

**API & Controller:**
- [ ] All endpoints return correct responses
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Idempotency prevents duplicate charges

**Frontend:**
- [ ] Post-purchase page loads and displays products
- [ ] Timer counts down and auto-redirects
- [ ] "Add to Order" button charges and shows success
- [ ] "No Thanks" button releases hold and redirects
- [ ] Error states display correctly with retry/skip options
- [ ] Expired payment method shows appropriate message

**Fulfillment:**
- [ ] Orders set to `OnHold` when entering post-purchase flow
- [ ] Hold released on successful upsell addition
- [ ] Hold released on skip
- [ ] Hold released on timer/window expiry

**Analytics:**
- [ ] Conversion events recorded with correct amounts
- [ ] Attribution links to correct upsell rule

**Edge Cases:**
- [ ] Non-vaulting provider (bank transfer, COD) skips post-purchase entirely
- [ ] Expired card handled gracefully
- [ ] Stock unavailable handled gracefully
- [ ] Payment declined handled gracefully
- [ ] Invoice edit failure after payment logged for manual review
- [ ] Guest checkout skips post-purchase entirely
- [ ] Multiple tabs don't cause duplicate charges

**Email:**
- [ ] Updated order confirmation email sent after post-purchase addition
- [ ] Email reflects new total and added items

---

## File Structure Summary

### Backend (C#)

```
src/Merchello.Core/Upsells/
â”œâ”€â”€ Dtos/
â”‚   â”œâ”€â”€ UpsellListItemDto.cs
â”‚   â”œâ”€â”€ UpsellDetailDto.cs
â”‚   â”œâ”€â”€ UpsellPageDto.cs
â”‚   â”œâ”€â”€ UpsellTriggerRuleDto.cs
â”‚   â”œâ”€â”€ UpsellRecommendationRuleDto.cs
â”‚   â”œâ”€â”€ UpsellEligibilityRuleDto.cs
â”‚   â”œâ”€â”€ CreateUpsellDto.cs
â”‚   â”œâ”€â”€ UpdateUpsellDto.cs
â”‚   â”œâ”€â”€ CreateUpsellTriggerRuleDto.cs
â”‚   â”œâ”€â”€ CreateUpsellRecommendationRuleDto.cs
â”‚   â”œâ”€â”€ CreateUpsellEligibilityRuleDto.cs
â”‚   â”œâ”€â”€ UpsellSuggestionDto.cs
â”‚   â”œâ”€â”€ UpsellProductDto.cs
â”‚   â”œâ”€â”€ RecordUpsellEventDto.cs
â”‚   â”œâ”€â”€ RecordUpsellEventsDto.cs
â”‚   â”œâ”€â”€ UpsellPerformanceDto.cs
â”‚   â”œâ”€â”€ UpsellSummaryDto.cs
â”‚   â”œâ”€â”€ UpsellDashboardDto.cs
â”‚   â””â”€â”€ UpsellEventsByDateDto.cs
â”œâ”€â”€ Factories/
â”‚   â””â”€â”€ UpsellFactory.cs
â”œâ”€â”€ Mapping/
â”‚   â”œâ”€â”€ UpsellRuleDbMapping.cs
â”‚   â””â”€â”€ UpsellEventDbMapping.cs
â”œâ”€â”€ Models/
â”‚   â”œâ”€â”€ UpsellRule.cs
â”‚   â”œâ”€â”€ UpsellTriggerRule.cs
â”‚   â”œâ”€â”€ UpsellRecommendationRule.cs
â”‚   â”œâ”€â”€ UpsellEligibilityRule.cs
â”‚   â”œâ”€â”€ UpsellEvent.cs
â”‚   â”œâ”€â”€ UpsellStatus.cs
â”‚   â”œâ”€â”€ UpsellSortBy.cs
â”‚   â”œâ”€â”€ UpsellDisplayLocation.cs
â”‚   â”œâ”€â”€ UpsellTriggerType.cs
â”‚   â”œâ”€â”€ UpsellRecommendationType.cs
â”‚   â”œâ”€â”€ UpsellEligibilityType.cs
â”‚   â”œâ”€â”€ UpsellEventType.cs
â”‚   â”œâ”€â”€ UpsellContext.cs
â”‚   â”œâ”€â”€ UpsellContextLineItem.cs
â”‚   â”œâ”€â”€ UpsellSuggestion.cs
â”‚   â”œâ”€â”€ UpsellProduct.cs
â”‚   â””â”€â”€ UpsellSettings.cs
â”œâ”€â”€ Extensions/
â”‚   â””â”€â”€ UpsellExtensions.cs
â”œâ”€â”€ Notifications/
â”‚   â”œâ”€â”€ UpsellRuleCreatingNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleCreatedNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleSavingNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleSavedNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleDeletingNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleDeletedNotification.cs
â”‚   â”œâ”€â”€ UpsellRuleStatusChangingNotification.cs
â”‚   â””â”€â”€ UpsellRuleStatusChangedNotification.cs
â””â”€â”€ Services/
    â”œâ”€â”€ UpsellService.cs
    â”œâ”€â”€ UpsellEngine.cs
    â”œâ”€â”€ UpsellAnalyticsService.cs
    â”œâ”€â”€ UpsellTriggerMatcher.cs
    â”œâ”€â”€ UpsellRuleNameResolver.cs
    â”œâ”€â”€ UpsellStatusJob.cs
    â”œâ”€â”€ UpsellConversionHandler.cs
    â”œâ”€â”€ UpsellEmailEnrichmentHandler.cs
    â”œâ”€â”€ Interfaces/
    â”‚   â”œâ”€â”€ IUpsellService.cs
    â”‚   â”œâ”€â”€ IUpsellEngine.cs
    â”‚   â”œâ”€â”€ IUpsellAnalyticsService.cs
    â”‚   â””â”€â”€ IUpsellRuleNameResolver.cs
    â””â”€â”€ Parameters/
        â”œâ”€â”€ CreateUpsellParameters.cs
        â”œâ”€â”€ UpdateUpsellParameters.cs
        â”œâ”€â”€ CreateUpsellTriggerRuleParameters.cs
        â”œâ”€â”€ CreateUpsellRecommendationRuleParameters.cs
        â”œâ”€â”€ CreateUpsellEligibilityRuleParameters.cs
        â”œâ”€â”€ UpsellQueryParameters.cs
        â”œâ”€â”€ UpsellOrderBy.cs
        â”œâ”€â”€ RecordUpsellEventParameters.cs
        â”œâ”€â”€ RecordUpsellConversionParameters.cs
        â”œâ”€â”€ GetUpsellPerformanceParameters.cs
        â”œâ”€â”€ UpsellReportParameters.cs
        â””â”€â”€ UpsellDashboardParameters.cs

src/Merchello/Controllers/
â”œâ”€â”€ UpsellsApiController.cs              # Admin API
â”œâ”€â”€ PostPurchaseUpsellController.cs      # Post-purchase storefront API (Phase 8)

src/Merchello/App_Plugins/Merchello/Views/Emails/Shared/
â””â”€â”€ _UpsellSuggestions.cshtml            # Reusable MJML partial

# Phase 8 Additions (Post-Purchase)
src/Merchello.Core/Upsells/
â”œâ”€â”€ Dtos/
â”‚   â”œâ”€â”€ PostPurchaseUpsellsDto.cs        # Available upsells for post-purchase
â”‚   â”œâ”€â”€ PostPurchasePreviewDto.cs        # Preview with shipping/tax breakdown
â”‚   â””â”€â”€ PostPurchaseResultDto.cs         # Result after adding to order
â”œâ”€â”€ Services/
â”‚   â”œâ”€â”€ PostPurchaseUpsellService.cs     # Core post-purchase logic
â”‚   â”œâ”€â”€ PaymentPostPurchaseHandler.cs    # Optional notification handler (non-checkout flows)
â”‚   â”œâ”€â”€ Interfaces/
â”‚   â”‚   â””â”€â”€ IPostPurchaseUpsellService.cs
â”‚   â””â”€â”€ Parameters/
â”‚       â”œâ”€â”€ InitializePostPurchaseParameters.cs
â”‚       â”œâ”€â”€ PreviewPostPurchaseParameters.cs
â”‚       â””â”€â”€ AddPostPurchaseUpsellParameters.cs
```

### Frontend (TypeScript/Lit)

```
src/Merchello/Client/src/upsells/
â”œâ”€â”€ manifest.ts
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ upsells-list.element.ts
â”‚   â”œâ”€â”€ upsell-detail.element.ts
â”‚   â”œâ”€â”€ upsell-performance.element.ts
â”‚   â”œâ”€â”€ upsell-dashboard.element.ts
â”‚   â”œâ”€â”€ trigger-rule-builder.element.ts
â”‚   â”œâ”€â”€ recommendation-rule-builder.element.ts
â”‚   â””â”€â”€ eligibility-rule-builder.element.ts
â”œâ”€â”€ contexts/
â”‚   â””â”€â”€ upsells-workspace.context.ts
â”œâ”€â”€ modals/
â”‚   â”œâ”€â”€ create-upsell-modal.element.ts
â”‚   â””â”€â”€ create-upsell-modal.token.ts
â””â”€â”€ types/
    â””â”€â”€ upsell.types.ts

# Phase 8 Additions (Post-Purchase Storefront)
src/YourStorefront/                      # Your storefront project
â””â”€â”€ post-purchase/
    â”œâ”€â”€ post-purchase.element.ts         # Main post-purchase upsell component
    â””â”€â”€ post-purchase.types.ts           # TypeScript types for post-purchase
```

### Modifications to Existing Files

| File | Change | Phase |
|------|--------|-------|
| `MerchelloDbContext.cs` | Add `DbSet<UpsellRule>` and `DbSet<UpsellEvent>` | 1 |
| `Startup.cs` | Register upsell services/background job + analytics singleton; register `IPostPurchaseUpsellService` and optional `PaymentPostPurchaseHandler` | 2, 6, 8 |
| `Constants.cs` | Add `MerchelloUpsellImpressions` extended data key | 5 |
| `tree-data-source.ts` | Add upsells child under Products, set Products `hasChildren: true` | 4 |
| `tree.types.ts` | Add `MERCHELLO_UPSELLS_ENTITY_TYPE` | 4 |
| `tree/manifest.ts` | Add `"merchello-upsells"` to `forEntityTypes` | 4 |
| `bundle.manifests.ts` | Import and spread upsells manifest | 4 |
| `StorefrontApiController.cs` | Add upsell storefront endpoints (or create separate `StorefrontUpsellController`) | 5 |
| `CheckoutPaymentsApiController.cs` | After payment + `SaveFromCheckout`, call `InitializePostPurchaseAsync` and set redirect URL | 8 |
| `InvoiceEditService.cs` | Convert product prices using locked exchange rate for multi-currency edits; apply dynamic shipping selection if extended | 8 |
| `SelectionKeyExtensions.cs` / `AddProductToOrderDto` | Optional: support dynamic shipping selections for post-purchase edits | 8 |
| `checkout/services/api.js` | Add `getBasket` helper (optional) for upsell basket refresh | 5 |
| `single-page-checkout.js` | Add upsell add-to-cart flow; refresh basket; recalc shipping; reinit payment | 5 |
| `merchello-api.ts` | Add upsell API methods | 3 |
| `navigation.ts` | Add upsell navigation helpers | 4 |
| `MerchelloCheckoutController.cs` | Add post-purchase page route if using integrated checkout UI | 8 |
| `Order.cs` | No changes - uses existing `Status` property for fulfillment hold | 8 |

---

## Configuration

### appsettings.json

```json
{
  "Merchello": {
    "Upsells": {
      "Enabled": true,
      "MaxSuggestionsPerLocation": 3,
      "CacheDurationSeconds": 300,
      "EventRetentionDays": 90
    }
  }
}
```








