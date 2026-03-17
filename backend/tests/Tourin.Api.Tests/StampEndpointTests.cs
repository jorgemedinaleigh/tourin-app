using System.Net;
using System.Net.Http.Json;
using Tourin.Application;
using Tourin.Domain;

namespace Tourin.Api.Tests;

public sealed class StampEndpointTests
{
  [Fact]
  public async Task StampVisit_InsideRadius_UpdatesStatsAndUnlocksAchievement()
  {
    await using var factory = new TourinApiFactory();
    await factory.SeedAsync(async dbContext =>
    {
      dbContext.HeritageSites.Add(new HeritageSite(
        "site-1",
        "Cerro Santa Lucia",
        "Test heritage site",
        -33.4391,
        -70.6413,
        25,
        250));

      await Task.CompletedTask;
    });

    using var client = factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Dev-User-Id", "user-1");
    client.DefaultRequestHeaders.Add("X-Dev-User-Email", "user-1@tourin.app");
    client.DefaultRequestHeaders.Add("X-Dev-User-Name", "User One");

    var response = await client.PostAsJsonAsync("/v1/visits/stamp", new StampVisitRequest(
      "site-1",
      -33.4390,
      -70.6412,
      DateTimeOffset.UtcNow));

    response.EnsureSuccessStatusCode();
    var payload = await response.Content.ReadAsStringAsync();

    Assert.Contains("\"siteId\":\"site-1\"", payload);
    Assert.Contains("\"sitesVisited\":1", payload);
    Assert.Contains("\"score\":25", payload);
    Assert.Contains("\"first-stamp\"", payload);
  }

  [Fact]
  public async Task StampVisit_DuplicateVisit_ReturnsConflict()
  {
    await using var factory = new TourinApiFactory();
    await factory.SeedAsync(async dbContext =>
    {
      dbContext.HeritageSites.Add(new HeritageSite(
        "site-1",
        "Cerro Santa Lucia",
        "Test heritage site",
        -33.4391,
        -70.6413,
        25,
        250));

      dbContext.Users.Add(new UserProfile("user-1", "user-1@tourin.app", "User One", DateTimeOffset.UtcNow));
      dbContext.Visits.Add(new Visit(
        Guid.NewGuid(),
        "user-1",
        "site-1",
        DateTimeOffset.UtcNow,
        DateTimeOffset.UtcNow,
        -33.4390,
        -70.6412,
        25));

      await Task.CompletedTask;
    });

    using var client = factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Dev-User-Id", "user-1");
    client.DefaultRequestHeaders.Add("X-Dev-User-Email", "user-1@tourin.app");
    client.DefaultRequestHeaders.Add("X-Dev-User-Name", "User One");

    var response = await client.PostAsJsonAsync("/v1/visits/stamp", new StampVisitRequest(
      "site-1",
      -33.4390,
      -70.6412,
      DateTimeOffset.UtcNow));

    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
  }

  [Fact]
  public async Task StampVisit_OutsideRadius_ReturnsBadRequest()
  {
    await using var factory = new TourinApiFactory();
    await factory.SeedAsync(async dbContext =>
    {
      dbContext.HeritageSites.Add(new HeritageSite(
        "site-1",
        "Cerro Santa Lucia",
        "Test heritage site",
        -33.4391,
        -70.6413,
        25,
        50));

      await Task.CompletedTask;
    });

    using var client = factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Dev-User-Id", "user-1");
    client.DefaultRequestHeaders.Add("X-Dev-User-Email", "user-1@tourin.app");
    client.DefaultRequestHeaders.Add("X-Dev-User-Name", "User One");

    var response = await client.PostAsJsonAsync("/v1/visits/stamp", new StampVisitRequest(
      "site-1",
      -33.4500,
      -70.6500,
      DateTimeOffset.UtcNow));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }
}
