# Installing Merchello

Merchello is an enterprise ecommerce package for Umbraco v17+. This guide walks you through getting a working Merchello installation, whether you want the full starter site or just the NuGet package added to an existing Umbraco project.

## Prerequisites

Before you begin, make sure you have:

- **.NET 10 SDK** installed (Merchello targets `net10.0`; see [Merchello.csproj](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Merchello.csproj))
- **Umbraco v17+** (Merchello is built specifically for this major version)
- A code editor (Visual Studio, VS Code, Rider, etc.)

## Which Version?

Merchello is in public beta. The current package versions are visible on [nuget.org](https://www.nuget.org/packages/Umbraco.Community.Merchello) and the [GitHub releases page](https://github.com/YodasMyDad/Merchello/releases). Replace `<version>` in the commands below (for example `1.0.0-beta.7`). The starter template and the main package are always released together on matching versions.

## Option 1: .NET Template (Recommended for New Projects)

The fastest way to get started is with the Merchello starter site template. This gives you a working example store with products, categories, basket, and checkout already wired up. The template mirrors the in-repo example at [src/Merchello.Site](https://github.com/YodasMyDad/Merchello/tree/main/src/Merchello.Site) (see [the prepare-starter-template script](https://github.com/YodasMyDad/Merchello/blob/main/scripts/prepare-starter-template.ps1) for how it is produced) with Merchello referenced as a NuGet package instead of a project reference.

```bash
# Install the template (once per machine)
dotnet new install Umbraco.Community.Merchello.StarterSite::<version>

# Scaffold your project
dotnet new merchello-starter -n MyStore
```

This creates a project named `MyStore.Web` (the `.Web` suffix is added automatically by the template, defined in [.template.config/template.json](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/.template.config/template.json)). If you want a different project name, use the `--projectName` flag:

```bash
dotnet new merchello-starter -n MyStore --projectName MyCustomProjectName
```

The template ships with uSync content pre-exported under `uSync/v17/` so first-run imports sample pages (homepage, categories, basket) automatically. See the [Starter Site Walkthrough](./starter-site-walkthrough.md) for a tour of what you get.

> **Tip:** After scaffolding, just start the application, complete the Umbraco install wizard, then log in and run uSync to import the sample content. Watch the [setup video](https://www.youtube.com/watch?v=jRSXaJpZekE) for an end-to-end walkthrough.

## Option 2: NuGet Package (Existing Project)

If you already have an Umbraco v17+ site and want to add Merchello to it, install the NuGet package directly:

```bash
dotnet add package Umbraco.Community.Merchello --version <version>
```

### Register Merchello in Program.cs

After installing the package, you need to add Merchello to the Umbraco builder pipeline. Open your `Program.cs` and add `.AddMerchello()`. This mirrors exactly what the starter site does in [Program.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/Program.cs):

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .AddMerchello()   // <-- Add this line
    .Build();

var app = builder.Build();

await app.BootUmbracoAsync();

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
```

The `AddMerchello()` extension registers every Merchello service, factory, background job, notification handler, email/webhook handler, content finder, and SignalR hub in one call. See [Startup.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Startup.cs) for the full registration list. You do not need to wire up middleware manually -- Merchello installs itself via an `IStartupFilter` and an `UmbracoPipelineFilter` internally.

> **Note:** Merchello shares Umbraco's database. It registers its own `MerchelloDbContext` against Umbraco's configured database provider (SQLite or SQL Server) -- you do not need a separate connection string.

### Configure appsettings.json

Add a `Merchello` section to your `appsettings.json` with at least these core settings:

```json
{
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
}
```

| Setting | Description |
| --- | --- |
| `InstallSeedData` | When `true`, exposes the seed data installer panel in the backoffice. Set to `false` if you do not want sample products. |
| `StoreCurrencyCode` | ISO 4217 currency code for your store (e.g. `"GBP"`, `"EUR"`, `"USD"`). This is the base currency for all stored amounts -- see the multi-currency invariants in [Multi-Currency Overview](../multi-currency/multi-currency-overview.md). |
| `DefaultShippingCountry` | ISO 3166-1 alpha-2 country code (e.g. `"GB"`, `"US"`). Used as the default when no customer preference is set. |

> **Invariant:** `StoreCurrencyCode` is the store currency. Basket amounts are stored in this currency and never change when a customer views prices in a different display currency. Display conversion is calculated on-the-fly; checkout and payment always use the stored value. Changing `StoreCurrencyCode` after go-live is not supported.

For a full list of every configuration option, see the [Configuration Reference](./configuration-reference.md).

## Enable the Merchello Section

After your first startup, you need to give your admin user access to the Merchello backoffice section:

1. Log into the Umbraco backoffice
2. Go to **Settings > User Groups**
3. Edit the **Administrators** group (or whichever group your user belongs to)
4. Under **Allowed Sections**, enable **Merchello**
5. Save

You should now see the Merchello section in the backoffice sidebar.

## Install Seed Data (Optional)

If you set `InstallSeedData` to `true`, you will see an **Install Seed Data** panel when you click on the Merchello root node in the backoffice tree. Clicking install will populate your store with sample products, warehouses, suppliers, customers, invoices, discounts, and more. This is great for exploring the system and testing your frontend.

The install can take a little time -- the panel will disappear when it is complete.

> **Warning:** Seed data is intended for development and testing. Do not install it on a production site.

See the [Seed Data](./seed-data.md) guide for details on exactly what gets created.

## What Happens at Startup

When Merchello starts for the first time, it automatically:

1. **Runs database migrations** -- `RunMerchMigration` (wired in [Startup.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Startup.cs)) applies EF Core migrations and creates every Merchello table alongside your Umbraco tables.
2. **Ensures built-in payment providers** -- the Manual Payment provider is created and enabled so you can process test orders without configuring a gateway.
3. **Installs essential data types** -- the product description TipTap rich text editor is registered. This runs regardless of `InstallSeedData`.
4. **Registers product routing** -- if `EnableProductRendering` is `true` (the default), `ProductContentFinder` resolves product root URLs directly without an Umbraco content node.
5. **Registers checkout routing** -- if `EnableCheckout` is `true` (the default), `CheckoutContentFinder` serves the integrated checkout at `/checkout`.
6. **Starts background jobs** -- exchange rate refresh, abandoned cart detection, outbound delivery (emails/webhooks), fulfilment polling, UCP signing key rotation, product sync worker, and more. See [Background Jobs](../background-jobs/background-jobs.md) for the full list.

## First 15 Minutes (Starter Template Flow)

After `dotnet new merchello-starter`:

1. Run the site (`dotnet run`) and complete the Umbraco install wizard.
2. Log into the backoffice and enable the **Merchello** section on your user group (see above).
3. Open the **uSync** dashboard and run an import to load the sample content tree (homepage, categories, basket page, product listing templates).
4. Open the **Merchello** section and click the root node. If `InstallSeedData` is `true`, click **Install Seed Data** to populate products, warehouses, customers, and sample invoices.
5. Browse the storefront -- homepage shows the seeded best sellers, category pages list products with filters, and any product URL (e.g. `/mesh-office-chair`) renders via `ProductContentFinder`.
6. Add a product to the basket, then visit `/checkout` to see the integrated Shopify-style checkout using the Manual Payment provider.

See [Starter Site Walkthrough](./starter-site-walkthrough.md) for a file-by-file tour of what each page does.

## Next Steps

- [Starter Site Walkthrough](./starter-site-walkthrough.md) -- explore the example store page by page
- [Project Structure](./project-structure.md) -- understand how Merchello is organized
- [Seed Data](./seed-data.md) -- what the seeder creates and why
- [Configuration Reference](./configuration-reference.md) -- every available setting with defaults
- [Store Settings](../store-configuration/store-settings.md) -- backoffice-managed store identity and contact details
