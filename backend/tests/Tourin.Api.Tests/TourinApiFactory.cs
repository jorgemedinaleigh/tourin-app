using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tourin.Infrastructure;

namespace Tourin.Api.Tests;

public sealed class TourinApiFactory : WebApplicationFactory<Program>
{
  private readonly string _databaseName;

  public TourinApiFactory(string? databaseName = null)
  {
    _databaseName = databaseName ?? Guid.NewGuid().ToString("N");
  }

  protected override void ConfigureWebHost(IWebHostBuilder builder)
  {
    builder.UseEnvironment("Development");
    builder.ConfigureAppConfiguration((_, configBuilder) =>
    {
      configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
      {
        ["Database:Provider"] = "InMemory",
        ["Database:InMemoryName"] = _databaseName,
        ["Auth:AllowDevelopmentBypass"] = "true",
        ["Auth:RequireHttpsMetadata"] = "false",
      });
    });
  }

  public async Task SeedAsync(Func<TourinDbContext, Task> seed)
  {
    using var scope = Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<TourinDbContext>();
    await seed(dbContext);
    await dbContext.SaveChangesAsync();
  }
}
