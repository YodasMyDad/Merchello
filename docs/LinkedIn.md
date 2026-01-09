# LinkedIn Post: 2026 - The Year Merchello Is Reborn

---

## POST CONTENT (Copy from here)

---

Some of you might remember Merchello - the ecommerce package for Umbraco that I was part of with Rusty. It was widely adopted in the Umbraco v7 era, but development stopped when v8 came along (Long story but completely my fault).

I've spent 20+ years building and running ecommerce stores, and I'm using that experience to rebuild Merchello from the ground up for Umbraco v17+. It's a complete reimagining - only the name stays the same.

I'm knee deep in this and actively developing features which are landing daily. MVP targeted for end of January, with live stores running on it by end of February, then 🤷🏼‍♂️

**What does it look like so far?**

🛒 **Shopify-Quality Checkout**
Single-page checkout with guest support, express payments (Apple Pay, Google Pay, PayPal), and mobile-first design.

📧 **Email System**
Configure 13+ notification types in the backoffice. MJML compiler and Razor helpers built in.

🔄 **Abandoned Cart Recovery**
Automatic detection with recovery sequence. Track recovery rates and revenue recovered.

📦 **Multi-Warehouse Inventory**
Stock tracking, reservation, and allocation across multiple warehouses. Service regions define where each warehouse can ship. Shipment status workflow from preparing through to delivered.

🏷️ **Advanced Discounts**
Four discount types: amount off products, buy X get Y, amount off order, and free shipping. Target by collection, customer segment, supplier, or warehouse. Set usage limits, scheduling, and combination rules.

👥 **Customers & Accounts**
Customers can link directly to Umbraco Members. Track balances, order history, and lifetime value. Build segments with automated rules (spend thresholds, order counts, geography) or manually curate them. Use segments for discount targeting and marketing.

💳 **Payments**
Stripe, Braintree, PayPal, and manual payments built in (Easy to roll your own). Express checkout (Apple Pay, Google Pay), refunds with audit trail, webhook confirmation.

🚚 **Shipping**
UPS, FedEx, and flat-rate providers built in (Easy to roll your own). State, country, and universal rate configuration. Weight-tier pricing. Service regions per warehouse.

🔗 **Webhooks**
23+ webhook topics to push data to Klaviyo, Mailchimp, or whatever marketing stack you're already using.

📊 **Reporting**
Sales dashboard, best sellers, discount performance analytics, and abandoned cart funnel tracking.

🔧 **Built for Developers**
100+ notification points throughout the system. Hook into any event - orders, payments, shipments, inventory, customers - and add your own logic.

🧩 **Products**
Products integrate with Umbraco's document types. Add custom content fields to your products using the same patterns you use everywhere else in Umbraco. Product description uses the built in tip tap editor, ready for blocks etc...

💰 **Tax**
Avalara and manual tax providers built in (Can roll your own). Geographic rates with country and state-level configuration.

Will update more when I'm actually using it properly. 

---

## END OF POST CONTENT

---

## Suggested Screenshots (Choose 10-15)

1. **Checkout Page** - The single-page checkout showing address, shipping options, and payment in one view. Demonstrates the Shopify-quality UX.

2. **Email Builder Workspace** - The backoffice email configuration interface showing notification topics, template selection, and preview capability.

3. **Order Detail View** - Full order management screen with timeline, line items, addresses, and action buttons (fulfil, refund, cancel).

4. **Product Editor - Multi-Variant** - Product editing interface showing variant table, options configuration, and pricing.

5. **Discount Editor** - The discount configuration modal showing targeting options (collections, segments, warehouses) and eligibility rules.

6. **Customer Segment Builder** - Automated segment criteria interface showing rule configuration (spend > X, orders > Y, location).

7. **Shipment Status Management** - Shipments view showing status workflow (Preparing > Shipped > Delivered) with tracking info.

8. **Dashboard/Analytics** - Sales overview with key metrics, charts, and month-over-month comparisons.

9. **Warehouse Configuration** - Warehouse list with service regions and stock levels.

10. **Payment Providers List** - Multi-provider configuration showing Stripe, PayPal, Braintree options.

11. **Shipping Options Configuration** - Rate configuration interface with country/state rules and weight tiers.

12. **Abandoned Cart List** - Recovery tracking showing abandoned checkouts, status, and recovery actions.

13. **Webhooks Configuration** - Webhook subscriptions list with topics, endpoints, and delivery status.

14. **Tax Configuration** - Tax groups and geographic rates interface.

15. **Product Collections** - Collection management showing products grouped into collections.

---

## Notes

- Post length is within LinkedIn's 3,000 character limit for expanded posts
- Emojis used sparingly as visual anchors for each feature section
- Feature list is scannable with bold headers
- Ends with a soft call-to-action (star the repo)
- Tone is direct and credible, not salesy
