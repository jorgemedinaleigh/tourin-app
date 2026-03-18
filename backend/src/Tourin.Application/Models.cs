namespace Tourin.Application;

public sealed record StatsDto(
  int Score,
  int SitesVisited,
  int EventsAttended,
  int AchievementsUnlocked);

public sealed record MeResponse(
  string Id,
  string Email,
  string Name,
  DateTimeOffset CreatedAt,
  string? AvatarUrl,
  string? AvatarKey,
  StatsDto Stats);

public sealed record AchievementDto(
  Guid Id,
  string Code,
  string Name,
  string Description,
  string Criteria,
  string BadgeUrl,
  DateTimeOffset? UnlockedAt);

public sealed record PassportEntryDto(
  Guid VisitId,
  string SiteId,
  string SiteName,
  string? StampUrl,
  string? CoverPhotoUrl,
  DateTimeOffset CapturedAt,
  DateTimeOffset CreatedAt,
  int ScoreAwarded);

public sealed record PassportResponse(
  IReadOnlyList<PassportEntryDto> Visits);

public sealed record LeaderboardEntryDto(
  string UserId,
  string DisplayName,
  string? AvatarUrl,
  int Score,
  int SitesVisited,
  int EventsAttended,
  int AchievementsUnlocked);

public sealed record HeritageSiteDto(
  string Id,
  string Name,
  string? Description,
  bool IsFree,
  string? Stamp,
  string? CoverPhoto,
  string? Type,
  string? SubType,
  string? Location,
  string? LegalStatus,
  string? Comuna,
  string? Region,
  int StampRadius,
  string? Route,
  string? Website,
  double Latitude,
  double Longitude);

public sealed record MetroStationDto(
  string Id,
  string Name,
  string Line,
  bool IsOperational,
  double Latitude,
  double Longitude);

public sealed record StampVisitRequest(
  string SiteId,
  double? Latitude,
  double? Longitude,
  DateTimeOffset? CapturedAt);

public sealed record StampVisitResponse(
  PassportEntryDto Visit,
  StatsDto Stats,
  IReadOnlyList<AchievementDto> NewlyUnlockedAchievements,
  double DistanceMeters);

public sealed record AvatarUploadRequest(
  string? ContentType,
  string? FileExtension);

public sealed record AvatarUploadResponse(
  string ObjectKey,
  string UploadUrl,
  string? PublicUrl,
  DateTimeOffset ExpiresAt);

public sealed record AvatarUploadCompleteRequest(
  string ObjectKey,
  string? PublicUrl);

public sealed record LeaderboardRow(
  string UserId,
  string DisplayName,
  string? AvatarUrl,
  int Score,
  int SitesVisited,
  int EventsAttended,
  int AchievementsUnlocked);

public sealed class TourinAppException : Exception
{
  public TourinAppException(int statusCode, string errorCode, string message)
    : base(message)
  {
    StatusCode = statusCode;
    ErrorCode = errorCode;
  }

  public int StatusCode { get; }
  public string ErrorCode { get; }
}
