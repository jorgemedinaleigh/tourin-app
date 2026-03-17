using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Tourin.Api.Auth;

public sealed class DevelopmentHeaderAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
  public const string SchemeName = "DevelopmentHeader";
  public const string UserIdHeader = "X-Dev-User-Id";
  public const string EmailHeader = "X-Dev-User-Email";
  public const string NameHeader = "X-Dev-User-Name";

  private readonly IConfiguration _configuration;

  public DevelopmentHeaderAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration)
    : base(options, logger, encoder)
  {
    _configuration = configuration;
  }

  protected override Task<AuthenticateResult> HandleAuthenticateAsync()
  {
    var allowDevelopmentBypass = _configuration.GetValue("Auth:AllowDevelopmentBypass", false);
    if (!allowDevelopmentBypass)
    {
      return Task.FromResult(AuthenticateResult.Fail("Development header auth is disabled."));
    }

    if (!Request.Headers.TryGetValue(UserIdHeader, out var userIdValues))
    {
      return Task.FromResult(AuthenticateResult.NoResult());
    }

    var userId = userIdValues.ToString().Trim();
    if (string.IsNullOrWhiteSpace(userId))
    {
      return Task.FromResult(AuthenticateResult.Fail("A development user id is required."));
    }

    var email = Request.Headers.TryGetValue(EmailHeader, out var emailValues)
      ? emailValues.ToString().Trim()
      : $"{userId}@tourin.local";
    var displayName = Request.Headers.TryGetValue(NameHeader, out var nameValues)
      ? nameValues.ToString().Trim()
      : userId;

    var claims = new[]
    {
      new Claim("sub", userId),
      new Claim(ClaimTypes.NameIdentifier, userId),
      new Claim(ClaimTypes.Email, email),
      new Claim("email", email),
      new Claim("name", string.IsNullOrWhiteSpace(displayName) ? userId : displayName),
    };

    var identity = new ClaimsIdentity(claims, SchemeName);
    var principal = new ClaimsPrincipal(identity);
    var ticket = new AuthenticationTicket(principal, SchemeName);

    return Task.FromResult(AuthenticateResult.Success(ticket));
  }
}
