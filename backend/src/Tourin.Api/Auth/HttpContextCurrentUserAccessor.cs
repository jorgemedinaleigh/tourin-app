using System.Security.Claims;
using Tourin.Application;

namespace Tourin.Api.Auth;

public sealed class HttpContextCurrentUserAccessor : ICurrentUserAccessor
{
  private readonly IHttpContextAccessor _httpContextAccessor;

  public HttpContextCurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
  {
    _httpContextAccessor = httpContextAccessor;
  }

  public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

  public string? UserId => FindValue("sub") ?? FindValue(ClaimTypes.NameIdentifier);

  public string? Email => FindValue(ClaimTypes.Email) ?? FindValue("email");

  public string? DisplayName =>
    FindValue("name") ??
    FindValue("preferred_username") ??
    FindValue("cognito:username") ??
    Email;

  private string? FindValue(string claimType)
  {
    return _httpContextAccessor.HttpContext?.User?.FindFirstValue(claimType);
  }
}
