# Merchello Documentation

Enterprise ecommerce NuGet package for Umbraco v17+. **Ethos: making enterprise ecommerce simple.**

---

## 1. Getting Started

### 1.1 Introduction
Introduce Merchello as an enterprise ecommerce NuGet package for Umbraco v17+ with the ethos of making enterprise ecommerce simple. Cover the modular, pluggable architecture and key features.

### 1.2 Installation
Guide through NuGet installation, Umbraco v17+ requirements, database setup (SQL Server/SQLite), and initial appsettings.json configuration.

### 1.3 Quick Start Guide
Walk through creating a first product, setting up a warehouse, configuring shipping/payment, and building a simple checkout flow.

### 1.4 Configuration Reference
Document all MerchelloSettings options including currency, ProductElementTypeAlias, ProductViewLocations, and other configuration keys.

---

## 2. Architecture & Core Concepts

### 2.1 Architecture Overview
Explain the three-layer architecture (Controllers → Services → Factories), design principles, and feature folder structure.

### 2.2 Services
Document the service pattern conventions including DbContext usage, CrudResult<T> pattern, async/await with CancellationToken, and RORO parameters.

### 2.3 Factories
Explain why all domain objects are created via factories (thread safety, consistency) and list all 21+ factories with what they create.

### 2.4 Notifications & Events
Cover INotificationAsyncHandler<T> pattern, priority-based execution with NotificationHandlerPriorityAttribute (100=validation, 500=modification, 1000=default, 2000=external sync), and before events that can cancel operations.

### 2.5 Available Notifications
Document all hookable events by domain:

**Product Events:** ProductCreating, ProductCreated, ProductSaving, ProductSaved, ProductDeleting, ProductDeleted, ProductOptionCreating, ProductOptionCreated, ProductOptionDeleting, ProductOptionDeleted

**Customer Events:** CustomerCreating, CustomerCreated, CustomerSaving, CustomerSaved, CustomerDeleting, CustomerDeleted

**Customer Segment Events:** CustomerSegmentCreating, CustomerSegmentCreated, CustomerSegmentSaving, CustomerSegmentSaved, CustomerSegmentDeleting, CustomerSegmentDeleted

**Discount Events:** DiscountCreating, DiscountCreated, DiscountSaving, DiscountSaved, DiscountDeleting, DiscountDeleted, DiscountStatusChanging, DiscountStatusChanged

**Invoice Events:** InvoiceSaving, InvoiceSaved, InvoiceDeleting, InvoiceDeleted, InvoiceCancelling, InvoiceCancelled, InvoiceAggregateChangedNotification (fires on any Invoice/child change)

**Order Events:** OrderCreating, OrderCreated, OrderSaving, OrderSaved, OrderStatusChanging, OrderStatusChanged

**Payment Events:** PaymentCreating, PaymentCreated, PaymentRefunding, PaymentRefunded

**Shipment Events:** ShipmentCreating, ShipmentCreated, ShipmentSaving, ShipmentSaved

**Inventory Events:** StockReserving, StockReserved, StockReleasing, StockReleased, StockAllocating, StockAllocated, StockAdjusted, LowStockNotification

**Warehouse Events:** WarehouseCreating, WarehouseCreated, WarehouseSaving, WarehouseSaved, WarehouseDeleting, WarehouseDeleted

**Supplier Events:** SupplierCreating, SupplierCreated, SupplierSaving, SupplierSaved, SupplierDeleting, SupplierDeleted

**Shipping Option Events:** ShippingOptionCreating, ShippingOptionCreated, ShippingOptionSaving, ShippingOptionSaved, ShippingOptionDeleting, ShippingOptionDeleted

**Tax Events:** TaxGroupCreating, TaxGroupCreated, TaxGroupSaving, TaxGroupSaved, TaxGroupDeleting, TaxGroupDeleted

**Basket Events:** BasketItemAdding, BasketItemAdded, BasketItemRemoving, BasketItemRemoved, BasketItemQuantityChanging, BasketItemQuantityChanged, BasketClearing, BasketCleared

**Checkout Events:** DiscountCodeApplying, DiscountCodeApplied, DiscountCodeRemoved

