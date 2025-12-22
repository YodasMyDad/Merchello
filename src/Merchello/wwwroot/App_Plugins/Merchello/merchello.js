const e = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-CyBncf44.js")
  }
], o = [
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
    element: () => import("./stats-dashboard.element-CRmcqV_K.js"),
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
], a = [
  // Tree Repository
  {
    type: "repository",
    alias: "Merchello.Tree.Repository",
    name: "Merchello Tree Repository",
    api: () => import("./repository-DmgoUM4c.js")
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
      "merchello-collections",
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
], l = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./fulfillment-modal.element-DDXLPaVp.js")
  },
  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./shipment-edit-modal.element-wreYZj6H.js")
  },
  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./manual-payment-modal.element-Df1cvIe9.js")
  },
  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./refund-modal.element-COwXBK9H.js")
  },
  // Cancel invoice modal for cancelling invoices
  {
    type: "modal",
    alias: "Merchello.CancelInvoice.Modal",
    name: "Merchello Cancel Invoice Modal",
    js: () => import("./cancel-invoice-modal.element-BY_5WpFq.js")
  },
  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("./export-modal.element-Cpr81lDQ.js")
  },
  // Edit order modal for editing order details
  {
    type: "modal",
    alias: "Merchello.EditOrder.Modal",
    name: "Merchello Edit Order Modal",
    js: () => import("./edit-order-modal.element-BOLm6sqk.js")
  },
  // Add custom item modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddCustomItem.Modal",
    name: "Merchello Add Custom Item Modal",
    js: () => import("./add-custom-item-modal.element-DBPaI9ox.js")
  },
  // Add discount modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddDiscount.Modal",
    name: "Merchello Add Discount Modal",
    js: () => import("./add-discount-modal.element-DNrdAKz2.js")
  },
  // Create order modal for creating draft orders from backoffice
  {
    type: "modal",
    alias: "Merchello.CreateOrder.Modal",
    name: "Merchello Create Order Modal",
    js: () => import("./create-order-modal.element-VSNkTSEr.js")
  },
  // Customer orders modal for viewing all orders by a customer
  {
    type: "modal",
    alias: "Merchello.CustomerOrders.Modal",
    name: "Merchello Customer Orders Modal",
    js: () => import("./customer-orders-modal.element-D8DTOjif.js")
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
    js: () => import("./orders-list.element-CVY8XtvL.js"),
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
    api: () => import("./order-detail-workspace.context-BnSdWMcV.js"),
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
    js: () => import("./option-editor-modal.element-B6VbDy09.js")
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
    js: () => import("./products-list.element-BYfTgZWN.js"),
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
    api: () => import("./product-detail-workspace.context-CSyrCe_f.js"),
    meta: {
      entityType: "merchello-product"
    }
  },
  // Workspace view for product detail
  {
    type: "workspaceView",
    alias: "Merchello.Product.Detail.View",
    name: "Product Detail View",
    js: () => import("./product-detail.element-VgaxFRmG.js"),
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
], r = [
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
  // Workspace view - the customers list
  {
    type: "workspaceView",
    alias: "Merchello.Customers.ListView",
    name: "Customers List View",
    js: () => import("./customers-list.element-Dyh91tSu.js"),
    weight: 100,
    meta: {
      label: "Customers",
      pathname: "list",
      icon: "icon-users"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace"
      }
    ]
  },
  // Workspace view - the segments list (tab in Customers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Customers.SegmentsView",
    name: "Customer Segments View",
    js: () => import("./segments-list.element-BaccrXyr.js"),
    weight: 90,
    meta: {
      label: "Segments",
      pathname: "segments",
      icon: "icon-filter"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace"
      }
    ]
  },
  // Routable workspace for segment detail (edit/create)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.CustomerSegment.Detail.Workspace",
    name: "Customer Segment Detail Workspace",
    api: () => import("./segment-detail-workspace.context-CmI4uy42.js"),
    meta: {
      entityType: "merchello-customer-segment"
    }
  },
  // Customer edit modal
  {
    type: "modal",
    alias: "Merchello.Customer.Edit.Modal",
    name: "Customer Edit Modal",
    js: () => import("./customer-edit-modal.element-BcZt0W1C.js")
  },
  // Customer picker modal (for adding members to segments)
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("./customer-picker-modal.element-Brh9nToC.js")
  },
  // Segment picker modal (for discount eligibility)
  {
    type: "modal",
    alias: "Merchello.SegmentPicker.Modal",
    name: "Segment Picker Modal",
    js: () => import("./segment-picker-modal.element-C9RUl9VR.js")
  }
], t = [
  // Workspace for collections (when clicking "Collections" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Collections.Workspace",
    name: "Merchello Collections Workspace",
    meta: {
      entityType: "merchello-collections",
      headline: "Collections"
    }
  },
  // Workspace view for collections
  {
    type: "workspaceView",
    alias: "Merchello.Collections.Workspace.View",
    name: "Merchello Collections View",
    js: () => import("./collections-workspace.element-0Igupqzr.js"),
    weight: 100,
    meta: {
      label: "Collections",
      pathname: "collections",
      icon: "icon-tag"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Collections.Workspace"
      }
    ]
  },
  // Collection picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.CollectionPicker.Modal",
    name: "Collection Picker Modal",
    js: () => import("./collection-picker-modal.element-C786O01D.js")
  },
  // Collection create/edit modal
  {
    type: "modal",
    alias: "Merchello.Collection.Modal",
    name: "Collection Modal",
    js: () => import("./collection-modal.element-DHmDCSvO.js")
  }
], s = [
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
    js: () => import("./filters-list.element-5uQAs0rS.js"),
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
    js: () => import("./filter-group-modal.element-YJFhs-A_.js")
  },
  // Modal for creating/editing filters
  {
    type: "modal",
    alias: "Merchello.Filter.Modal",
    name: "Merchello Filter Modal",
    js: () => import("./filter-modal.element-DceuHPlt.js")
  },
  // Filter picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.FilterPicker.Modal",
    name: "Filter Picker Modal",
    js: () => import("./filter-picker-modal.element-pOV95NvQ.js")
  }
], c = [
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
    js: () => import("./product-types-list.element-BRBvMm9B.js"),
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
    js: () => import("./product-type-modal.element-DXw6Q2vi.js")
  },
  // Product type picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.ProductTypePicker.Modal",
    name: "Product Type Picker Modal",
    js: () => import("./product-type-picker-modal.element-DW9jk-R5.js")
  }
], n = [
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
    js: () => import("./product-feed-workspace.element-LoMR_rol.js"),
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
], p = [
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
], m = [
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
    js: () => import("./analytics-workspace.element-DiCP6rvk.js"),
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
  // Workspace for discounts list (when clicking "Discounts" in tree)
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
  // Workspace view for discounts list
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./discounts-list.element-BNHhmOyH.js"),
    weight: 100,
    meta: {
      label: "Discounts",
      pathname: "discounts",
      icon: "icon-tag"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Discounts.Workspace"
      }
    ]
  },
  // Routable workspace for discount detail (create/edit)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discount.Detail.Workspace",
    name: "Discount Detail Workspace",
    api: () => import("./discount-detail-workspace.context-CqOEJ3nx.js"),
    meta: {
      entityType: "merchello-discount"
    }
  },
  // Select discount type modal
  {
    type: "modal",
    alias: "Merchello.SelectDiscountType.Modal",
    name: "Select Discount Type Modal",
    js: () => import("./select-discount-type-modal.element-qIlBdUpP.js")
  }
], h = [
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
    js: () => import("./tax-workspace.element-CXzV9X-R.js"),
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
    js: () => import("./tax-group-modal.element-zNd-5gd0.js")
  }
], M = [
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
    js: () => import("./suppliers-list.element-BziDBRlF.js"),
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
    js: () => import("./supplier-modal.element-CMdxeYj8.js")
  },
  // Supplier picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.SupplierPicker.Modal",
    name: "Supplier Picker Modal",
    js: () => import("./supplier-picker-modal.element-DO--3n7G.js")
  }
], u = [
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
    js: () => import("./warehouses-list.element-BwthmnDx.js"),
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
    api: () => import("./warehouse-detail-workspace.context-RricrK56.js"),
    meta: {
      entityType: "merchello-warehouse"
    }
  },
  // Detail view for warehouse editing
  {
    type: "workspaceView",
    alias: "Merchello.Warehouse.Detail.View",
    name: "Merchello Warehouse Detail View",
    js: () => import("./warehouse-detail.element-DCb-mZUu.js"),
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
    js: () => import("./service-region-modal.element-Cf43v7j_.js")
  },
  // Warehouse picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.WarehousePicker.Modal",
    name: "Warehouse Picker Modal",
    js: () => import("./warehouse-picker-modal.element-C0lv_K_j.js")
  }
], y = [
  // Workspace view for shipping providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ShippingProviders.View",
    name: "Shipping Providers View",
    js: () => import("./shipping-providers-list.element-CXFHHa1b.js"),
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
    js: () => import("./shipping-provider-config-modal.element-DZLMhWX_.js")
  },
  // Test shipping provider modal
  {
    type: "modal",
    alias: "Merchello.TestProvider.Modal",
    name: "Test Shipping Provider Modal",
    js: () => import("./test-provider-modal.element-BVqhHkVy.js")
  },
  // Shipping option detail modal
  {
    type: "modal",
    alias: "Merchello.ShippingOption.Detail.Modal",
    name: "Shipping Option Detail Modal",
    js: () => import("./shipping-option-detail-modal.element-BC0oHVnf.js")
  },
  // Shipping cost modal
  {
    type: "modal",
    alias: "Merchello.ShippingCost.Modal",
    name: "Shipping Cost Modal",
    js: () => import("./shipping-cost-modal.element-CcSMnQe-.js")
  },
  // Shipping weight tier modal
  {
    type: "modal",
    alias: "Merchello.ShippingWeightTier.Modal",
    name: "Shipping Weight Tier Modal",
    js: () => import("./shipping-weight-tier-modal.element-BcO0nsS-.js")
  }
], k = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./payment-providers-list.element-DFMD0_au.js"),
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
    js: () => import("./payment-provider-config-modal.element-DETAJaoh.js")
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
    js: () => import("./test-provider-modal.element-Ctgv2E4g.js")
  }
], w = [
  // Workspace view for exchange rate providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ExchangeRateProviders.View",
    name: "Exchange Rate Providers View",
    js: () => import("./exchange-rate-providers-list.element-C8-CGbek.js"),
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
    js: () => import("./exchange-rate-provider-config-modal.element-3dlBQneL.js")
  },
  // Modal for testing an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Test.Modal",
    name: "Exchange Rate Provider Test Modal",
    js: () => import("./test-provider-modal.element-40RTK5c3.js")
  }
], W = [
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
], P = [
  // Product picker modal for selecting products in orders and property editors
  {
    type: "modal",
    alias: "Merchello.ProductPicker.Modal",
    name: "Merchello Product Picker Modal",
    js: () => import("./product-picker-modal.element-NnXCWQqC.js")
  }
], g = [
  ...e,
  ...o,
  ...a,
  ...l,
  ...i,
  ...r,
  ...t,
  ...s,
  ...c,
  ...n,
  ...p,
  ...m,
  ...d,
  ...h,
  ...M,
  ...u,
  ...y,
  ...k,
  ...w,
  ...W,
  ...P
];
export {
  g as manifests
};
//# sourceMappingURL=merchello.js.map
