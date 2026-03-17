using System.Net;
using Tourin.Domain;

namespace Tourin.Application;

public sealed class SystemClock : ISystemClock
{
  public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

public sealed class TourinService
{
  private readonly ITourinDataAccess _dataAccess;
  private readonly ICurrentUserAccessor _currentUserAccessor;
  private readonly IAvatarStorageService _avatarStorageService;
  private readonly ISystemClock _clock;

  public TourinService(
    ITourinDataAccess dataAccess,
    ICurrentUserAccessor currentUserAccessor,
    IAvatarStorageService avatarStorageService,
    ISystemClock clock)
  {
    _dataAccess = dataAccess;
    _currentUserAccessor = currentUserAccessor;
    _avatarStorageService = avatarStorageService;
    _clock = clock;
  }

  public async Task<MeResponse> GetCurrentUserAsync(CancellationToken cancellationToken)
  {
    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    return ToMeResponse(user);
  }

  public async Task<IReadOnlyList<AchievementDto>> GetAchievementsAsync(CancellationToken cancellationToken)
  {
    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    var achievements = await _dataAccess.ListAchievementsAsync(cancellationToken);
    var unlockedByAchievementId = (await _dataAccess.ListUserAchievementsAsync(user.Id, cancellationToken))
      .ToDictionary(item => item.AchievementId, item => item.UnlockedAt);

    return achievements
      .OrderBy(item => item.Threshold)
      .ThenBy(item => item.Name)
      .Select(item => new AchievementDto(
        item.Id,
        item.Code,
        item.Name,
        item.Description,
        item.Criteria,
        item.BadgeUrl,
        unlockedByAchievementId.TryGetValue(item.Id, out var unlockedAt) ? unlockedAt : null))
      .ToArray();
  }

  public async Task<PassportResponse> GetPassportAsync(string? siteId, CancellationToken cancellationToken)
  {
    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    var visits = await _dataAccess.ListVisitsAsync(user.Id, cancellationToken);

    if (!string.IsNullOrWhiteSpace(siteId))
    {
      visits = visits.Where(item => item.SiteId == siteId.Trim()).ToArray();
    }

    var sites = await _dataAccess.GetSitesByIdsAsync(visits.Select(item => item.SiteId), cancellationToken);

    var response = visits
      .OrderByDescending(item => item.CapturedAt)
      .ThenByDescending(item => item.CreatedAt)
      .Select(item =>
      {
        sites.TryGetValue(item.SiteId, out var site);

        return new PassportEntryDto(
          item.Id,
          item.SiteId,
          site?.Name ?? item.SiteId,
          site?.StampUrl,
          site?.CoverPhotoUrl,
          item.CapturedAt,
          item.CreatedAt,
          item.ScoreAwarded);
      })
      .ToArray();

    return new PassportResponse(response);
  }

  public async Task<IReadOnlyList<LeaderboardEntryDto>> GetLeaderboardAsync(string? sortBy, int limit, CancellationToken cancellationToken)
  {
    var rows = await _dataAccess.GetLeaderboardAsync(ResolveSort(sortBy), Math.Clamp(limit, 1, 100), cancellationToken);

    return rows
      .Select(item => new LeaderboardEntryDto(
        item.UserId,
        item.DisplayName,
        item.AvatarUrl,
        item.Score,
        item.SitesVisited,
        item.EventsAttended,
        item.AchievementsUnlocked))
      .ToArray();
  }

  public async Task<IReadOnlyList<HeritageSiteDto>> GetMapSitesAsync(CancellationToken cancellationToken)
  {
    var sites = await _dataAccess.ListSitesAsync(cancellationToken);

    return sites
      .OrderBy(item => item.Name)
      .Select(ToSiteDto)
      .ToArray();
  }

  public async Task<IReadOnlyList<MetroStationDto>> GetMetroStationsAsync(CancellationToken cancellationToken)
  {
    var stations = await _dataAccess.ListMetroStationsAsync(cancellationToken);

    return stations
      .OrderBy(item => item.StationName)
      .Select(item => new MetroStationDto(
        item.Id,
        item.StationName,
        item.Line,
        item.IsOperational,
        item.Latitude,
        item.Longitude))
      .ToArray();
  }