**Other Events:** OrderGroupingNotification, OrderGroupingModifyingNotification, ExchangeRatesRefreshedNotification, ExchangeRateFetchFailedNotification

### 2.6 Extension Points
Explain ExtensionManager assembly scanning, auto-discovery pattern, and provider registration for shipping, payment, exchange rates, and order grouping.

---

## 3. Products

### 3.1 Product Model
Explain the ProductRoot (parent) vs Product (variant) relationship, key properties, and entity hierarchy.

### 3.2 Product Options
Cover variant options (IsVariant=true) that generate variants vs add-on options (IsVariant=false) with PriceAdjustment, CostAdjustment, and SkuSuffix.

### 3.3 Product Types
Document ProductType entity for categorizing products and how to filter/query by type.

### 3.4 Collections
Explain ProductCollection for categorizing ProductRoots with many-to-many relationships and collection-based filtering.

### 3.5 Filters & Filter Groups
Document the product filtering system including FilterGroups, ProductFilter values with HexColour and Image properties.

### 3.6 Product Images
Explain RootImages vs variant Images, ExcludeRootProductImages flag, and image resolution patterns in views.

### 3.7 Package Configurations
Cover DefaultPackageConfigurations on ProductRoot inherited by variants, with variant-level PackageConfigurations override and HsCode for customs.

### 3.8 Digital Products
Document IsDigitalProduct flag, automatic disabling of stock tracking, and handling non-physical products.

---

## 4. Product Rendering & Views

### 4.1 ViewAlias System
Explain how ViewAlias on ProductRoot maps to ~/Views/Products/{ViewAlias}.cshtml and the view discovery service.

### 4.2 Custom Product Properties
Document ProductElementTypeAlias configuration for adding Umbraco Element Type properties to products, stored as JSON in ElementPropertyData.

### 4.3 MerchelloPublishedElementFactory
Explain how the factory converts stored JSON property data to IPublishedElement with full Umbraco property value converter integration.

### 4.4 ProductRoot Extensions
Document Value<T>(), HasValue(), and GetPublishedElement() extension methods for accessing Umbraco properties from ProductRoot in code and templates.

### 4.5 MerchelloProductViewModel
Cover the view model structure including ProductRoot, SelectedVariant, AllVariants, VariantOptions, AddOnOptions, and IContentModel implementation.

### 4.6 Product Routing
Explain ProductContentFinder URL matching, route hijacking with MerchelloProductController, and variant URL segment resolution.

### 4.7 Building Product Views
Provide complete Razor view examples showing element property access, variant rendering, add-on options, and image gallery patterns.

---

## 5. Umbraco Integration

### 5.1 Property Editors Overview
Introduce the 5 Merchello property editors for picking Merchello content from Umbraco content pages.

### 5.2 Collection Picker
Document Merchello.PropertyEditorUi.CollectionPicker with maxItems config, storing comma-separated GUIDs, returning IEnumerable<ProductCollection>.

### 5.3 Product Picker
Document Merchello.PropertyEditorUi.ProductPicker with filtering by collection, product type, or filter values, returning IEnumerable<Product>.

### 5.4 Product Type Picker
Document Merchello.PropertyEditorUi.ProductTypePicker for selecting product types, returning IEnumerable<ProductType>.

### 5.5 Filter Group Picker
Document Merchello.PropertyEditorUi.FilterGroupPicker for selecting filter groups, returning IEnumerable<ProductFilterGroup>.

### 5.6 Filter Value Picker
Document Merchello.PropertyEditorUi.FilterValuePicker with optional filterGroupId restriction, returning IEnumerable<ProductFilter>.

### 5.7 Value Converters
Explain how value converters work, batch loading pattern with IServiceScopeFactory, and order preservation for multi-select.

### 5.8 Template Usage Examples
Show Razor examples accessing picked products/collections, handling null/deleted items, and single vs multi-select usage patterns.

---

## 6. Customers

### 6.1 Customer Model
Document Customer entity with Email, MemberKey (Umbraco link), CustomerTags, and relationship to Invoices.

