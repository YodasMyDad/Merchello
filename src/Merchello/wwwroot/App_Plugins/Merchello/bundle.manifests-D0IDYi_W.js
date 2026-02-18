const e = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-DuVy2_EA.js")
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
    element: () => import("./stats-dashboard.element-CKCAe1s7.js"),
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
    api: () => import("./tree-repository-YB0-3jol.js")
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
      "merchello-product-import-export",
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
], l = "merchello-root", i = "merchello-orders", t = "merchello-products", r = "merchello-customers", s = "merchello-collections", c = "merchello-filters", n = "merchello-product-types", p = "merchello-product-feed", m = "merchello-product-import-export", d = "merchello-analytics", h = "merchello-discounts", M = "merchello-suppliers", y = "merchello-warehouses", u = "merchello-emails", k = "merchello-providers", P = "merchello-webhooks", E = "merchello-outstanding", w = "merchello-abandoned-checkouts", T = "merchello-notifications", b = "merchello-upsells", g = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./fulfillment-modal.element-Dq7uAFn4.js")
  },
  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./shipment-edit-modal.element-Db2tij3Y.js")
  },
  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./manual-payment-modal.element-D0nCwXBl.js")
  },
  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./refund-modal.element--GIc1dbg.js")
  },
  // Cancel invoice modal for cancelling invoices
  {
    type: "modal",
    alias: "Merchello.CancelInvoice.Modal",
    name: "Merchello Cancel Invoice Modal",
    js: () => import("./cancel-invoice-modal.element-CXzKSfIh.js")
  },
  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("./export-modal.element-C25Nn-2h.js")
  },
  // Edit order modal for editing order details
  {
    type: "modal",
    alias: "Merchello.EditOrder.Modal",
    name: "Merchello Edit Order Modal",
    js: () => import("./edit-order-modal.element-D-G-wTQC.js")
  },
  // Add custom item modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddCustomItem.Modal",
    name: "Merchello Add Custom Item Modal",
    js: () => import("./add-custom-item-modal.element-CuMjyxZq.js")
  },
  // Add discount modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddDiscount.Modal",
    name: "Merchello Add Discount Modal",
    js: () => import("./add-discount-modal.element-DgNQRmvx.js")
  },
  // Create order modal for creating manual orders from backoffice
  {
    type: "modal",
    alias: "Merchello.CreateOrder.Modal",
    name: "Merchello Create Order Modal",
    js: () => import("./create-order-modal.element-bqUXILW3.js")
  },
  // Customer orders modal for viewing all orders by a customer
  {
    type: "modal",
    alias: "Merchello.CustomerOrders.Modal",
    name: "Merchello Customer Orders Modal",
    js: () => import("./customer-orders-modal.element-C6Qz-8Lo.js")
  },
  // Generate statement modal for downloading customer statement PDFs
  {
    type: "modal",
    alias: "Merchello.GenerateStatement.Modal",
    name: "Merchello Generate Statement Modal",
    js: () => import("./generate-statement-modal.element-B0tiQXwu.js")
  },
  // Workspace for orders list (when clicking "Orders" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Orders.Workspace",
    name: "Merchello Orders Workspace",
    api: () => import("./orders-workspace.context-BoYEw5GR.js"),
    meta: {
      entityType: i
    }
  },
  // Workspace view - the orders list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Orders.ListView",
    name: "Orders List View",
    js: () => import("./orders-list.element-Du8TURok.js"),
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
], C = [
  // Mark as paid modal
  {
    type: "modal",
    alias: "Merchello.MarkAsPaid.Modal",
    name: "Merchello Mark as Paid Modal",
    js: () => import("./mark-as-paid-modal.element-BgT8Lj5Z.js")
  },
  // Workspace for outstanding list (when clicking "Outstanding" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Outstanding.Workspace",
    name: "Merchello Outstanding Workspace",
    api: () => import("./outstanding-workspace.context-CS2VTAQZ.js"),
    meta: {
      entityType: E
    }
  },
  // Workspace view - the outstanding list
  {
    type: "workspaceView",
    alias: "Merchello.Outstanding.ListView",
    name: "Outstanding List View",
    js: () => import("./outstanding-list.element-B7ttwRu0.js"),
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
], W = [
  // Workspace for abandoned checkouts list (when clicking "Abandoned Checkouts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.AbandonedCheckouts.Workspace",
    name: "Merchello Abandoned Checkouts Workspace",
    api: () => import("./abandoned-checkouts-workspace.context-BMKQTRZi.js"),
    meta: {
      entityType: w
    }
  },
  // Workspace view - the abandoned checkouts list
  {
    type: "workspaceView",
    alias: "Merchello.AbandonedCheckouts.ListView",
    name: "Abandoned Checkouts List View",
    js: () => import("./abandoned-checkouts-list.element-CMaQ9WTA.js"),
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
], f = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("./create-product-modal.element-D5rksAXp.js")
  },
  // Option editor modal
  {
    type: "modal",
    alias: "Merchello.OptionEditor.Modal",
    name: "Merchello Option Editor Modal",
    js: () => import("./option-editor-modal.element-CjmivBJ4.js")
  },
  // Variant batch update modal
  {
    type: "modal",
    alias: "Merchello.VariantBatchUpdate.Modal",
    name: "Merchello Variant Batch Update Modal",
    js: () => import("./variant-batch-update-modal.element-DtaqzQ5Y.js")
  },
  // Workspace for products list (when clicking "Products" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Products.Workspace",
    name: "Merchello Products Workspace",
    api: () => import("./products-workspace.context-hTtyYFui.js"),
    meta: {
      entityType: t
    }
  },
  // Workspace view for products list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./products-list.element-CityCuQX.js"),
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
], U = [
  // Workspace for customers (when clicking "Customers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Customers.Workspace",
    name: "Merchello Customers Workspace",
    api: () => import("./customers-workspace.context-CQjB6-wL.js"),
    meta: {
      entityType: r
    }
  },
  // Workspace view - the customers list
  {
    type: "workspaceView",
    alias: "Merchello.Customers.ListView",
    name: "Customers List View",
    js: () => import("./customers-list.element-Df4_i_tY.js"),
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
    js: () => import("./segments-list.element-kzckwugV.js"),
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
    js: () => import("./customer-edit-modal.element-Oqe8pZ5b.js")
  },
  // Customer picker modal (for adding members to segments)
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("./customer-picker-modal.element-MSn4uVWu.js")
  },
  // Segment picker modal (for discount eligibility)
  {
    type: "modal",
    alias: "Merchello.SegmentPicker.Modal",
    name: "Segment Picker Modal",
    js: () => import("./segment-picker-modal.element-mSmqoAUG.js")
  }
], S = [
  // Workspace for collections (when clicking "Collections" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Collections.Workspace",
    name: "Merchello Collections Workspace",
    api: () => import("./collections-workspace.context-YI4itxB9.js"),
    meta: {
      entityType: s
    }
  },
  // Workspace view for collections
  {
    type: "workspaceView",
    alias: "Merchello.Collections.Workspace.View",
    name: "Merchello Collections View",
    js: () => import("./collections-workspace.element-DDKqhmJS.js"),
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
    js: () => import("./collection-picker-modal.element-b5Uyz1bO.js")
  },
  // Collection create/edit modal
  {
    type: "modal",
    alias: "Merchello.Collection.Modal",
    name: "Collection Modal",
    js: () => import("./collection-modal.element-vUZSqpxN.js")
  }
], j = [
  // Workspace for filters (when clicking "Filters" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Filters.Workspace",
    name: "Merchello Filters Workspace",
    api: () => import("./filters-workspace.context-DTRfpIKC.js"),
    meta: {
      entityType: c
    }
  },
  // Workspace view for filters list
  {
    type: "workspaceView",
    alias: "Merchello.Filters.Workspace.View",
    name: "Merchello Filters View",
    js: () => import("./filters-list.element-BsSIIfCv.js"),
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
    js: () => import("./filter-group-modal.element-CUGmlu_m.js")
  },
  // Modal for creating/editing filters
  {
    type: "modal",
    alias: "Merchello.Filter.Modal",
    name: "Merchello Filter Modal",
    js: () => import("./filter-modal.element-CN1TkOmw.js")
  },
  // Filter picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.FilterPicker.Modal",
    name: "Filter Picker Modal",
    js: () => import("./filter-picker-modal.element-DzFk_cRl.js")
  },
  // Filter group picker modal (for property editor)
  {
    type: "modal",
    alias: "Merchello.FilterGroupPicker.Modal",
    name: "Filter Group Picker Modal",
    js: () => import("./filter-group-picker-modal.element-BltMsjII.js")
  }
], V = [
  // Workspace for product types (when clicking "Product Types" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductTypes.Workspace",
    name: "Merchello Product Types Workspace",
    api: () => import("./product-types-workspace.context-CVhAszr4.js"),
    meta: {
      entityType: n
    }
  },
  // Workspace view for product types
  {
    type: "workspaceView",
    alias: "Merchello.ProductTypes.Workspace.View",
    name: "Merchello Product Types View",
    js: () => import("./product-types-list.element-BgHdmBkT.js"),
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
    js: () => import("./product-type-modal.element-DPbGcxuq.js")
  },
  // Product type picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.ProductTypePicker.Modal",
    name: "Product Type Picker Modal",
    js: () => import("./product-type-picker-modal.element-BtNUJ6Bd.js")
  }
], v = [
  // Workspace for product feed (when clicking "Product Feed" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductFeed.Workspace",
    name: "Merchello Product Feed Workspace",
    api: () => import("./product-feed-workspace.context-DO-XWGVC.js"),
    meta: {
      entityType: p
    }
  },
  // Workspace view for product feed
  {
    type: "workspaceView",
    alias: "Merchello.ProductFeed.Workspace.View",
    name: "Merchello Product Feed View",
    js: () => import("./product-feeds-list.element-Cz1ywt9Q.js"),
    weight: 100,
    meta: {
      label: "Product Feeds",
      pathname: "product-feeds",
      icon: "icon-rss"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductFeed.Workspace"
      }
    ]
  },
  {
    type: "modal",
    alias: "Merchello.ProductFeed.Validation.Modal",
    name: "Product Feed Validation Modal",
    js: () => import("./product-feed-validation-modal.element-C_bqe_KB.js")
  }
], A = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductImportExport.Workspace",
    name: "Merchello Product Import Export Workspace",
    api: () => import("./product-import-export-workspace.context-T0xLSTLN.js"),
    meta: {
      entityType: m
    }
  },
  {
    type: "workspaceView",
    alias: "Merchello.ProductImportExport.Workspace.View",
    name: "Merchello Product Import Export View",
    js: () => import("./product-import-export-page.element-Cv0weukr.js"),
    weight: 100,
    meta: {
      label: "Import & Export",
      pathname: "sync",
      icon: "icon-page-up"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductImportExport.Workspace"
      }
    ]
  }
], L = [
  // Workspace for providers (when clicking "Providers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Providers.Workspace",
    name: "Merchello Providers Workspace",
    api: () => import("./providers-workspace.context-G75m_AYI.js"),
    meta: {
      entityType: k
    }
  }
], O = [
  // Workspace for analytics (when clicking "Analytics" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Analytics.Workspace",
    name: "Merchello Analytics Workspace",
    api: () => import("./analytics-workspace.context-B2756Pto.js"),
    meta: {
      entityType: d
    }
  },
  // Workspace view for analytics
  {
    type: "workspaceView",
    alias: "Merchello.Analytics.Workspace.View",
    name: "Merchello Analytics View",
    js: () => import("./analytics-workspace.element-DY6PZP9P.js"),
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
], I = [
  // Workspace for discounts list (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    api: () => import("./discounts-workspace.context-sC8l3PzL.js"),
    meta: {
      entityType: h
    }
  },
  // Workspace view for discounts list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./discounts-list.element-JCIZYlkY.js"),
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
    js: () => import("./select-discount-type-modal.element-Dtpz2BoT.js")
  }
], _ = [
  // Workspace for emails (when clicking "Emails" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Emails.Workspace",
    name: "Merchello Emails Workspace",
    api: () => import("./email-workspace.context-DQKkeea-.js"),
    meta: {
      entityType: u
    }
  },
  // Workspace view - the email list
  {
    type: "workspaceView",
    alias: "Merchello.Emails.ListView",
    name: "Emails List View",
    js: () => import("./email-list.element-NaesdV7N.js"),
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
    js: () => import("./email-preview-modal.element-BqGBm9__.js")
  }
], x = [
  // Workspace for webhooks (when clicking "Webhooks" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Webhooks.Workspace",
    name: "Merchello Webhooks Workspace",
    api: () => import("./webhooks-workspace.context-CaANZX8p.js"),
    meta: {
      entityType: P
    }
  },
  // Workspace view - the webhooks list
  {
    type: "workspaceView",
    alias: "Merchello.Webhooks.ListView",
    name: "Webhooks List View",
    js: () => import("./webhooks-list.element-B2w7fBg2.js"),
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
    js: () => import("./webhook-subscription-modal.element-D5HVqdeJ.js")
  },
  // Webhook test modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Test.Modal",
    name: "Webhook Test Modal",
    js: () => import("./webhook-test-modal.element-DnGlEHiE.js")
  },
  // Delivery detail modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Delivery.Modal",
    name: "Webhook Delivery Detail Modal",
    js: () => import("./delivery-detail-modal.element-DmGlCvjw.js")
  },
  // Integration guide modal
  {
    type: "modal",
    alias: "Merchello.WebhookIntegrationGuide.Modal",
    name: "Webhook Integration Guide Modal",
    js: () => import("./webhook-integration-guide-modal.element-BDO373pt.js")
  }
], R = [
  // Workspace for notifications (when clicking "Notifications" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Notifications.Workspace",
    name: "Merchello Notifications Workspace",
    api: () => import("./notifications-workspace.context-BBVCVS6A.js"),
    meta: {
      entityType: T
    }
  },
  // Workspace view - the notifications list (rendered inside workspace editor shell)
  {
    type: "workspaceView",
    alias: "Merchello.Notifications.ListView",
    name: "Notifications List View",
    js: () => import("./notifications-list.element-C993yFDN.js"),
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
], F = [
  // ============================================
  // Tax Providers (under Providers workspace)
  // ============================================
  // Workspace view for tax providers list (appears as "Tax" tab in Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.TaxProviders.View",
    name: "Tax Providers View",
    js: () => import("./tax-providers-list.element-buSI1Bgr.js"),
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
    js: () => import("./tax-group-modal.element-BzhPFKhe.js")
  },
  // Tax rate modal (handles both create and edit for geographic rates)
  {
    type: "modal",
    alias: "Merchello.TaxRate.Modal",
    name: "Merchello Tax Rate Modal",
    js: () => import("./tax-rate-modal.element-D_hb8TZ6.js")
  },
  // Tax provider config modal
  {
    type: "modal",
    alias: "Merchello.TaxProviderConfig.Modal",
    name: "Merchello Tax Provider Config Modal",
    js: () => import("./tax-provider-config-modal.element-1Pi5woxd.js")
  },
  // Test tax provider modal
  {
    type: "modal",
    alias: "Merchello.TestTaxProvider.Modal",
    name: "Merchello Test Tax Provider Modal",
    js: () => import("./test-tax-provider-modal.element-DBRx-nTM.js")
  },
  // Shipping tax override modal
  {
    type: "modal",
    alias: "Merchello.ShippingTaxOverride.Modal",
    name: "Merchello Shipping Tax Override Modal",
    js: () => import("./shipping-tax-override-modal.element-CDQ7YwC0.js")
  }
], Y = [
  // ============================================
  // Suppliers List Workspace
  // ============================================
  // Main workspace for suppliers list
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Suppliers.Workspace",
    name: "Merchello Suppliers Workspace",
    api: () => import("./suppliers-workspace.context-Bxb5ZwJZ.js"),
    meta: {
      entityType: M
    }
  },
  // List view for suppliers
  {
    type: "workspaceView",
    alias: "Merchello.Suppliers.ListView",
    name: "Merchello Suppliers List View",
    js: () => import("./suppliers-list.element-CtnQDZdI.js"),
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
    js: () => import("./supplier-modal.element-xm2xFD-m.js")
  },
  // Supplier picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.SupplierPicker.Modal",
    name: "Supplier Picker Modal",
    js: () => import("./supplier-picker-modal.element-DYHdkOa-.js")
  }
], D = [
  // ============================================
  // Warehouses List Workspace
  // ============================================
  // Main workspace for warehouses list (child of Settings in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Warehouses.Workspace",
    name: "Merchello Warehouses Workspace",
    api: () => import("./warehouses-workspace.context-CgnKkZrq.js"),
    meta: {
      entityType: y
    }
  },
  // List view for warehouses (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.ListView",
    name: "Merchello Warehouses List View",
    js: () => import("./warehouses-list.element-CIddfqAD.js"),
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
    js: () => import("./service-region-modal.element-DErhtZUp.js")
  },
  // Warehouse picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.WarehousePicker.Modal",
    name: "Warehouse Picker Modal",
    js: () => import("./warehouse-picker-modal.element-D2CG9PZ1.js")
  }
], $ = [
  // Workspace view for shipping providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ShippingProviders.View",
    name: "Shipping Providers View",
    js: () => import("./shipping-providers-list.element-CHtBgnfX.js"),
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
    js: () => import("./shipping-provider-config-modal.element-zMhxpwOU.js")
  },
  // Test shipping provider modal
  {
    type: "modal",
    alias: "Merchello.TestProvider.Modal",
    name: "Test Shipping Provider Modal",
    js: () => import("./test-provider-modal.element-DBCPY8bt.js")
  },
  // Shipping option detail modal
  {
    type: "modal",
    alias: "Merchello.ShippingOption.Detail.Modal",
    name: "Shipping Option Detail Modal",
    js: () => import("./shipping-option-detail-modal.element-VjfFMrz0.js")
  },
  // Shipping cost modal
  {
    type: "modal",
    alias: "Merchello.ShippingCost.Modal",
    name: "Shipping Cost Modal",
    js: () => import("./shipping-cost-modal.element-DqDM8gDP.js")
  },
  // Shipping weight tier modal
  {
    type: "modal",
    alias: "Merchello.ShippingWeightTier.Modal",
    name: "Shipping Weight Tier Modal",
    js: () => import("./shipping-weight-tier-modal.element-DWxT4QIU.js")
  },
  // Shipping destination exclusion modal
  {
    type: "modal",
    alias: "Merchello.ShippingDestinationExclusion.Modal",
    name: "Shipping Destination Exclusion Modal",
    js: () => import("./shipping-destination-exclusion-modal.element-DbEg37yk.js")
  },
  // Shipping postcode rule modal
  {
    type: "modal",
    alias: "Merchello.ShippingPostcodeRule.Modal",
    name: "Shipping Postcode Rule Modal",
    js: () => import("./shipping-postcode-rule-modal.element-6Wtqfb5Q.js")
  }
], N = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./payment-providers-list.element-CeJuPyyC.js"),
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
    js: () => import("./payment-provider-config-modal.element-Baumx2RB.js")
  },
  // Modal for configuring payment methods within a provider
  {
    type: "modal",
    alias: "Merchello.PaymentMethods.Config.Modal",
    name: "Payment Methods Configuration Modal",
    js: () => import("./payment-methods-config-modal.element-D_3-Rnin.js")
  },
  // Modal for editing a single payment method's display settings
  {
    type: "modal",
    alias: "Merchello.PaymentMethod.Edit.Modal",
    name: "Payment Method Edit Modal",
    js: () => import("./payment-method-edit-modal.element-2XAeI_Ro.js")
  },
  // Modal for displaying setup instructions
  {
    type: "modal",
    alias: "Merchello.SetupInstructions.Modal",
    name: "Setup Instructions Modal",
    js: () => import("./setup-instructions-modal.element-MwIiQTRY.js")
  },
  // Modal for testing a payment provider
  {
    type: "modal",
    alias: "Merchello.TestPaymentProvider.Modal",
    name: "Test Payment Provider Modal",
    js: () => import("./test-provider-modal.element-DSdKS8gu.js")
  }
], H = [
  // Workspace view for fulfilment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.FulfilmentProviders.View",
    name: "Fulfilment Providers View",
    js: () => import("./fulfilment-providers-list.element-BpE8W2CJ.js"),
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
    js: () => import("./fulfilment-provider-config-modal.element-C49bpKvV.js")
  },
  // Test modal
  {
    type: "modal",
    alias: "Merchello.TestFulfilmentProvider.Modal",
    name: "Test Fulfilment Provider Modal",
    js: () => import("./test-provider-modal.element-DlKk8_xe.js")
  }
], G = [
  // Workspace view for exchange rate providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ExchangeRateProviders.View",
    name: "Exchange Rate Providers View",
    js: () => import("./exchange-rate-providers-list.element-ZijxNCCW.js"),
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
    js: () => import("./exchange-rate-provider-config-modal.element-BOVkmf6w.js")
  },
  // Modal for testing an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Test.Modal",
    name: "Exchange Rate Provider Test Modal",
    js: () => import("./test-provider-modal.element-C_QCW5c0.js")
  }
], B = [
  // Workspace view for address lookup providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.AddressLookupProviders.View",
    name: "Address Lookup Providers View",
    js: () => import("./address-lookup-providers-list.element-CzfVqcPq.js"),
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
    js: () => import("./address-lookup-provider-config-modal.element-BVwlCAWE.js")
  },
  // Modal for testing an address lookup provider
  {
    type: "modal",
    alias: "Merchello.AddressLookupProvider.Test.Modal",
    name: "Address Lookup Provider Test Modal",
    js: () => import("./test-provider-modal.element-Deu1IwzU.js")
  }
], q = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Upsells.Workspace",
    name: "Merchello Upsells Workspace",
    api: () => import("./upsells-workspace.context-DYpGcS3D.js"),
    meta: {
      entityType: b
    }
  },
  {
    type: "workspaceView",
    alias: "Merchello.Upsells.Workspace.View",
    name: "Merchello Upsells View",
    js: () => import("./upsells-list.element-CRRNO4m3.js"),
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
    js: () => import("./create-upsell-modal.element-bhVvWifL.js")
  },
  {
    type: "modal",
    alias: "Merchello.UpsellStyle.Modal",
    name: "Upsell Style Modal",
    js: () => import("./upsell-style-modal.element-CfVJKB6J.js")
  }
], K = [
  // Workspace for root (when clicking "Merchello" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Root.Workspace",
    name: "Merchello Root Workspace",
    api: () => import("./settings-workspace.context-CaEQr_lz.js"),
    meta: {
      entityType: l
    }
  },
  {
    type: "workspaceView",
    alias: "Merchello.Root.Workspace.View",
    name: "Merchello Root View",
    js: () => import("./settings-workspace.element-CSFqh_Pk.js"),
    weight: 100,
    meta: {
      label: "Overview",
      pathname: "overview",
      icon: "icon-home"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Root.Workspace"
      }
    ]
  }
], z = [
  // Product picker modal for selecting products in orders and property editors
  {
    type: "modal",
    alias: "Merchello.ProductPicker.Modal",
    name: "Merchello Product Picker Modal",
    js: () => import("./product-picker-modal.element-Cg4K2-0Z.js")
  }
], X = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.CollectionPicker",
    name: "Merchello Collection Picker",
    element: () => import("./property-editor-ui-collection-picker.element-C47OYL_O.js"),
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
], J = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.ProductTypePicker",
    name: "Merchello Product Type Picker",
    element: () => import("./property-editor-ui-product-type-picker.element-BMMevjxv.js"),
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
], Q = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.FilterGroupPicker",
    name: "Merchello Filter Group Picker",
    element: () => import("./property-editor-ui-filter-group-picker.element-B8RMYQAB.js"),
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
], Z = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.FilterValuePicker",
    name: "Merchello Filter Value Picker",
    element: () => import("./property-editor-ui-filter-value-picker.element-CHuKG1Ig.js"),
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
], ee = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.ProductPicker",
    name: "Merchello Product Picker",
    element: () => import("./property-editor-ui-product-picker.element-Cf32mnfF.js"),
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
], oe = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.GoogleShoppingCategoryPicker",
    name: "Merchello Google Shopping Category Picker",
    element: () => import("./property-editor-ui-google-shopping-category-picker.element-DVqp52fd.js"),
    meta: {
      label: "Google Shopping Category Picker",
      icon: "icon-shopping-basket-alt-2",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String"
    }
  }
], ae = [
  {
    type: "propertyContext",
    alias: "Merchello.PropertyContext.DropdownLayout",
    name: "Merchello Dropdown Layout Property Context",
    api: () => import("./dropdown-layout.property-context-DYQ0zB7v.js"),
    forPropertyEditorUis: [
      "Umb.PropertyEditorUi.Dropdown",
      "Umb.PropertyEditorUi.Select"
    ],
    meta: {},
    weight: 500
  }
], le = [
  ...e,
  ...o,
  ...a,
  ...g,
  ...C,
  ...W,
  ...f,
  ...U,
  ...S,
  ...j,
  ...V,
  ...v,
  ...A,
  ...L,
  ...O,
  ...I,
  ..._,
  ...x,
  ...R,
  ...F,
  ...Y,
  ...D,
  ...$,
  ...N,
  ...H,
  ...G,
  ...B,
  ...q,
  ...K,
  ...z,
  ...X,
  ...J,
  ...Q,
  ...Z,
  ...ee,
  ...oe,
  ...ae
];
export {
  l as M,
  i as a,
  t as b,
  r as c,
  s as d,
  c as e,
  n as f,
  p as g,
  d as h,
  h as i,
  M as j,
  y as k,
  u as l,
  k as m,
  P as n,
  T as o,
  E as p,
  w as q,
  b as r,
  m as s,
  le as t
};
//# sourceMappingURL=bundle.manifests-D0IDYi_W.js.map
