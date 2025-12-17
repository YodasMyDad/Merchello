const e = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-7MqAbKmv.js")
  }
], o = [
  {
    name: "Merchello Dashboard",
    alias: "Merchello.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element-BfYTyMbg.js"),
    meta: {
      label: "Merchello Dashboard",
      pathname: "merchello-dashboard"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Content"
      }
    ]
  }
], a = [
  // Section
  {
    type: "section",
    alias: "Merchello.Section",
    name: "Merchello Section",
    meta: {
      label: "Merchello",
      pathname: "merchello"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionUserPermission",
        match: "Merchello.Section"
      }
    ]
  },
  // Menu
  {
    type: "menu",
    alias: "Merchello.Menu",
    name: "Merchello Menu"
  },
  // Sidebar app to show the menu
  {
    type: "sectionSidebarApp",
    kind: "menu",
    alias: "Merchello.SidebarApp",
    name: "Merchello Sidebar",
    weight: 100,
    meta: {
      label: "Merchello",
      menu: "Merchello.Menu"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Merchello.Section"
      }
    ]
  },
  // Stats Dashboard
  {
    type: "dashboard",
    alias: "Merchello.Dashboard.Stats",
    name: "Merchello Stats Dashboard",
    element: () => import("./stats-dashboard.element-CV4y_8iQ.js"),
    meta: {
      label: "Stats",
      pathname: "stats"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Merchello.Section"
      }
    ]
  }
], l = [
  // Tree Repository
  {
    type: "repository",
    alias: "Merchello.Tree.Repository",
    name: "Merchello Tree Repository",
    api: () => import("./repository-CVctc46m.js")
  },
  // Tree
  {
    type: "tree",
    kind: "default",
    alias: "Merchello.Tree",
    name: "Merchello Tree",
    meta: {
      repositoryAlias: "Merchello.Tree.Repository"
    }
  },
  // Tree Item (for rendering tree nodes)
  {
    type: "treeItem",
    kind: "default",
    alias: "Merchello.TreeItem",
    name: "Merchello Tree Item",
    forEntityTypes: [
      "merchello-root",
      "merchello-orders",
      "merchello-order",
      "merchello-products",
      "merchello-customers",
      "merchello-categories",
      "merchello-filters",
      "merchello-product-types",
      "merchello-product-feed",
      "merchello-analytics",
      "merchello-discounts",
      "merchello-tax",
      "merchello-suppliers",
      "merchello-warehouses",
      "merchello-providers"
    ]
  },
  // Menu Item to add tree to the menu
  {
    type: "menuItem",
    kind: "tree",
    alias: "Merchello.MenuItem",
    name: "Merchello Menu Item",
    weight: 100,
    meta: {
      label: "Merchello",
      menus: ["Merchello.Menu"],
      treeAlias: "Merchello.Tree"
    }
  }
], r = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./fulfillment-modal.element-a_Zt5ppR.js")
  },
  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./shipment-edit-modal.element-BulUa0fI.js")
  },
  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./manual-payment-modal.element-DPqAdA-p.js")
  },
  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./refund-modal.element-PNacNjUj.js")
  },
  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("./export-modal.element-CU1I5YgD.js")
  },
  // Edit order modal for editing order details
  {
    type: "modal",
    alias: "Merchello.EditOrder.Modal",
    name: "Merchello Edit Order Modal",
    js: () => import("./edit-order-modal.element-DdtOiLYn.js")
  },
  // Add custom item modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddCustomItem.Modal",
    name: "Merchello Add Custom Item Modal",
    js: () => import("./add-custom-item-modal.element-O0A5CfSa.js")
  },
  // Add discount modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddDiscount.Modal",
    name: "Merchello Add Discount Modal",
    js: () => import("./add-discount-modal.element-BM_mcuhD.js")
  },
  // Create order modal for creating draft orders from backoffice
  {
    type: "modal",
    alias: "Merchello.CreateOrder.Modal",
    name: "Merchello Create Order Modal",
    js: () => import("./create-order-modal.element-D-Oje9yz.js")
  },
  // Customer orders modal for viewing all orders by a customer
  {
    type: "modal",
    alias: "Merchello.CustomerOrders.Modal",
    name: "Merchello Customer Orders Modal",
    js: () => import("./customer-orders-modal.element-Udh-2Yw2.js")
  },
  // Workspace for orders list (when clicking "Orders" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Orders.Workspace",
    name: "Merchello Orders Workspace",
    meta: {
      entityType: "merchello-orders",
      headline: "Orders"
    }
  },
  // Workspace view - the orders list
  {
    type: "workspaceView",
    alias: "Merchello.Orders.ListView",
    name: "Orders List View",
    js: () => import("./orders-list.element-CdVtxx3S.js"),
    weight: 100,
    meta: {
      label: "Orders",
      pathname: "list",
      icon: "icon-list"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Orders.Workspace"
      }
    ]
  },
  // Workspace for individual order detail (routable)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Order.Detail.Workspace",
    name: "Order Detail Workspace",
    api: () => import("./order-detail-workspace.context-D9VzXzR0.js"),
    meta: {
      entityType: "merchello-order"
    }
  }
], i = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("./create-product-modal.element-CoG51F05.js")
  },
  // Option editor modal
  {
    type: "modal",
    alias: "Merchello.OptionEditor.Modal",
    name: "Merchello Option Editor Modal",
    js: () => import("./option-editor-modal.element-BmiB6jpM.js")
  },
  // Workspace for products list (when clicking "Products" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Products.Workspace",
    name: "Merchello Products Workspace",
    meta: {
      entityType: "merchello-products",
      headline: "Products"
    }
  },
  // Workspace view for products list
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./products-list.element-hyw5ihpS.js"),
    weight: 100,
    meta: {
      label: "Products",
      pathname: "products",
      icon: "icon-box"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Products.Workspace"
      }
    ]
  },
  // Workspace for individual product detail (routable)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Product.Detail.Workspace",
    name: "Product Detail Workspace",
    api: () => import("./product-detail-workspace.context-CWKOpLpG.js"),
    meta: {
      entityType: "merchello-product"
    }
  },
  // Workspace view for product detail
  {
    type: "workspaceView",
    alias: "Merchello.Product.Detail.View",
    name: "Product Detail View",
    js: () => import("./product-detail.element-BSawIljO.js"),
    weight: 100,
    meta: {
      label: "Product",
      pathname: "product",
      icon: "icon-box"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Product.Detail.Workspace"
      }
    ]
  }
], t = [
  // Workspace for customers (when clicking "Customers" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Customers.Workspace",
    name: "Merchello Customers Workspace",
    meta: {
      entityType: "merchello-customers",
      headline: "Customers"
    }
  },
  // Workspace view for customers
  {
    type: "workspaceView",
    alias: "Merchello.Customers.Workspace.View",
    name: "Merchello Customers View",
    js: () => import("./customers-workspace.element-CBex_0em.js"),
    weight: 100,
    meta: {
      label: "Customers",
      pathname: "customers",
      icon: "icon-users"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace"
      }
    ]
  }
], s = [
  // Workspace for categories (when clicking "Categories" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Categories.Workspace",
    name: "Merchello Categories Workspace",
    meta: {
      entityType: "merchello-categories",
      headline: "Categories"
    }
  },
  // Workspace view for categories
  {
    type: "workspaceView",
    alias: "Merchello.Categories.Workspace.View",
    name: "Merchello Categories View",
    js: () => import("./categories-workspace.element-FcYZ2W5I.js"),
    weight: 100,
    meta: {
      label: "Categories",
      pathname: "categories",
      icon: "icon-tag"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Categories.Workspace"
      }
    ]
  }
], c = [
  // Workspace for filters (when clicking "Filters" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Filters.Workspace",
    name: "Merchello Filters Workspace",
    meta: {
      entityType: "merchello-filters",
      headline: "Filters"
    }
  },
  // Workspace view for filters list
  {
    type: "workspaceView",
    alias: "Merchello.Filters.Workspace.View",
    name: "Merchello Filters View",
    js: () => import("./filters-list.element-CkTKTmvh.js"),
    weight: 100,
    meta: {
      label: "Filters",
      pathname: "filters",
      icon: "icon-filter"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Filters.Workspace"
      }
    ]
  },
  // Modal for creating/editing filter groups
  {
    type: "modal",
    alias: "Merchello.FilterGroup.Modal",
    name: "Merchello Filter Group Modal",
    js: () => import("./filter-group-modal.element-D87KKRXA.js")
  },
  // Modal for creating/editing filters
  {
    type: "modal",
    alias: "Merchello.Filter.Modal",
    name: "Merchello Filter Modal",
    js: () => import("./filter-modal.element-CFRH6hr2.js")
  }
], n = [
  // Workspace for product types (when clicking "Product Types" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.ProductTypes.Workspace",
    name: "Merchello Product Types Workspace",
    meta: {
      entityType: "merchello-product-types",
      headline: "Product Types"
    }
  },
  // Workspace view for product types
  {
    type: "workspaceView",
    alias: "Merchello.ProductTypes.Workspace.View",
    name: "Merchello Product Types View",
    js: () => import("./product-types-list.element-DzUHPKOc.js"),
    weight: 100,
    meta: {
      label: "Product Types",
      pathname: "product-types",
      icon: "icon-tags"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductTypes.Workspace"
      }
    ]
  },
  // Modal for create/edit product type
  {
    type: "modal",
    alias: "Merchello.ProductType.Modal",
    name: "Merchello Product Type Modal",
    js: () => import("./product-type-modal.element-BWqMfBXU.js")
  }
], p = [
  // Workspace for product feed (when clicking "Product Feed" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.ProductFeed.Workspace",
    name: "Merchello Product Feed Workspace",
    meta: {
      entityType: "merchello-product-feed",
      headline: "Product Feed"
    }
  },
  // Workspace view for product feed
  {
    type: "workspaceView",
    alias: "Merchello.ProductFeed.Workspace.View",
    name: "Merchello Product Feed View",
    js: () => import("./product-feed-workspace.element-C3_xgutn.js"),
    weight: 100,
    meta: {
      label: "Product Feed",
      pathname: "product-feed",
      icon: "icon-rss"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductFeed.Workspace"
      }
    ]
  }
], m = [
  // Workspace for providers (when clicking "Providers" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Providers.Workspace",
    name: "Merchello Providers Workspace",
    meta: {
      entityType: "merchello-providers",
      headline: "Providers"
    }
  }
], h = [
  // Workspace for analytics (when clicking "Analytics" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Analytics.Workspace",
    name: "Merchello Analytics Workspace",
    meta: {
      entityType: "merchello-analytics",
      headline: "Analytics"
    }
  },
  // Workspace view for analytics
  {
    type: "workspaceView",
    alias: "Merchello.Analytics.Workspace.View",
    name: "Merchello Analytics View",
    js: () => import("./analytics-workspace.element-Bu79sInl.js"),
    weight: 100,
    meta: {
      label: "Analytics",
      pathname: "analytics",
      icon: "icon-chart-curve"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Analytics.Workspace"
      }
    ]
  }
], d = [
  // Workspace for discounts (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    meta: {
      entityType: "merchello-discounts",
      headline: "Discounts"
    }
  },
  // Workspace view for discounts
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./discounts-workspace.element-1pbtwsUV.js"),
    weight: 100,
    meta: {
      label: "Discounts",
      pathname: "discounts",
      icon: "icon-megaphone"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Discounts.Workspace"
      }
    ]
  }
], M = [
  // ============================================
  // Tax Workspace
  // ============================================
  // Workspace for tax (when clicking "Tax" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Tax.Workspace",
    name: "Merchello Tax Workspace",
    meta: {
      entityType: "merchello-tax",
      headline: "Tax Groups"
    }
  },
  // Workspace view for tax groups list
  {
    type: "workspaceView",
    alias: "Merchello.Tax.Workspace.View",
    name: "Merchello Tax Groups View",
    js: () => import("./tax-workspace.element-C07WAIkz.js"),
    weight: 100,
    meta: {
      label: "Tax Groups",
      pathname: "tax-groups",
      icon: "icon-calculator"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Tax.Workspace"
      }
    ]
  },
  // ============================================
  // Modals
  // ============================================
  // Tax group modal (handles both create and edit)
  {
    type: "modal",
    alias: "Merchello.TaxGroup.Modal",
    name: "Merchello Tax Group Modal",
    js: () => import("./tax-group-modal.element-Tinaq3TS.js")
  }
], u = [
  // ============================================
  // Suppliers List Workspace
  // ============================================
  // Main workspace for suppliers list
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Suppliers.Workspace",
    name: "Merchello Suppliers Workspace",
    meta: {
      entityType: "merchello-suppliers",
      headline: "Suppliers"
    }
  },
  // List view for suppliers
  {
    type: "workspaceView",
    alias: "Merchello.Suppliers.ListView",
    name: "Merchello Suppliers List View",
    js: () => import("./suppliers-list.element-jHIm4QnP.js"),
    weight: 100,
    meta: {
      label: "Suppliers",
      pathname: "suppliers",
      icon: "icon-truck"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Suppliers.Workspace"
      }
    ]
  },
  // ============================================
  // Modals
  // ============================================
  // Supplier modal (handles both create and edit)
  {
    type: "modal",
    alias: "Merchello.Supplier.Modal",
    name: "Merchello Supplier Modal",
    js: () => import("./supplier-modal.element-C0_TQTkA.js")
  }
], y = [
  // ============================================
  // Warehouses List Workspace
  // ============================================
  // Main workspace for warehouses list (child of Settings in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Warehouses.Workspace",
    name: "Merchello Warehouses Workspace",
    meta: {
      entityType: "merchello-warehouses",
      headline: "Warehouses"
    }
  },
  // List view for warehouses
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.ListView",
    name: "Merchello Warehouses List View",
    js: () => import("./warehouses-list.element-BQlcK8qx.js"),
    weight: 100,
    meta: {
      label: "Warehouses",
      pathname: "warehouses",
      icon: "icon-store"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Warehouses.Workspace"
      }
    ]
  },
  // ============================================
  // Warehouse Detail Workspace (Routable)
  // ============================================
  // Routable workspace for warehouse detail/edit
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Warehouse.Detail.Workspace",
    name: "Merchello Warehouse Detail Workspace",
    api: () => import("./warehouse-detail-workspace.context-445MyDy1.js"),
    meta: {
      entityType: "merchello-warehouse"
    }
  },
  // Detail view for warehouse editing
  {
    type: "workspaceView",
    alias: "Merchello.Warehouse.Detail.View",
    name: "Merchello Warehouse Detail View",
    js: () => import("./warehouse-detail.element-DzNPEBJs.js"),
    weight: 100,
    meta: {
      label: "Warehouse",
      pathname: "warehouse",
      icon: "icon-store"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Warehouse.Detail.Workspace"
      }
    ]
  },
  // ============================================
  // Modals
  // ============================================
  // Service region modal
  {
    type: "modal",
    alias: "Merchello.ServiceRegion.Modal",
    name: "Merchello Service Region Modal",
    js: () => import("./service-region-modal.element-BY01ApLT.js")
  }
], k = [
  // Workspace view for shipping providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ShippingProviders.View",
    name: "Shipping Providers View",
    js: () => import("./shipping-providers-list.element-CPbi98bY.js"),
    weight: 90,
    meta: {
      label: "Shipping",
      pathname: "shipping",
      icon: "icon-truck"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  },
  // NOTE: Shipping options are now managed per-warehouse in the Warehouses section
  // The old "Shipping Options" tab in Providers has been removed
  // Shipping provider configuration modal
  {
    type: "modal",
    alias: "Merchello.ShippingProvider.Config.Modal",
    name: "Shipping Provider Config Modal",
    js: () => import("./shipping-provider-config-modal.element-PQyHYjWd.js")
  },
  // Test shipping provider modal
  {
    type: "modal",
    alias: "Merchello.TestProvider.Modal",
    name: "Test Shipping Provider Modal",
    js: () => import("./test-provider-modal.element-DkKh8ZL4.js")
  },
  // Shipping option detail modal
  {
    type: "modal",
    alias: "Merchello.ShippingOption.Detail.Modal",
    name: "Shipping Option Detail Modal",
    js: () => import("./shipping-option-detail-modal.element-cI0XCWcA.js")
  },
  // Shipping cost modal
  {
    type: "modal",
    alias: "Merchello.ShippingCost.Modal",
    name: "Shipping Cost Modal",
    js: () => import("./shipping-cost-modal.element-D_Zplb6b.js")
  },
  // Shipping weight tier modal
  {
    type: "modal",
    alias: "Merchello.ShippingWeightTier.Modal",
    name: "Shipping Weight Tier Modal",
    js: () => import("./shipping-weight-tier-modal.element-CWIkB6g2.js")
  }
], w = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./payment-providers-list.element-DTvUD66r.js"),
    weight: 100,
    meta: {
      label: "Payments",
      pathname: "payments",
      icon: "icon-credit-card"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  },
  // Modal for configuring a payment provider
  {
    type: "modal",
    alias: "Merchello.PaymentProvider.Config.Modal",
    name: "Payment Provider Configuration Modal",
    js: () => import("./payment-provider-config-modal.element-CNmZ6T52.js")
  },
  // Modal for displaying setup instructions
  {
    type: "modal",
    alias: "Merchello.SetupInstructions.Modal",
    name: "Setup Instructions Modal",
    js: () => import("./setup-instructions-modal.element-C5hRHVZ_.js")
  },
  // Modal for testing a payment provider
  {
    type: "modal",
    alias: "Merchello.TestPaymentProvider.Modal",
    name: "Test Payment Provider Modal",
    js: () => import("./test-provider-modal.element-C9Ww7Tk6.js")
  }
], W = [
  // Workspace view for exchange rate providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ExchangeRateProviders.View",
    name: "Exchange Rate Providers View",
    js: () => import("./exchange-rate-providers-list.element-B9xB1Xq1.js"),
    weight: 80,
    // After Payments (100) and Shipping (90)
    meta: {
      label: "Exchange Rates",
      pathname: "exchange-rates",
      icon: "icon-globe"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  },
  // Modal for configuring an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Config.Modal",
    name: "Exchange Rate Provider Configuration Modal",
    js: () => import("./exchange-rate-provider-config-modal.element-DOBS_pcT.js")
  },
  // Modal for testing an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Test.Modal",
    name: "Exchange Rate Provider Test Modal",
    js: () => import("./test-provider-modal.element-SekSqepK.js")
  }
], P = [
  // Workspace for root (when clicking "Merchello" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Root.Workspace",
    name: "Merchello Root Workspace",
    meta: {
      entityType: "merchello-root",
      headline: "Merchello"
    }
  }
], g = [
  // Product picker modal for selecting products in orders and property editors
  {
    type: "modal",
    alias: "Merchello.ProductPicker.Modal",
    name: "Merchello Product Picker Modal",
    js: () => import("./product-picker-modal.element-jCSnbNgO.js")
  }
], b = [
  ...e,
  ...o,
  ...a,
  ...l,
  ...r,
  ...i,
  ...t,
  ...s,
  ...c,
  ...n,
  ...p,
  ...m,
  ...h,
  ...d,
  ...M,
  ...u,
  ...y,
  ...k,
  ...w,
  ...W,
  ...P,
  ...g
];
export {
  b as manifests
};
//# sourceMappingURL=merchello.js.map