  public async Task<StampVisitResponse> StampVisitAsync(StampVisitRequest request, CancellationToken cancellationToken)
  {
    if (string.IsNullOrWhiteSpace(request.SiteId))
    {
      throw new TourinAppException((int)HttpStatusCode.BadRequest, "site_id_required", "A site id is required.");
    }

    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    var site = await _dataAccess.FindSiteAsync(request.SiteId.Trim(), cancellationToken)
      ?? throw new TourinAppException((int)HttpStatusCode.NotFound, "site_not_found", "The requested site does not exist.");

    var duplicateVisit = await _dataAccess.FindVisitAsync(user.Id, site.Id, cancellationToken);
    if (duplicateVisit is not null)
    {
      throw new TourinAppException((int)HttpStatusCode.Conflict, "visit_already_exists", "This site has already been stamped.");
    }

    if (site.StampRadiusMeters > 0 && (!request.Latitude.HasValue || !request.Longitude.HasValue))
    {
      throw new TourinAppException((int)HttpStatusCode.BadRequest, "location_required", "A location is required to stamp this site.");
    }

    var distanceMeters = request.Latitude.HasValue && request.Longitude.HasValue
      ? CalculateDistanceMeters(
        request.Latitude.Value,
        request.Longitude.Value,
        site.Latitude,
        site.Longitude)
      : 0d;

    if (site.StampRadiusMeters > 0 && distanceMeters > site.StampRadiusMeters)
    {
      throw new TourinAppException((int)HttpStatusCode.BadRequest, "too_far_from_site", "You are outside the valid stamping radius.");
    }

    var now = _clock.UtcNow;
    var capturedAt = request.CapturedAt ?? now;
    var visit = new Visit(
      Guid.NewGuid(),
      user.Id,
      site.Id,
      capturedAt,
      now,
      request.Latitude ?? site.Latitude,
      request.Longitude ?? site.Longitude,
      site.Score);

    await _dataAccess.AddVisitAsync(visit, cancellationToken);
    user.Stats.ApplySiteStamped(site.Score, now);

    var achievements = await _dataAccess.ListAchievementsAsync(cancellationToken);
    var unlockedAchievements = await _dataAccess.ListUserAchievementsAsync(user.Id, cancellationToken);
    var unlockedAchievementIds = unlockedAchievements.Select(item => item.AchievementId).ToHashSet();
    var newlyUnlocked = new List<AchievementDto>();

    foreach (var achievement in achievements.OrderBy(item => item.Threshold).ThenBy(item => item.Code))
    {
      if (unlockedAchievementIds.Contains(achievement.Id) || !MatchesRule(achievement, user.Stats))
      {
        continue;
      }

      var userAchievement = new UserAchievement(Guid.NewGuid(), user.Id, achievement.Id, now);
      await _dataAccess.AddUserAchievementAsync(userAchievement, cancellationToken);
      unlockedAchievementIds.Add(achievement.Id);

      newlyUnlocked.Add(new AchievementDto(
        achievement.Id,
        achievement.Code,
        achievement.Name,
        achievement.Description,
        achievement.Criteria,
        achievement.BadgeUrl,
        now));
    }

    user.Stats.SetAchievementsUnlocked(unlockedAchievementIds.Count, now);
    await _dataAccess.SaveChangesAsync(cancellationToken);

    return new StampVisitResponse(
      new PassportEntryDto(
        visit.Id,
        site.Id,
        site.Name,
        site.StampUrl,
        site.CoverPhotoUrl,
        visit.CapturedAt,
        visit.CreatedAt,
        visit.ScoreAwarded),
      ToStatsDto(user.Stats),
      newlyUnlocked,
      distanceMeters);
  }

  public async Task<AvatarUploadResponse> CreateAvatarUploadUrlAsync(AvatarUploadRequest request, CancellationToken cancellationToken)
  {
    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    return await _avatarStorageService.CreateAvatarUploadAsync(user.Id, request.ContentType, request.FileExtension, cancellationToken);
  }

