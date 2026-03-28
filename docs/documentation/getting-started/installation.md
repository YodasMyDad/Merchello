# Installing Merchello

Merchello is an enterprise ecommerce package for Umbraco v17+. This guide walks you through getting a working Merchello installation, whether you want the full starter site or just the NuGet package added to an existing Umbraco project.

## Prerequisites

Before you begin, make sure you have:

- **.NET 9+** installed
- **Umbraco v17+** (Merchello is built specifically for this version)
- A code editor (Visual Studio, VS Code, Rider, etc.)

## Option 1: .NET Template (Recommended for New Projects)

The fastest way to get started is with the Merchello starter site template. This gives you a fully working example store with products, categories, basket, and checkout already wired up.

```bash
# Install the template
dotnet new install Umbraco.Community.Merchello.StarterSite@1.0.0-beta.4

# Create your project
dotnet new merchello-starter -n MyStore
```

This creates a project named `MyStore.Web` (the `.Web` suffix is added automatically). If you want a different project name, use the `--projectName` flag:

```bash
dotnet new merchello-starter -n MyStore --projectName MyCustomProjectName
```

> **Tip:** The starter site comes with everything pre-configured. After running the template, just start the application, install Umbraco, and you are ready to go. Watch the [setup video](https://www.youtube.com/watch?v=jRSXaJpZekE) for a walkthrough including uSync content import.

## Option 2: NuGet Package (Existing Project)

If you already have an Umbraco v17+ site and want to add Merchello to it, install the NuGet package directly:

```bash
dotnet add package Umbraco.Community.Merchello --version 1.0.0-beta.4
```

### Register Merchello in Program.cs

After installing the package, you need to add Merchello to the Umbraco builder pipeline. Open your `Program.cs` and add `.AddMerchello()`:

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

That single `.AddMerchello()` call registers all Merchello services, controllers, background jobs, and middleware. No other startup code is needed.

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
|---------|-------------|
| `InstallSeedData` | When `true`, enables the seed data installer in the backoffice. Set to `false` if you do not want sample products. |
| `StoreCurrencyCode` | ISO 4217 currency code for your store (e.g., `"GBP"`, `"EUR"`, `"USD"`). This is the base currency for all transactions. |
| `DefaultShippingCountry` | ISO 3166-1 alpha-2 country code (e.g., `"GB"`, `"US"`). Used as the default when no customer preference is set. |

> **Note:** Change these values to match your store before the first startup. The `StoreCurrencyCode` becomes the base currency for all pricing and transactions.

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

1. **Runs database migrations** -- creates all the Merchello tables in your Umbraco database
2. **Installs essential data types** -- these are always installed regardless of the `InstallSeedData` setting
3. **Registers product routing** -- if `EnableProductRendering` is `true` (the default), products can be accessed at root-level URLs without Umbraco content nodes
4. **Registers checkout routing** -- if `EnableCheckout` is `true` (the default), the integrated checkout is available at `/checkout`
5. **Starts background jobs** -- exchange rate syncing, abandoned cart detection, webhook delivery, and more

## Next Steps

- [Project Structure](./project-structure.md) -- understand how Merchello is organized
- [Starter Site Walkthrough](./starter-site-walkthrough.md) -- explore the example store
- [Configuration Reference](./configuration-reference.md) -- all available settings
- [Store Settings](../store-configuration/store-settings.md) -- configure your store identity and currency
