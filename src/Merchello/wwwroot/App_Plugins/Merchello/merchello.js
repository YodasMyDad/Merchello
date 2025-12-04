const e = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-C4I35199.js")
  }
], a = [
  {
    name: "Merchello Dashboard",
    alias: "Merchello.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element-BnrZiiT_.js"),
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
    element: () => import("./stats-dashboard.element-DZEoeL52.js"),
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
    api: () => import("./repository-C_EO0E2_.js")
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
      "merchello-providers",
      "merchello-analytics",
      "merchello-marketing",
      "merchello-settings",
      "merchello-warehouses",
      "merchello-shipping"
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
], i = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./fulfillment-modal.element-CLlr4mi2.js")
  },
  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./shipment-edit-modal.element-Dhtc2Gfr.js")
  },
  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./manual-payment-modal.element-DNAhnbJF.js")
  },
  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./refund-modal.element-CdmcT7Vk.js")
  },
  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("./export-modal.element-CPg7bk3_.js")
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
    js: () => import("./orders-list.element-DNiHW7_-.js"),
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
    api: () => import("./order-detail-workspace.context-de2-Lf5u.js"),
    meta: {
      entityType: "merchello-order"
    }
  }
], t = [
  // Workspace for products (when clicking "Products" in tree)
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
  // Workspace view for products
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./products-workspace.element-DJMzQim_.js"),
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
  // Workspace view for customers
  {
    type: "workspaceView",
    alias: "Merchello.Customers.Workspace.View",
    name: "Merchello Customers View",
    js: () => import("./customers-workspace.element-8UV46O-R.js"),
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
  },
  // Workspace view for providers overview
  {
    type: "workspaceView",
    alias: "Merchello.Providers.Workspace.View",
    name: "Merchello Providers View",
    js: () => import("./providers-workspace.element-DUC_gQpN.js"),
    weight: 100,
    meta: {
      label: "Overview",
      pathname: "overview",
      icon: "icon-nodes"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace"
      }
    ]
  }
], c = [
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
    js: () => import("./analytics-workspace.element-BvcWxAL1.js"),
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
], n = [
  // Workspace for marketing (when clicking "Marketing" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Marketing.Workspace",
    name: "Merchello Marketing Workspace",
    meta: {
      entityType: "merchello-marketing",
      headline: "Marketing"
    }
  },
  // Workspace view for marketing
  {
    type: "workspaceView",
    alias: "Merchello.Marketing.Workspace.View",
    name: "Merchello Marketing View",
    js: () => import("./marketing-workspace.element-C61vfnfG.js"),
    weight: 100,
    meta: {
      label: "Marketing",
      pathname: "marketing",
      icon: "icon-megaphone"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Marketing.Workspace"
      }
    ]
  }
], m = [
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
  },
  // Workspace for settings entity type
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Settings.Workspace",
    name: "Merchello Settings Workspace",
    meta: {
      entityType: "merchello-settings",
      headline: "Settings"
    }
  },
  // Workspace view for settings
  {
    type: "workspaceView",
    alias: "Merchello.Settings.Workspace.View",
    name: "Merchello Settings View",
    js: () => import("./settings-workspace.element-CkzsBEgG.js"),
    weight: 100,
    meta: {
      label: "Settings",
      pathname: "settings",
      icon: "icon-settings"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Settings.Workspace"
      }
    ]
  }
], p = [
  // Workspace for warehouses (child of Settings in tree)
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
  // Workspace view for warehouses
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.Workspace.View",
    name: "Merchello Warehouses View",
    js: () => import("./warehouses-workspace.element-p6XyIaEc.js"),
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
  }
], h = [
  // Workspace for shipping (child of Settings in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Shipping.Workspace",
    name: "Merchello Shipping Workspace",
    meta: {
      entityType: "merchello-shipping",
      headline: "Shipping"
    }
  },
  // Workspace view for shipping
  {
    type: "workspaceView",
    alias: "Merchello.Shipping.Workspace.View",
    name: "Merchello Shipping View",
    js: () => import("./shipping-workspace.element-Cr-E2dGp.js"),
    weight: 100,
    meta: {
      label: "Shipping",
      pathname: "shipping",
      icon: "icon-truck"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Shipping.Workspace"
      }
    ]
  }
], d = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./payment-providers-list.element-B1u704eC.js"),
    weight: 90,
    meta: {
      label: "Payment Providers",
      pathname: "payment-providers",
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
    js: () => import("./payment-provider-config-modal.element-DPMiVZS0.js")
  },
  // Modal for displaying setup instructions
  {
    type: "modal",
    alias: "Merchello.SetupInstructions.Modal",
    name: "Setup Instructions Modal",
    js: () => import("./setup-instructions-modal.element-DSNkXTBC.js")
  }
], M = [
  ...e,
  ...a,
  ...o,
  ...l,
  ...i,
  ...t,
  ...r,
  ...s,
  ...c,
  ...n,
  ...m,
  ...p,
  ...h,
  ...d
];
export {
  M as manifests
};
//# sourceMappingURL=merchello.js.map