  public async Task<MeResponse> CompleteAvatarUploadAsync(AvatarUploadCompleteRequest request, CancellationToken cancellationToken)
  {
    if (string.IsNullOrWhiteSpace(request.ObjectKey))
    {
      throw new TourinAppException((int)HttpStatusCode.BadRequest, "object_key_required", "An object key is required.");
    }

    var user = await GetOrCreateCurrentUserAsync(cancellationToken);
    var expectedPrefix = $"avatars/{user.Id}/";
    if (!request.ObjectKey.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
    {
      throw new TourinAppException((int)HttpStatusCode.BadRequest, "invalid_avatar_key", "The avatar key does not belong to the current user.");
    }

    user.UpdateAvatar(request.ObjectKey.Trim(), request.PublicUrl, _clock.UtcNow);
    await _dataAccess.SaveChangesAsync(cancellationToken);

    return ToMeResponse(user);
  }

  private async Task<UserProfile> GetOrCreateCurrentUserAsync(CancellationToken cancellationToken)
  {
    if (!_currentUserAccessor.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUserAccessor.UserId))
    {
      throw new TourinAppException((int)HttpStatusCode.Unauthorized, "authentication_required", "Authentication is required.");
    }

    var userId = _currentUserAccessor.UserId.Trim();
    var now = _clock.UtcNow;
    var user = await _dataAccess.FindUserAsync(userId, cancellationToken);

    if (user is null)
    {
      user = new UserProfile(
        userId,
        _currentUserAccessor.Email ?? $"{userId}@tourin.local",
        _currentUserAccessor.DisplayName ?? "Tourin User",
        now);

      await _dataAccess.AddUserAsync(user, cancellationToken);
      await _dataAccess.SaveChangesAsync(cancellationToken);
      return user;
    }

    user.SyncIdentity(_currentUserAccessor.Email, _currentUserAccessor.DisplayName, now);
    await _dataAccess.SaveChangesAsync(cancellationToken);
    return user;
  }

  private static bool MatchesRule(Achievement achievement, UserStats stats)
  {
    return achievement.RuleType switch
    {
      AchievementRuleType.SitesVisited => stats.SitesVisited >= achievement.Threshold,
      AchievementRuleType.Score => stats.Score >= achievement.Threshold,
      AchievementRuleType.EventsAttended => stats.EventsAttended >= achievement.Threshold,
      _ => false,
    };
  }

  private static string ResolveSort(string? sortBy)
  {
    return sortBy?.Trim() switch
    {
      "sitesVisited" => "sitesVisited",
      "eventsAttended" => "eventsAttended",
      _ => "score",
    };
  }

  private static HeritageSiteDto ToSiteDto(HeritageSite site)
  {
    return new HeritageSiteDto(
      site.Id,
      site.Name,
      site.Description,
      site.IsFree,
      site.Price,
      site.Score,
      site.StampUrl,
      site.CoverPhotoUrl,
      site.Type,
      site.SubType,
      site.Location,
      site.LegalStatus,
      site.Comuna,
      site.Region,
      site.StampRadiusMeters,
      site.Route,
      site.Website,
      site.Latitude,
      site.Longitude);
  }

  private static MeResponse ToMeResponse(UserProfile user)
  {
    return new MeResponse(
      user.Id,
      user.Email,
      user.DisplayName,
      user.CreatedAt,
      user.AvatarUrl,
      user.AvatarKey,
      ToStatsDto(user.Stats));
  }

  private static StatsDto ToStatsDto(UserStats stats)
  {
    return new StatsDto(
      stats.Score,
      stats.SitesVisited,
      stats.EventsAttended,
      stats.AchievementsUnlocked);
  }

  private static double CalculateDistanceMeters(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude)
  {
    const double earthRadiusMeters = 6_371_000d;
    var dLatitude = DegreesToRadians(toLatitude - fromLatitude);
    var dLongitude = DegreesToRadians(toLongitude - fromLongitude);
    var lat1 = DegreesToRadians(fromLatitude);
    var lat2 = DegreesToRadians(toLatitude);

    var a =
      Math.Sin(dLatitude / 2d) * Math.Sin(dLatitude / 2d) +
      Math.Sin(dLongitude / 2d) * Math.Sin(dLongitude / 2d) * Math.Cos(lat1) * Math.Cos(lat2);
    var c = 2d * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));

    return earthRadiusMeters * c;
  }

  private static double DegreesToRadians(double value) => value * Math.PI / 180d;
}
