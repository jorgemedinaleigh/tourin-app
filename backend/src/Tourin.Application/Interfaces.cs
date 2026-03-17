using Tourin.Domain;

namespace Tourin.Application;

public interface ICurrentUserAccessor
{
  bool IsAuthenticated { get; }
  string? UserId { get; }
  string? Email { get; }
  string? DisplayName { get; }
}

public interface ISystemClock
{
  DateTimeOffset UtcNow { get; }
}

public interface IAvatarStorageService
{
  Task<AvatarUploadResponse> CreateAvatarUploadAsync(
    string userId,
    string? contentType,
    string? fileExtension,
    CancellationToken cancellationToken);
}

public interface ITourinDataAccess
{
  Task<UserProfile?> FindUserAsync(string userId, CancellationToken cancellationToken);
  Task AddUserAsync(UserProfile user, CancellationToken cancellationToken);
  Task<HeritageSite?> FindSiteAsync(string siteId, CancellationToken cancellationToken);
  Task<IReadOnlyList<HeritageSite>> ListSitesAsync(CancellationToken cancellationToken);
  Task<IReadOnlyDictionary<string, HeritageSite>> GetSitesByIdsAsync(IEnumerable<string> siteIds, CancellationToken cancellationToken);
  Task<IReadOnlyList<MetroStation>> ListMetroStationsAsync(CancellationToken cancellationToken);
  Task<Visit?> FindVisitAsync(string userId, string siteId, CancellationToken cancellationToken);
  Task<IReadOnlyList<Visit>> ListVisitsAsync(string userId, CancellationToken cancellationToken);
  Task AddVisitAsync(Visit visit, CancellationToken cancellationToken);
  Task<IReadOnlyList<Achievement>> ListAchievementsAsync(CancellationToken cancellationToken);
  Task<IReadOnlyList<UserAchievement>> ListUserAchievementsAsync(string userId, CancellationToken cancellationToken);
  Task AddUserAchievementAsync(UserAchievement userAchievement, CancellationToken cancellationToken);
  Task<IReadOnlyList<LeaderboardRow>> GetLeaderboardAsync(string sortBy, int limit, CancellationToken cancellationToken);
  Task SaveChangesAsync(CancellationToken cancellationToken);
}