### 6.2 Customer Service
Cover GetOrCreateByEmailAsync pattern for checkout integration, customer search, and CRUD operations via ICustomerService.

### 6.3 Customer Segments
Explain manual segments (explicit membership) vs automated segments (criteria-based), SegmentType enum, and MatchMode (All/Any).

### 6.4 Segment Criteria
Document automated segment criteria including total spend, order count, days since last order, country, tags, and date registered.

### 6.5 Customer Metrics
Cover CustomerMetrics read model providing OrderCount, TotalSpend, AverageOrderValue, FirstOrderDate, LastOrderDate.

---

## 7. Discounts

### 7.1 Discount Model
Document Discount entity, DiscountStatus lifecycle (Draft→Scheduled→Active→Expired), and DiscountMethod (Code vs Automatic).

### 7.2 Discount Categories
Explain the three discount categories: AmountOffProducts, BuyXGetY (BOGO), and FreeShipping with their specific configurations.

### 7.3 Target Rules
Document DiscountTargetRule for targeting AllProducts, SpecificProducts, Categories, or ProductTypes with inclusion/exclusion support.

### 7.4 Eligibility Rules
Cover DiscountEligibilityRule for restricting to AllCustomers, CustomerSegments, or SpecificCustomers.

### 7.5 Requirements
Document minimum purchase amount and minimum quantity requirements via RequirementType and RequirementValue.

### 7.6 Buy X Get Y Configuration
Explain DiscountBuyXGetYConfig with trigger types, get quantities, selection methods (cheapest/most expensive), and BuyXGetYCalculator.

### 7.7 Free Shipping Configuration
Document DiscountFreeShippingConfig with country scope, rate limits, and allowed shipping option restrictions.

### 7.8 Discount Engine
Cover IDiscountEngine interface with CalculateAsync, ValidateCodeAsync, ApplyDiscountsAsync, and automatic discount detection.

### 7.9 Combining Discounts
Explain combination flags (CanCombineWithProductDiscounts, etc.), priority ordering, and stacking rules.

---

## 8. Checkout & Baskets

### 8.1 Basket Model
Document Basket entity with LineItems, currency/totals calculation, shipping address, and Errors collection.

### 8.2 Checkout Service
Cover ICheckoutService for adding/removing items, applying discount codes, calculating totals, and basket management.

### 8.3 Order Grouping
Explain IOrderGroupingStrategy interface, DefaultOrderGroupingStrategy (groups by warehouse), and custom grouping scenarios.

### 8.4 Warehouse Selection
Document priority-based warehouse selection considering stock availability (Stock - ReservedStock) and region serviceability.

### 8.5 Shipping Options at Checkout
Cover GetShippingOptionsForBasket, per-group shipping selection, and product-level shipping restrictions.

### 8.6 Checkout Flow
Document complete flow: Basket → OrderGrouping → ShippingSelection → Payment → Invoice → Orders → Shipments.

---

## 9. Invoices & Orders

### 9.1 Invoice Model
Document Invoice entity with Customer, addresses, currency/exchange rates, Notes, and timeline tracking.

### 9.2 Order Model
Cover Order entity, relationship to Invoice (1:N), OrderStatus enum, and LineItems per order.

### 9.3 Line Items
Document LineItem entity, LineItemType enum (Product, Discount, Custom), and ExtendedData dictionary for custom metadata.

### 9.4 Order Status Lifecycle
Explain status flow: Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped → Completed, plus Cancelled and OnHold states.

### 9.5 Invoice Service
Cover IInvoiceService for CreateOrderFromBasketAsync, order management, draft orders, and backoffice operations.

### 9.6 Order Editing
Document PreviewInvoiceEditAsync and EditInvoiceAsync with stock validation for post-order modifications.

### 9.7 Cancellation
Cover CancelInvoiceAsync with automatic stock release and cancellation reason tracking.

---

## 10. Payments

### 10.1 Payment Model
Document Payment entity with PaymentType (Payment, Refund, PartialRefund), TransactionId, and provider data.

### 10.2 Payment Provider Architecture
Explain IPaymentProvider interface, PaymentProviderBase class, Provider → Methods relationship, and PaymentMethodDefinition.

