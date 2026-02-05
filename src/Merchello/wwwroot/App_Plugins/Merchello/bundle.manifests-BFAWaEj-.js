const e = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-Cs5m1cXa.js")
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
    element: () => import("./stats-dashboard.element-S2-eZO_c.js"),
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
    api: () => import("./tree-repository-DFzX8TS8.js")
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
      "merchello-outstanding",
      "merchello-abandoned-checkouts",
      "merchello-products",
      "merchello-customers",
      "merchello-collections",
      "merchello-filters",
      "merchello-product-types",
      "merchello-product-feed",
      "merchello-analytics",
      "merchello-discounts",
      "merchello-suppliers",
      "merchello-warehouses",
      "merchello-emails",
      "merchello-providers",
      "merchello-webhooks",
      "merchello-notifications",
      "merchello-upsells"
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
], X = "merchello-root", l = "merchello-orders", i = "merchello-products", t = "merchello-customers", r = "merchello-collections", s = "merchello-filters", c = "merchello-product-types", n = "merchello-product-feed", p = "merchello-analytics", m = "merchello-discounts", d = "merchello-suppliers", h = "merchello-warehouses", M = "merchello-emails", u = "merchello-providers", y = "merchello-webhooks", k = "merchello-outstanding", P = "merchello-abandoned-checkouts", w = "merchello-notifications", E = "merchello-upsells", T = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./fulfillment-modal.element-BPdnerTg.js")
  },
  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./shipment-edit-modal.element-b8lNqFPe.js")
  },
  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./manual-payment-modal.element-BO9Z61Fr.js")
  },
  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./refund-modal.element-ChXyTkAz.js")
  },
  // Cancel invoice modal for cancelling invoices
  {
    type: "modal",
    alias: "Merchello.CancelInvoice.Modal",
    name: "Merchello Cancel Invoice Modal",
    js: () => import("./cancel-invoice-modal.element-B53fwZYS.js")
  },
  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("./export-modal.element-CzL_m6QL.js")
  },
  // Edit order modal for editing order details
  {
    type: "modal",
    alias: "Merchello.EditOrder.Modal",
    name: "Merchello Edit Order Modal",
    js: () => import("./edit-order-modal.element-3yb5CI1j.js")
  },
  // Add custom item modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddCustomItem.Modal",
    name: "Merchello Add Custom Item Modal",
    js: () => import("./add-custom-item-modal.element-CxIZUBFX.js")
  },
  // Add discount modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddDiscount.Modal",
    name: "Merchello Add Discount Modal",
    js: () => import("./add-discount-modal.element-BhBf3Dbn.js")
  },
  // Create order modal for creating manual orders from backoffice
  {
    type: "modal",
    alias: "Merchello.CreateOrder.Modal",
    name: "Merchello Create Order Modal",
    js: () => import("./create-order-modal.element-B_bHPbpd.js")
  },
  // Customer orders modal for viewing all orders by a customer
  {
    type: "modal",
    alias: "Merchello.CustomerOrders.Modal",
    name: "Merchello Customer Orders Modal",
    js: () => import("./customer-orders-modal.element-DxGchnMK.js")
  },
  // Generate statement modal for downloading customer statement PDFs
  {
    type: "modal",
    alias: "Merchello.GenerateStatement.Modal",
    name: "Merchello Generate Statement Modal",
    js: () => import("./generate-statement-modal.element-D74Mmtwb.js")
  },
  // Workspace for orders list (when clicking "Orders" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Orders.Workspace",
    name: "Merchello Orders Workspace",
    api: () => import("./orders-workspace.context-B0B4uq0N.js"),
    meta: {
      entityType: l
    }
  },
  // Workspace view - the orders list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Orders.ListView",
    name: "Orders List View",
    js: () => import("./orders-list.element-DnCayp52.js"),
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
  }
], b = [
  // Mark as paid modal
  {
    type: "modal",
    alias: "Merchello.MarkAsPaid.Modal",
    name: "Merchello Mark as Paid Modal",
    js: () => import("./mark-as-paid-modal.element-BdBBh4YQ.js")
  },
  // Workspace for outstanding list (when clicking "Outstanding" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Outstanding.Workspace",
    name: "Merchello Outstanding Workspace",
    api: () => import("./outstanding-workspace.context-D_SNVqbg.js"),
    meta: {
      entityType: k
    }
  },
  // Workspace view - the outstanding list
  {
    type: "workspaceView",
    alias: "Merchello.Outstanding.ListView",
    name: "Outstanding List View",
    js: () => import("./outstanding-list.element-CLFAxd-T.js"),
    weight: 100,
    meta: {
      label: "Outstanding",
      pathname: "list",
      icon: "icon-timer"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Outstanding.Workspace"
      }
    ]
  }
], g = [
  // Workspace for abandoned checkouts list (when clicking "Abandoned Checkouts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.AbandonedCheckouts.Workspace",
    name: "Merchello Abandoned Checkouts Workspace",
    api: () => import("./abandoned-checkouts-workspace.context-1bIBXZ7m.js"),
    meta: {
      entityType: P
    }
  },
  // Workspace view - the abandoned checkouts list
  {
    type: "workspaceView",
    alias: "Merchello.AbandonedCheckouts.ListView",
    name: "Abandoned Checkouts List View",
    js: () => import("./abandoned-checkouts-list.element-DnOJXXkk.js"),
    weight: 100,
    meta: {
      label: "Abandoned Checkouts",
      pathname: "list",
      icon: "icon-shopping-basket-alt-2"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.AbandonedCheckouts.Workspace"
      }
    ]
  }
], W = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("./create-product-modal.element-BXTIkZbI.js")
  },
  // Option editor modal
  {
    type: "modal",
    alias: "Merchello.OptionEditor.Modal",
    name: "Merchello Option Editor Modal",
    js: () => import("./option-editor-modal.element-BUMNkLop.js")
  },
  // Workspace for products list (when clicking "Products" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Products.Workspace",
    name: "Merchello Products Workspace",
    api: () => import("./products-workspace.context-DYwPAifk.js"),
    meta: {
      entityType: i
    }
  },
  // Workspace view for products list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./products-list.element-CVkD3PR6.js"),
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
  }
], C = [
  // Workspace for customers (when clicking "Customers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Customers.Workspace",
    name: "Merchello Customers Workspace",
    api: () => import("./customers-workspace.context-4uX9Q1D8.js"),
    meta: {
      entityType: t
    }
  },
  // Workspace view - the customers list
  {
    type: "workspaceView",
    alias: "Merchello.Customers.ListView",
    name: "Customers List View",
    js: () => import("./customers-list.element-Dh8quuKN.js"),
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
    js: () => import("./segments-list.element-CBxqxuQn.js"),
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
  // Customer edit modal
  {
    type: "modal",
    alias: "Merchello.Customer.Edit.Modal",
    name: "Customer Edit Modal",
    js: () => import("./customer-edit-modal.element-uvw4-XkC.js")
  },
  // Customer picker modal (for adding members to segments)
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("./customer-picker-modal.element-oSKWq6yh.js")
  },
  // Segment picker modal (for discount eligibility)
  {
    type: "modal",
    alias: "Merchello.SegmentPicker.Modal",
    name: "Segment Picker Modal",
    js: () => import("./segment-picker-modal.element-DKQfs1lJ.js")
  }
], f = [
  // Workspace for collections (when clicking "Collections" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Collections.Workspace",
    name: "Merchello Collections Workspace",
    api: () => import("./collections-workspace.context-VDfu4Pnb.js"),
    meta: {
      entityType: r
    }
  },
  // Workspace view for collections
  {
    type: "workspaceView",
    alias: "Merchello.Collections.Workspace.View",
    name: "Merchello Collections View",
    js: () => import("./collections-workspace.element-D4jVojo1.js"),
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
    js: () => import("./collection-picker-modal.element-MDeihn9a.js")
  },
  // Collection create/edit modal
  {
    type: "modal",
    alias: "Merchello.Collection.Modal",
    name: "Collection Modal",
    js: () => import("./collection-modal.element-CVXmmtwL.js")
  }
], S = [
  // Workspace for filters (when clicking "Filters" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Filters.Workspace",
    name: "Merchello Filters Workspace",
    api: () => import("./filters-workspace.context-BkVbND7c.js"),
    meta: {
      entityType: s
    }
  },
  // Workspace view for filters list
  {
    type: "workspaceView",
    alias: "Merchello.Filters.Workspace.View",
    name: "Merchello Filters View",
    js: () => import("./filters-list.element-C2CyMqZR.js"),
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
    js: () => import("./filter-group-modal.element-DsJWMKei.js")
  },
  // Modal for creating/editing filters
  {
    type: "modal",
    alias: "Merchello.Filter.Modal",
    name: "Merchello Filter Modal",
    js: () => import("./filter-modal.element-CQ1M58_x.js")
  },
  // Filter picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.FilterPicker.Modal",
    name: "Filter Picker Modal",
    js: () => import("./filter-picker-modal.element-Beo3pztH.js")
  },
  // Filter group picker modal (for property editor)
  {
    type: "modal",
    alias: "Merchello.FilterGroupPicker.Modal",
    name: "Filter Group Picker Modal",
    js: () => import("./filter-group-picker-modal.element-Cq_97fOv.js")
  }
], U = [
  // Workspace for product types (when clicking "Product Types" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductTypes.Workspace",
    name: "Merchello Product Types Workspace",
    api: () => import("./product-types-workspace.context-DSmehZTz.js"),
    meta: {
      entityType: c
    }
  },
  // Workspace view for product types
  {
    type: "workspaceView",
    alias: "Merchello.ProductTypes.Workspace.View",
    name: "Merchello Product Types View",
    js: () => import("./product-types-list.element-Cg8iM2V7.js"),
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
    js: () => import("./product-type-modal.element-GAB1iWMp.js")
  },
  // Product type picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.ProductTypePicker.Modal",
    name: "Product Type Picker Modal",
    js: () => import("./product-type-picker-modal.element-Bv8AbVmO.js")
  }
], j = [
  // Workspace for product feed (when clicking "Product Feed" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductFeed.Workspace",
    name: "Merchello Product Feed Workspace",
    api: () => import("./product-feed-workspace.context-BNP2AFIg.js"),
    meta: {
      entityType: n
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
], V = [
  // Workspace for providers (when clicking "Providers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Providers.Workspace",
    name: "Merchello Providers Workspace",
    api: () => import("./providers-workspace.context-CTfJe1AD.js"),
    meta: {
      entityType: u
    }
  }
], v = [
  // Workspace for analytics (when clicking "Analytics" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Analytics.Workspace",
    name: "Merchello Analytics Workspace",
    api: () => import("./analytics-workspace.context-C-Q1H3Yn.js"),
    meta: {
      entityType: p
    }
  },
  // Workspace view for analytics
  {
    type: "workspaceView",
    alias: "Merchello.Analytics.Workspace.View",
    name: "Merchello Analytics View",
    js: () => import("./analytics-workspace.element-fuaClrrL.js"),
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
], A = [
  // Workspace for discounts list (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    api: () => import("./discounts-workspace.context-Cg9UO98l.js"),
    meta: {
      entityType: m
    }
  },
  // Workspace view for discounts list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./discounts-list.element-uVS87_lP.js"),
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
  // Select discount type modal
  {
    type: "modal",
    alias: "Merchello.SelectDiscountType.Modal",
    name: "Select Discount Type Modal",
    js: () => import("./select-discount-type-modal.element-DnbivhSS.js")
  }
], L = [
  // Workspace for emails (when clicking "Emails" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Emails.Workspace",
    name: "Merchello Emails Workspace",
    api: () => import("./email-workspace.context-Dtp5ol8D.js"),
    meta: {
      entityType: M
    }
  },
  // Workspace view - the email list
  {
    type: "workspaceView",
    alias: "Merchello.Emails.ListView",
    name: "Emails List View",
    js: () => import("./email-list.element-CTNnkomI.js"),
    weight: 100,
    meta: {
      label: "Emails",
      pathname: "list",
      icon: "icon-mailbox"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Emails.Workspace"
      }
    ]
  },
  // Email preview modal
  {
    type: "modal",
    alias: "Merchello.Email.Preview.Modal",
    name: "Email Preview Modal",
    js: () => import("./email-preview-modal.element-BP1IwQso.js")
  }
], O = [
  // Workspace for webhooks (when clicking "Webhooks" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Webhooks.Workspace",
    name: "Merchello Webhooks Workspace",
    api: () => import("./webhooks-workspace.context-D7SlERQv.js"),
    meta: {
      entityType: y
    }
  },
  // Workspace view - the webhooks list
  {
    type: "workspaceView",
    alias: "Merchello.Webhooks.ListView",
    name: "Webhooks List View",
    js: () => import("./webhooks-list.element-D46JLCP_.js"),
    weight: 100,
    meta: {
      label: "Webhooks",
      pathname: "list",
      icon: "icon-link"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Webhooks.Workspace"
      }
    ]
  },
  // Webhook subscription create/edit modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Subscription.Modal",
    name: "Webhook Subscription Modal",
    js: () => import("./webhook-subscription-modal.element-BZBuEriM.js")
  },
  // Webhook test modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Test.Modal",
    name: "Webhook Test Modal",
    js: () => import("./webhook-test-modal.element-BZ38h2Gn.js")
  },
  // Delivery detail modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Delivery.Modal",
    name: "Webhook Delivery Detail Modal",
    js: () => import("./delivery-detail-modal.element-BTCbVboD.js")
  },
  // Integration guide modal
  {
    type: "modal",
    alias: "Merchello.WebhookIntegrationGuide.Modal",
    name: "Webhook Integration Guide Modal",
    js: () => import("./webhook-integration-guide-modal.element-BnoGIZn1.js")
  }
], I = [
  // Workspace for notifications (when clicking "Notifications" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Notifications.Workspace",
    name: "Merchello Notifications Workspace",
    api: () => import("./notifications-workspace.context-DYU0z3CZ.js"),
    meta: {
      entityType: w
    }
  },
  // Workspace view - the notifications list (rendered inside workspace editor shell)
  {
    type: "workspaceView",
    alias: "Merchello.Notifications.ListView",
    name: "Notifications List View",
    js: () => import("./notifications-list.element-l_Wec1mb.js"),
    weight: 100,
    meta: {
      label: "Notifications",
      pathname: "list",
      icon: "icon-bell"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Notifications.Workspace"
      }
    ]
  }
], _ = [
  // ============================================
  // Tax Providers (under Providers workspace)
  // ============================================
  // Workspace view for tax providers list (appears as "Tax" tab in Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.TaxProviders.View",
    name: "Tax Providers View",
    js: () => import("./tax-providers-list.element-WnEr3RPU.js"),
    weight: 85,
    meta: {
      label: "Tax",
      pathname: "tax",
      icon: "icon-calculator"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
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
    js: () => import("./tax-group-modal.element-D_UgW0XI.js")
  },
  // Tax rate modal (handles both create and edit for geographic rates)
  {
    type: "modal",
    alias: "Merchello.TaxRate.Modal",
    name: "Merchello Tax Rate Modal",
    js: () => import("./tax-rate-modal.element-7CW-E9SM.js")
  },
  // Tax provider config modal
  {
    type: "modal",
    alias: "Merchello.TaxProviderConfig.Modal",
    name: "Merchello Tax Provider Config Modal",
    js: () => import("./tax-provider-config-modal.element-CiWdGLgI.js")
  },
  // Test tax provider modal
  {
    type: "modal",
    alias: "Merchello.TestTaxProvider.Modal",
    name: "Merchello Test Tax Provider Modal",
    js: () => import("./test-tax-provider-modal.element-mrL_JSdV.js")
  },
  // Shipping tax override modal
  {
    type: "modal",
    alias: "Merchello.ShippingTaxOverride.Modal",
    name: "Merchello Shipping Tax Override Modal",
    js: () => import("./shipping-tax-override-modal.element-CWGD_uzz.js")
  }
], R = [
  // ============================================
  // Suppliers List Workspace
  // ============================================
  // Main workspace for suppliers list
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Suppliers.Workspace",
    name: "Merchello Suppliers Workspace",
    api: () => import("./suppliers-workspace.context-D3JetzuY.js"),
    meta: {
      entityType: d
    }
  },
  // List view for suppliers
  {
    type: "workspaceView",
    alias: "Merchello.Suppliers.ListView",
    name: "Merchello Suppliers List View",
    js: () => import("./suppliers-list.element-Cx_Aat2G.js"),
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
    js: () => import("./supplier-modal.element-985D7RqP.js")
  },
  // Supplier picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.SupplierPicker.Modal",
    name: "Supplier Picker Modal",
    js: () => import("./supplier-picker-modal.element-BqqentHw.js")
  }
], x = [
  // ============================================
  // Warehouses List Workspace
  // ============================================
  // Main workspace for warehouses list (child of Settings in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Warehouses.Workspace",
    name: "Merchello Warehouses Workspace",
    api: () => import("./warehouses-workspace.context-BWNIuwAQ.js"),
    meta: {
      entityType: h
    }
  },
  // List view for warehouses (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.ListView",
    name: "Merchello Warehouses List View",
    js: () => import("./warehouses-list.element-zKmynJag.js"),
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
  // Modals
  // ============================================
  // Service region modal
  {
    type: "modal",
    alias: "Merchello.ServiceRegion.Modal",
    name: "Merchello Service Region Modal",
    js: () => import("./service-region-modal.element-DzqZX1Qq.js")
  },
  // Warehouse picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.WarehousePicker.Modal",
    name: "Warehouse Picker Modal",
    js: () => import("./warehouse-picker-modal.element-Do4o3AY5.js")
  }
], F = [
  // Workspace view for shipping providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ShippingProviders.View",
    name: "Shipping Providers View",
    js: () => import("./shipping-providers-list.element-XRfT2toE.js"),
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
    js: () => import("./shipping-provider-config-modal.element-AtErKkJD.js")
  },
  // Test shipping provider modal
  {
    type: "modal",
    alias: "Merchello.TestProvider.Modal",
    name: "Test Shipping Provider Modal",
    js: () => import("./test-provider-modal.element-CScDl2YH.js")
  },
  // Shipping option detail modal
  {
    type: "modal",
    alias: "Merchello.ShippingOption.Detail.Modal",
    name: "Shipping Option Detail Modal",
    js: () => import("./shipping-option-detail-modal.element-BFlUo9no.js")
  },
  // Shipping cost modal
  {
    type: "modal",
    alias: "Merchello.ShippingCost.Modal",
    name: "Shipping Cost Modal",
    js: () => import("./shipping-cost-modal.element-B-v5sgpH.js")
  },
  // Shipping weight tier modal
  {
    type: "modal",
    alias: "Merchello.ShippingWeightTier.Modal",
    name: "Shipping Weight Tier Modal",
    js: () => import("./shipping-weight-tier-modal.element-C_vxASmR.js")
  }
], Y = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./payment-providers-list.element-D3zzoETe.js"),
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
    js: () => import("./payment-provider-config-modal.element-CxLzsC9b.js")
  },
  // Modal for configuring payment methods within a provider
  {
    type: "modal",
    alias: "Merchello.PaymentMethods.Config.Modal",
    name: "Payment Methods Configuration Modal",
    js: () => import("./payment-methods-config-modal.element-DFMC-i3y.js")
  },
  // Modal for editing a single payment method's display settings
  {
    type: "modal",
    alias: "Merchello.PaymentMethod.Edit.Modal",
    name: "Payment Method Edit Modal",
    js: () => import("./payment-method-edit-modal.element-BA8JoHLr.js")
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
    js: () => import("./test-provider-modal.element-Bk_JRCUj.js")
  }
], N = [
  // Workspace view for fulfilment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.FulfilmentProviders.View",
    name: "Fulfilment Providers View",
    js: () => import("./fulfilment-providers-list.element-CwhUKjcK.js"),
    weight: 75,
    meta: {
      label: "Fulfilment",
      pathname: "fulfilment",
      icon: "icon-box"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  },
  // Configuration modal
  {
    type: "modal",
    alias: "Merchello.FulfilmentProvider.Config.Modal",
    name: "Fulfilment Provider Configuration Modal",
    js: () => import("./fulfilment-provider-config-modal.element-DaQiKjm0.js")
  },
  // Test modal
  {
    type: "modal",
    alias: "Merchello.TestFulfilmentProvider.Modal",
    name: "Test Fulfilment Provider Modal",
    js: () => import("./test-provider-modal.element-CaVEZsMV.js")
  }
], $ = [
  // Workspace view for exchange rate providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ExchangeRateProviders.View",
    name: "Exchange Rate Providers View",
    js: () => import("./exchange-rate-providers-list.element-BPFgD-IN.js"),
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
    js: () => import("./exchange-rate-provider-config-modal.element-C3lBViYm.js")
  },
  // Modal for testing an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Test.Modal",
    name: "Exchange Rate Provider Test Modal",
    js: () => import("./test-provider-modal.element-BLao488n.js")
  }
], D = [
  // Workspace view for address lookup providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.AddressLookupProviders.View",
    name: "Address Lookup Providers View",
    js: () => import("./address-lookup-providers-list.element-CdJtMHOR.js"),
    weight: 85,
    meta: {
      label: "Address Lookup",
      pathname: "address-lookup",
      icon: "icon-map-location"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  },
  // Modal for configuring an address lookup provider
  {
    type: "modal",
    alias: "Merchello.AddressLookupProvider.Config.Modal",
    name: "Address Lookup Provider Configuration Modal",
    js: () => import("./address-lookup-provider-config-modal.element-C7u47qXo.js")
  },
  // Modal for testing an address lookup provider
  {
    type: "modal",
    alias: "Merchello.AddressLookupProvider.Test.Modal",
    name: "Address Lookup Provider Test Modal",
    js: () => import("./test-provider-modal.element-CHwPGuP-.js")
  }
], H = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Upsells.Workspace",
    name: "Merchello Upsells Workspace",
    api: () => import("./upsells-workspace.context-CpAs7qDY.js"),
    meta: {
      entityType: E
    }
  },
  {
    type: "workspaceView",
    alias: "Merchello.Upsells.Workspace.View",
    name: "Merchello Upsells View",
    js: () => import("./upsells-list.element-Cm5wxLwK.js"),
    weight: 100,
    meta: {
      label: "Upsells",
      pathname: "upsells",
      icon: "icon-chart-curve"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Upsells.Workspace"
      }
    ]
  },
  {
    type: "modal",
    alias: "Merchello.CreateUpsell.Modal",
    name: "Create Upsell Modal",
    js: () => import("./create-upsell-modal.element-TrdRFEqF.js")
  }
], G = [
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
], q = [
  // Product picker modal for selecting products in orders and property editors
  {
    type: "modal",
    alias: "Merchello.ProductPicker.Modal",
    name: "Merchello Product Picker Modal",
    js: () => import("./product-picker-modal.element-DUNg5Zej.js")
  }
], B = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.CollectionPicker",
    name: "Merchello Collection Picker",
    element: () => import("./property-editor-ui-collection-picker.element-BCJX7Sqf.js"),
    meta: {
      label: "Collection Picker",
      icon: "icon-folder",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      settings: {
        properties: [
          {
            alias: "maxItems",
            label: "Maximum items",
            description: "Maximum collections allowed (1 = single select, 0 = unlimited)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          }
        ],
        defaultData: [{ alias: "maxItems", value: 1 }]
      }
    }
  }
], K = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.ProductTypePicker",
    name: "Merchello Product Type Picker",
    element: () => import("./property-editor-ui-product-type-picker.element-CxBVXyfC.js"),
    meta: {
      label: "Product Type Picker",
      icon: "icon-tags",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      settings: {
        properties: [
          {
            alias: "maxItems",
            label: "Maximum items",
            description: "Maximum product types allowed (1 = single select, 0 = unlimited)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          }
        ],
        defaultData: [{ alias: "maxItems", value: 1 }]
      }
    }
  }
], z = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.FilterGroupPicker",
    name: "Merchello Filter Group Picker",
    element: () => import("./property-editor-ui-filter-group-picker.element-CBhr-d2U.js"),
    meta: {
      label: "Filter Group Picker",
      icon: "icon-filter",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      settings: {
        properties: [
          {
            alias: "maxItems",
            label: "Maximum items",
            description: "Maximum filter groups allowed (1 = single select, 0 = unlimited)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          }
        ],
        defaultData: [{ alias: "maxItems", value: 1 }]
      }
    }
  }
], J = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.FilterValuePicker",
    name: "Merchello Filter Value Picker",
    element: () => import("./property-editor-ui-filter-value-picker.element-C17d0yN2.js"),
    meta: {
      label: "Filter Value Picker",
      icon: "icon-tags",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      settings: {
        properties: [
          {
            alias: "maxItems",
            label: "Maximum items",
            description: "Maximum filters allowed (1 = single select, 0 = unlimited)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          },
          {
            alias: "filterGroupId",
            label: "Restrict to Group",
            description: "Optional: Only show filters from this group",
            propertyEditorUiAlias: "Merchello.PropertyEditorUi.FilterGroupPicker"
          }
        ],
        defaultData: [{ alias: "maxItems", value: 0 }]
      }
    }
  }
], Q = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.ProductPicker",
    name: "Merchello Product Picker",
    element: () => import("./property-editor-ui-product-picker.element-BrWvktvQ.js"),
    meta: {
      label: "Product Picker",
      icon: "icon-box",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      settings: {
        properties: [
          {
            alias: "minItems",
            label: "Minimum items",
            description: "Minimum products required (0 = optional)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          },
          {
            alias: "maxItems",
            label: "Maximum items",
            description: "Maximum products allowed (1 = single select, 0 = unlimited)",
            propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
            config: [{ alias: "min", value: 0 }]
          },
          {
            alias: "collectionIds",
            label: "Restrict to Collections",
            description: "Optional: Only show products from these collections",
            propertyEditorUiAlias: "Merchello.PropertyEditorUi.CollectionPicker"
          },
          {
            alias: "productTypeIds",
            label: "Restrict to Product Types",
            description: "Optional: Only show products of these types",
            propertyEditorUiAlias: "Merchello.PropertyEditorUi.ProductTypePicker"
          },
          {
            alias: "filterValueIds",
            label: "Restrict to Filter Values",
            description: "Optional: Only show products with these filter values",
            propertyEditorUiAlias: "Merchello.PropertyEditorUi.FilterValuePicker"
          }
        ],
        defaultData: [
          { alias: "minItems", value: 0 },
          { alias: "maxItems", value: 1 }
        ]
      }
    }
  }
], Z = [
  ...e,
  ...o,
  ...a,
  ...T,
  ...b,
  ...g,
  ...W,
  ...C,
  ...f,
  ...S,
  ...U,
  ...j,
  ...V,
  ...v,
  ...A,
  ...L,
  ...O,
  ...I,
  ..._,
  ...R,
  ...x,
  ...F,
  ...Y,
  ...N,
  ...$,
  ...D,
  ...H,
  ...G,
  ...q,
  ...B,
  ...K,
  ...z,
  ...J,
  ...Q
];
export {
  X as M,
  l as a,
  i as b,
  t as c,
  r as d,
  s as e,
  c as f,
  n as g,
  p as h,
  m as i,
  d as j,
  h as k,
  M as l,
  u as m,
  y as n,
  w as o,
  k as p,
  P as q,
  E as r,
  Z as s
};
//# sourceMappingURL=bundle.manifests-BFAWaEj-.js.map
