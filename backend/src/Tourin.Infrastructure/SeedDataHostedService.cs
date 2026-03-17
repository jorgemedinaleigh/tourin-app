using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Tourin.Domain;

namespace Tourin.Infrastructure;

public sealed class SeedDataHostedService : IHostedService
{
  private readonly IServiceProvider _serviceProvider;

  public SeedDataHostedService(IServiceProvider serviceProvider)
  {
    _serviceProvider = serviceProvider;
  }

  public async Task StartAsync(CancellationToken cancellationToken)
  {
    using var scope = _serviceProvider.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<TourinDbContext>();

    if (dbContext.Database.IsInMemory())
    {
      await dbContext.Database.EnsureCreatedAsync(cancellationToken);
    }
    else
    {
      await dbContext.Database.MigrateAsync(cancellationToken);
    }

    var existingCodes = await dbContext.Achievements
      .Select(item => item.Code)
      .ToListAsync(cancellationToken);

    var seeds = new[]
    {
      new Achievement(
        Guid.Parse("94e1c72b-fc0c-4996-8c5d-1e80f2c1ea1e"),
        "first-stamp",
        "Primer sello",
        "Obtienes tu primera estampa en Tourin.",
        "Visita y estampa 1 sitio.",
        "https://placehold.co/256x256/png?text=1",
        AchievementRuleType.SitesVisited,
        1),
      new Achievement(
        Guid.Parse("03891827-ab0d-4296-9897-1de48e0ad0d8"),
        "sites-5",
        "Explorador curioso",
        "Has recorrido una buena parte del mapa.",
        "Visita y estampa 5 sitios.",
        "https://placehold.co/256x256/png?text=5",
        AchievementRuleType.SitesVisited,
        5),
      new Achievement(
        Guid.Parse("ef73cae4-c4cc-42a6-9f53-a50ec51879d4"),
        "sites-10",
        "Coleccionista de sellos",
        "Tu pasaporte ya muestra constancia.",
        "Visita y estampa 10 sitios.",
        "https://placehold.co/256x256/png?text=10",
        AchievementRuleType.SitesVisited,
        10),
      new Achievement(
        Guid.Parse("d30ae334-a92a-43d4-b0c1-cbff49703778"),
        "score-100",
        "100 puntos",
        "Alcanzas los primeros 100 puntos en Tourin.",
        "Consigue 100 puntos.",
        "https://placehold.co/256x256/png?text=100",
        AchievementRuleType.Score,
        100),
      new Achievement(
        Guid.Parse("8f88b8a0-f5df-40fd-940d-86b57db2a3c4"),
        "score-500",
        "500 puntos",
        "Ya tienes un avance serio dentro de la app.",
        "Consigue 500 puntos.",
        "https://placehold.co/256x256/png?text=500",
        AchievementRuleType.Score,
        500),
    };

    var missingSeeds = seeds
      .Where(item => !existingCodes.Contains(item.Code, StringComparer.OrdinalIgnoreCase))
      .ToArray();

    if (missingSeeds.Length == 0)
    {
      return;
    }

    dbContext.Achievements.AddRange(missingSeeds);
    await dbContext.SaveChangesAsync(cancellationToken);
  }

  public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