### 10.3 Integration Types
Document the four integration types: Redirect, HostedFields (iframes), Widget (Apple Pay, Google Pay), and DirectForm.

### 10.4 Payment Flow
Cover three-step flow: CreatePaymentSessionAsync → client-side interaction → ProcessPaymentAsync/RecordPaymentAsync.

### 10.5 Express Checkout
Document express checkout methods for Apple Pay, Google Pay, PayPal with ProcessExpressCheckoutAsync and customer data extraction.

### 10.6 Manual Payments
Cover ManualPaymentProvider for recording offline payments (cash, check, bank transfer) via backoffice.

### 10.7 Refunds
Document ProcessRefundAsync for full/partial refunds with RefundReason tracking and parent payment linking.

### 10.8 Webhooks
Cover PaymentWebhookController with provider-specific signature validation and idempotent processing.

### 10.9 Payment Status
Explain InvoicePaymentStatus calculation via CalculatePaymentStatusAsync as single source of truth.

### 10.10 Creating a Payment Provider
Provide step-by-step implementation guide with required methods, configuration fields, and testing.

---

## 11. Shipping

### 11.1 Shipping Model
Document ShippingOption entity with ShippingCost, ShippingWeightTier, and ShippingOptionCountry.

### 11.2 Shipping Provider Architecture
Explain IShippingProvider interface, ShippingProviderBase, ProviderConfigCapabilities, and ServiceType model.

### 11.3 Built-in Providers
Document FlatRateShippingProvider, FedExShippingProvider, and UpsShippingProvider with their capabilities.

### 11.4 Quote Flow
Cover ShippingQuoteRequest building, package configuration resolution, rate caching, and GetRatesAsync vs GetRatesForServicesAsync.

### 11.5 Service Levels
Document ShippingServiceLevel model with ServiceType, transit time, delivery dates, and currency handling.

### 11.6 Delivery Date Selection
Cover GetAvailableDeliveryDatesAsync, CalculateDeliveryDateSurchargeAsync, and ValidateDeliveryDateAsync for premium delivery.

### 11.7 Product Shipping Restrictions
Document ShippingRestrictionMode (None, AllowList, ExcludeList), AllowedShippingOptions, and ExcludedShippingOptions.

### 11.8 Creating a Shipping Provider
Provide step-by-step guide with global vs method configuration, currency conversion pattern, and testing.

---

## 12. Inventory & Warehouses

### 12.1 Warehouse Model
Document Warehouse entity with Supplier relationship, Code, Address, and ServiceRegions collection.

### 12.2 Service Regions
Explain WarehouseServiceRegion with include/exclude patterns, country-level and state-level rules via IsExcluded flag.

### 12.3 Product-Warehouse Relationships
Cover ProductRootWarehouse (priority ordering), ProductWarehouse (stock per variant), and ProductWarehousePriceOverride.

### 12.4 Stock Management
Document Stock, ReservedStock, AvailableStock (computed), TrackStock flag, and StockStatus (InStock/LowStock/OutOfStock/Untracked).

### 12.5 Inventory Service
Cover IInventoryService with ReserveStockAsync, AllocateStockAsync, and ReleaseStockAsync for order lifecycle.

### 12.6 Stock Operations
Document AdjustStockAsync for corrections, TransferStockAsync between warehouses, and low stock detection via ReorderPoint.

### 12.7 Suppliers
Cover Supplier entity with one-to-many Warehouse relationship and contact information.

---

## 13. Shipments

### 13.1 Shipment Model
Document Shipment entity with Order relationship, LineItems subset, and tracking information.

### 13.2 Creating Shipments
Cover shipment creation from orders, automatic stock allocation (Stock -= qty, Reserved -= qty), and partial shipments.

### 13.3 Tracking
Document TrackingNumber, TrackingUrl, Carrier, and ActualDeliveryDate tracking.

---

## 14. Tax

### 14.1 Tax Groups
Document TaxGroup entity with TaxPercentage and Product-TaxGroup relationship via ProductRoot.TaxGroupId.

### 14.2 Tax Calculation
Cover tax calculation in checkout, line item tax, and ITaxService interface.

