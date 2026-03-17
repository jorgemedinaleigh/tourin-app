using Amazon.S3;
using Amazon;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tourin.Application;

namespace Tourin.Infrastructure;

public static class ServiceCollectionExtensions
{
  public static IServiceCollection AddTourinInfrastructure(this IServiceCollection services, IConfiguration configuration)
  {
    services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
    services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));

    var databaseOptions = configuration
      .GetSection(DatabaseOptions.SectionName)
      .Get<DatabaseOptions>() ?? new DatabaseOptions();
    var storageOptions = configuration
      .GetSection(StorageOptions.SectionName)
      .Get<StorageOptions>() ?? new StorageOptions();

    var provider = databaseOptions.Provider?.Trim().ToLowerInvariant();
    if (provider == "postgres" && !string.IsNullOrWhiteSpace(databaseOptions.ConnectionString))
    {
      services.AddDbContext<TourinDbContext>(options => options.UseNpgsql(databaseOptions.ConnectionString));
    }
    else
    {
      var databaseRoot = new InMemoryDatabaseRoot();
      services.AddSingleton(databaseRoot);
      services.AddDbContext<TourinDbContext>(options => options.UseInMemoryDatabase(databaseOptions.InMemoryName, databaseRoot));
    }

    var region = string.IsNullOrWhiteSpace(storageOptions.Region) ? "us-east-1" : storageOptions.Region.Trim();
    services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(RegionEndpoint.GetBySystemName(region)));
    services.AddScoped<ITourinDataAccess, EfCoreTourinDataAccess>();
    services.AddScoped<IAvatarStorageService, S3AvatarStorageService>();
    services.AddSingleton<ISystemClock, SystemClock>();
    services.AddHostedService<SeedDataHostedService>();

    return services;
  }
}
