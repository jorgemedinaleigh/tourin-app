using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Tourin.Api.Auth;
using Tourin.Application;
using Tourin.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();
builder.Services.AddScoped<TourinService>();
builder.Services.AddTourinInfrastructure(builder.Configuration);

builder.Services
  .AddAuthentication(options =>
  {
    options.DefaultAuthenticateScheme = "TourinAuth";
    options.DefaultChallengeScheme = "TourinAuth";
  })
  .AddPolicyScheme("TourinAuth", "Tourin auth", options =>
  {
    options.ForwardDefaultSelector = context =>
    {
      if (context.Request.Headers.ContainsKey(DevelopmentHeaderAuthenticationHandler.UserIdHeader))
      {
        return DevelopmentHeaderAuthenticationHandler.SchemeName;
      }

      return JwtBearerDefaults.AuthenticationScheme;
    };
  })
  .AddScheme<AuthenticationSchemeOptions, DevelopmentHeaderAuthenticationHandler>(
    DevelopmentHeaderAuthenticationHandler.SchemeName,
    _ => { })
  .AddJwtBearer(options =>
  {
    var issuer = builder.Configuration["Auth:Authority"];
    var region = builder.Configuration["Auth:Region"];
    var userPoolId = builder.Configuration["Auth:UserPoolId"];

    if (string.IsNullOrWhiteSpace(issuer) && !string.IsNullOrWhiteSpace(region) && !string.IsNullOrWhiteSpace(userPoolId))
    {
      issuer = $"https://cognito-idp.{region}.amazonaws.com/{userPoolId}";
    }

    options.Authority = issuer;
    options.RequireHttpsMetadata = builder.Configuration.GetValue("Auth:RequireHttpsMetadata", true);
    options.TokenValidationParameters = new TokenValidationParameters
    {
      ValidateAudience = false,
      ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
      ValidIssuer = issuer,
      NameClaimType = "name",
    };
  });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
  errorApp.Run(async context =>
  {
    var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (statusCode, title, detail, errorCode) = exception switch
    {
      TourinAppException appException => (
        appException.StatusCode,
        appException.ErrorCode,
        appException.Message,
        appException.ErrorCode),
      _ => (
        StatusCodes.Status500InternalServerError,
        "internal_server_error",
        "An unexpected error occurred.",
        "internal_server_error"),
    };

    context.Response.StatusCode = statusCode;
    context.Response.ContentType = "application/problem+json";

    await context.Response.WriteAsJsonAsync(new ProblemDetails
    {
      Status = statusCode,
      Title = title,
      Detail = detail,
      Extensions =
      {
        ["errorCode"] = errorCode,
      },
    });
  });
});

if (app.Environment.IsDevelopment())
{
  app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
  service = "tourin-api",
  version = "v1",
})).AllowAnonymous();

app.MapGet("/v1/health", () => Results.Ok(new
{
  status = "ok",
  time = DateTimeOffset.UtcNow,
})).AllowAnonymous();

var api = app.MapGroup("/v1");

api.MapGet("/me", async Task<Ok<MeResponse>> (
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetCurrentUserAsync(cancellationToken));
}).RequireAuthorization();

api.MapGet("/achievements", async Task<Ok<IReadOnlyList<AchievementDto>>> (
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetAchievementsAsync(cancellationToken));
}).RequireAuthorization();

api.MapGet("/passport", async Task<Ok<PassportResponse>> (
  [FromQuery] string? siteId,
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetPassportAsync(siteId, cancellationToken));
}).RequireAuthorization();

api.MapGet("/leaderboard", async Task<Ok<IReadOnlyList<LeaderboardEntryDto>>> (
  [FromQuery] string? sortBy,
  [FromQuery] int? limit,
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetLeaderboardAsync(sortBy, limit ?? 100, cancellationToken));
}).AllowAnonymous();

api.MapGet("/map/sites", async Task<Ok<IReadOnlyList<HeritageSiteDto>>> (
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetMapSitesAsync(cancellationToken));
}).AllowAnonymous();

api.MapGet("/metro/stations", async Task<Ok<IReadOnlyList<MetroStationDto>>> (
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.GetMetroStationsAsync(cancellationToken));
}).AllowAnonymous();

api.MapPost("/visits/stamp", async Task<Ok<StampVisitResponse>> (
  [FromBody] StampVisitRequest request,
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.StampVisitAsync(request, cancellationToken));
}).RequireAuthorization();

api.MapPost("/profile/avatar/upload-url", async Task<Ok<AvatarUploadResponse>> (
  [FromBody] AvatarUploadRequest request,
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.CreateAvatarUploadUrlAsync(request, cancellationToken));
}).RequireAuthorization();

api.MapPost("/profile/avatar/complete", async Task<Ok<MeResponse>> (
  [FromBody] AvatarUploadCompleteRequest request,
  TourinService service,
  CancellationToken cancellationToken) =>
{
  return TypedResults.Ok(await service.CompleteAvatarUploadAsync(request, cancellationToken));
}).RequireAuthorization();

app.Run();

public partial class Program
{
}