---

## 15. Currency

### 15.1 Currency Service
Document ICurrencyService for formatting, Round(), ToMinorUnits(), and FromMinorUnits() operations.

### 15.2 Exchange Rates
Cover IExchangeRateProvider, IExchangeRateCache with cross-rate calculation, and FrankfurterExchangeRateProvider.

### 15.3 Multi-Currency Support
Explain store currency vs display currency, exchange rate tracking on invoices, and currency conversion in shipping.

---

## 16. Reporting

### 16.1 Analytics Summary
Document IReportingService KPI metrics including gross sales, returning customers, fulfilled orders, and total orders.

### 16.2 Sales Reports
Cover time series sales data, sales breakdown (gross, discounts, net, shipping, taxes), and best-selling products.

### 16.3 Order Statistics
Document dashboard statistics and order export functionality.

---

## 17. Extending Merchello

### 17.1 Extension Manager
Explain ExtensionManager assembly scanning, GetImplementation<T>/GetImplementations<T>, and auto-discovery pattern.

### 17.2 Custom Payment Provider
Provide complete guide to implementing IPaymentProvider with configuration fields and payment methods.

### 17.3 Custom Shipping Provider
Provide complete guide to implementing IShippingProvider with rate calculation and currency conversion.

### 17.4 Custom Exchange Rate Provider
Cover IExchangeRateProvider implementation with GetRatesAsync and GetRateAsync methods.

### 17.5 Custom Order Grouping Strategy
Explain IOrderGroupingStrategy implementation with GroupItemsAsync for vendor grouping, category grouping, etc.

### 17.6 Custom Notification Handlers
Cover implementing INotificationAsyncHandler<T> with NotificationHandlerPriorityAttribute. Include examples: sending order confirmation emails (OrderCreated), syncing to external systems (InvoiceSaved), validating before saves (ProductSaving with CancelOperation), logging status changes (OrderStatusChanged), and low stock alerts (LowStockNotification).

### 17.7 Custom Order Status Handler
Document IOrderStatusHandler for CanTransitionAsync, OnStatusChangingAsync, and OnStatusChangedAsync hooks.

---

## 18. Backoffice Development

### 18.1 UI Architecture
Explain Lit web components, Vite build system, TypeScript patterns, and feature-based folder structure.

### 18.2 Creating Property Editor UIs
Cover property editor pattern with UmbFormControlMixin, UmbChangeEvent, and manifest registration.

### 18.3 Picker Modals
Document modal token pattern, UmbModalBaseElement, and single vs multi-select with drag reordering.

### 18.4 API Integration
Cover MerchelloApi layer pattern with error handling and loading states.

### 18.5 Manifest Registration
Document propertyEditorUi manifests, modal manifests, and bundle.manifests.ts aggregation.

---

## 19. API Reference

### 19.1 Checkout API
Document public checkout endpoints for basket operations, shipping quotes, express checkout, and payment methods.

### 19.2 Backoffice API
Cover backoffice API endpoints for product, order, customer, and provider configuration management.

### 19.3 Webhook Endpoints
Document PaymentWebhookController endpoints with signature validation patterns.

---

## 20. Services Reference

### 20.1 Product Services
Document IProductService (CRUD, variants, options) and IInventoryService (stock operations) method signatures.

### 20.2 Accounting Services
Cover IInvoiceService, ILineItemService, and ITaxService method signatures and usage.

### 20.3 Customer Services
Document ICustomerService and ICustomerSegmentService method signatures.

### 20.4 Commerce Services
Cover ICheckoutService, IPaymentService, IShippingService, and IShippingQuoteService method signatures.

### 20.5 Discount Services
Document IDiscountService and IDiscountEngine method signatures.

### 20.6 Location Services
Cover IWarehouseService, ISupplierService, and ILocationsService method signatures.

### 20.7 Utility Services
Document ICurrencyService and IReportingService method signatures.

---

## 21. Troubleshooting

### 21.1 Common Issues
Cover common issues: stock not updating, shipping not appearing, payment failures, discount not applying.

### 21.2 Debugging
Document logging configuration and notification tracing for troubleshooting.
