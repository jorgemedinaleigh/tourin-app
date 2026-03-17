using System.Net;

namespace Tourin.Api.Tests;

public sealed class MeEndpointTests
{
  [Fact]
  public async Task GetMe_WithoutAuthentication_ReturnsUnauthorized()
  {
    await using var factory = new TourinApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/v1/me");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task GetMe_WithDevelopmentHeaders_UpsertsCurrentUser()
  {
    await using var factory = new TourinApiFactory();
    using var client = factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Dev-User-Id", "user-123");
    client.DefaultRequestHeaders.Add("X-Dev-User-Email", "user-123@tourin.app");
    client.DefaultRequestHeaders.Add("X-Dev-User-Name", "Tourin Tester");

    var response = await client.GetAsync("/v1/me");
    var payload = await response.Content.ReadAsStringAsync();

    response.EnsureSuccessStatusCode();
    Assert.Contains("\"id\":\"user-123\"", payload);
    Assert.Contains("\"name\":\"Tourin Tester\"", payload);
    Assert.Contains("\"sitesVisited\":0", payload);
  }
}
