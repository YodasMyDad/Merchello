using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Merchello.Core.Data;

public class MerchDesignTimeDbContextFactory : IDesignTimeDbContextFactory<MerchDbContext>
{
    public MerchDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Merch.Web"))
            .AddJsonFile("appSettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appSettings.{environment}.json", optional: true)
            .Build();

        var connectionString = configuration.GetSection("Merch").GetValue<string>("ConnectionString");

        var optionsBuilder = new DbContextOptionsBuilder<MerchDbContext>();
        optionsBuilder.UseSqlServer(connectionString, builder => builder.MigrationsHistoryTable(tableName: "MerchMigrations"));

        return new MerchDbContext(optionsBuilder.Options, configuration);
    }
}

public class MerchSqliteDesignTimeDbContextFactory : IDesignTimeDbContextFactory<SqliteMerchDbContext>
{
    public SqliteMerchDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Merch.Web"))
            .AddJsonFile("appSettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appSettings.{environment}.json", optional: true)
            .Build();

        var connectionString = configuration.GetSection("Merch").GetValue<string>("ConnectionString");

        var optionsBuilder = new DbContextOptionsBuilder<SqliteMerchDbContext>();
        optionsBuilder.UseSqlite(connectionString);

        return new SqliteMerchDbContext(optionsBuilder.Options, configuration);
    }
}

public class MerchPostgreSqlDesignTimeDbContextFactory : IDesignTimeDbContextFactory<PostgreSqlMerchDbContext>
{
    public PostgreSqlMerchDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Merch.Web"))
            .AddJsonFile("appSettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appSettings.{environment}.json", optional: true)
            .Build();

        var connectionString = configuration.GetSection("Merch").GetValue<string>("ConnectionString");

        var optionsBuilder = new DbContextOptionsBuilder<PostgreSqlMerchDbContext>();
        optionsBuilder.UseNpgsql(connectionString, builder => builder.MigrationsHistoryTable(tableName: "MerchMigrations"));

        return new PostgreSqlMerchDbContext(optionsBuilder.Options, configuration);
    }
}
